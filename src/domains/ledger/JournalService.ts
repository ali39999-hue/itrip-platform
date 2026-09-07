import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';

export class ImmutableJournalError extends Error {
  constructor(message: string = 'Posted journal entries cannot be updated or deleted. Use createReversalEntry to adjust.') {
    super(message);
    this.name = 'ImmutableJournalError';
  }
}

export class DuplicatePostingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicatePostingError';
  }
}

export interface JournalLineInput {
  chartAccountCode: string;
  chartAccountName: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  direction: 'DEBIT' | 'CREDIT';
  amount: Money | Prisma.Decimal;
  currency?: string;
  memo?: string;
}

export interface CreateJournalEntryParams {
  entryNumber: string;
  description: string;
  date?: Date;
  referenceType?: string;
  referenceId?: string;
  currency?: string;
  lines: JournalLineInput[];
}

export interface JournalBalanceVerification {
  journalEntryId: string;
  entryNumber: string;
  isBalanced: boolean;
  totalDebit: Money;
  totalCredit: Money;
  variance: Money;
}

/**
 * Journal Service (FIN-101, FIN-102, FIN-103, FIN-104)
 * Canonical Book of Original Entry managing double-entry journal entries and lines.
 */
export class JournalService {
  /**
   * Helper to ensure ChartOfAccounts exists
   */
  private static async getOrCreateChartAccount(
    code: string,
    name: string,
    category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
    currency: string,
    client: Prisma.TransactionClient
  ) {
    return client.chartOfAccounts.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name,
        category,
        currency,
        isActive: true,
      },
    });
  }

  /**
   * Creates an immutable canonical Journal Entry with lines (FIN-101, FIN-102)
   */
  static async createJournalEntry(
    params: CreateJournalEntryParams,
    tx?: Prisma.TransactionClient
  ) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = (params.currency || 'IRR').toUpperCase();

      // FIN-102: Source / posting uniqueness guard
      if (params.referenceType && params.referenceId) {
        const existingRef = await client.journalEntry.findFirst({
          where: {
            referenceType: params.referenceType,
            referenceId: params.referenceId,
          },
        });
        if (existingRef) {
          // Idempotent return of existing entry to prevent double posting
          return client.journalEntry.findUniqueOrThrow({
            where: { id: existingRef.id },
            include: { lines: true, account: true },
          });
        }
      }

      // Check entryNumber uniqueness
      const existingEntry = await client.journalEntry.findUnique({
        where: { entryNumber: params.entryNumber },
      });
      if (existingEntry) {
        return client.journalEntry.findUniqueOrThrow({
          where: { id: existingEntry.id },
          include: { lines: true, account: true },
        });
      }

      // Verify Debit = Credit Invariant
      let totalDebit = Money.zero(currency);
      let totalCredit = Money.zero(currency);

      for (const line of params.lines) {
        const lineMoney = line.amount instanceof Money
          ? line.amount
          : new Money(line.amount.toString(), line.currency || currency);

        if (line.direction === 'DEBIT') {
          totalDebit = totalDebit.add(lineMoney);
        } else {
          totalCredit = totalCredit.add(lineMoney);
        }
      }

      if (!totalDebit.equals(totalCredit)) {
        throw new Error(
          `Accounting Invariant Violation: SUM(DEBIT) [${totalDebit.toString()}] !== SUM(CREDIT) [${totalCredit.toString()}] for journal entry ${params.entryNumber}`
        );
      }

      // Resolve Chart of Accounts for each line
      const chartAccounts = new Map<string, { id: string }>();
      for (const line of params.lines) {
        if (!chartAccounts.has(line.chartAccountCode)) {
          const chartAcc = await this.getOrCreateChartAccount(
            line.chartAccountCode,
            line.chartAccountName,
            line.category,
            line.currency || currency,
            client
          );
          chartAccounts.set(line.chartAccountCode, chartAcc);
        }
      }

      const firstLine = params.lines[0];
      const headerChartAccount = chartAccounts.get(firstLine.chartAccountCode)!;

      return client.journalEntry.create({
        data: {
          entryNumber: params.entryNumber,
          chartOfAccountId: headerChartAccount.id,
          date: params.date || new Date(),
          description: params.description,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          lines: {
            create: params.lines.map((line) => {
              const chartAcc = chartAccounts.get(line.chartAccountCode)!;
              const decAmount = line.amount instanceof Money
                ? line.amount.toDecimal()
                : line.amount;
              const isDebit = line.direction === 'DEBIT';
              return {
                chartOfAccountId: chartAcc.id,
                direction: line.direction,
                debit: isDebit ? decAmount : new Prisma.Decimal(0),
                credit: isDebit ? new Prisma.Decimal(0) : decAmount,
                amount: decAmount,
                currency: line.currency || currency,
                memo: line.memo || params.description,
              };
            }),
          },
        },
        include: { lines: true, account: true },
      });
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * FIN-103: Enforces immutable posted journals.
   * Attempting to update a posted journal entry strictly fails closed.
   */
  static async updateJournalEntry(): Promise<never> {
    throw new ImmutableJournalError('Posted journal entries cannot be updated. Use createReversalEntry to adjust.');
  }

  /**
   * FIN-103: Enforces immutable posted journals.
   * Attempting to delete a posted journal entry strictly fails closed.
   */
  static async deleteJournalEntry(): Promise<never> {
    throw new ImmutableJournalError('Posted journal entries cannot be deleted. Use createReversalEntry to adjust.');
  }

  /**
   * FIN-104: Create corrective reversal entry
   * Creates an exact inverted duplicate of a posted journal entry, balancing debits/credits to zero.
   */
  static async createReversalEntry(
    journalEntryId: string,
    reason: string,
    tx?: Prisma.TransactionClient
  ) {
    const runner = async (client: Prisma.TransactionClient) => {
      const original = await client.journalEntry.findUnique({
        where: { id: journalEntryId },
        include: { lines: { include: { account: true } } },
      });

      if (!original) {
        throw new Error(`JournalEntry ${journalEntryId} not found`);
      }

      const reversalNumber = `JE-REV-${original.entryNumber}`;

      // Invert each line: DEBIT -> CREDIT, CREDIT -> DEBIT
      const reversedLines: JournalLineInput[] = original.lines.map((line) => {
        const invertedDirection: 'DEBIT' | 'CREDIT' = line.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT';
        return {
          chartAccountCode: line.account.code,
          chartAccountName: line.account.name,
          category: line.account.category as JournalLineInput['category'],
          direction: invertedDirection,
          amount: new Prisma.Decimal(line.amount.toString()),
          currency: line.currency,
          memo: `Reversal of line ${line.id}: ${reason}`,
        };
      });

      return this.createJournalEntry(
        {
          entryNumber: reversalNumber,
          description: `Reversal of ${original.entryNumber}: ${reason}`,
          referenceType: 'REVERSAL',
          referenceId: original.id,
          lines: reversedLines,
        },
        client
      );
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * Verifies that a posted journal entry satisfies the Debit = Credit invariant
   */
  static async verifyJournalBalance(journalEntryId: string): Promise<JournalBalanceVerification> {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: true },
    });

    if (!entry) {
      throw new Error(`JournalEntry ${journalEntryId} not found`);
    }

    const currency = entry.lines[0]?.currency || 'IRR';
    let totalDebit = Money.zero(currency);
    let totalCredit = Money.zero(currency);

    for (const line of entry.lines) {
      const money = new Money(line.amount.toString(), line.currency);
      if (line.direction === 'DEBIT') {
        totalDebit = totalDebit.add(money);
      } else {
        totalCredit = totalCredit.add(money);
      }
    }

    const variance = totalDebit.sub(totalCredit);

    return {
      journalEntryId: entry.id,
      entryNumber: entry.entryNumber,
      isBalanced: variance.isZero(),
      totalDebit,
      totalCredit,
      variance,
    };
  }
}
