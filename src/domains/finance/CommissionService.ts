import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';

export interface CalculateCommissionParams {
  targetType: 'AGENCY' | 'AGENT' | 'AFFILIATE' | 'PARTNER';
  targetId?: string;
  productType: 'FLIGHT' | 'HOTEL' | 'TOUR' | 'ALL';
  bookingAmount: number | Prisma.Decimal;
  currency?: string;
}

export class CommissionService {
  /**
   * Evaluates active commercial rules to calculate tier-based partner commission (COMM-001)
   */
  static async calculateCommission(params: CalculateCommissionParams): Promise<{
    ruleId?: string;
    commissionAmount: Money;
    appliedRate: number;
    fixedFee: number;
  }> {
    const currency = params.currency || 'IRR';
    const amount = new Money(params.bookingAmount.toString(), currency);
    const decimals = currency === 'IRR' ? 0 : 2;

    // Look up active commission rules for this target and product
    const rule = await prisma.commissionRule.findFirst({
      where: {
        targetType: params.targetType,
        targetId: params.targetId || null,
        productType: { in: [params.productType, 'ALL'] },
        isActive: true,
      },
      orderBy: { ratePercentage: 'desc' },
    });

    if (!rule) {
      // Default baseline commission: 3% for agencies, 1% for affiliates
      const defaultRate = params.targetType === 'AGENCY' ? 0.03 : 0.01;
      const commissionAmount = amount.mul(defaultRate).round(decimals);
      return {
        commissionAmount,
        appliedRate: defaultRate,
        fixedFee: 0,
      };
    }

    const rawRate = Number(rule.ratePercentage);
    const rate = rawRate > 1 ? rawRate / 100 : rawRate;
    const fixed = Number(rule.fixedFee);
    const variablePart = amount.mul(rate).round(decimals);
    const totalCommission = variablePart.add(new Money(fixed.toString(), currency));

    return {
      ruleId: rule.id,
      commissionAmount: totalCommission,
      appliedRate: rate,
      fixedFee: fixed,
    };
  }

  /**
   * Accrues partner commission for a confirmed booking (FIN-014).
   * Derives commercial terms from active rules or baseline tier contracts.
   */
  static async accrueCommission(params: {
    bookingId: string;
    targetType: 'AGENCY' | 'AGENT' | 'AFFILIATE' | 'PARTNER';
    targetId?: string;
    productType: 'FLIGHT' | 'HOTEL' | 'TOUR' | 'ALL';
    bookingAmount: number | Prisma.Decimal;
    currency?: string;
  }): Promise<{
    accrued: boolean;
    ruleId?: string;
    commissionAmount: Money;
    appliedRate: number;
    fixedFee: number;
  }> {
    const calc = await this.calculateCommission(params);
    return {
      accrued: true,
      ruleId: calc.ruleId,
      commissionAmount: calc.commissionAmount,
      appliedRate: calc.appliedRate,
      fixedFee: calc.fixedFee,
    };
  }

  /**
   * Computes traceable commission adjustment on booking refund or cancellation (FIN-015).
   * Prorates the clawback proportional to the refund ratio with Money precision.
   */
  static adjustCommission(params: {
    originalCommission: Money;
    refundRatio: number; // 0 to 1
  }): {
    adjustedCommission: Money;
    clawbackAmount: Money;
  } {
    const decimals = params.originalCommission.currency === 'IRR' ? 0 : 2;
    const clawback = params.originalCommission.mul(params.refundRatio).round(decimals);
    const adjusted = params.originalCommission.sub(clawback);
    return {
      adjustedCommission: adjusted,
      clawbackAmount: clawback,
    };
  }

  /**
   * Posts commission clawback ledger entry directly to General Ledger (FIN-016).
   * Debits Partner Commission Payable (2040) -> Credits Partner Commission Expense (5010)
   */
  static async postCommissionClawback(params: {
    groupId: string;
    partnerId: string;
    clawbackAmount: Money;
    referenceId: string;
    memo?: string;
  }, tx?: Prisma.TransactionClient): Promise<void> {
    const { GeneralLedgerService } = await import('@/domains/ledger/GeneralLedgerService');
    const currency = params.clawbackAmount.currency;
    const amount = params.clawbackAmount.toDecimal();

    const runner = async (client: Prisma.TransactionClient) => {
      // Create or get the partner payable account
      const partnerAccount = await client.account.upsert({
        where: {
          ownerType_ownerId_currency: {
            ownerType: 'PARTNER_PAYABLE',
            ownerId: params.partnerId,
            currency,
          },
        },
        update: {},
        create: {
          ownerType: 'PARTNER_PAYABLE',
          ownerId: params.partnerId,
          currency,
        },
      });

      // Platform commission expense offset account
      const platformExpenseAccount = await client.account.upsert({
        where: {
          ownerType_ownerId_currency: {
            ownerType: 'COMMISSION_EXPENSE',
            ownerId: '#platform',
            currency,
          },
        },
        update: {},
        create: {
          ownerType: 'COMMISSION_EXPENSE',
          ownerId: '#platform',
          currency,
        },
      });

      // Post balanced reversal entry: DEBIT Partner Payable -> CREDIT Commission Expense
      await GeneralLedgerService.postBalancedEntry(
        {
          groupId: params.groupId,
          referenceType: 'COMMISSION_CLAWBACK',
          referenceId: params.referenceId,
          currency,
          memo: params.memo || `Commission clawback for ref ${params.referenceId}`,
          legs: [
            { account: partnerAccount, direction: 'DEBIT', amount },
            { account: platformExpenseAccount, direction: 'CREDIT', amount },
          ],
        },
        client
      );
    };

    if (tx) {
      await runner(tx);
    } else {
      await prisma.$transaction(runner);
    }
  }
}
