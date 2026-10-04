import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { OperationalExceptionService, ExceptionSeverity } from '../finance/three-way-reconciliation';

export interface ReconciliationGroupMismatch {
  groupId: string;
  totalDebit: number;
  totalCredit: number;
  diff: number;
  currency: string;
  entriesCount: number;
}

export interface ReconciliationReport {
  timestamp: string;
  totalGroupsChecked: number;
  unbalancedGroupsCount: number;
  totalSystemDebit: number;
  totalSystemCredit: number;
  isBalanced: boolean;
  mismatches: ReconciliationGroupMismatch[];
  summaryByCurrency: Record<string, { totalDebit: number; totalCredit: number; diff: number }>;
}

export class ReconciliationService {
  /**
   * Scans all ledger entries grouped by posting groupId and verifies the
   * fundamental accounting invariant: SUM(DEBIT) === SUM(CREDIT).
   *
   * Uses database-level aggregation (groupBy) to avoid loading all entries
   * into memory — safe for ledgers with hundreds of thousands of records.
   */
  static async reconcileLedger(): Promise<ReconciliationReport> {
    // Aggregate debit totals per group+currency at the database level
    const debitGroups = await prisma.ledgerEntry.groupBy({
      by: ['groupId', 'currency'],
      where: { direction: 'DEBIT' },
      _sum: { amount: true },
      _count: { id: true },
    });

    const creditGroups = await prisma.ledgerEntry.groupBy({
      by: ['groupId', 'currency'],
      where: { direction: 'CREDIT' },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Build a merged map of all groups using Prisma.Decimal for exact arithmetic (FIN-001)
    const groupsMap = new Map<string, {
      totalDebit: Prisma.Decimal;
      totalCredit: Prisma.Decimal;
      currency: string;
      entriesCount: number;
    }>();

    for (const row of debitGroups) {
      const key = `${row.groupId}::${row.currency}`;
      const amount = row._sum.amount ? new Prisma.Decimal(row._sum.amount.toString()) : new Prisma.Decimal(0);
      const existing = groupsMap.get(key);
      if (existing) {
        existing.totalDebit = existing.totalDebit.add(amount);
        existing.entriesCount += row._count.id;
      } else {
        groupsMap.set(key, {
          totalDebit: amount,
          totalCredit: new Prisma.Decimal(0),
          currency: row.currency || 'IRR',
          entriesCount: row._count.id,
        });
      }
    }

    for (const row of creditGroups) {
      const key = `${row.groupId}::${row.currency}`;
      const amount = row._sum.amount ? new Prisma.Decimal(row._sum.amount.toString()) : new Prisma.Decimal(0);
      const existing = groupsMap.get(key);
      if (existing) {
        existing.totalCredit = existing.totalCredit.add(amount);
        existing.entriesCount += row._count.id;
      } else {
        groupsMap.set(key, {
          totalDebit: new Prisma.Decimal(0),
          totalCredit: amount,
          currency: row.currency || 'IRR',
          entriesCount: row._count.id,
        });
      }
    }

    let totalSystemDebit = new Prisma.Decimal(0);
    let totalSystemCredit = new Prisma.Decimal(0);
    const summaryByCurrency: Record<string, { totalDebit: number; totalCredit: number; diff: number }> = {};
    const mismatches: ReconciliationGroupMismatch[] = [];

    for (const [key, stats] of groupsMap.entries()) {
      const groupId = key.split('::')[0];
      totalSystemDebit = totalSystemDebit.add(stats.totalDebit);
      totalSystemCredit = totalSystemCredit.add(stats.totalCredit);

      if (!summaryByCurrency[stats.currency]) {
        summaryByCurrency[stats.currency] = { totalDebit: 0, totalCredit: 0, diff: 0 };
      }
      summaryByCurrency[stats.currency].totalDebit += stats.totalDebit.toNumber();
      summaryByCurrency[stats.currency].totalCredit += stats.totalCredit.toNumber();

      const diff = stats.totalDebit.sub(stats.totalCredit).abs();
      if (!diff.isZero()) {
        mismatches.push({
          groupId,
          totalDebit: stats.totalDebit.toNumber(),
          totalCredit: stats.totalCredit.toNumber(),
          diff: diff.toNumber(),
          currency: stats.currency,
          entriesCount: stats.entriesCount,
        });
      }
    }

    for (const curr of Object.keys(summaryByCurrency)) {
      summaryByCurrency[curr].diff = Math.abs(summaryByCurrency[curr].totalDebit - summaryByCurrency[curr].totalCredit);
    }

    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      totalGroupsChecked: groupsMap.size,
      unbalancedGroupsCount: mismatches.length,
      totalSystemDebit: totalSystemDebit.toNumber(),
      totalSystemCredit: totalSystemCredit.toNumber(),
      isBalanced: mismatches.length === 0,
      mismatches,
      summaryByCurrency,
    };

    if (mismatches.length > 0) {
      console.warn(`[Reconciliation] Found ${mismatches.length} unbalanced posting groups!`, mismatches);
    }

    return report;
  }

  /**
   * Cross-Entity Reconciliation (RECON-001): Reconciles Booking ↔ Payment ↔ Invoice ↔ Ledger
   * Automatically files an OperationalException if a mismatch is detected (RECON-003).
   */
  static async reconcileBookingFinancials(bookingId: string): Promise<{
    matched: boolean;
    confidenceScore: number; // 0 - 100
    bookingAmount: number;
    paidAmount: number;
    invoicedAmount: number;
    status: 'MATCHED' | 'REVIEW' | 'MISMATCH';
    exceptionId?: string;
  }> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const bookingTotal = new Prisma.Decimal(booking.totalAmount.toString());

    // Aggregate successful payments for this booking
    const payments = await prisma.payment.aggregate({
      where: { bookingId, status: 'SUCCESS' },
      _sum: { amount: true },
    });
    const paidTotal = payments._sum.amount ? new Prisma.Decimal(payments._sum.amount.toString()) : new Prisma.Decimal(0);

    // Aggregate issued invoices for this booking
    const invoices = await prisma.invoice.aggregate({
      where: { bookingId, status: { in: ['ISSUED', 'PAID'] } },
      _sum: { totalAmount: true },
    });
    const invoicedTotal = invoices._sum.totalAmount ? new Prisma.Decimal(invoices._sum.totalAmount.toString()) : new Prisma.Decimal(0);

    const paymentDiff = bookingTotal.sub(paidTotal).abs();
    const invoiceDiff = bookingTotal.sub(invoicedTotal).abs();

    let confidenceScore = 100;
    if (!paymentDiff.isZero()) confidenceScore -= 50;
    if (!invoiceDiff.isZero() && !invoicedTotal.isZero()) confidenceScore -= 25;

    const isMatch = paymentDiff.isZero();
    const status = confidenceScore >= 95 ? 'MATCHED' : confidenceScore >= 80 ? 'REVIEW' : 'MISMATCH';

    let exceptionId: string | undefined;

    // If payment mismatch detected, automatically record into Exception Center (RECON-003).
    // ERP-009: repeated detections of the same mismatch dedupe onto the one open exception.
    if (!isMatch && (booking.status === 'CONFIRMED' || booking.status === 'PAYMENT_CONFIRMED')) {
      exceptionId = await OperationalExceptionService.raiseException({
        type: 'PAYMENT_MISMATCH',
        severity: ExceptionSeverity.HIGH,
        entityType: 'BOOKING',
        entityId: booking.id,
        title: `Payment discrepancy on booking ${booking.reference}`,
        description: `Expected booking total ${bookingTotal.toString()} ${booking.currency}, but recorded payments total ${paidTotal.toString()} ${booking.currency}. Difference: ${paymentDiff.toString()}`,
      });
    }

    return {
      matched: isMatch,
      confidenceScore,
      bookingAmount: bookingTotal.toNumber(),
      paidAmount: paidTotal.toNumber(),
      invoicedAmount: invoicedTotal.toNumber(),
      status,
      exceptionId,
    };
  }
}
