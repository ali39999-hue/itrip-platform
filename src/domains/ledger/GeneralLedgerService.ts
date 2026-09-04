import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface WalletPostingParams {
  groupId: string;
  userId: string;
  amount: number;
  currency?: string;
  referenceId?: string;
}

export interface GatewayPostingParams {
  groupId: string;
  amount: number;
  currency?: string;
  referenceId?: string;
}

export interface RevenueRealizationParams {
  groupId: string;
  amount: number;
  netCost: number;
  taxAmount?: number;
  feeAmount?: number;
  supplierId: string;
  currency?: string;
  referenceId?: string;
}

export interface FXSpreadPostingParams {
  groupId: string;
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  spreadAmount: number;
  referenceId?: string;
}

export interface RefundPostingParams {
  groupId: string;
  userId: string;
  amount: number;
  currency?: string;
  referenceId?: string;
}

/** Sentinel ownerId for platform-owned accounts so the unique constraint covers them. */
const PLATFORM = '#platform';

export class GeneralLedgerService {
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
    // Race-safe upsert against @@unique([ownerType, ownerId, currency]).
    const account = await client.account.upsert({
      where,
      update: {},
      create: { ownerType, ownerId: resolvedOwnerId, currency },
    });
    return account;
  }

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
    return (Number(credits._sum.amount) || 0) - (Number(debits._sum.amount) || 0);
  }

  /**
   * Template 0: Wallet Top-Up (CREDIT Customer from Gateway/Settlement)
   * Records money entering the platform wallet (PSP or demo seed).
   */
  static async postTopUp(params: WalletPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const currency = params.currency || 'IRR';

      const customerAcc = await this.getOrCreateAccount('USER', params.userId, currency, client);
      const gatewayAcc = await this.getOrCreateAccount('GATEWAY_SETTLEMENT', null, currency, client);

      // DEBIT Gateway settlement (PSP owes the platform this inflow)
      await client.ledgerEntry.create({
        data: {
          groupId: params.groupId,
          accountId: gatewayAcc.id,
          direction: 'DEBIT',
          amount: params.amount,
          currency,
          referenceType: 'TOPUP',
          referenceId: params.referenceId,
        },
      });

      // CREDIT Customer wallet
      await client.ledgerEntry.create({
        data: {
          groupId: params.groupId,
          accountId: customerAcc.id,
          direction: 'CREDIT',
          amount: params.amount,
          currency,
          referenceType: 'TOPUP',
          referenceId: params.referenceId,
        },
      });
    };

    if (tx) {
      await runner(tx);
    } else {
      await prisma.$transaction(runner);
    }
  }

  /**
   * Template 1: Wallet Payment (DEBIT Customer -> CREDIT Escrow)
   */
  static async postWalletPayment(params: WalletPostingParams, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const currency = params.currency || 'IRR';

    const customerAcc = await this.getOrCreateAccount('USER', params.userId, currency, client as Prisma.TransactionClient);
    const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client as Prisma.TransactionClient);

    // Check Wallet Balance Before DEBIT
    const currentBalance = await this.getAccountBalance(customerAcc.id, currency, client);

    if (currentBalance < params.amount) {
      throw new Error('Insufficient wallet balance');
    }

    // DEBIT Customer
    await client.ledgerEntry.create({
      data: {
        groupId: params.groupId,
        accountId: customerAcc.id,
        direction: 'DEBIT',
        amount: params.amount,
        currency,
        referenceType: 'BOOKING',
        referenceId: params.referenceId,
      },
    });

    // CREDIT Escrow
    await client.ledgerEntry.create({
      data: {
        groupId: params.groupId,
        accountId: escrowAcc.id,
        direction: 'CREDIT',
        amount: params.amount,
        currency,
        referenceType: 'BOOKING',
        referenceId: params.referenceId,
      },
    });
  }

  /**
   * Template 2: Gateway Payment (DEBIT Gateway -> CREDIT Escrow)
   * NOTE: the gateway settlement account is not funded by a real PSP yet —
   * reconciliation against the actual PSP statement is required before
   * these entries represent real money.
   */
  static async postGatewayPayment(params: GatewayPostingParams, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const currency = params.currency || 'IRR';

    const gatewayAcc = await this.getOrCreateAccount('GATEWAY_SETTLEMENT', null, currency, client as Prisma.TransactionClient);
    const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client as Prisma.TransactionClient);

    await client.ledgerEntry.create({
      data: {
        groupId: params.groupId,
        accountId: gatewayAcc.id,
        direction: 'DEBIT',
        amount: params.amount,
        currency,
        referenceType: 'BOOKING',
        referenceId: params.referenceId,
      },
    });

    await client.ledgerEntry.create({
      data: {
        groupId: params.groupId,
        accountId: escrowAcc.id,
        direction: 'CREDIT',
        amount: params.amount,
        currency,
        referenceType: 'BOOKING',
        referenceId: params.referenceId,
      },
    });
  }

  /**
   * Template 3: Revenue Realization, Supplier Liability, Tax Liability & Platform Fees
   */
  static async postRevenueRealization(params: RevenueRealizationParams, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const currency = params.currency || 'IRR';
    const fee = params.feeAmount || 0;
    const tax = params.taxAmount || 0;

    const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client as Prisma.TransactionClient);
    const revenueAcc = await this.getOrCreateAccount('PLATFORM_REVENUE', null, currency, client as Prisma.TransactionClient);
    const supplierPayableAcc = await this.getOrCreateAccount('SUPPLIER_PAYABLE', params.supplierId, currency, client as Prisma.TransactionClient);
    const feeAcc = await this.getOrCreateAccount('PLATFORM_FEE', null, currency, client as Prisma.TransactionClient);
    const taxAcc = await this.getOrCreateAccount('TAX_PAYABLE', null, currency, client as Prisma.TransactionClient);

    // 1. Release from Escrow to Revenue (DEBIT Escrow, CREDIT Revenue)
    await client.ledgerEntry.create({
      data: {
        groupId: params.groupId,
        accountId: escrowAcc.id,
        direction: 'DEBIT',
        amount: params.amount,
        currency,
        referenceType: 'SETTLEMENT',
        referenceId: params.referenceId,
      },
    });

    await client.ledgerEntry.create({
      data: {
        groupId: params.groupId,
        accountId: revenueAcc.id,
        direction: 'CREDIT',
        amount: params.amount,
        currency,
        referenceType: 'SETTLEMENT',
        referenceId: params.referenceId,
      },
    });

    // 2. Accrue Supplier Liability (DEBIT Revenue expense, CREDIT Supplier Payable)
    if (params.netCost > 0) {
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_payable`,
          accountId: revenueAcc.id,
          direction: 'DEBIT',
          amount: params.netCost,
          currency,
          referenceType: 'SETTLEMENT',
          referenceId: params.referenceId,
        },
      });

      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_payable`,
          accountId: supplierPayableAcc.id,
          direction: 'CREDIT',
          amount: params.netCost,
          currency,
          referenceType: 'SETTLEMENT',
          referenceId: params.referenceId,
        },
      });
    }

    // 3. Tax liability: collected VAT must sit in its own account, not revenue.
    if (tax > 0) {
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_tax`,
          accountId: revenueAcc.id,
          direction: 'DEBIT',
          amount: tax,
          currency,
          referenceType: 'TAX',
          referenceId: params.referenceId,
        },
      });
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_tax`,
          accountId: taxAcc.id,
          direction: 'CREDIT',
          amount: tax,
          currency,
          referenceType: 'TAX',
          referenceId: params.referenceId,
        },
      });
    }

    // 4. Gateway/Platform Fee posting if applicable
    if (fee > 0) {
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_fee`,
          accountId: revenueAcc.id,
          direction: 'DEBIT',
          amount: fee,
          currency,
          referenceType: 'FEE',
          referenceId: params.referenceId,
        },
      });
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_fee`,
          accountId: feeAcc.id,
          direction: 'CREDIT',
          amount: fee,
          currency,
          referenceType: 'FEE',
          referenceId: params.referenceId,
        },
      });
    }
  }

  /**
   * Template 4: FX Conversion (balanced two-leg posting)
   * Leg 1: DEBIT user (fromCurrency) -> CREDIT FX_POOL (fromCurrency)
   * Leg 2: DEBIT FX_POOL (toCurrency, minus spread) -> CREDIT user (toCurrency)
   * Spread: CREDIT PLATFORM_REVENUE (toCurrency)
   */
  static async postFXConversion(params: FXSpreadPostingParams, tx?: Prisma.TransactionClient) {
    const runner = async (client: Prisma.TransactionClient) => {
      const userFromAcc = await this.getOrCreateAccount('USER', params.userId, params.fromCurrency, client);
      const userToAcc = await this.getOrCreateAccount('USER', params.userId, params.toCurrency, client);
      const fxPoolFromAcc = await this.getOrCreateAccount('FX_POOL', null, params.fromCurrency, client);
      const fxPoolToAcc = await this.getOrCreateAccount('FX_POOL', null, params.toCurrency, client);
      const revenueAcc = await this.getOrCreateAccount('PLATFORM_REVENUE', null, params.toCurrency, client);

      const netToAmount = params.toAmount - params.spreadAmount;
      if (netToAmount < 0) {
        throw new Error('Invalid FX conversion: spread exceeds converted amount');
      }

      // Leg 1: take the source currency from the user
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_fx_from`,
          accountId: userFromAcc.id,
          direction: 'DEBIT',
          amount: params.fromAmount,
          currency: params.fromCurrency,
          referenceType: 'FX_SPREAD',
          referenceId: params.referenceId,
        },
      });
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_fx_from`,
          accountId: fxPoolFromAcc.id,
          direction: 'CREDIT',
          amount: params.fromAmount,
          currency: params.fromCurrency,
          referenceType: 'FX_SPREAD',
          referenceId: params.referenceId,
        },
      });

      // Leg 2: deliver the target currency (spread retained as revenue)
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_fx_to`,
          accountId: fxPoolToAcc.id,
          direction: 'DEBIT',
          amount: netToAmount,
          currency: params.toCurrency,
          referenceType: 'FX_SPREAD',
          referenceId: params.referenceId,
        },
      });
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_fx_to`,
          accountId: userToAcc.id,
          direction: 'CREDIT',
          amount: netToAmount,
          currency: params.toCurrency,
          referenceType: 'FX_SPREAD',
          referenceId: params.referenceId,
        },
      });

      if (params.spreadAmount > 0) {
        await client.ledgerEntry.create({
          data: {
            groupId: `${params.groupId}_fx_to`,
            accountId: fxPoolToAcc.id,
            direction: 'DEBIT',
            amount: params.spreadAmount,
            currency: params.toCurrency,
            referenceType: 'FX_SPREAD',
            referenceId: params.referenceId,
          },
        });
        await client.ledgerEntry.create({
          data: {
            groupId: `${params.groupId}_fx_to`,
            accountId: revenueAcc.id,
            direction: 'CREDIT',
            amount: params.spreadAmount,
            currency: params.toCurrency,
            referenceType: 'FX_SPREAD',
            referenceId: params.referenceId,
          },
        });
      }
    };

    if (tx) {
      await runner(tx);
    } else {
      await prisma.$transaction(runner);
    }
  }

  /**
   * Template 5: Refund (DEBIT Escrow -> CREDIT Customer)
   */
  static async postRefund(params: RefundPostingParams, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const currency = params.currency || 'IRR';

    const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client as Prisma.TransactionClient);
    const customerAcc = await this.getOrCreateAccount('USER', params.userId, currency, client as Prisma.TransactionClient);

    // Escrow must never go negative: refunds are covered by collected funds.
    const escrowBalance = await this.getAccountBalance(escrowAcc.id, currency, client);
    if (escrowBalance < params.amount) {
      throw new Error('Insufficient escrow balance for refund');
    }

    await client.ledgerEntry.create({
      data: {
        groupId: params.groupId,
        accountId: escrowAcc.id,
        direction: 'DEBIT',
        amount: params.amount,
        currency,
        referenceType: 'REFUND',
        referenceId: params.referenceId,
      },
    });

    await client.ledgerEntry.create({
      data: {
        groupId: params.groupId,
        accountId: customerAcc.id,
        direction: 'CREDIT',
        amount: params.amount,
        currency,
        referenceType: 'REFUND',
        referenceId: params.referenceId,
      },
    });
  }

  /**
   * Verify Balanced Invariant (FIN-004): Asserts SUM(DEBIT) === SUM(CREDIT) for any groupId
   */
  static async assertBalancedPostingGroup(groupId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = tx || prisma;
    const entries = await client.ledgerEntry.findMany({
      where: { groupId },
      select: { direction: true, amount: true, currency: true },
    });

    if (entries.length === 0) return true;

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const e of entries) {
      if (e.direction === 'DEBIT') {
        totalDebit = totalDebit.add(e.amount);
      } else if (e.direction === 'CREDIT') {
        totalCredit = totalCredit.add(e.amount);
      }
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new Error(
        `Ledger integrity error: Unbalanced posting group ${groupId}. Debit (${totalDebit.toString()}) != Credit (${totalCredit.toString()})`
      );
    }

    return true;
  }
}
