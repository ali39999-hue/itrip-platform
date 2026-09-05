import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';

export interface WalletPostingParams {
  groupId: string;
  userId: string;
  amount: number | Prisma.Decimal | Money;
  currency?: string;
  referenceId?: string;
  memo?: string;
}

export interface GatewayPostingParams {
  groupId: string;
  amount: number | Prisma.Decimal | Money;
  currency?: string;
  referenceId?: string;
  memo?: string;
}

export interface RevenueRealizationParams {
  groupId: string;
  amount: number | Prisma.Decimal | Money;
  netCost: number | Prisma.Decimal | Money;
  taxAmount?: number | Prisma.Decimal | Money;
  feeAmount?: number | Prisma.Decimal | Money;
  supplierId: string;
  currency?: string;
  referenceId?: string;
}

export interface FXSpreadPostingParams {
  groupId: string;
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number | Prisma.Decimal;
  toAmount: number | Prisma.Decimal;
  spreadAmount: number | Prisma.Decimal;
  referenceId?: string;
}

export interface RefundPostingParams {
  groupId: string;
  userId: string;
  amount: number | Prisma.Decimal | Money;
  currency?: string;
  referenceId?: string;
  memo?: string;
}

const PLATFORM = '#platform';

export class GeneralLedgerService {
  /**
   * Helper to ensure Account exists with unique constraint
   */
  private static async getOrCreateAccount(
    ownerType: string,
    ownerId: string | null,
    currency: string,
    client: Prisma.TransactionClient
  ) {
    const resolvedOwnerId = ownerId ?? PLATFORM;
    const where = {
      ownerType_ownerId_currency: { ownerType, ownerId: resolvedOwnerId, currency },
    } as const;
    return client.account.upsert({
      where,
      update: {},
      create: { ownerType, ownerId: resolvedOwnerId, currency },
    });
  }

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
   * Calculate exact balance for an account with Decimal precision (FIN-001)
   */
  static async getAccountBalance(
    accountId: string,
    currency: string,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx || prisma;
    const credits = await client.ledgerEntry.aggregate({
      where: { accountId, currency, direction: 'CREDIT' },
      _sum: { amount: true },
    });
    const debits = await client.ledgerEntry.aggregate({
      where: { accountId, currency, direction: 'DEBIT' },
      _sum: { amount: true },
    });

    const creditSum = credits._sum.amount ? new Prisma.Decimal(credits._sum.amount.toString()) : new Prisma.Decimal(0);
    const debitSum = debits._sum.amount ? new Prisma.Decimal(debits._sum.amount.toString()) : new Prisma.Decimal(0);

    return creditSum.sub(debitSum).toNumber();
  }

  /**
   * Calculate Money object balance
   */
  static async getAccountBalanceMoney(
    accountId: string,
    currency: string,
    tx?: Prisma.TransactionClient
  ): Promise<Money> {
    const bal = await this.getAccountBalance(accountId, currency, tx);
    return new Money(bal, currency);
  }

  /**
   * Core posting kernel: Writes balanced double-entry pairs with strict Debit = Credit invariant (FIN-002, FIN-003)
   */
  private static async postBalancedEntry(
    params: {
      groupId: string;
      referenceType: string;
      referenceId?: string;
      currency: string;
      memo?: string;
      legs: Array<{
        account: { id: string; code?: string; name?: string; category?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' };
        direction: 'DEBIT' | 'CREDIT';
        amount: Prisma.Decimal;
      }>;
    },
    client: Prisma.TransactionClient
  ) {
    // 1. Idempotency Guard (FIN-003): If this groupId already exists, return early
    const existing = await client.ledgerEntry.findFirst({
      where: { groupId: params.groupId },
    });
    if (existing) {
      return; // Idempotent: already posted
    }

    // 2. Invariant Check (FIN-002): SUM(DEBIT) must equal SUM(CREDIT)
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const leg of params.legs) {
      if (leg.direction === 'DEBIT') {
        totalDebit = totalDebit.add(leg.amount);
      } else {
        totalCredit = totalCredit.add(leg.amount);
      }
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new Error(
        `Accounting Invariant Violation: SUM(DEBIT) [${totalDebit.toString()}] !== SUM(CREDIT) [${totalCredit.toString()}] for group ${params.groupId}`
      );
    }

    // 3. Write LedgerEntry rows
    for (const leg of params.legs) {
      await client.ledgerEntry.create({
        data: {
          groupId: params.groupId,
          accountId: leg.account.id,
          direction: leg.direction,
          amount: leg.amount,
          currency: params.currency,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
        },
      });
    }

    // 4. Mirror to Chart of Accounts JournalEntry & JournalLine (FIN-001)
    const headerAccount = await this.getOrCreateChartAccount(
      '1010',
      'Operating Cash & Bank',
      'ASSET',
      params.currency,
      client
    );

    const entryNumber = `JE-${params.groupId}`;
    await client.journalEntry.upsert({
      where: { entryNumber },
      update: {},
      create: {
        entryNumber,
        chartOfAccountId: headerAccount.id,
        description: params.memo || `Journal entry for ${params.referenceType}`,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        lines: {
          create: params.legs.map((leg) => ({
            chartOfAccountId: headerAccount.id,
            direction: leg.direction,
            debit: leg.direction === 'DEBIT' ? leg.amount : new Prisma.Decimal(0),
            credit: leg.direction === 'CREDIT' ? leg.amount : new Prisma.Decimal(0),
            amount: leg.amount,
            currency: params.currency,
            memo: params.memo,
          })),
        },
      },
    });
  }

  /**
   * Template 0: Wallet Top-Up (DEBIT Gateway -> CREDIT Customer Wallet)
   */
  static async postTopUp(params: WalletPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = (params.currency || 'IRR').toUpperCase();
      const amount = params.amount instanceof Money
        ? params.amount.toDecimal()
        : params.amount instanceof Prisma.Decimal
          ? params.amount
          : new Prisma.Decimal(params.amount.toString());

      const customerAcc = await this.getOrCreateAccount('USER', params.userId, currency, client);
      const gatewayAcc = await this.getOrCreateAccount('GATEWAY_SETTLEMENT', null, currency, client);

      await this.postBalancedEntry({
        groupId: params.groupId,
        referenceType: 'TOPUP',
        referenceId: params.referenceId,
        currency,
        memo: params.memo || 'Wallet top-up',
        legs: [
          { account: gatewayAcc, direction: 'DEBIT', amount },
          { account: customerAcc, direction: 'CREDIT', amount },
        ],
      }, client);
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * Template 1: Wallet Payment with Row Locking (DEBIT Customer -> CREDIT Escrow) (WAL-001)
   * Prevents concurrent overdrafts via PostgreSQL row locking.
   */
  static async postWalletPayment(params: WalletPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = (params.currency || 'IRR').toUpperCase();
      const amount = params.amount instanceof Money
        ? params.amount.toDecimal()
        : params.amount instanceof Prisma.Decimal
          ? params.amount
          : new Prisma.Decimal(params.amount.toString());

      const customerAcc = await this.getOrCreateAccount('USER', params.userId, currency, client);
      const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client);

      // Row-lock the customer account row FOR UPDATE (WAL-001)
      await client.$queryRaw`
        SELECT "id" FROM "Account"
        WHERE "id" = ${customerAcc.id}
        FOR UPDATE
      `;

      // Check current balance under lock
      const currentBalance = await this.getAccountBalance(customerAcc.id, currency, client);

      if (new Prisma.Decimal(currentBalance.toString()).lessThan(amount)) {
        throw new Error('Insufficient wallet balance');
      }

      await this.postBalancedEntry({
        groupId: params.groupId,
        referenceType: 'BOOKING',
        referenceId: params.referenceId,
        currency,
        memo: params.memo || 'Wallet booking payment',
        legs: [
          { account: customerAcc, direction: 'DEBIT', amount },
          { account: escrowAcc, direction: 'CREDIT', amount },
        ],
      }, client);
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }

  /**
   * Template 2: Gateway Payment (DEBIT Gateway -> CREDIT Escrow)
   */
  static async postGatewayPayment(params: GatewayPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = (params.currency || 'IRR').toUpperCase();
      const amount = params.amount instanceof Money
        ? params.amount.toDecimal()
        : params.amount instanceof Prisma.Decimal
          ? params.amount
          : new Prisma.Decimal(params.amount.toString());

      const gatewayAcc = await this.getOrCreateAccount('GATEWAY_SETTLEMENT', null, currency, client);
      const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client);

      await this.postBalancedEntry({
        groupId: params.groupId,
        referenceType: 'BOOKING',
        referenceId: params.referenceId,
        currency,
        memo: params.memo || 'Gateway payment capture',
        legs: [
          { account: gatewayAcc, direction: 'DEBIT', amount },
          { account: escrowAcc, direction: 'CREDIT', amount },
        ],
      }, client);
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * Template 3: Revenue Realization, Supplier Liability, Tax & Fees
   */
  static async postRevenueRealization(params: RevenueRealizationParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = (params.currency || 'IRR').toUpperCase();
      const toDec = (val?: number | Prisma.Decimal | Money) =>
        val instanceof Money ? val.toDecimal() : val instanceof Prisma.Decimal ? val : new Prisma.Decimal((val || 0).toString());

      const totalAmount = toDec(params.amount);
      const netCost = toDec(params.netCost);
      const taxAmount = toDec(params.taxAmount);
      const feeAmount = toDec(params.feeAmount);

      const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client);
      const revenueAcc = await this.getOrCreateAccount('PLATFORM_REVENUE', null, currency, client);
      const supplierPayableAcc = await this.getOrCreateAccount('SUPPLIER_PAYABLE', params.supplierId, currency, client);
      const feeAcc = await this.getOrCreateAccount('PLATFORM_FEE', null, currency, client);
      const taxAcc = await this.getOrCreateAccount('TAX_PAYABLE', null, currency, client);

      // Leg 1: Escrow -> Revenue
      await this.postBalancedEntry({
        groupId: params.groupId,
        referenceType: 'SETTLEMENT',
        referenceId: params.referenceId,
        currency,
        memo: 'Revenue realization from escrow',
        legs: [
          { account: escrowAcc, direction: 'DEBIT', amount: totalAmount },
          { account: revenueAcc, direction: 'CREDIT', amount: totalAmount },
        ],
      }, client);

      // Leg 2: Accrue Supplier Liability
      if (netCost.greaterThan(0)) {
        await this.postBalancedEntry({
          groupId: `${params.groupId}_payable`,
          referenceType: 'SETTLEMENT',
          referenceId: params.referenceId,
          currency,
          memo: 'Supplier liability accrual',
          legs: [
            { account: revenueAcc, direction: 'DEBIT', amount: netCost },
            { account: supplierPayableAcc, direction: 'CREDIT', amount: netCost },
          ],
        }, client);
      }

      // Leg 3: Tax Liability Accrual
      if (taxAmount.greaterThan(0)) {
        await this.postBalancedEntry({
          groupId: `${params.groupId}_tax`,
          referenceType: 'TAX',
          referenceId: params.referenceId,
          currency,
          memo: 'Tax liability accrual',
          legs: [
            { account: revenueAcc, direction: 'DEBIT', amount: taxAmount },
            { account: taxAcc, direction: 'CREDIT', amount: taxAmount },
          ],
        }, client);
      }

      // Leg 4: Platform Fee Accrual
      if (feeAmount.greaterThan(0)) {
        await this.postBalancedEntry({
          groupId: `${params.groupId}_fee`,
          referenceType: 'FEE',
          referenceId: params.referenceId,
          currency,
          memo: 'Platform fee allocation',
          legs: [
            { account: revenueAcc, direction: 'DEBIT', amount: feeAmount },
            { account: feeAcc, direction: 'CREDIT', amount: feeAmount },
          ],
        }, client);
      }
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * Template 4: Refund Posting (DEBIT Escrow -> CREDIT Customer Wallet)
   */
  static async postRefund(params: RefundPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = (params.currency || 'IRR').toUpperCase();
      const amount = params.amount instanceof Money
        ? params.amount.toDecimal()
        : params.amount instanceof Prisma.Decimal
          ? params.amount
          : new Prisma.Decimal(params.amount.toString());

      const customerAcc = await this.getOrCreateAccount('USER', params.userId, currency, client);
      const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client);

      await this.postBalancedEntry({
        groupId: params.groupId,
        referenceType: 'REFUND',
        referenceId: params.referenceId,
        currency,
        memo: params.memo || 'Booking refund credit',
        legs: [
          { account: escrowAcc, direction: 'DEBIT', amount },
          { account: customerAcc, direction: 'CREDIT', amount },
        ],
      }, client);
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * Template 5: FX Conversion
   */
  static async postFXConversion(params: FXSpreadPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const userFromAcc = await this.getOrCreateAccount('USER', params.userId, params.fromCurrency, client);
      const userToAcc = await this.getOrCreateAccount('USER', params.userId, params.toCurrency, client);
      const fxPoolFromAcc = await this.getOrCreateAccount('FX_POOL', null, params.fromCurrency, client);
      const fxPoolToAcc = await this.getOrCreateAccount('FX_POOL', null, params.toCurrency, client);

      const fromAmount = new Prisma.Decimal(params.fromAmount.toString());
      const toAmount = new Prisma.Decimal(params.toAmount.toString());

      // Leg 1: Source Currency
      await this.postBalancedEntry({
        groupId: `${params.groupId}_fx_from`,
        referenceType: 'FX_CONVERSION',
        referenceId: params.referenceId,
        currency: params.fromCurrency,
        legs: [
          { account: userFromAcc, direction: 'DEBIT', amount: fromAmount },
          { account: fxPoolFromAcc, direction: 'CREDIT', amount: fromAmount },
        ],
      }, client);

      // Leg 2: Target Currency
      await this.postBalancedEntry({
        groupId: `${params.groupId}_fx_to`,
        referenceType: 'FX_CONVERSION',
        referenceId: params.referenceId,
        currency: params.toCurrency,
        legs: [
          { account: fxPoolToAcc, direction: 'DEBIT', amount: toAmount },
          { account: userToAcc, direction: 'CREDIT', amount: toAmount },
        ],
      }, client);
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }
}
