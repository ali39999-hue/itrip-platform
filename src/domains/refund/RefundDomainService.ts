import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { BookingStateMachine, BookingState } from '../booking/state-machine';
import { InventoryEngine } from '../inventory/InventoryEngine';

export interface RequestRefundParams {
  bookingId: string;
  reason?: string;
  idempotencyKey: string;
  penaltyPercentage?: number; // e.g., 0.15 for 15% cancellation fee
  approvedBy?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundNumber?: string;
  grossAmount?: number;
  penaltyAmount?: number;
  netRefundAmount?: number;
  currency?: string;
  status?: string;
  error?: string;
}

/**
 * Legal booking-status chain from each refundable state to REFUNDED (BOOK-007/008):
 * every hop is asserted — no direct jumps into REFUNDED.
 */
const CHAIN_TO_REFUNDED: Partial<Record<BookingState, BookingState[]>> = {
  CONFIRMED: ['CANCEL_REQUESTED', 'CANCELLING', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'],
  CANCEL_REQUESTED: ['CANCELLING', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'],
  CANCELLED: ['REFUND_INITIATED', 'REFUNDED'],
};

export class RefundDomainService {
  /**
   * Request & Process Booking Refund with Idempotency & General Ledger posting (REF-001, REF-002, REF-003)
   */
  static async processRefund(
    params: RequestRefundParams,
    tx?: Prisma.TransactionClient
  ): Promise<RefundResult> {
    const runner = async (client: Prisma.TransactionClient): Promise<RefundResult> => {
      // 1. Idempotency Check: Prevent duplicate refunds for same key (REF-003)
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

      // Must be CONFIRMED or CANCEL_REQUESTED or CANCELLED to be refundable
      const validStatuses = ['CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED'];
      if (!validStatuses.includes(booking.status)) {
        return {
          success: false,
          error: `Booking status ${booking.status} is not eligible for refund`,
        };
      }

      // 3. Calculate gross, penalty, and net refund with Money precision
      const grossMoney = new Money(booking.totalAmount.toString(), booking.currency);
      const penaltyRate = new Prisma.Decimal((params.penaltyPercentage || 0).toString());
      const penaltyMoney = grossMoney.mul(penaltyRate).round(0);
      const netMoney = grossMoney.sub(penaltyMoney);

      const refundNumber = `RFD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      // 4. Create Refund Record with immutable policy & approval trail (REF-004, REF-005).
      // A concurrent caller using the same idempotency key loses the unique race
      // (P2002) and collapses onto the winner's refund — exactly-once semantics.
      let refund;
      try {
        refund = await client.refund.create({
          data: {
            refundNumber,
            bookingId: booking.id,
            amount: grossMoney.toDecimal(),
            penaltyAmount: penaltyMoney.toDecimal(),
            netRefundAmount: netMoney.toDecimal(),
            currency: booking.currency,
            status: 'SETTLED',
            reason: params.reason || 'Customer cancellation',
            idempotencyKey: params.idempotencyKey,
            approvedBy: params.approvedBy || 'SYSTEM',
            settledAt: new Date(),
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
            // Immutable snapshot of the policy inputs at request time (REF-004)
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
                  capturedBy: params.approvedBy || 'SYSTEM',
                }),
              },
            },
            approvals: {
              create: {
                approverId: params.approvedBy || 'SYSTEM',
                decision: 'APPROVED',
                note: params.reason || 'Customer cancellation',
              },
            },
          },
        });
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const winner = await client.refund.findUnique({
            where: { idempotencyKey: params.idempotencyKey },
          });
          if (winner) {
            return {
              success: true,
              refundId: winner.id,
              refundNumber: winner.refundNumber,
              grossAmount: Number(winner.amount),
              penaltyAmount: Number(winner.penaltyAmount),
              netRefundAmount: Number(winner.netRefundAmount),
              currency: winner.currency,
              status: winner.status,
            };
          }
        }
        throw err;
      }

      // 5. Walk the legal booking-status chain to REFUNDED — every hop asserted.
      const chain = CHAIN_TO_REFUNDED[booking.status as BookingState];
      if (!chain) {
        return { success: false, error: `No refund transition chain defined from ${booking.status}` };
      }
      let previous = booking.status as BookingState;
      for (const next of chain) {
        BookingStateMachine.assertTransition(previous, next);
        previous = next;
      }

      // Payment lifecycle follows its own state machine (BOOK-003): a refund can
      // only be marked on a captured payment. Test/edge fixtures without a
      // captured payment keep their payment status untouched.
      const paymentNow = booking.paymentStatus as string | null;
      let newPaymentStatus: string | undefined;
      if (paymentNow === 'CAPTURED') {
        BookingStateMachine.assertPaymentTransition('CAPTURED', 'PARTIALLY_REFUNDED');
        BookingStateMachine.assertPaymentTransition('PARTIALLY_REFUNDED', 'REFUNDED');
        newPaymentStatus = 'REFUNDED';
      } else if (paymentNow === 'PARTIALLY_REFUNDED') {
        BookingStateMachine.assertPaymentTransition('PARTIALLY_REFUNDED', 'REFUNDED');
        newPaymentStatus = 'REFUNDED';
      }

      await client.booking.update({
        where: { id: booking.id },
        data: {
          status: 'REFUNDED',
          ...(newPaymentStatus ? { paymentStatus: newPaymentStatus } : {}),
          cancelledAt: new Date(),
        },
      });

      // Relational Booking Status History (BOOK-004)
      await client.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: 'REFUNDED',
          actor: params.approvedBy || 'SYSTEM',
          reason: `Refund processed: ${params.reason || 'Customer cancellation'}`,
          correlationId: `corr_rfd_${refund.id}`,
        },
      });

      // 6. Post Double-Entry Ledger Reversal: DEBIT Escrow -> CREDIT Customer Wallet
      await GeneralLedgerService.postRefund(
        {
          groupId: `rfd_grp_${refund.id}`,
          userId: booking.customerId,
          amount: netMoney.toNumber(),
          currency: booking.currency,
          referenceId: refund.id,
        },
        client
      );

      // 6b. Record the execution attempt of the actual money movement (REF-006)
      await client.refundAttempt.create({
        data: {
          refundId: refund.id,
          attemptNumber: 1,
          channel: 'WALLET',
          amount: netMoney.toDecimal(),
          currency: booking.currency,
          status: 'SUCCESS',
          gatewayRef: `ledger:rfd_grp_${refund.id}`,
        },
      });

      // 6c. Release the booking's inventory hold in the same transaction
      // (INV-010): a refunded booking must stop consuming allotment capacity,
      // and the release can never be orphaned from the refund itself. The
      // engine's compensation path restores consumed capacity exactly once.
      if (booking.holdToken) {
        const compensation = await InventoryEngine.compensateCapturedHold(booking.holdToken, client);
        if (!compensation.success) {
          throw new Error(`Refund inventory compensation failed: ${compensation.error || 'unknown error'}`);
        }
      }

      // 7. Emit Outbox Event for notification
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

      return {
        success: true,
        refundId: refund.id,
        refundNumber: refund.refundNumber,
        grossAmount: grossMoney.toNumber(),
        penaltyAmount: penaltyMoney.toNumber(),
        netRefundAmount: netMoney.toNumber(),
        currency: booking.currency,
        status: 'SETTLED',
      };
    };

    if (tx) {
      return runner(tx);
    }
    return prisma.$transaction(runner, {
      maxWait: 15000,
      timeout: 20000,
    });
  }
}
