/**
 * NOTE: settlement execution lives ONLY in `settleLeaderRewardAction`
 * (src/actions/admin.ts) — idempotent, audited, tiered per REFERRAL_CONFIG.
 * A previous `settleLeaderCommission` DB writer was removed: it had zero
 * callers, used a divergent tier matrix, posted no real ledger rows, and had
 * no idempotency guard. This module keeps pure reward math only.
 */

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

}
