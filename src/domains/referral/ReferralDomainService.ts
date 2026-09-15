import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { REFERRAL_CONFIG, ReferralTier } from '@/lib/referral/config';

export type ReferralStatus = 'VALID' | 'UNMATCHED' | 'SELF_REFERRAL' | 'INACTIVE' | 'USAGE_LIMIT_EXCEEDED';

/** Per-code effective parameters: global REFERRAL_CONFIG with JSON overrides applied. */
export interface EffectiveReferralConfig {
  discountPercent: number;
  maxDiscountCapIrr: number | null;
  maxUses: number | null;
  tiers: ReferralTier[];
}

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
  /** Effective per-code cap (null = uncapped). Always set, even when invalid. */
  discountCapIrr: number | null;
  maxUses?: number | null;
  usedCount?: number;
  reason?: 'NOT_FOUND' | 'INACTIVE' | 'SELF_REFERRAL' | 'EMPTY' | 'USAGE_LIMIT_EXCEEDED';
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
  /** Effective per-code settings (for admin display + settlement math). */
  discountPercent: number;
  maxDiscountCapIrr: number | null;
  maxUses: number | null;
  usedCount: number;
  customTierConfig?: string | null;
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
   * Parses a ReferralCode.customTierConfig JSON blob. Returns null when absent
   * or invalid (caller falls back to global defaults — never throws).
   */
  static parsePerCodeConfig(raw?: string | null): {
    discountPercent?: number;
    maxDiscountCapIrr?: number | null;
    maxUses?: number | null;
    tiers?: Array<{ minPax: number; maxPax: number | null; rewardPercent: number }>;
  } | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      const out: {
        discountPercent?: number;
        maxDiscountCapIrr?: number | null;
        maxUses?: number | null;
        tiers?: Array<{ minPax: number; maxPax: number | null; rewardPercent: number }>;
      } = {};
      const rec = parsed as Record<string, unknown>;
      if (typeof rec.discountPercent === 'number' && rec.discountPercent >= 0 && rec.discountPercent <= 1) {
        out.discountPercent = rec.discountPercent;
      }
      if (rec.maxDiscountCapIrr === null || (typeof rec.maxDiscountCapIrr === 'number' && rec.maxDiscountCapIrr >= 0)) {
        out.maxDiscountCapIrr = rec.maxDiscountCapIrr;
      }
      if (rec.maxUses === null || (typeof rec.maxUses === 'number' && Number.isInteger(rec.maxUses) && rec.maxUses >= 1)) {
        out.maxUses = rec.maxUses;
      }
      if (Array.isArray(rec.tiers)) {
        const tiers = rec.tiers.filter(
          (t): t is { minPax: number; maxPax: number | null; rewardPercent: number } =>
            !!t &&
            typeof t === 'object' &&
            Number.isInteger((t as { minPax: unknown }).minPax) &&
            (t as { minPax: number }).minPax >= 1 &&
            ((t as { maxPax: unknown }).maxPax === null ||
              (Number.isInteger((t as { maxPax: unknown }).maxPax) &&
                ((t as { maxPax: number }).maxPax as number) >= (t as { minPax: number }).minPax)) &&
            typeof (t as { rewardPercent: unknown }).rewardPercent === 'number' &&
            (t as { rewardPercent: number }).rewardPercent >= 0 &&
            (t as { rewardPercent: number }).rewardPercent <= 1
        );
        if (tiers.length > 0) out.tiers = tiers;
      }
      return Object.keys(out).length > 0 ? out : null;
    } catch {
      return null;
    }
  }

  /**
   * Resolves the effective parameters for one code: global defaults with the
   * code's JSON overrides applied. Invalid JSON can never break pricing —
   * it is ignored in favor of the defaults.
   */
  static getEffectiveConfig(codeRow: { customTierConfig?: string | null } | null): EffectiveReferralConfig {
    const base: EffectiveReferralConfig = {
      discountPercent: REFERRAL_CONFIG.referralDiscountPercent,
      maxDiscountCapIrr: REFERRAL_CONFIG.maxDiscountCapIrr,
      maxUses: null,
      tiers: REFERRAL_CONFIG.tiers,
    };
    if (!codeRow) return base;
    const override = this.parsePerCodeConfig(codeRow.customTierConfig);
    if (!override) return base;
    return {
      discountPercent: override.discountPercent ?? base.discountPercent,
      maxDiscountCapIrr:
        override.maxDiscountCapIrr !== undefined ? override.maxDiscountCapIrr : base.maxDiscountCapIrr,
      maxUses: override.maxUses !== undefined ? override.maxUses : null,
      tiers: override.tiers
        ? [...override.tiers]
            .sort((a, b) => a.minPax - b.minPax)
            .map((t, i) => ({
              minPax: t.minPax,
              maxPax: t.maxPax ?? Number.POSITIVE_INFINITY,
              rewardPercent: t.rewardPercent,
              labelFa: `سطح ${i + 1}: استرداد ${Math.round(t.rewardPercent * 100)}٪ از ${t.minPax} نفر`,
              labelEn: `Tier ${i + 1}: ${Math.round(t.rewardPercent * 100)}% refund from ${t.minPax} pax`,
            }))
        : base.tiers,
    };
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
        discountCapIrr: REFERRAL_CONFIG.maxDiscountCapIrr,
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
        discountCapIrr: REFERRAL_CONFIG.maxDiscountCapIrr,
        reason: 'NOT_FOUND',
      };
    }

    const effective = this.getEffectiveConfig(referral);

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
        discountCapIrr: effective.maxDiscountCapIrr,
        maxUses: effective.maxUses,
        reason: 'INACTIVE',
      };
    }

    // Self-referral rule: Group leader cannot claim the discount on their own trip
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
        discountCapIrr: effective.maxDiscountCapIrr,
        maxUses: effective.maxUses,
        reason: 'SELF_REFERRAL',
      };
    }

    // Capacity / Max Uses quota: If maxUses is configured, count active/valid bookings using this code
    let usedCount = 0;
    if (effective.maxUses !== null && effective.maxUses > 0) {
      usedCount = await client.bookingReferral.count({
        where: {
          referralCodeId: referral.id,
          status: 'VALID',
          booking: {
            status: { notIn: ['CANCELLED', 'REFUNDED', 'EXPIRED', 'FAILED'] },
          },
        },
      });

      if (usedCount >= effective.maxUses) {
        return {
          valid: false,
          status: 'USAGE_LIMIT_EXCEEDED',
          rawCode: rawCode || '',
          normalizedCode,
          referralCodeId: referral.id,
          leaderId: referral.leaderId,
          leaderName: referral.leader.name || undefined,
          discountPercent: 0,
          discountCapIrr: effective.maxDiscountCapIrr,
          maxUses: effective.maxUses,
          usedCount,
          reason: 'USAGE_LIMIT_EXCEEDED',
        };
      }
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
      discountPercent: effective.discountPercent,
      discountCapIrr: effective.maxDiscountCapIrr,
      maxUses: effective.maxUses,
      usedCount,
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
  static calculateDiscount(
    baseCost: Money | number,
    discountPercent = REFERRAL_CONFIG.referralDiscountPercent,
    maxDiscountCapIrr: number | null = REFERRAL_CONFIG.maxDiscountCapIrr
  ): {
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

    // Enforce maximum cap if configured (per-code cap wins over default)
    if (maxDiscountCapIrr !== null && currency === 'IRR') {
      const capMoney = new Money(maxDiscountCapIrr, 'IRR');
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
  static getTierForPax(confirmedPax: number, tiersOverride?: ReferralTier[]): {
    tier: ReferralTier | null;
    rewardPercent: number;
    nextTierDistance: number;
    nextTierPercent: number;
  } {
    const tiers = [...(tiersOverride ?? REFERRAL_CONFIG.tiers)].sort((a, b) => a.minPax - b.minPax);
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
    // Terminal non-converting states: EXPIRED (abandoned drafts) and FAILED
    // must count as cancelled, otherwise their pax vanishes from every bucket.
    const CANCELLED_STATUSES = ['CANCEL_REQUESTED', 'CANCELLING', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED', 'EXPIRED', 'FAILED'];

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

    const effective = this.getEffectiveConfig(referral);
    const { tier, rewardPercent, nextTierDistance, nextTierPercent } = this.getTierForPax(
      confirmedPax,
      effective.tiers
    );

    // Resolve leader's own confirmed booking cost to calculate reward
    const leaderConfirmedBooking = await client.booking.findFirst({
      where: {
        customerId: referral.leaderId,
        status: 'CONFIRMED',
      },
      orderBy: { totalAmount: 'desc' },
      select: { totalAmount: true },
    });

    const leaderBaseCost = leaderConfirmedBooking ? Money.from(leaderConfirmedBooking.totalAmount) : Money.zero('IRR');
    const estimatedRewardAmount = leaderBaseCost.mul(rewardPercent).roundForCurrency().rounded.toNumber();

    const latestSettlement = referral.settlements[0];
    const settlementStatus: LeaderDashboardRow['settlementStatus'] = latestSettlement
      ? (latestSettlement.status as 'PENDING' | 'SETTLED')
      : 'NONE';

    const usedCount = referral.referrals.filter(
      (r) => r.status === 'VALID' && r.booking && !CANCELLED_STATUSES.includes(r.booking.status)
    ).length;

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
      discountPercent: effective.discountPercent,
      maxDiscountCapIrr: effective.maxDiscountCapIrr,
      maxUses: effective.maxUses,
      usedCount,
      customTierConfig: referral.customTierConfig,
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
   * Fulfills the "saved for later" promise: bookings placed with a raw code
   * while it was UNMATCHED link to the code record once an admin registers
   * it. Only non-terminal bookings are touched (cancelled/refunded/expired/
   * failed trips never resurrect attribution). Returns the linked count.
   */
  static async resolveUnmatchedForCode(
    referralCodeId: string,
    normalizedCode: string,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<number> {
    // Case-insensitive on purpose: rows written before the rawCode
    // normalization fix may hold lowercase variants of the same code.
    const unmatched = await client.bookingReferral.findMany({
      where: {
        referralCodeId: null,
        status: 'UNMATCHED',
        rawCode: { equals: normalizedCode, mode: 'insensitive' },
        booking: { status: { notIn: ['CANCELLED', 'REFUNDED', 'EXPIRED', 'FAILED'] } },
      },
      select: { bookingId: true },
    });
    if (unmatched.length === 0) return 0;
    const res = await client.bookingReferral.updateMany({
      where: {
        bookingId: { in: unmatched.map((u) => u.bookingId) },
        referralCodeId: null,
        status: 'UNMATCHED',
      },
      data: {
        referralCodeId,
        rawCode: normalizedCode,
        status: 'VALID',
      },
    });
    return res.count;
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
