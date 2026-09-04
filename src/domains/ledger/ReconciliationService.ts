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
}
