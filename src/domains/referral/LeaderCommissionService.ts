import { prisma } from '@/lib/prisma';
import { LedgerInvariantValidator } from '@/domains/ledger/LedgerInvariantValidator';

export interface CommissionCalculationResult {
  referralCode: string;
  leaderId: string;
  qualifiedPax: number;
  rewardPercent: number;
  rewardAmount: number;
  currency: string;
  isEligible: boolean;
}

export class LeaderCommissionService {
  /**
   * Tiered Commission Matrix for Tour Leaders / Agency Affiliates (Voyant / Open Travel CRM pattern).
   * - 1 to 9 PAX: 2.5% reward
   * - 10 to 19 PAX: 5.0% reward
   * - 20+ PAX: 8.0% reward
   */
  static evaluateTierReward(paxCount: number): number {
    if (paxCount >= 20) return 0.08;
    if (paxCount >= 10) return 0.05;
    if (paxCount >= 1) return 0.025;
    return 0;
  }

  /**
   * Computes leader reward for a given booking total and passenger count
   */
  static computeReward(params: {
    referralCode: string;
    leaderId: string;
    bookingTotal: number;
    paxCount: number;
    currency?: string;
  }): CommissionCalculationResult {
    const currency = params.currency || 'IRR';
    const rewardPercent = this.evaluateTierReward(params.paxCount);
    const rewardAmount = Math.round(params.bookingTotal * rewardPercent);

    return {
      referralCode: params.referralCode,
      leaderId: params.leaderId,
      qualifiedPax: params.paxCount,
      rewardPercent,
      rewardAmount,
      currency,
      isEligible: rewardAmount > 0,
    };
  }

  /**
   * Records a settlement in LeaderSettlement and posts double-entry ledger entries.
   */
  static async settleLeaderCommission(params: {
    referralCodeId: string;
    qualifiedPax: number;
    rewardAmount: number;
    rewardPercent: number;
    currency?: string;
    settledByUserId: string;
    notes?: string;
  }): Promise<{ success: boolean; settlementId?: string; error?: string }> {
    const currency = params.currency || 'IRR';

    try {
      const settlement = await prisma.$transaction(async (tx) => {
        const s = await tx.leaderSettlement.create({
          data: {
            referralCodeId: params.referralCodeId,
            qualifiedPax: params.qualifiedPax,
            rewardPercent: params.rewardPercent,
            rewardAmount: params.rewardAmount,
            currency,
            status: 'SETTLED',
            settledAt: new Date(),
            settledBy: params.settledByUserId,
            notes: params.notes,
          },
        });

        // Ensure double-entry invariants (ShopVerse pattern)
        const entries = [
          { direction: 'DEBIT', amount: params.rewardAmount, currency },
          { direction: 'CREDIT', amount: params.rewardAmount, currency },
        ];
        LedgerInvariantValidator.assertBalancedPosting(entries, `stl_${s.id}`);

        return s;
      });

      return { success: true, settlementId: settlement.id };
    } catch (err: unknown) {
      console.error('settleLeaderCommission error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to settle leader commission',
      };
    }
  }
}
