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
      const commissionAmount = amount.mul(defaultRate).round(0);
      return {
        commissionAmount,
        appliedRate: defaultRate,
        fixedFee: 0,
      };
    }

    const rate = Number(rule.ratePercentage);
    const fixed = Number(rule.fixedFee);
    const variablePart = amount.mul(rate).round(0);
    const totalCommission = variablePart.add(fixed);

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
    const clawback = params.originalCommission.mul(params.refundRatio).round(0);
    const adjusted = params.originalCommission.sub(clawback);
    return {
      adjustedCommission: adjusted,
      clawbackAmount: clawback,
    };
  }
}
