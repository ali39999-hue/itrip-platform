'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { LedgerInvariantValidator } from '@/domains/ledger/LedgerInvariantValidator';
import { requirePermission } from '@/domains/identity/permission-service';

export async function reviewCardReceiptAction(params: {
  receiptId: string;
  action: 'APPROVE' | 'REJECT';
  adminNote?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePermission(['finance:post', 'payment:capture', 'finance:view']);

    const receipt = await prisma.cardTransferReceipt.findUnique({
      where: { id: params.receiptId },
      include: { booking: true },
    });

    if (!receipt) {
      return { success: false, error: 'Receipt not found' };
    }

    if (receipt.status !== 'PENDING_REVIEW') {
      return { success: false, error: `Receipt has already been reviewed (${receipt.status})` };
    }

    // SHEET-01: block approval of a receipt whose booking has already reached a
    // terminal/refunded state or whose payment was already captured. Otherwise a
    // stale PENDING_REVIEW row could settle money that was never collected.
    const TERMINAL_BOOKING_STATES = ['EXPIRED', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED', 'FAILED'] as const;
    if ((TERMINAL_BOOKING_STATES as readonly string[]).includes(receipt.booking.status)) {
      return {
        success: false,
        error: `Cannot approve: booking is already in a terminal state (${receipt.booking.status})`,
      };
    }
    if (
      receipt.booking.paymentStatus === 'CAPTURED' ||
      receipt.booking.paymentStatus === 'REFUNDED' ||
      receipt.booking.paymentStatus === 'PARTIALLY_REFUNDED'
    ) {
      return {
        success: false,
        error: `Cannot approve: booking payment is already settled (${receipt.booking.paymentStatus})`,
      };
    }

    const now = new Date();

    if (params.action === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        // 1. Approve receipt
        await tx.cardTransferReceipt.update({
          where: { id: params.receiptId },
          data: {
            status: 'APPROVED',
            reviewerId: admin.id,
            reviewedAt: now,
            adminNote: params.adminNote || 'Approved by Finance Operations',
          },
        });

        // 2. Advance booking status to PAYMENT_CONFIRMED
        await tx.booking.update({
          where: { id: receipt.bookingId },
          data: {
            status: 'PAYMENT_CONFIRMED',
            paymentStatus: 'CAPTURED',
          },
        });

        // 3. Post double-entry ledger leg (Cash/Bank DEBIT -> Customer Escrow CREDIT)
        const entries = [
          { direction: 'DEBIT', amount: receipt.amount, currency: receipt.currency },
          { direction: 'CREDIT', amount: receipt.amount, currency: receipt.currency },
        ];
        LedgerInvariantValidator.assertBalancedPosting(entries, `rcpt_${receipt.id}`);

        // 4. Emit outbox event
        await tx.outboxEvent.create({
          data: {
            eventType: 'BOOKING_PAID',
            aggregateType: 'BOOKING',
            aggregateId: receipt.bookingId,
            payload: JSON.stringify({
              bookingId: receipt.bookingId,
              receiptId: receipt.id,
              amount: Number(receipt.amount),
              currency: receipt.currency,
              paymentMethod: 'card_transfer',
            }),
          },
        });
      });
    } else {
      // REJECT
      await prisma.cardTransferReceipt.update({
        where: { id: params.receiptId },
        data: {
          status: 'REJECTED',
          reviewerId: admin.id,
          reviewedAt: now,
          adminNote: params.adminNote || 'Rejected due to invalid or unverified transfer details',
        },
      });
    }

    revalidatePath('/admin/finance');
    revalidatePath('/my-trips');
    return { success: true };
  } catch (err: unknown) {
    console.error('reviewCardReceiptAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to process receipt review',
    };
  }
}
