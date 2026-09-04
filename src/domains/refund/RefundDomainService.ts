import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { BookingStateMachine } from '../booking/state-machine';

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

      // 4. Create Refund Record
      const refund = await client.refund.create({
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
        },
      });

      // 5. Update Booking Status to REFUNDED
      const currentStatus = booking.status as import('../booking/state-machine').BookingState;
      if (BookingStateMachine.canTransition(currentStatus, 'CANCEL_REQUESTED')) {
        BookingStateMachine.assertTransition(currentStatus, 'CANCEL_REQUESTED');
      }

      await client.booking.update({
        where: { id: booking.id },
        data: {
          status: 'REFUNDED',
          cancelledAt: new Date(),
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
