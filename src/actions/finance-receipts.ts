'use server';

import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { LedgerInvariantValidator } from '@/domains/ledger/LedgerInvariantValidator';

export async function reviewCardReceiptAction(params: {
  receiptId: string;
  action: 'APPROVE' | 'REJECT';
  adminNote?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const userRole = session.user.role || 'CUSTOMER';
    if (!['SUPER_ADMIN', 'FINANCE', 'OPS'].includes(userRole)) {
      return { success: false, error: 'Forbidden: Admin or Finance role required' };
    }

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

    const now = new Date();

    if (params.action === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        // 1. Approve receipt
        await tx.cardTransferReceipt.update({
          where: { id: params.receiptId },
          data: {
            status: 'APPROVED',
            reviewerId: session.user.id,
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
          reviewerId: session.user.id,
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
