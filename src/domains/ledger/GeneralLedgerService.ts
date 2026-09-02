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

export class GeneralLedgerService {
  private static async getOrCreateAccount(
    ownerType: string,
    ownerId: string | null,
    currency: string,
    client: Prisma.TransactionClient
  ) {
    let account = await client.account.findFirst({
      where: { ownerType, ownerId: ownerId ?? undefined, currency },
    });
    if (!account) {
      account = await client.account.create({
        data: { ownerType, ownerId, currency },
      });
    }
    return account;
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
    const creditsAgg = await client.ledgerEntry.aggregate({
      where: { accountId: customerAcc.id, direction: 'CREDIT' },
      _sum: { amount: true },
    });

    const debitsAgg = await client.ledgerEntry.aggregate({
      where: { accountId: customerAcc.id, direction: 'DEBIT' },
      _sum: { amount: true },
    });

    const currentBalance = (Number(creditsAgg._sum.amount) || 0) - (Number(debitsAgg._sum.amount) || 0);

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
   * Template 3: Revenue Realization, Supplier Liability, Tax & Platform Fees
   */
  static async postRevenueRealization(params: RevenueRealizationParams, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const currency = params.currency || 'IRR';
    const tax = params.taxAmount || 0;
    const fee = params.feeAmount || 0;

    const escrowAcc = await this.getOrCreateAccount('PLATFORM_ESCROW', null, currency, client as Prisma.TransactionClient);
    const revenueAcc = await this.getOrCreateAccount('PLATFORM_REVENUE', null, currency, client as Prisma.TransactionClient);
    const supplierPayableAcc = await this.getOrCreateAccount('SUPPLIER_PAYABLE', params.supplierId, currency, client as Prisma.TransactionClient);
    const feeAcc = await this.getOrCreateAccount('PLATFORM_FEE', null, currency, client as Prisma.TransactionClient);

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

    // 3. Tax & Gateway/Platform Fee posting if applicable
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
   * Template 4: FX Spread / Conversion Posting
   */
  static async postFXConversion(params: FXSpreadPostingParams, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const revenueAcc = await this.getOrCreateAccount('PLATFORM_REVENUE', null, params.fromCurrency, client as Prisma.TransactionClient);
    
    if (params.spreadAmount > 0) {
      await client.ledgerEntry.create({
        data: {
          groupId: `${params.groupId}_fx`,
          accountId: revenueAcc.id,
          direction: 'CREDIT',
          amount: params.spreadAmount,
          currency: params.fromCurrency,
          referenceType: 'FX_SPREAD',
          referenceId: params.referenceId,
        },
      });
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
}
