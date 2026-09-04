import { prisma } from '@/lib/prisma';

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

    // Build a merged map of all groups
    const groupsMap = new Map<string, {
      totalDebit: number;
      totalCredit: number;
      currency: string;
      entriesCount: number;
    }>();

    for (const row of debitGroups) {
      const key = `${row.groupId}::${row.currency}`;
      const existing = groupsMap.get(key);
      if (existing) {
        existing.totalDebit += Number(row._sum.amount || 0);
        existing.entriesCount += row._count.id;
      } else {
        groupsMap.set(key, {
          totalDebit: Number(row._sum.amount || 0),
          totalCredit: 0,
          currency: row.currency || 'IRR',
          entriesCount: row._count.id,
        });
      }
    }

    for (const row of creditGroups) {
      const key = `${row.groupId}::${row.currency}`;
      const existing = groupsMap.get(key);
      if (existing) {
        existing.totalCredit += Number(row._sum.amount || 0);
        existing.entriesCount += row._count.id;
      } else {
        groupsMap.set(key, {
          totalDebit: 0,
          totalCredit: Number(row._sum.amount || 0),
          currency: row.currency || 'IRR',
          entriesCount: row._count.id,
        });
      }
    }

    let totalSystemDebit = 0;
    let totalSystemCredit = 0;
    const summaryByCurrency: Record<string, { totalDebit: number; totalCredit: number; diff: number }> = {};
    const mismatches: ReconciliationGroupMismatch[] = [];

    for (const [key, stats] of groupsMap.entries()) {
      const groupId = key.split('::')[0];
      totalSystemDebit += stats.totalDebit;
      totalSystemCredit += stats.totalCredit;

      if (!summaryByCurrency[stats.currency]) {
        summaryByCurrency[stats.currency] = { totalDebit: 0, totalCredit: 0, diff: 0 };
      }
      summaryByCurrency[stats.currency].totalDebit += stats.totalDebit;
      summaryByCurrency[stats.currency].totalCredit += stats.totalCredit;

      const diff = Math.abs(stats.totalDebit - stats.totalCredit);
      if (diff > 0.001) {
        mismatches.push({
          groupId,
          totalDebit: stats.totalDebit,
          totalCredit: stats.totalCredit,
          diff,
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
      totalSystemDebit,
      totalSystemCredit,
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

    const bookingTotal = Number(booking.totalAmount);

    // Aggregate successful payments for this booking
    const payments = await prisma.payment.aggregate({
      where: { bookingId, status: 'SUCCESS' },
      _sum: { amount: true },
    });
    const paidTotal = Number(payments._sum.amount || 0);

    // Aggregate issued invoices for this booking
    const invoices = await prisma.invoice.aggregate({
      where: { bookingId, status: { in: ['ISSUED', 'PAID'] } },
      _sum: { totalAmount: true },
    });
    const invoicedTotal = Number(invoices._sum.totalAmount || 0);

    const paymentDiff = Math.abs(bookingTotal - paidTotal);
    const invoiceDiff = Math.abs(bookingTotal - invoicedTotal);

    let confidenceScore = 100;
    if (paymentDiff > 0.01) confidenceScore -= 50;
    if (invoiceDiff > 0.01 && invoicedTotal > 0) confidenceScore -= 25;

    const isMatch = paymentDiff <= 0.01;
    const status = confidenceScore >= 95 ? 'MATCHED' : confidenceScore >= 80 ? 'REVIEW' : 'MISMATCH';

    let exceptionId: string | undefined;

    // If payment mismatch detected, automatically record into Exception Center (RECON-003)
    if (!isMatch && (booking.status === 'CONFIRMED' || booking.status === 'PAYMENT_CONFIRMED')) {
      const exc = await prisma.operationalException.create({
        data: {
          type: 'PAYMENT_MISMATCH',
          severity: 'HIGH',
          entityType: 'BOOKING',
          entityId: booking.id,
          title: `Payment discrepancy on booking ${booking.reference}`,
          description: `Expected booking total ${bookingTotal} ${booking.currency}, but recorded payments total ${paidTotal} ${booking.currency}. Difference: ${paymentDiff}`,
          status: 'OPEN',
        },
      });
      exceptionId = exc.id;
    }

    return {
      matched: isMatch,
      confidenceScore,
      bookingAmount: bookingTotal,
      paidAmount: paidTotal,
      invoicedAmount: invoicedTotal,
      status,
      exceptionId,
    };
  }
}
