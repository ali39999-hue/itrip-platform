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
      const totalAmt = Number(booking.totalAmount);
      const firstItem = booking.items[0];
      const netCost = firstItem ? Number(firstItem.netCost) : Math.round(totalAmt * 0.88);
      const taxAmount = firstItem ? Number(firstItem.taxAmount || 0) : Math.round(totalAmt * 0.08);
      const feeAmount = firstItem ? Number(firstItem.feeAmount || 0) : 0;
      const supplierId = booking.supplierId || firstItem?.inventoryItemId || 'sup_default_firuzo';

      if (params.paymentMethod === 'wallet_irr') {
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

      // 5. Step 4: Post Realized Revenue, Supplier Liability & Fees
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
          stateHistory: JSON.stringify([
            { from: booking.status, to: 'PAYMENT_CONFIRMED', at: new Date() },
            { from: 'PAYMENT_CONFIRMED', to: 'CONFIRMED', at: new Date() },
          ]),
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
    });
  }
}
