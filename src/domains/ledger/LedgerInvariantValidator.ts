import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class UnbalancedLedgerInvariantException extends Error {
  constructor(message: string, public readonly variance: string) {
    super(message);
    this.name = 'UnbalancedLedgerInvariantException';
  }
}

export interface LedgerHealthReport {
  isHealthy: boolean;
  currencyBalances: Record<
    string,
    {
      totalDebit: string;
      totalCredit: string;
      variance: string;
      isBalanced: boolean;
    }
  >;
  unbalancedGroupsCount: number;
}

export class LedgerInvariantValidator {
  /**
   * Validates zero-sum balancing for a specific journal entry or transaction group (ShopVerse pattern).
   * Ensures that total debit exactly equals total credit before committing.
   */
  static assertBalancedPosting(
    entries: Array<{ direction: 'DEBIT' | 'CREDIT' | string; amount: number | Prisma.Decimal; currency: string }>,
    groupId?: string
  ): void {
    if (!entries || entries.length === 0) {
      throw new UnbalancedLedgerInvariantException('Cannot validate empty ledger entries', '0');
    }

    const currencyMap = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();

    for (const entry of entries) {
      const curr = (entry.currency || 'IRR').toUpperCase();
      const amt = new Prisma.Decimal(entry.amount.toString());

      if (!currencyMap.has(curr)) {
        currencyMap.set(curr, { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) });
      }

      const rec = currencyMap.get(curr)!;
      if (entry.direction.toUpperCase() === 'DEBIT') {
        rec.debit = rec.debit.plus(amt);
      } else if (entry.direction.toUpperCase() === 'CREDIT') {
        rec.credit = rec.credit.plus(amt);
      } else {
        throw new UnbalancedLedgerInvariantException(
          `Invalid ledger direction "${entry.direction}" in group ${groupId || 'unknown'}`,
          '0'
        );
      }
    }

    for (const [curr, totals] of currencyMap.entries()) {
      const diff = totals.debit.minus(totals.credit).abs();
      if (!diff.isZero()) {
        throw new UnbalancedLedgerInvariantException(
          `Unbalanced ledger entry detected for ${curr} in group "${groupId || 'unnamed'}": Debit (${totals.debit}) != Credit (${totals.credit}), variance: ${diff}`,
          diff.toString()
        );
      }
    }
  }

  /**
   * System-wide global ledger health verification.
   * Scans all database LedgerEntries and verifies that sum of debits equals credits.
   */
  static async verifyGlobalLedgerHealth(
    client?: Prisma.TransactionClient
  ): Promise<LedgerHealthReport> {
    const db = client || prisma;

    // Group debits and credits by currency
    const summaryRows: Array<{
      currency: string;
      direction: string;
      sum_amount: string | number;
    }> = await db.$queryRaw`
      SELECT currency, direction, SUM(amount) as sum_amount
      FROM "LedgerEntry"
      GROUP BY currency, direction
    `;

    const report: LedgerHealthReport = {
      isHealthy: true,
      currencyBalances: {},
      unbalancedGroupsCount: 0,
    };

    const parsed: Record<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }> = {};

    for (const row of summaryRows) {
      const curr = row.currency;
      if (!parsed[curr]) {
        parsed[curr] = { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
      }
      const val = new Prisma.Decimal(row.sum_amount ? row.sum_amount.toString() : '0');
      if (row.direction === 'DEBIT') {
        parsed[curr].debit = val;
      } else {
        parsed[curr].credit = val;
      }
    }

    for (const [curr, totals] of Object.entries(parsed)) {
      const variance = totals.debit.minus(totals.credit).abs();
      const isBalanced = variance.isZero();
      if (!isBalanced) {
        report.isHealthy = false;
        report.unbalancedGroupsCount++;
      }

      report.currencyBalances[curr] = {
        totalDebit: totals.debit.toString(),
        totalCredit: totals.credit.toString(),
        variance: variance.toString(),
        isBalanced,
      };
    }

    return report;
  }
}
