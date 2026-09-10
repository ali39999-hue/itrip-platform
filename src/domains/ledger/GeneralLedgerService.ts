import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { JournalService, JournalLineInput } from './JournalService';

export class ImmutableLedgerError extends Error {
  constructor(message: string = 'Posted ledger entries are immutable and cannot be modified or deleted. Create a reversal entry instead.') {
    super(message);
    this.name = 'ImmutableLedgerError';
  }
}

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
  fromAmount: number | Prisma.Decimal | Money;
  toAmount: number | Prisma.Decimal | Money;
  spreadAmount: number | Prisma.Decimal | Money;
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

/**
 * Canonical mapping from operational ledger accounts (Account.ownerType) to
 * ChartOfAccounts codes. (FIN-002, FIN-005, FIN-101)
 */
const OWNER_TYPE_TO_CHART_ACCOUNT: Record<
  string,
  { code: string; name: string; category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' }
> = {
  USER: { code: '1020', name: 'Customer Wallet Liability', category: 'LIABILITY' },
  PLATFORM_ESCROW: { code: '2010', name: 'Platform Customer Escrow', category: 'LIABILITY' },
  PLATFORM_REVENUE: { code: '4010', name: 'Platform Service Revenue', category: 'REVENUE' },
  PLATFORM_FEE: { code: '4020', name: 'Fee Revenue', category: 'REVENUE' },
  GATEWAY_SETTLEMENT: { code: '1010', name: 'Operating Cash & Bank', category: 'ASSET' },
  SUPPLIER_PAYABLE: { code: '2020', name: 'Supplier Accounts Payable', category: 'LIABILITY' },
  TAX_PAYABLE: { code: '2030', name: 'Tax & VAT Payable', category: 'LIABILITY' },
  FX_POOL: { code: '1030', name: 'FX Liquidity Pool', category: 'ASSET' },
  PARTNER_PAYABLE: { code: '2040', name: 'Partner Commission Payable', category: 'LIABILITY' },
  COMMISSION_EXPENSE: { code: '5010', name: 'Partner Commission Expense', category: 'EXPENSE' },
};

function toDecimal(val: Money | Prisma.Decimal | number | string | undefined | null): Prisma.Decimal {
  if (val === undefined || val === null) return new Prisma.Decimal(0);
  if (typeof (val as Money).toDecimal === 'function') return (val as Money).toDecimal();
  if (val instanceof Prisma.Decimal) return val;
  return new Prisma.Decimal(val.toString());
}

function resolveCurrency(currency?: string | Money | Prisma.Decimal | number, amount?: Money | Prisma.Decimal | number | string): string {
  if (typeof currency === 'string' && currency.length > 0 && isNaN(Number(currency))) return currency.toUpperCase();
  if (currency && typeof (currency as Money).currency === 'string') {
    return (currency as Money).currency.toUpperCase();
  }
  if (typeof amount === 'string' && amount.length > 0 && isNaN(Number(amount))) return amount.toUpperCase();
  if (amount && typeof (amount as Money).currency === 'string') {
    return (amount as Money).currency.toUpperCase();
  }
  return 'IRR';
}

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
   * Calculate exact balance for an account returning a Money object (FIN-105)
   */
  static async getAccountBalance(
    accountId: string,
    currency: string,
    tx?: Prisma.TransactionClient
  ): Promise<Money> {
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

    const net = creditSum.sub(debitSum);
    return new Money(net, currency);
  }

  /**
   * Calculate exact balances for all user accounts returning Money objects (FIN-105)
   */
  static async getUserBalances(
    userId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Record<string, Money>> {
    const client = tx || prisma;
    const userAccounts = await client.account.findMany({
      where: { ownerType: 'USER', ownerId: userId },
      select: { id: true, currency: true },
    });

    const balances: Record<string, Money> = {
      IRR: Money.zero('IRR'),
      USDT: Money.zero('USDT'),
      AED: Money.zero('AED'),
    };
    if (userAccounts.length === 0) return balances;

    const accountIds = userAccounts.map((a) => a.id);
    const sums = await client.ledgerEntry.groupBy({
      by: ['accountId', 'direction'],
      where: { accountId: { in: accountIds } },
      _sum: { amount: true },
    });

    const accountCurrency = new Map(userAccounts.map((a) => [a.id, a.currency]));
    for (const row of sums) {
      const currency = accountCurrency.get(row.accountId);
      if (!currency) continue;
      const amount = row._sum.amount ? new Prisma.Decimal(row._sum.amount.toString()) : new Prisma.Decimal(0);
      const delta = row.direction === 'CREDIT' ? amount : amount.negated();
      const current = (balances[currency] ?? Money.zero(currency)).toDecimal();
      balances[currency] = new Money(current.add(delta), currency);
    }

    return balances;
  }

  /**
   * Backward-compatible alias for Money balance
   */
  static async getAccountBalanceMoney(
    accountId: string,
    currency: string,
    tx?: Prisma.TransactionClient
  ): Promise<Money> {
    return this.getAccountBalance(accountId, currency, tx);
  }

  /**
   * FIN-103: Immutable posted ledger entries guard
   */
  static async updateLedgerEntry(): Promise<never> {
    throw new ImmutableLedgerError();
  }

  /**
   * FIN-103: Immutable posted ledger entries guard
   */
  static async deleteLedgerEntry(): Promise<never> {
    throw new ImmutableLedgerError();
  }

  /**
   * Core posting kernel: Writes balanced double-entry pairs with strict Debit = Credit invariant (FIN-002, FIN-003, FIN-101, FIN-102)
   */
  private static async postBalancedEntry(
    params: {
      groupId: string;
      referenceType: string;
      referenceId?: string;
      currency: string;
      memo?: string;
      legs: Array<{
        account: { id: string; ownerType: string; ownerId: string | null };
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

    // 1b. FIN-102: Source/posting uniqueness guard
    // Prevent double posting for the same referenceType and referenceId
    if (params.referenceType && params.referenceId && params.referenceType !== 'REVERSAL') {
      const existingBySource = await client.ledgerEntry.findFirst({
        where: {
          referenceType: params.referenceType,
          referenceId: params.referenceId,
        },
      });
      if (existingBySource) {
        return; // Idempotent: already posted for this source reference
      }
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

    // 4. Mirror to Canonical Journal Service (FIN-101)
    const journalLines: JournalLineInput[] = params.legs.map((leg) => {
      const mapping = OWNER_TYPE_TO_CHART_ACCOUNT[leg.account.ownerType];
      if (!mapping) {
        throw new Error(
          `Accounting mapping error: no ChartOfAccounts mapping for Account.ownerType '${leg.account.ownerType}' (group ${params.groupId})`
        );
      }
      return {
        chartAccountCode: mapping.code,
        chartAccountName: mapping.name,
        category: mapping.category,
        direction: leg.direction,
        amount: leg.amount,
        currency: params.currency,
        memo: params.memo,
      };
    });

    await JournalService.createJournalEntry(
      {
        entryNumber: `JE-${params.groupId}`,
        description: params.memo || `Journal entry for ${params.referenceType}`,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        currency: params.currency,
        lines: journalLines,
      },
      client
    );
  }

  /**
   * FIN-104: Create reversal / corrective entry for a posting group
   */
  static async createReversalEntry(
    groupId: string,
    reason: string,
    tx?: Prisma.TransactionClient
  ) {
    const runner = async (client: Prisma.TransactionClient) => {
      const originalEntries = await client.ledgerEntry.findMany({
        where: { groupId },
        include: { account: true },
      });

      if (originalEntries.length === 0) {
        throw new Error(`Ledger posting group ${groupId} not found for reversal`);
      }

      const reversalGroupId = `REV-${groupId}`;
      const first = originalEntries[0];

      const reversedLegs = originalEntries.map((e) => ({
        account: e.account,
        direction: (e.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT') as 'DEBIT' | 'CREDIT',
        amount: new Prisma.Decimal(e.amount.toString()),
      }));

      await this.postBalancedEntry(
        {
          groupId: reversalGroupId,
          referenceType: 'REVERSAL',
          referenceId: originalEntries[0].id,
          currency: first.currency,
          memo: `Reversal of group ${groupId}: ${reason}`,
          legs: reversedLegs,
        },
        client
      );

      const originalJe = await client.journalEntry.findUnique({
        where: { entryNumber: `JE-${groupId}` },
      });
      if (originalJe) {
        await JournalService.createReversalEntry(originalJe.id, reason, client);
      }
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * Template 0: Wallet Top-Up (DEBIT Gateway -> CREDIT Customer Wallet)
   */
  static async postTopUp(params: WalletPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = resolveCurrency(params.amount, params.currency);
      const amount = toDecimal(params.amount);

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
   */
  static async postWalletPayment(params: WalletPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = resolveCurrency(params.amount, params.currency);
      const amount = toDecimal(params.amount);

      const customerAcc = await this.getOrCreateAccount('USER', params.userId, currency, client);
      const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client);

      // Row-lock the customer account row FOR UPDATE (WAL-001)
      await client.$queryRaw`
        SELECT id FROM Account
        WHERE id = ${customerAcc.id}
        FOR UPDATE
      `;

      // Check current balance under lock
      const currentBalance = await this.getAccountBalance(customerAcc.id, currency, client);

      if (currentBalance.amount.lessThan(amount)) {
        throw new Error('Insufficient wallet balance');
      }

      await this.postBalancedEntry({
        groupId: params.groupId,
        referenceType: 'BOOKING',
        referenceId: params.referenceId,
        currency,
        memo: params.memo || 'Wallet payment capture',
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
   * Template 2: Gateway Payment (DEBIT Gateway -> CREDIT Escrow) (FIN-106)
   */
  static async postGatewayPayment(params: GatewayPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = resolveCurrency(params.amount, params.currency);
      const amount = toDecimal(params.amount);

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
   * Template 3: Revenue Realization, Supplier Liability, Tax & Fees (FIN-107, FIN-108)
   */
  static async postRevenueRealization(params: RevenueRealizationParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = resolveCurrency(params.amount, params.currency);
      const totalAmount = toDecimal(params.amount);
      const netCost = toDecimal(params.netCost);
      const taxAmount = toDecimal(params.taxAmount);
      const feeAmount = toDecimal(params.feeAmount);

      const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client);
      const revenueAcc = await this.getOrCreateAccount('PLATFORM_REVENUE', null, currency, client);
      const supplierPayableAcc = await this.getOrCreateAccount('SUPPLIER_PAYABLE', params.supplierId, currency, client);
      const feeAcc = await this.getOrCreateAccount('PLATFORM_FEE', null, currency, client);
      const taxAcc = await this.getOrCreateAccount('TAX_PAYABLE', null, currency, client);

      // Leg 1: Escrow -> Revenue
      await this.postBalancedEntry({
        groupId: params.groupId,
        referenceType: 'REVENUE_REALIZATION',
        referenceId: params.referenceId,
        currency,
        memo: 'Revenue realization from escrow',
        legs: [
          { account: escrowAcc, direction: 'DEBIT', amount: totalAmount },
          { account: revenueAcc, direction: 'CREDIT', amount: totalAmount },
        ],
      }, client);

      // Leg 2: Accrue Supplier Liability (FIN-108)
      if (netCost.greaterThan(0)) {
        await this.postBalancedEntry({
          groupId: `${params.groupId}_payable`,
          referenceType: 'SUPPLIER_PAYABLE',
          referenceId: params.referenceId,
          currency,
          memo: 'Supplier liability accrual',
          legs: [
            { account: revenueAcc, direction: 'DEBIT', amount: netCost },
            { account: supplierPayableAcc, direction: 'CREDIT', amount: netCost },
          ],
        }, client);
      }

      // Leg 3: Tax Liability Accrual (FIN-107)
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

      // Leg 4: Platform Fee Accrual (FIN-107)
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
   * Wires booking confirmation to ledger deriving revenue, tax, and supplier liability from PriceSnapshot (FIN-107, FIN-108)
   */
  static async wireBookingConfirmationToLedger(
    bookingId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const runner = async (client: Prisma.TransactionClient) => {
      const booking = await client.booking.findUnique({
        where: { id: bookingId },
        include: {
          priceSnapshots: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          items: true,
        },
      });

      if (!booking) {
        throw new Error(`Booking ${bookingId} not found for ledger wiring`);
      }

      let sellPrice = new Prisma.Decimal(booking.totalAmount.toString());
      let netCost = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);
      let feeAmount = new Prisma.Decimal(0);

      const snapshot = booking.priceSnapshots[0];
      if (snapshot) {
        sellPrice = new Prisma.Decimal(snapshot.sellPrice.toString());
        netCost = new Prisma.Decimal(snapshot.baseAmount.toString());
        taxAmount = new Prisma.Decimal(snapshot.taxAmount.toString());
        const markup = new Prisma.Decimal(snapshot.markupAmount.toString());
        const fee = new Prisma.Decimal(snapshot.serviceFee.toString());
        feeAmount = markup.add(fee);
      } else if (booking.items.length > 0) {
        for (const item of booking.items) {
          netCost = netCost.add(new Prisma.Decimal(item.netCost.toString()));
          taxAmount = taxAmount.add(new Prisma.Decimal(item.taxAmount.toString()));
          feeAmount = feeAmount.add(new Prisma.Decimal(item.markup.toString()));
        }
      }

      const supplierId = booking.supplierId || 'default_supplier';

      await this.postRevenueRealization(
        {
          groupId: `rev_conf_${booking.id}`,
          amount: new Money(sellPrice, booking.currency),
          netCost: new Money(netCost, booking.currency),
          taxAmount: new Money(taxAmount, booking.currency),
          feeAmount: new Money(feeAmount, booking.currency),
          supplierId,
          currency: booking.currency,
          referenceId: booking.id,
        },
        client
      );
    };

    if (tx) return runner(tx);
    return prisma.$transaction(runner);
  }

  /**
   * Template 4: Refund Posting (DEBIT Escrow -> CREDIT Customer Wallet) (REF-106)
   */
  static async postRefund(params: RefundPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = resolveCurrency(params.amount, params.currency);
      const amount = toDecimal(params.amount);

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

      const fromAmount = toDecimal(params.fromAmount);
      const toAmount = toDecimal(params.toAmount);

      // Leg 1: Source Currency
      await this.postBalancedEntry({
        groupId: `${params.groupId}_fx_from`,
        referenceType: 'FX_CONVERSION',
        referenceId: params.referenceId ? `${params.referenceId}_from` : undefined,
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
        referenceId: params.referenceId ? `${params.referenceId}_to` : undefined,
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
