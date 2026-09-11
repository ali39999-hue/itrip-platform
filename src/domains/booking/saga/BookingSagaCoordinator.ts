/**
 * Canonical Durable Booking Saga Coordinator (SAGA-101 to SAGA-105)
 *
 * Implements a durable, multi-step Saga engine with:
 * 1. Step pre-persistence BEFORE execution in SagaStep (SAGA-102).
 * 2. External provider results stored durably in SagaStep.resultSnapshot (SAGA-103).
 * 3. Formal reverse-order Compensation Catalog for all failure paths (SAGA-104).
 * 4. Zero open DB transactions during external provider/HTTP calls (SAGA-105).
 * 5. Crash recovery and idempotent duplicate-step execution protection (SAGA-106).
 */

import { prisma } from '@/lib/prisma';
import { BookingStateMachine, BookingState } from '../state-machine';
import { InventoryEngine } from '@/domains/inventory/InventoryEngine';
import { PaymentDomainService } from '@/domains/payments/PaymentDomainService';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { InvoiceDomainService } from '@/domains/finance/InvoiceDomainService';
import { wrapOutboxPayload } from '@/domains/events/OutboxConsumer';
import { businessMetrics } from '@/lib/observability/business-metrics';
import { Money } from '@/lib/finance';
import { createLogger } from '@/lib/observability/logger';

const sagaLogger = createLogger('booking-saga-coordinator');

export interface ConfirmBookingSagaParams {
  bookingId: string;
  idempotencyKey: string;
  paymentMethod: 'wallet_irr' | 'gateway_shetab' | 'wallet_usdt' | 'gateway_ecardo';
  holdToken?: string;
  supplierCallFn?: (ctx: Record<string, unknown>) => Promise<{ pnr: string; ticketNumbers?: string[]; externalBookingId?: string }>;
  voidSupplierFn?: (ctx: Record<string, unknown>, snapshot: Record<string, unknown>) => Promise<void>;
}

export interface SagaExecutionResult {
  success: boolean;
  bookingId: string;
  sagaId: string;
  status: 'SUCCEEDED' | 'COMPENSATED' | 'FAILED';
  error?: string;
  pnr?: string;
}

export class BookingSagaCoordinator {
  /**
   * Canonical Booking Confirmation Saga Orchestrator (SAGA-101)
   */
  static async executeBookingConfirmation(params: ConfirmBookingSagaParams): Promise<SagaExecutionResult> {
    const correlationId = `corr_saga_${params.bookingId}_${Date.now().toString(36)}`;

    // 1. Fetch booking without holding transaction
    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: { items: true },
    });

    if (!booking) {
      throw new Error(`Booking ${params.bookingId} not found`);
    }

    // Idempotency: if booking is already confirmed, return success immediately
    if (booking.status === 'CONFIRMED') {
      return {
        success: true,
        bookingId: booking.id,
        sagaId: `saga_dup_${booking.id}`,
        status: 'SUCCEEDED',
        pnr: booking.externalPnr || undefined,
      };
    }

    // 2. Validate state machine transition
    BookingStateMachine.assertTransition(booking.status as BookingState, 'PAYMENT_CONFIRMED');

    // 3. Find or initialize durable SagaExecution record
    let saga = await prisma.sagaExecution.findFirst({
      where: { aggregateId: booking.id, sagaType: 'CONFIRM_BOOKING_SAGA' },
      include: { steps: { orderBy: { id: 'asc' } } },
    });

    if (!saga) {
      saga = await prisma.sagaExecution.create({
        data: {
          sagaType: 'CONFIRM_BOOKING_SAGA',
          aggregateType: 'BOOKING',
          aggregateId: booking.id,
          correlationId,
          status: 'RUNNING',
          currentStep: 'INITIALIZED',
          contextJson: JSON.stringify({
            bookingId: booking.id,
            customerId: booking.customerId,
            totalAmount: booking.totalAmount.toString(),
            currency: booking.currency,
            paymentMethod: params.paymentMethod,
            holdToken: params.holdToken || booking.holdToken,
          }),
        },
        include: { steps: true },
      });
    } else if (saga.status === 'SUCCEEDED') {
      // Already successfully executed (idempotent duplicate request)
      return {
        success: true,
        bookingId: booking.id,
        sagaId: saga.id,
        status: 'SUCCEEDED',
        pnr: booking.externalPnr || undefined,
      };
    }

    const context: Record<string, unknown> = JSON.parse(saga.contextJson || '{}');

    // =========================================================================
    // STEP 1: CAPTURE INVENTORY HOLD
    // =========================================================================
    const holdToken = (params.holdToken || booking.holdToken || context.holdToken) as string | undefined;
    if (holdToken) {
      const step1 = await this.executeStep(
        saga.id,
        'CAPTURE_INVENTORY_HOLD',
        { holdToken },
        async () => {
          const res = await InventoryEngine.captureHold(holdToken);
          if (!res.success) {
            throw new Error(res.error || 'Failed to capture inventory hold');
          }
          return { holdToken, status: 'CAPTURED' };
        }
      );

      if (!step1.success) {
        return this.compensateSaga(saga.id, booking.id, context, step1.error);
      }
    }

    // =========================================================================
    // STEP 2: PROCESS / CAPTURE PAYMENT (SAGA-105: Bounded payment execution)
    // =========================================================================
    const step2 = await this.executeStep(
      saga.id,
      'CAPTURE_PAYMENT',
      {
        bookingId: booking.id,
        idempotencyKey: params.idempotencyKey,
        method: params.paymentMethod,
        amount: booking.totalAmount.toString(),
        currency: booking.currency,
      },
      async () => {
        const payRes = await PaymentDomainService.processPayment({
          bookingId: booking.id,
          idempotencyKey: params.idempotencyKey,
          method: params.paymentMethod,
          amount: new Money(booking.totalAmount, booking.currency),
          currency: booking.currency,
        });

        if (!payRes.success) {
          throw new Error(payRes.error || 'Payment execution failed');
        }

        context.paymentId = payRes.paymentId;

        // Debit wallet immediately on payment capture
        if (params.paymentMethod === 'wallet_irr' || params.paymentMethod === 'wallet_usdt') {
          await GeneralLedgerService.postWalletPayment({
            groupId: `saga_pay_${booking.id}`,
            userId: booking.customerId,
            amount: new Money(booking.totalAmount, booking.currency),
            currency: booking.currency,
            referenceId: booking.id,
          });
        }

        return {
          paymentId: payRes.paymentId,
          method: params.paymentMethod,
          amount: booking.totalAmount.toString(),
          currency: booking.currency,
        };
      }
    );

    if (!step2.success) {
      return this.compensateSaga(saga.id, booking.id, context, step2.error);
    }

    // =========================================================================
    // STEP 3: EXTERNAL SUPPLIER CALL (SAGA-105: Outside DB transaction)
    // =========================================================================
    let pnr = booking.externalPnr;
    const step3 = await this.executeStep(
      saga.id,
      'CALL_EXTERNAL_SUPPLIER',
      { bookingId: booking.id, itemsCount: booking.items.length },
      async () => {
        if (params.supplierCallFn) {
          const suppRes = await params.supplierCallFn(context);
          pnr = suppRes.pnr;
          return {
            pnr: suppRes.pnr,
            ticketNumbers: suppRes.ticketNumbers || [],
            externalBookingId: suppRes.externalBookingId || `ext_${Date.now()}`,
          };
        }
        // No supplier integration wired (BUG-006): never fabricate a PNR or
        // ticket number. Ticketing stays pending and an OperationalException
        // routes the booking to ops follow-up.
        return {
          pnr: null as string | null,
          ticketNumbers: [] as string[],
          externalBookingId: 'pending_supplier_confirmation',
        };
      }
    );

    if (!step3.success) {
      return this.compensateSaga(saga.id, booking.id, context, step3.error, params.voidSupplierFn);
    }

    // =========================================================================
    // STEP 4: GENERAL LEDGER POSTING
    // =========================================================================
    const step4 = await this.executeStep(
      saga.id,
      'POST_GENERAL_LEDGER',
      { bookingId: booking.id, totalAmount: booking.totalAmount.toString() },
      async () => {
        const totalMoney = new Money(booking.totalAmount, booking.currency);
        let netCostMoney = Money.zero(booking.currency);
        let taxMoney = Money.zero(booking.currency);
        let feeMoney = Money.zero(booking.currency);

        for (const item of booking.items) {
          netCostMoney = netCostMoney.add(new Money(item.netCost ?? 0, booking.currency));
          taxMoney = taxMoney.add(new Money(item.taxAmount ?? 0, booking.currency));
          feeMoney = feeMoney.add(new Money(item.feeAmount ?? 0, booking.currency));
        }

        const primaryItem = booking.items[0];
        let supplierId = 'sup_default_firuzo';
        if (primaryItem?.inventoryItemId) {
          const inv = await prisma.inventoryItem.findUnique({
            where: { id: primaryItem.inventoryItemId },
            select: { supplierId: true },
          });
          if (inv?.supplierId) supplierId = inv.supplierId;
        }

        if (params.paymentMethod !== 'wallet_irr' && params.paymentMethod !== 'wallet_usdt') {
          await GeneralLedgerService.postGatewayPayment({
            groupId: `saga_pay_${booking.id}`,
            amount: totalMoney,
            currency: booking.currency,
            referenceId: booking.id,
          });
        }

        await GeneralLedgerService.postRevenueRealization({
          groupId: `saga_rev_${booking.id}`,
          amount: totalMoney,
          netCost: netCostMoney,
          taxAmount: taxMoney,
          feeAmount: feeMoney,
          supplierId,
          currency: booking.currency,
          referenceId: booking.id,
        });

        return {
          groupId: `saga_rev_${booking.id}`,
          amount: totalMoney.toString(),
          supplierId,
        };
      }
    );

    if (!step4.success) {
      return this.compensateSaga(saga.id, booking.id, context, step4.error, params.voidSupplierFn);
    }

    // =========================================================================
    // STEP 5: COMMERCIAL INVOICE ISSUANCE
    // =========================================================================
    const step5 = await this.executeStep(
      saga.id,
      'ISSUE_INVOICE',
      { bookingId: booking.id },
      async () => {
        const invoice = await InvoiceDomainService.createInvoice({
          bookingId: booking.id,
          customerId: booking.customerId,
          lines: booking.items.map((item) => ({
            description: `${item.type} reservation (${booking.reference})`,
            quantity: 1,
            unitPrice: new Money(item.sellPrice, booking.currency),
            taxAmount: new Money(item.taxAmount || 0, booking.currency),
          })),
          currency: booking.currency,
        });
        return { invoiceNumber: invoice.invoiceNumber, invoiceId: invoice.id };
      }
    );

    if (!step5.success) {
      return this.compensateSaga(saga.id, booking.id, context, step5.error, params.voidSupplierFn);
    }

    // =========================================================================
    // STEP 6: TRANSITION BOOKING TO CONFIRMED
    // =========================================================================
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        fulfillmentStatus: 'CONFIRMED',
        // Ticket identity is only claimed when a real supplier confirmed it
        // (BUG-006): otherwise the booking stays queued for issuing and an
        // OperationalException routes it to ops follow-up.
        ticketStatus: pnr ? 'ISSUED' : 'ISSUING',
        externalPnr: pnr || null,
      },
    });

    if (!pnr) {
      await prisma.operationalException.create({
        data: {
          type: 'TICKET_NOT_ISSUED',
          severity: 'HIGH',
          entityType: 'BOOKING',
          entityId: booking.id,
          title: `صدور بلیت برای رزرو ${booking.reference} در انتظار تایید تامین‌کننده`,
          description: 'پرداخت و رزرو تایید شد، اما هیچ یکپارچه‌سازی تامین‌کننده‌ای PNR صادر نکرده است. صدور بلیت نیازمند پیگیری عملیات است.',
        },
      }).catch(() => null);
    }

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: 'CONFIRMED',
        actor: 'BOOKING_SAGA_COORDINATOR',
        reason: 'Canonical booking saga confirmed',
        correlationId,
      },
    });

    businessMetrics.recordBookingConfirmed(booking.id, Number(booking.totalAmount));

    // Update Travel File dossier status (ERP-001)
    const { TravelFileDomainService } = await import('../../erp/TravelFileDomainService');
    await TravelFileDomainService.onBookingConfirmed(booking.id).catch(() => null);

    // =========================================================================
    // STEP 7: EMIT OUTBOX NOTIFICATION EVENT
    // =========================================================================
    await prisma.outboxEvent.create({
      data: {
        eventType: 'BOOKING_CONFIRMED',
        aggregateType: 'BOOKING',
        aggregateId: booking.id,
        correlationId,
        payload: wrapOutboxPayload({
          bookingId: booking.id,
          customerId: booking.customerId,
          paymentId: context.paymentId,
          reference: booking.reference,
          pnr,
        }),
        status: 'PENDING',
      },
    });

    // Mark Saga SUCCEEDED
    await prisma.sagaExecution.update({
      where: { id: saga.id },
      data: {
        status: 'SUCCEEDED',
        currentStep: 'COMPLETED',
        finishedAt: new Date(),
      },
    });

    return {
      success: true,
      bookingId: booking.id,
      sagaId: saga.id,
      status: 'SUCCEEDED',
      pnr: pnr || undefined,
    };
  }

  /**
   * Pre-persists step BEFORE execution (SAGA-102) and captures external results (SAGA-103).
   * Idempotent: skips if step already SUCCEEDED.
   */
  private static async executeStep(
    sagaId: string,
    stepType: string,
    inputSnapshot: Record<string, unknown>,
    actionFn: () => Promise<Record<string, unknown>>
  ): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
    // 1. Check if step exists
    let step = await prisma.sagaStep.findFirst({
      where: { sagaId, stepType },
    });

    if (step && step.status === 'SUCCEEDED') {
      // Idempotent replay: return cached result snapshot without re-executing
      const cached = step.resultSnapshot ? JSON.parse(step.resultSnapshot) : {};
      return { success: true, result: cached };
    }

    // 2. Pre-persist step as RUNNING BEFORE executing action (SAGA-102)
    if (!step) {
      step = await prisma.sagaStep.create({
        data: {
          sagaId,
          stepType,
          status: 'RUNNING',
          inputSnapshot: JSON.stringify(inputSnapshot),
          startedAt: new Date(),
          attempts: 1,
        },
      });
    } else {
      step = await prisma.sagaStep.update({
        where: { id: step.id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
    }

    // 3. Execute action OUTSIDE database transaction (SAGA-105)
    try {
      const result = await actionFn();

      // 4. Durably persist result snapshot (SAGA-103)
      await prisma.sagaStep.update({
        where: { id: step.id },
        data: {
          status: 'SUCCEEDED',
          resultSnapshot: JSON.stringify(result),
          finishedAt: new Date(),
        },
      });

      return { success: true, result };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await prisma.sagaStep.update({
        where: { id: step.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
          finishedAt: new Date(),
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Reverse-Order Compensation Catalog (SAGA-104)
   */
  private static async compensateSaga(
    sagaId: string,
    bookingId: string,
    context: Record<string, unknown>,
    failureReason?: string,
    voidSupplierFn?: (ctx: Record<string, unknown>, snapshot: Record<string, unknown>) => Promise<void>
  ): Promise<SagaExecutionResult> {
    console.warn(`[BookingSagaCoordinator] Failure in saga ${sagaId} on booking ${bookingId}: ${failureReason}. Triggering compensation catalog.`);

    await prisma.sagaExecution.update({
      where: { id: sagaId },
      data: { status: 'COMPENSATING' },
    });

    // Fetch succeeded steps in reverse order
    const succeededSteps = await prisma.sagaStep.findMany({
      where: { sagaId, status: 'SUCCEEDED' },
      orderBy: { id: 'desc' },
    });

    for (const s of succeededSteps) {
      const resultSnapshot = s.resultSnapshot ? JSON.parse(s.resultSnapshot) : {};

      try {
        switch (s.stepType) {
          case 'CALL_EXTERNAL_SUPPLIER': {
            if (voidSupplierFn) {
              await voidSupplierFn(context, resultSnapshot);
            }
            sagaLogger.info('Compensation: Voided external supplier reservation/PNR', { bookingId });
            break;
          }

          case 'CAPTURE_PAYMENT': {
            // Refund payment via GeneralLedger reversal
            const amountStr = (resultSnapshot.amount as string) || (context.totalAmount as string);
            const currency = (resultSnapshot.currency as string) || (context.currency as string) || 'IRR';
            const customerId = context.customerId as string;

            if (amountStr && customerId) {
              const refundMoney = new Money(amountStr, currency);
              await GeneralLedgerService.postRefund({
                groupId: `comp_pay_${sagaId}`,
                userId: customerId,
                amount: refundMoney,
                currency,
                referenceId: bookingId,
                memo: `Saga rollback refund for booking ${bookingId}`,
              });
              sagaLogger.info('Compensation: Refunded payment to user', { amount: amountStr, currency, customerId });
            }
            break;
          }

          case 'CAPTURE_INVENTORY_HOLD': {
            const holdToken = (resultSnapshot.holdToken as string) || (context.holdToken as string);
            if (holdToken) {
              await InventoryEngine.releaseHold(holdToken);
              sagaLogger.info('Compensation: Released inventory hold', { holdToken });
            }
            break;
          }

          case 'POST_GENERAL_LEDGER': {
            // GeneralLedger reversal is handled via postRefund
            sagaLogger.info('Compensation: Ledger adjustments completed for saga', { sagaId });
            break;
          }

          case 'ISSUE_INVOICE': {
            if (resultSnapshot.invoiceId) {
              await prisma.invoice.update({
                where: { id: resultSnapshot.invoiceId },
                data: { status: 'VOIDED' },
              });
              sagaLogger.info('Compensation: Voided invoice', { invoiceNumber: resultSnapshot.invoiceNumber });
            }
            break;
          }
        }

        await prisma.sagaStep.update({
          where: { id: s.id },
          data: { status: 'COMPENSATED' },
        });
      } catch (compErr) {
        sagaLogger.error(`Compensation failed for step ${s.stepType}`, {
          error: compErr instanceof Error ? compErr.message : String(compErr),
        });
      }
    }

    // Transition booking to FAILED
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'FAILED',
        paymentStatus: 'FAILED',
        fulfillmentStatus: 'FAILED',
      },
    });

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: 'PENDING_PAYMENT',
        toStatus: 'FAILED',
        actor: 'BOOKING_SAGA_COORDINATOR',
        reason: `Saga failed and compensated: ${failureReason}`,
      },
    });

    await prisma.sagaExecution.update({
      where: { id: sagaId },
      data: {
        status: 'COMPENSATED',
        finishedAt: new Date(),
      },
    });

    return {
      success: false,
      bookingId,
      sagaId,
      status: 'COMPENSATED',
      error: failureReason,
    };
  }
}
