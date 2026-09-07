import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { BookingStateMachine, BookingState } from '../booking/state-machine';
import { RefundStateMachine, RefundState } from './RefundStateMachine';
import { CustomerRefundAdapter } from '../payments/adapters/CustomerRefundAdapter';
import { InventoryEngine } from '../inventory/InventoryEngine';
import { businessMetrics } from '@/lib/observability/business-metrics';

export class RefundAmountInvariantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefundAmountInvariantViolationError';
  }
}

export interface RequestRefundParams {
  bookingId: string;
  reason?: string;
  idempotencyKey: string;
  penaltyPercentage?: number; // e.g., 0.15 for 15% cancellation fee
  approvedBy?: string;
  channel?: 'WALLET' | 'GATEWAY' | 'PAYA';
  recipientIban?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundNumber?: string;
  grossAmount?: number;
  penaltyAmount?: number;
  netRefundAmount?: number;
  grossMoney?: Money;
  penaltyMoney?: Money;
  netRefundMoney?: Money;
  currency?: string;
  status?: string;
  error?: string;
}

export interface PersistSupplierRefundParams {
  refundId: string;
  supplierId: string;
  supplierRef: string;
  grossAmount: Money | number;
  penaltyAmount?: Money | number;
  netAmount: Money | number;
  status?: string;
  rawResponse?: Record<string, unknown>;
}

/**
 * Legal booking-status chain from each refundable state to REFUNDED (BOOK-007/008)
 */
const CHAIN_TO_REFUNDED: Partial<Record<BookingState, BookingState[]>> = {
  CONFIRMED: ['CANCEL_REQUESTED', 'CANCELLING', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'],
  CANCEL_REQUESTED: ['CANCELLING', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'],
  CANCELLED: ['REFUND_INITIATED', 'REFUNDED'],
};

export class RefundDomainService {
  /**
   * REF-101, REF-103: Request a new refund in REQUESTED state.
   * Enforces that pending + refunded amount never exceeds the refundable booking total.
   */
  static async requestRefund(
    params: RequestRefundParams,
    tx?: Prisma.TransactionClient
  ): Promise<RefundResult> {
    const runner = async (client: Prisma.TransactionClient): Promise<RefundResult> => {
      // 1. Idempotency Check (REF-107)
      const existing = await client.refund.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });

      if (existing) {
        return {
          success: true,
          refundId: existing.id,
          refundNumber: existing.refundNumber,
          grossAmount: Number(existing.amount),
          penaltyAmount: Number(existing.penaltyAmount),
          netRefundAmount: Number(existing.netRefundAmount),
          grossMoney: new Money(existing.amount, existing.currency),
          penaltyMoney: new Money(existing.penaltyAmount, existing.currency),
          netRefundMoney: new Money(existing.netRefundAmount, existing.currency),
          currency: existing.currency,
          status: existing.status,
        };
      }

      // 2. Fetch booking and check eligibility
      const booking = await client.booking.findUnique({
        where: { id: params.bookingId },
        include: { items: true },
      });

      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      const validStatuses = ['CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED'];
      if (!validStatuses.includes(booking.status)) {
        return {
          success: false,
          error: `Booking status ${booking.status} is not eligible for refund`,
        };
      }

      // 3. Calculate gross, penalty, and net refund
      const grossMoney = new Money(booking.totalAmount.toString(), booking.currency);
      const penaltyRate = new Prisma.Decimal((params.penaltyPercentage || 0).toString());
      const penaltyMoney = grossMoney.mul(penaltyRate).round(0);
      const netMoney = grossMoney.sub(penaltyMoney);

      // REF-103: Enforce refund amount invariant
      // SUM(pending + refunded) cannot exceed booking totalAmount
      const existingRefunds = await client.refund.findMany({
        where: {
          bookingId: booking.id,
          status: { notIn: ['FAILED', 'REJECTED'] },
        },
      });

      let totalExisting = Money.zero(booking.currency);
      for (const r of existingRefunds) {
        totalExisting = totalExisting.add(new Money(r.amount.toString(), r.currency));
      }

      const totalWithRequested = totalExisting.add(grossMoney);
      const maxRefundable = new Money(booking.totalAmount.toString(), booking.currency);

      if (totalWithRequested.greaterThan(maxRefundable)) {
        throw new RefundAmountInvariantViolationError(
          `REF-103 Invariant Violation: pending + refunded (${totalWithRequested.toString()}) exceeds refundable amount (${maxRefundable.toString()}) for booking ${booking.id}`
        );
      }

      const refundNumber = `RFD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      // 4. Create Refund Record with initial status REQUESTED (REF-101)
      const refund = await client.refund.create({
        data: {
          refundNumber,
          bookingId: booking.id,
          amount: grossMoney.toDecimal(),
          penaltyAmount: penaltyMoney.toDecimal(),
          netRefundAmount: netMoney.toDecimal(),
          currency: booking.currency,
          status: 'REQUESTED',
          reason: params.reason || 'Customer cancellation',
          idempotencyKey: params.idempotencyKey,
          items: {
            create: booking.items.map((item) => {
              const itemTotal = new Money(item.sellPrice.toString(), booking.currency);
              const itemPenalty = itemTotal.mul(penaltyRate).round(0);
              const itemNet = itemTotal.sub(itemPenalty);
              return {
                bookingItemId: item.id,
                amount: itemTotal.toDecimal(),
                penalty: itemPenalty.toDecimal(),
                netAmount: itemNet.toDecimal(),
                currency: booking.currency,
              };
            }),
          },
          policySnapshot: {
            create: {
              bookingId: booking.id,
              bookingStatusAtRequest: booking.status,
              penaltyPercentage: penaltyRate,
              rulesJson: JSON.stringify({
                grossAmount: grossMoney.toNumber(),
                penaltyPercentage: params.penaltyPercentage || 0,
                penaltyAmount: penaltyMoney.toNumber(),
                netRefundAmount: netMoney.toNumber(),
                reason: params.reason || 'Customer cancellation',
              }),
            },
          },
        },
      });

      return {
        success: true,
        refundId: refund.id,
        refundNumber: refund.refundNumber,
        grossAmount: grossMoney.toNumber(),
        penaltyAmount: penaltyMoney.toNumber(),
        netRefundAmount: netMoney.toNumber(),
        grossMoney,
        penaltyMoney,
        netRefundMoney: netMoney,
        currency: booking.currency,
        status: refund.status,
      };
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * REF-101, REF-102: Approves a requested refund.
   */
  static async approveRefund(
    refundId: string,
    approverId: string = 'SYSTEM',
    note?: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ success: boolean; status: RefundState }> {
    const runner = async (client: Prisma.TransactionClient) => {
      const refund = await client.refund.findUniqueOrThrow({
        where: { id: refundId },
      });

      RefundStateMachine.assertTransition(refund.status as RefundState, 'APPROVED');

      await client.refund.update({
        where: { id: refundId },
        data: {
          status: 'APPROVED',
          approvedBy: approverId,
        },
      });

      await client.refundApproval.create({
        data: {
          refundId,
          approverId,
          decision: 'APPROVED',
          note: note || 'Refund approved',
        },
      });

      return { success: true, status: 'APPROVED' as RefundState };
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * REF-104: Persist supplier refund result
   */
  static async persistSupplierRefund(
    params: PersistSupplierRefundParams,
    tx?: Prisma.TransactionClient
  ): Promise<{ success: boolean; refundId: string; supplierRef: string }> {
    const runner = async (client: Prisma.TransactionClient) => {
      const refund = await client.refund.findUniqueOrThrow({
        where: { id: params.refundId },
        include: { booking: true },
      });

      // Record in audit log for traceable verification
      await client.auditLog.create({
        data: {
          action: 'SUPPLIER_REFUND_RECORDED',
          resource: 'Refund',
          resourceId: refund.id,
          newData: JSON.stringify({
            supplierId: params.supplierId,
            supplierRef: params.supplierRef,
            grossAmount: params.grossAmount.toString(),
            netAmount: params.netAmount.toString(),
            status: params.status || 'PROCESSED',
            rawResponse: params.rawResponse,
          }),
        },
      });

      return {
        success: true,
        refundId: refund.id,
        supplierRef: params.supplierRef,
      };
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * REF-105, REF-106: Execute customer refund payout and wire once to general ledger.
   */
  static async executeRefundPayout(
    params: {
      refundId: string;
      channel?: 'WALLET' | 'GATEWAY' | 'PAYA';
      recipientIban?: string;
    },
    tx?: Prisma.TransactionClient
  ): Promise<RefundResult> {
    const runner = async (client: Prisma.TransactionClient): Promise<RefundResult> => {
      const refund = await client.refund.findUniqueOrThrow({
        where: { id: params.refundId },
        include: { booking: true },
      });

      const currentStatus = refund.status as RefundState;
      if (currentStatus !== 'APPROVED' && currentStatus !== 'PROCESSING') {
        RefundStateMachine.assertTransition(currentStatus, 'PROCESSING');
      }

      await client.refund.update({
        where: { id: refund.id },
        data: { status: 'PROCESSING' },
      });

      const channel = params.channel || 'WALLET';
      const netMoney = new Money(refund.netRefundAmount.toString(), refund.currency);
      const booking = refund.booking;

      let payoutSuccess = false;
      let payoutRef = `rfd_pay_${refund.id}`;
      let errorMessage: string | undefined;

      if (channel === 'WALLET') {
        // Internal Ledger Credit
        payoutSuccess = true;
        payoutRef = `ledger:rfd_grp_${refund.id}`;
      } else if (channel === 'GATEWAY') {
        const adapter = new CustomerRefundAdapter();
        const res = await adapter.refundViaGateway({
          gatewayRef: `gw_${booking.id}`,
          amount: netMoney,
          reason: refund.reason || 'Customer cancellation',
        });
        payoutSuccess = res.success;
        payoutRef = res.payoutRef;
        errorMessage = res.error;
      } else if (channel === 'PAYA') {
        const adapter = new CustomerRefundAdapter();
        const res = await adapter.payoutViaPaya({
          iban: params.recipientIban || 'IR270170000000100324200001',
          accountHolderName: 'Customer',
          amount: netMoney,
          referenceId: `paya_${refund.id}`,
          description: refund.reason || 'Customer refund',
        });
        payoutSuccess = res.success;
        payoutRef = res.payoutRef;
        errorMessage = res.error;
      }

      // REF-105: Persist customer refund result in RefundAttempt
      const attemptCount = await client.refundAttempt.count({ where: { refundId: refund.id } });
      await client.refundAttempt.create({
        data: {
          refundId: refund.id,
          attemptNumber: attemptCount + 1,
          channel,
          amount: netMoney.toDecimal(),
          currency: refund.currency,
          status: payoutSuccess ? 'SUCCESS' : 'FAILED',
          gatewayRef: payoutRef,
          errorMessage,
        },
      });

      if (!payoutSuccess) {
        await client.refund.update({
          where: { id: refund.id },
          data: { status: 'FAILED' },
        });
        return {
          success: false,
          refundId: refund.id,
          error: errorMessage || 'Refund payout failed',
          status: 'FAILED',
        };
      }

      // REF-106: Wire refund to General Ledger (refund posts exactly once)
      await GeneralLedgerService.postRefund(
        {
          groupId: `rfd_grp_${refund.id}`,
          userId: booking.customerId,
          amount: netMoney,
          currency: booking.currency,
          referenceId: refund.id,
          memo: `Booking refund credit for ${refund.refundNumber}`,
        },
        client
      );

      // Walk booking status machine to REFUNDED
      const chain = CHAIN_TO_REFUNDED[booking.status as BookingState];
      if (chain) {
        let previous = booking.status as BookingState;
        for (const next of chain) {
          BookingStateMachine.assertTransition(previous, next);
          previous = next;
        }
      }

      await client.booking.update({
        where: { id: booking.id },
        data: {
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED',
          cancelledAt: new Date(),
        },
      });

      // Update refund status to SETTLED (REF-102)
      RefundStateMachine.assertTransition('PROCESSING', 'SETTLED');
      const settledRefund = await client.refund.update({
        where: { id: refund.id },
        data: {
          status: 'SETTLED',
          settledAt: new Date(),
        },
      });

      // Release inventory hold
      if (booking.holdToken) {
        await InventoryEngine.compensateCapturedHold(booking.holdToken, client);
      }

      // Relational Booking Status History
      await client.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: 'REFUNDED',
          actor: refund.approvedBy || 'SYSTEM',
          reason: `Refund processed: ${refund.reason || 'Customer cancellation'}`,
          correlationId: `corr_rfd_${refund.id}`,
        },
      });

      // Emit Outbox Event
      await client.outboxEvent.create({
        data: {
          eventType: 'BOOKING_REFUNDED',
          aggregateType: 'REFUND',
          aggregateId: refund.id,
          correlationId: `corr_rfd_${refund.id}`,
          payload: JSON.stringify({
            bookingId: booking.id,
            refundId: refund.id,
            refundNumber: refund.refundNumber,
            netAmount: netMoney.toNumber(),
            currency: booking.currency,
          }),
        },
      });

      businessMetrics.recordRefundProcessed(refund.id, netMoney.toNumber());

      return {
        success: true,
        refundId: settledRefund.id,
        refundNumber: settledRefund.refundNumber,
        grossAmount: Number(settledRefund.amount),
        penaltyAmount: Number(settledRefund.penaltyAmount),
        netRefundAmount: Number(settledRefund.netRefundAmount),
        grossMoney: new Money(settledRefund.amount, settledRefund.currency),
        penaltyMoney: new Money(settledRefund.penaltyAmount, settledRefund.currency),
        netRefundMoney: new Money(settledRefund.netRefundAmount, settledRefund.currency),
        currency: settledRefund.currency,
        status: 'SETTLED',
      };
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner, { maxWait: 15000, timeout: 20000 });
  }

  /**
   * Comprehensive end-to-end refund workflow (REF-101 to REF-107):
   * Orchestrates request -> approve -> execute in sequence for seamless execution.
   */
  static async processRefund(
    params: RequestRefundParams,
    tx?: Prisma.TransactionClient
  ): Promise<RefundResult> {
    const runner = async (client: Prisma.TransactionClient): Promise<RefundResult> => {
      // 1. Request phase (REF-101, REF-103)
      const reqRes = await this.requestRefund(params, client);
      if (!reqRes.success || !reqRes.refundId) {
        return reqRes;
      }

      // If already settled via idempotency replay
      if (reqRes.status === 'SETTLED') {
        return reqRes;
      }

      // 2. Approve phase (REF-102)
      await this.approveRefund(reqRes.refundId, params.approvedBy || 'SYSTEM', params.reason, client);

      // 3. Execution & Settlement phase (REF-105, REF-106)
      return this.executeRefundPayout(
        {
          refundId: reqRes.refundId,
          channel: params.channel || 'WALLET',
          recipientIban: params.recipientIban,
        },
        client
      );
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner, { maxWait: 15000, timeout: 20000 });
  }
}
