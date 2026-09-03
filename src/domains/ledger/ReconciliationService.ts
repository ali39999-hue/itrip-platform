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
   */
  static async reconcileLedger(): Promise<ReconciliationReport> {
    const allEntries = await prisma.ledgerEntry.findMany({
      select: {
        id: true,
        groupId: true,
        direction: true,
        amount: true,
        currency: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const groupsMap = new Map<string, {
      totalDebit: number;
      totalCredit: number;
      currency: string;
      entriesCount: number;
    }>();

    let totalSystemDebit = 0;
    let totalSystemCredit = 0;
    const summaryByCurrency: Record<string, { totalDebit: number; totalCredit: number; diff: number }> = {};

    for (const entry of allEntries) {
      const amt = Number(entry.amount);
      const curr = entry.currency || 'IRR';

      if (!summaryByCurrency[curr]) {
        summaryByCurrency[curr] = { totalDebit: 0, totalCredit: 0, diff: 0 };
      }

      if (!groupsMap.has(entry.groupId)) {
        groupsMap.set(entry.groupId, {
          totalDebit: 0,
          totalCredit: 0,
          currency: curr,
          entriesCount: 0,
        });
      }

      const grp = groupsMap.get(entry.groupId)!;
      grp.entriesCount += 1;

      if (entry.direction === 'DEBIT') {
        grp.totalDebit += amt;
        totalSystemDebit += amt;
        summaryByCurrency[curr].totalDebit += amt;
      } else if (entry.direction === 'CREDIT') {
        grp.totalCredit += amt;
        totalSystemCredit += amt;
        summaryByCurrency[curr].totalCredit += amt;
      }
    }

    // Check mismatches per posting group
    const mismatches: ReconciliationGroupMismatch[] = [];
    for (const [groupId, stats] of groupsMap.entries()) {
      const diff = Math.abs(stats.totalDebit - stats.totalCredit);
      // Floating point tolerance threshold for multi-currency or decimal representations
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
