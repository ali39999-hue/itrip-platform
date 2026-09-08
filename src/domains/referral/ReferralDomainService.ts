import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { REFERRAL_CONFIG, ReferralTier } from '@/lib/referral/config';

export type ReferralStatus = 'VALID' | 'UNMATCHED' | 'SELF_REFERRAL' | 'INACTIVE';

export interface ValidationResult {
  valid: boolean;
  status: ReferralStatus;
  rawCode: string;
  normalizedCode: string;
  referralCodeId?: string;
  leaderId?: string;
  leaderName?: string;
  leaderPhone?: string;
  discountPercent: number;
  reason?: 'NOT_FOUND' | 'INACTIVE' | 'SELF_REFERRAL' | 'EMPTY';
}

export interface LeaderDashboardRow {
  id: string;
  code: string;
  leaderId: string;
  leaderName: string;
  leaderPhone: string;
  leaderEmail: string;
  isActive: boolean;
  confirmedPax: number;
  pendingPax: number;
  cancelledPax: number;
  currentTier: ReferralTier | null;
  rewardPercent: number; // 0, 0.25, 0.50, 1.00
  nextTierDistance: number; // Pax needed to reach next tier
  nextTierPercent: number; // Next tier percentage
  estimatedRewardAmount: number;
  currency: string;
  settlementStatus: 'NONE' | 'PENDING' | 'SETTLED';
  travelers: Array<{
    bookingReference: string;
    bookingStatus: string;
    travelerName: string;
    paxCount: number;
    bookingTotal: number;
    createdAt: string;
  }>;
}

export class ReferralDomainService {
  /**
   * Trims whitespace and normalizes code to uppercase (e.g. "kooh123 " -> "KOOH123").
   */
  static normalizeCode(rawCode?: string | null): string {
    if (!rawCode) return '';
    return rawCode.trim().toUpperCase();
  }

  /**
   * Validates a referral code against active leaders and checks self-referral rule.
   */
  static async validateCode(
    rawCode: string | null | undefined,
    customerId?: string | null,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<ValidationResult> {
    const normalizedCode = this.normalizeCode(rawCode);

    if (!normalizedCode) {
      return {
        valid: false,
        status: 'UNMATCHED',
        rawCode: rawCode || '',
        normalizedCode: '',
        discountPercent: 0,
        reason: 'EMPTY',
      };
    }

    const referral = await client.referralCode.findUnique({
      where: { code: normalizedCode },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!referral) {
      return {
        valid: false,
        status: 'UNMATCHED',
        rawCode: rawCode || '',
        normalizedCode,
        discountPercent: 0,
        reason: 'NOT_FOUND',
      };
    }

    if (!referral.isActive) {
      return {
        valid: false,
        status: 'INACTIVE',
        rawCode: rawCode || '',
        normalizedCode,
        referralCodeId: referral.id,
        leaderId: referral.leaderId,
        leaderName: referral.leader.name || undefined,
        discountPercent: 0,
        reason: 'INACTIVE',
      };
    }

    // Self-referral rule: Group leader cannot claim 5% discount on their own trip
    // and cannot count themselves towards their own quota.
    if (customerId && referral.leaderId === customerId) {
      return {
        valid: false,
        status: 'SELF_REFERRAL',
        rawCode: rawCode || '',
        normalizedCode,
        referralCodeId: referral.id,
        leaderId: referral.leaderId,
        leaderName: referral.leader.name || undefined,
        discountPercent: 0,
        reason: 'SELF_REFERRAL',
      };
    }

    return {
      valid: true,
      status: 'VALID',
      rawCode: rawCode || '',
      normalizedCode,
      referralCodeId: referral.id,
      leaderId: referral.leaderId,
      leaderName: referral.leader.name || undefined,
      leaderPhone: referral.leader.phone || undefined,
      discountPercent: REFERRAL_CONFIG.referralDiscountPercent,
    };
  }

  /**
   * Calculates the exact passenger (pax) count from a booking's item details.
   */
  static extractPaxCount(detailsJson?: string | null, fallbackCount = 1): number {
    if (!detailsJson) return Math.max(1, fallbackCount);
    try {
      const parsed = typeof detailsJson === 'string' ? JSON.parse(detailsJson) : detailsJson;
      if (Array.isArray(parsed?.passengers) && parsed.passengers.length > 0) {
        return parsed.passengers.length;
      }
      if (typeof parsed?.count === 'number' && parsed.count > 0) {
        return parsed.count;
      }
    } catch {
      // noop
    }
    return Math.max(1, fallbackCount);
  }

  /**
   * Calculates discount amount based strictly on BASE price (not subtotal/taxes).
   * Enforces configurable maximum discount cap.
   */
  static calculateDiscount(baseCost: Money | number, discountPercent = REFERRAL_CONFIG.referralDiscountPercent): {
    discountMoney: Money;
    discountAmount: number;
  } {
    const currency = baseCost instanceof Money ? baseCost.currency : 'IRR';
    const baseMoney = baseCost instanceof Money ? baseCost : new Money(baseCost, currency);

    if (discountPercent <= 0) {
      return { discountMoney: Money.zero(currency), discountAmount: 0 };
    }

    const rate = new Prisma.Decimal(discountPercent.toString());
    let discount = baseMoney.mul(rate).round(0);

    // Enforce maximum cap if configured
    if (REFERRAL_CONFIG.maxDiscountCapIrr !== null && currency === 'IRR') {
      const capMoney = new Money(REFERRAL_CONFIG.maxDiscountCapIrr, 'IRR');
      if (discount.greaterThan(capMoney)) {
        discount = capMoney;
      }
    }

    return {
      discountMoney: discount,
      discountAmount: discount.toNumber(),
    };
  }

  /**
   * Determines leader reward tier dynamically from confirmed passenger count.
   */
  static getTierForPax(confirmedPax: number): {
    tier: ReferralTier | null;
    rewardPercent: number;
    nextTierDistance: number;
    nextTierPercent: number;
  } {
    const tiers = [...REFERRAL_CONFIG.tiers].sort((a, b) => a.minPax - b.minPax);
    let matchedTier: ReferralTier | null = null;
    let nextTier: ReferralTier | null = null;

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (confirmedPax >= t.minPax) {
        matchedTier = t;
        nextTier = tiers[i + 1] || null;
      } else {
        if (!nextTier) {
          nextTier = t;
        }
        break;
      }
    }

    const rewardPercent = matchedTier ? matchedTier.rewardPercent : 0;
    const nextTierDistance = nextTier ? Math.max(0, nextTier.minPax - confirmedPax) : 0;
    const nextTierPercent = nextTier ? nextTier.rewardPercent : rewardPercent;

    return {
      tier: matchedTier,
      rewardPercent,
      nextTierDistance,
      nextTierPercent,
    };
  }

  /**
   * Calculates leader reward stats dynamically at runtime (never static),
   * ensuring that cancellations immediately roll back tiers without discrepancies.
   */
  static async calculateLeaderStats(
    referralCodeId: string,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<LeaderDashboardRow | null> {
    const referral = await client.referralCode.findUnique({
      where: { id: referralCodeId },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        settlements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        referrals: {
          include: {
            booking: {
              include: {
                items: true,
                customer: { select: { name: true, phone: true } },
              },
            },
          },
        },
      },
    });

    if (!referral) return null;

    let confirmedPax = 0;
    let pendingPax = 0;
    let cancelledPax = 0;

    const travelers: LeaderDashboardRow['travelers'] = [];

    const PENDING_STATUSES = ['DRAFT', 'HELD', 'PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'CONFIRMING_SUPPLIER'];
    const CANCELLED_STATUSES = ['CANCEL_REQUESTED', 'CANCELLING', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'];

    for (const ref of referral.referrals) {
      const b = ref.booking;
      if (!b) continue;

      // Exclude self-bookings by the leader
      if (b.customerId === referral.leaderId) {
        continue;
      }

      const pax = ref.paxCount || this.extractPaxCount(b.items[0]?.details);
      const bStatus = b.status;

      let travelerName = b.customer?.name || 'مسافر';
      try {
        const details = JSON.parse(b.items[0]?.details || '{}');
        if (details.passengers?.[0]?.firstNameFa || details.passengers?.[0]?.lastNameFa) {
          travelerName = `${details.passengers[0].firstNameFa || ''} ${details.passengers[0].lastNameFa || ''}`.trim();
        } else if (details.passengers?.[0]?.lastNameEn) {
          travelerName = `${details.passengers[0].firstNameEn || ''} ${details.passengers[0].lastNameEn || ''}`.trim();
        }
      } catch {
        // noop
      }

      travelers.push({
        bookingReference: b.reference,
        bookingStatus: b.status,
        travelerName,
        paxCount: pax,
        bookingTotal: Number(b.totalAmount),
        createdAt: b.createdAt.toISOString(),
      });

      if (bStatus === 'CONFIRMED') {
        confirmedPax += pax;
      } else if (CANCELLED_STATUSES.includes(bStatus)) {
        cancelledPax += pax;
      } else if (PENDING_STATUSES.includes(bStatus)) {
        pendingPax += pax;
      }
    }

    const { tier, rewardPercent, nextTierDistance, nextTierPercent } = this.getTierForPax(confirmedPax);

    // Resolve leader's own confirmed booking cost to calculate reward
    const leaderConfirmedBooking = await client.booking.findFirst({
      where: {
        customerId: referral.leaderId,
        status: 'CONFIRMED',
      },
      orderBy: { totalAmount: 'desc' },
      select: { totalAmount: true },
    });

    const leaderBaseCost = leaderConfirmedBooking ? Number(leaderConfirmedBooking.totalAmount) : 0;
    const estimatedRewardAmount = Math.round(leaderBaseCost * rewardPercent);

    const latestSettlement = referral.settlements[0];
    const settlementStatus: LeaderDashboardRow['settlementStatus'] = latestSettlement
      ? (latestSettlement.status as 'PENDING' | 'SETTLED')
      : 'NONE';

    return {
      id: referral.id,
      code: referral.code,
      leaderId: referral.leaderId,
      leaderName: referral.leader.name || 'سرگروه فیروزو',
      leaderPhone: referral.leader.phone || '—',
      leaderEmail: referral.leader.email || '—',
      isActive: referral.isActive,
      confirmedPax,
      pendingPax,
      cancelledPax,
      currentTier: tier,
      rewardPercent,
      nextTierDistance,
      nextTierPercent,
      estimatedRewardAmount,
      currency: 'IRR',
      settlementStatus,
      travelers,
    };
  }

  /**
   * Fetches all leaders and generates the ERP DataGrid rows for admin.
   */
  static async getAllLeaderStats(client: Prisma.TransactionClient | typeof prisma = prisma): Promise<LeaderDashboardRow[]> {
    const allCodes = await client.referralCode.findMany({
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows: LeaderDashboardRow[] = [];
    for (const item of allCodes) {
      const stats = await this.calculateLeaderStats(item.id, client);
      if (stats) rows.push(stats);
    }
    return rows;
  }
}
