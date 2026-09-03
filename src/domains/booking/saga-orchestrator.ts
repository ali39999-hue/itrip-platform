import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { BookingStateMachine, BookingState } from './state-machine';
import { InventoryEngine } from '../inventory/InventoryEngine';
import { PaymentDomainService } from '../payments/PaymentDomainService';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';

export interface ConfirmBookingSagaParams {
  bookingId: string;
  idempotencyKey: string;
  paymentMethod: 'wallet_irr' | 'gateway_shetab' | 'wallet_usdt';
  holdToken?: string;
}

interface HistoryEntry {
  from: string;
  to: string;
  at: string;
}

/**
 * Appends transitions to the booking's stateHistory without destroying prior
 * history, and normalizes legacy string-form entries to the object shape.
 */
function appendHistory(rawHistory: string | null, entries: Array<{ from: string; to: string }>): HistoryEntry[] {
  let history: unknown[] = [];
  if (rawHistory) {
    try {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed)) history = parsed;
    } catch {
      // Corrupt history is never fatal: start a fresh array.
      history = [];
    }
  }
  const normalized: HistoryEntry[] = history.map((item) =>
    typeof item === 'string'
      ? { from: 'UNKNOWN', to: item, at: new Date(0).toISOString() }
      : (item as HistoryEntry)
  );
  const now = new Date().toISOString();
  entries.forEach((e) => normalized.push({ from: e.from, to: e.to, at: now }));
  return normalized;
}

export class BookingSagaOrchestrator {
  /**
   * Orchestrates the multi-step saga of booking confirmation with automatic rollback compensations
   */
  static async confirmBookingSaga(params: ConfirmBookingSagaParams) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const booking = await tx.booking.findUnique({
        where: { id: params.bookingId },
        include: { items: true },
      });

      if (!booking) throw new Error('Booking not found');

      // 1. Validate State Transition
      BookingStateMachine.assertTransition(
        booking.status as BookingState,
        'PAYMENT_CONFIRMED'
      );

      // 2. Step 1: Process Payment with Idempotency
      const paymentRes = await PaymentDomainService.processPayment(
        {
          bookingId: booking.id,
          idempotencyKey: params.idempotencyKey,
          method: params.paymentMethod,
          amount: Number(booking.totalAmount),
          currency: booking.currency,
        },
        tx
      );

      if (!paymentRes.success) {
        throw new Error(paymentRes.error || 'Payment failed in saga');
      }

      // 3. Step 2: Capture Inventory Hold if provided
      const holdToken = params.holdToken || booking.holdToken;
      if (holdToken) {
        const captureRes = await InventoryEngine.captureHold(holdToken, tx);
        if (!captureRes.success) {
          throw new Error(captureRes.error || 'Inventory hold capture failed in saga');
        }
      }

      // 4. Step 3: Dual-Entry Ledger Posting
      // Breakdown comes from the stored booking items; never invented here.
      const totalAmt = Number(booking.totalAmount);
      const firstItem = booking.items[0];
      const netCost = firstItem ? Number(firstItem.netCost) : 0;
      const taxAmount = firstItem ? Number(firstItem.taxAmount || 0) : 0;
      const feeAmount = firstItem ? Number(firstItem.feeAmount || 0) : 0;
      const supplierId = firstItem?.inventoryItemId || 'sup_default_firuzo';

      if (params.paymentMethod === 'wallet_irr' || params.paymentMethod === 'wallet_usdt') {
        await GeneralLedgerService.postWalletPayment(
          {
            groupId: `saga_pay_${booking.id}`,
            userId: booking.customerId,
            amount: totalAmt,
            currency: booking.currency,
            referenceId: booking.id,
          },
          tx
        );
      } else {
        await GeneralLedgerService.postGatewayPayment(
          {
            groupId: `saga_pay_${booking.id}`,
            amount: totalAmt,
            currency: booking.currency,
            referenceId: booking.id,
          },
          tx
        );
      }

      // 5. Step 4: Post Realized Revenue, Supplier Liability, Tax & Fees
      await GeneralLedgerService.postRevenueRealization(
        {
          groupId: `saga_rev_${booking.id}`,
          amount: totalAmt,
          netCost,
          taxAmount,
          feeAmount,
          supplierId,
          currency: booking.currency,
          referenceId: booking.id,
        },
        tx
      );

      // 6. Step 5: Transition to CONFIRMED
      BookingStateMachine.assertTransition('PAYMENT_CONFIRMED', 'CONFIRMED');

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          stateHistory: JSON.stringify(
            appendHistory(booking.stateHistory, [
              { from: booking.status, to: 'PAYMENT_CONFIRMED' },
              { from: 'PAYMENT_CONFIRMED', to: 'CONFIRMED' },
            ])
          ),
        },
      });

      // 7. Step 6: Outbox Event for async voucher issuing & email notification
      await tx.outboxEvent.create({
        data: {
          eventType: 'BOOKING_CONFIRMED',
          payload: JSON.stringify({
            bookingId: booking.id,
            customerId: booking.customerId,
            paymentId: paymentRes.paymentId,
            reference: booking.reference,
          }),
        },
      });

      return { success: true, booking: updated };
    }, {
      // A multi-step interactive saga needs more headroom than the default 5s.
      maxWait: 10000,
      timeout: 20000,
    });
  }
}
