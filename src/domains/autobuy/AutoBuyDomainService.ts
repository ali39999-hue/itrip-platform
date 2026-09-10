import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { encryptSensitive } from '@/lib/security/crypto-vault';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { BookingSagaCoordinator } from '../booking/saga/BookingSagaCoordinator';
import { wrapOutboxPayload } from '../events/OutboxConsumer';
import { getTourById, getAllTours } from '@/services/tours-service';
import { FLIGHTS, HOTELS } from '@/lib/data';

export interface PassengerInput {
  firstName: string;
  lastName: string;
  nationalId?: string;
  passportNo?: string;
  birthDate?: string;
  gender?: 'male' | 'female';
}

export interface CreateAutoBuyInput {
  title: string;
  serviceType: 'TOURS' | 'FLIGHTS' | 'HOTELS';
  targetId?: string;
  origin?: string;
  destination?: string;
  targetDate: string; // YYYY-MM-DD
  maxPrice: number; // IRR/Toman
  currency?: string;
  passengerCount?: number;
  passengers?: PassengerInput[];
  executionMode?: 'ON_PRICE_DROP' | 'ON_SCHEDULED_TIME' | 'ON_INVENTORY_AVAILABLE' | 'ON_CONDITIONS_MET';
  scheduledAt?: Date | string;
  expiresAt?: Date | string;
  bypassSpendCeiling?: boolean;
}

export interface EvaluationResult {
  ruleId: string;
  matched: boolean;
  executed: boolean;
  success: boolean;
  reason?: string;
  bookingId?: string;
  reference?: string;
  totalAmount?: number;
}

/**
 * Auto-Buy Safety Policies & Thresholds (Wave 19: AUTO-101 to AUTO-110)
 */
export const AUTO_BUY_SAFETY = {
  DEFAULT_MAX_SPEND_PER_RULE: 500_000_000, // 500M IRR (~50M Toman) (AUTO-102)
  DEFAULT_DAILY_BUDGET: 1_000_000_000, // 1B IRR / day (AUTO-103)
  DEFAULT_MONTHLY_BUDGET: 5_000_000_000, // 5B IRR / month (AUTO-103)
  HIGH_VALUE_THRESHOLD: 200_000_000, // 200M IRR triggers human approval (AUTO-109)
  ALLOWED_SUPPLIERS: [
    'PARTO_GDS',
    'W5',
    'IR',
    'QB',
    'EP',
    'IS',
    'EGHAMAT_24',
    'HOTELS',
    'TOURS',
    'FIRUZO_OFFICIAL',
    'BEDBANK_DEFAULT',
    'GDS_DEFAULT',
    'Mahan Air',
    'Iran Air',
    'Aseman',
    'آسمان',
    'ماهان',
    'ایران ایر',
    'کیش ایر',
    'معراج',
    'وارش',
    'زاگرس',
    'کاسپین',
    'قشم ایر',
    'default',
  ],
  PRICE_DEVIATION_DROP_THRESHOLD: 0.4, // >40% unexpected price drop triggers safety block (AUTO-105)
};

export class AutoBuyDomainService {
  private static killSwitchActive = false; // AUTO-106

  /**
   * Set global Auto-Buy kill switch (AUTO-106)
   */
  static setKillSwitch(active: boolean) {
    this.killSwitchActive = active;
    console.warn(`[AutoBuySafety] Kill switch state updated: ${active ? 'ACTIVE (HALTED)' : 'INACTIVE (NORMAL)'}`);
  }

  /**
   * Returns current kill switch status (AUTO-106)
   */
  static isKillSwitchActive(): boolean {
    return this.killSwitchActive || process.env.AUTO_BUY_KILL_SWITCH === 'true';
  }

  /**
   * Authorize user for Auto-Buy creation / activation (AUTO-101)
   * Only active users with verified KYC (nationalId) or active agency membership are authorized.
   */
  static async checkAuthorization(userId: string): Promise<{ authorized: boolean; reason?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMemberships: {
          where: { status: 'ACTIVE' },
          include: { organization: true },
        },
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return { authorized: false, reason: 'User account not found or inactive' };
    }

    // Admins and staff are always authorized
    const isStaff = user.userRoles.some((ur) =>
      ['SUPER_ADMIN', 'ADMIN', 'OPS', 'FINANCE'].includes(ur.role.name)
    );
    if (isStaff || user.role === 'SUPER_ADMIN') {
      return { authorized: true };
    }

    // B2B Agency members are authorized
    const hasActiveAgency = user.organizationMemberships.some(
      (m) => m.organization.status === 'ACTIVE'
    );
    if (hasActiveAgency) {
      return { authorized: true };
    }

    // Individual users must have verified KYC (nationalId)
    if (user.nationalId) {
      return { authorized: true };
    }

    // In dev/demo mode, allow if test environment
    if (process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production') {
      return { authorized: true };
    }

    return {
      authorized: false,
      reason: 'AUTO_BUY_UNAUTHORIZED: Auto-Buy requires verified KYC (National ID) or active Agency credentials.',
    };
  }

  /**
   * Create a new automated purchase rule with encrypted passenger data and safety guards
   */
  static async createRule(userId: string, input: CreateAutoBuyInput) {
    if (!userId) throw new Error('User ID is required');

    // AUTO-101: Verify authorization
    const authCheck = await this.checkAuthorization(userId);
    if (!authCheck.authorized) {
      throw new Error(authCheck.reason || 'Auto-buy creation unauthorized');
    }

    if (!input.title?.trim()) throw new Error('Title is required');
    if (!['TOURS', 'FLIGHTS', 'HOTELS'].includes(input.serviceType)) {
      throw new Error('Invalid service type');
    }
    if (!input.targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) {
      throw new Error('Valid target date (YYYY-MM-DD) is required');
    }
    if (!input.maxPrice || input.maxPrice <= 0) {
      throw new Error('Max price must be greater than zero');
    }

    // AUTO-102: Spend ceiling guard
    if (input.maxPrice > AUTO_BUY_SAFETY.DEFAULT_MAX_SPEND_PER_RULE && !input.bypassSpendCeiling) {
      throw new Error(
        `SPEND_CEILING_EXCEEDED: Max price (${input.maxPrice.toLocaleString('fa-IR')} IRR) exceeds system ceiling of ${AUTO_BUY_SAFETY.DEFAULT_MAX_SPEND_PER_RULE.toLocaleString('fa-IR')} IRR`
      );
    }

    const passengerCount = input.passengerCount || input.passengers?.length || 1;
    const sanitizedPassengers = (input.passengers || []).map((p) => ({
      firstName: p.firstName,
      lastName: p.lastName,
      nationalId: p.nationalId ? encryptSensitive(p.nationalId) : undefined,
      passportNo: p.passportNo ? encryptSensitive(p.passportNo) : undefined,
      birthDate: p.birthDate,
      gender: p.gender,
    }));

    const rule = await prisma.autoBuyRule.create({
      data: {
        userId,
        title: input.title.trim(),
        serviceType: input.serviceType,
        targetId: input.targetId || null,
        origin: input.origin || null,
        destination: input.destination || null,
        targetDate: input.targetDate,
        maxPrice: new Prisma.Decimal(input.maxPrice),
        currency: input.currency || 'IRR',
        passengerCount,
        passengerDetails: JSON.stringify(sanitizedPassengers),
        executionMode: input.executionMode || 'ON_CONDITIONS_MET',
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        status: 'ACTIVE',
      },
    });

    // AUTO-108: Audit trail logging
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'AUTO_BUY_RULE_CREATED',
        resource: 'AutoBuyRule',
        resourceId: rule.id,
        newData: JSON.stringify({
          title: rule.title,
          serviceType: rule.serviceType,
          maxPrice: input.maxPrice,
          targetDate: rule.targetDate,
        }),
      },
    });

    return rule;
  }

  /**
   * Cancel an active rule
   */
  static async cancelRule(userId: string, ruleId: string) {
    const rule = await prisma.autoBuyRule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) throw new Error('Rule not found or access denied');
    if (rule.status === 'FULFILLED') throw new Error('Cannot cancel an already fulfilled purchase');

    const updated = await prisma.autoBuyRule.update({
      where: { id: ruleId },
      data: { status: 'CANCELLED' },
    });

    // AUTO-108: Audit trail logging
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'AUTO_BUY_RULE_CANCELLED',
        resource: 'AutoBuyRule',
        resourceId: ruleId,
      },
    });

    return updated;
  }

  /**
   * Retrieve all rules for a user
   */
  static async getUserRules(userId: string) {
    return prisma.autoBuyRule.findMany({
      where: { userId },
      include: {
        booking: {
          select: {
            id: true,
            reference: true,
            status: true,
            totalAmount: true,
            travelDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check daily and monthly budget caps (AUTO-103)
   */
  static async checkBudgetCaps(
    userId: string,
    additionalAmount: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch fulfilled auto-buy bookings for this user today and this month
    const todayRules = await prisma.autoBuyRule.findMany({
      where: {
        userId,
        status: 'FULFILLED',
        updatedAt: { gte: startOfDay },
      },
      include: { booking: { select: { totalAmount: true } } },
    });

    const todaySpend = todayRules.reduce((sum, r) => sum + Number(r.booking?.totalAmount || 0), 0);
    if (todaySpend + additionalAmount > AUTO_BUY_SAFETY.DEFAULT_DAILY_BUDGET) {
      return {
        allowed: false,
        reason: `DAILY_BUDGET_EXCEEDED: Purchase would bring daily total to ${(todaySpend + additionalAmount).toLocaleString('fa-IR')} IRR, exceeding daily budget of ${AUTO_BUY_SAFETY.DEFAULT_DAILY_BUDGET.toLocaleString('fa-IR')} IRR`,
      };
    }

    const monthRules = await prisma.autoBuyRule.findMany({
      where: {
        userId,
        status: 'FULFILLED',
        updatedAt: { gte: startOfMonth },
      },
      include: { booking: { select: { totalAmount: true } } },
    });

    const monthSpend = monthRules.reduce((sum, r) => sum + Number(r.booking?.totalAmount || 0), 0);
    if (monthSpend + additionalAmount > AUTO_BUY_SAFETY.DEFAULT_MONTHLY_BUDGET) {
      return {
        allowed: false,
        reason: `MONTHLY_BUDGET_EXCEEDED: Purchase would bring monthly total to ${(monthSpend + additionalAmount).toLocaleString('fa-IR')} IRR, exceeding monthly budget of ${AUTO_BUY_SAFETY.DEFAULT_MONTHLY_BUDGET.toLocaleString('fa-IR')} IRR`,
      };
    }

    return { allowed: true };
  }

  /**
   * Evaluate conditions with allowlist and price deviation checks (AUTO-104, AUTO-105)
   */
  static async checkMatch(rule: {
    serviceType: string;
    targetId: string | null;
    origin: string | null;
    destination: string | null;
    targetDate: string;
    maxPrice: Prisma.Decimal;
    passengerCount: number;
  }): Promise<{
    matched: boolean;
    pricePerPerson: number;
    totalCost: number;
    itemId: string;
    description: string;
    supplierCode: string;
    blockedReason?: string;
  }> {
    const maxPriceNumber = Number(rule.maxPrice);
    const count = rule.passengerCount || 1;

    // 1. TOURS
    if (rule.serviceType === 'TOURS') {
      let tour = rule.targetId ? getTourById(rule.targetId) : undefined;
      if (!tour && rule.destination) {
        tour = getAllTours().find((t) => t.city.includes(rule.destination!) || t.title.includes(rule.destination!));
      }
      if (!tour) {
        tour = getAllTours()[0];
      }

      if (tour) {
        const matchingDeparture = (tour.departureDates || []).find((d) => d.startDate === rule.targetDate) || tour.departureDates?.[0];
        const unitPrice = matchingDeparture ? matchingDeparture.price : tour.price;
        const total = unitPrice * count;

        if (total <= maxPriceNumber) {
          return {
            matched: true,
            pricePerPerson: unitPrice,
            totalCost: total,
            itemId: tour.id,
            description: `${tour.title} (${tour.city})`,
            supplierCode: 'TOURS',
          };
        }
      }
    }

    // 2. FLIGHTS
    if (rule.serviceType === 'FLIGHTS') {
      const matchingFlights = FLIGHTS.filter((f) => {
        const matchOrig = !rule.origin || f.originCity.includes(rule.origin) || f.origin.includes(rule.origin);
        const matchDest = !rule.destination || f.destinationCity.includes(rule.destination) || f.destination.includes(rule.destination);
        return matchOrig && matchDest;
      });

      if (matchingFlights.length > 0) {
        const cheapest = matchingFlights.sort((a, b) => a.price - b.price)[0];
        const total = cheapest.price * count;

        if (total <= maxPriceNumber && cheapest.seatsLeft >= count) {
          const supplierCode = cheapest.airline;

          // AUTO-104: Supplier Allowlist check
          if (!AUTO_BUY_SAFETY.ALLOWED_SUPPLIERS.some((s) => supplierCode.includes(s) || s.includes(supplierCode))) {
            return {
              matched: false,
              pricePerPerson: cheapest.price,
              totalCost: total,
              itemId: cheapest.id,
              description: '',
              supplierCode,
              blockedReason: `SUPPLIER_NOT_ALLOWLISTED: Supplier "${supplierCode}" is not in the approved auto-buy allowlist`,
            };
          }

          // AUTO-105: Price deviation anomaly check (>40% drop compared to maxPrice)
          if (maxPriceNumber > 0 && total < maxPriceNumber * (1 - AUTO_BUY_SAFETY.PRICE_DEVIATION_DROP_THRESHOLD)) {
            return {
              matched: false,
              pricePerPerson: cheapest.price,
              totalCost: total,
              itemId: cheapest.id,
              description: '',
              supplierCode,
              blockedReason: `PRICE_DEVIATION_SUSPICIOUS: Offer total (${total.toLocaleString('fa-IR')}) is >40% below rule target price (${maxPriceNumber.toLocaleString('fa-IR')}), indicating potential fare glitch`,
            };
          }

          return {
            matched: true,
            pricePerPerson: cheapest.price,
            totalCost: total,
            itemId: cheapest.id,
            description: `پرواز ${cheapest.airline} (${cheapest.originCity} به ${cheapest.destinationCity})`,
            supplierCode,
          };
        }
      }
    }

    // 3. HOTELS
    if (rule.serviceType === 'HOTELS') {
      let hotel = rule.targetId ? HOTELS.find((h) => h.id === rule.targetId) : undefined;
      if (!hotel && rule.destination) {
        hotel = HOTELS.find((h) => h.city.includes(rule.destination!) || h.name.includes(rule.destination!));
      }
      if (hotel) {
        const total = hotel.pricePerNight * count;
        if (total <= maxPriceNumber) {
          return {
            matched: true,
            pricePerPerson: hotel.pricePerNight,
            totalCost: total,
            itemId: hotel.id,
            description: `${hotel.name} (${hotel.city})`,
            supplierCode: 'HOTELS',
          };
        }
      }
    }

    return { matched: false, pricePerPerson: 0, totalCost: 0, itemId: '', description: '', supplierCode: '' };
  }

  /**
   * Human Approval for high-value auto-buy rules (AUTO-109)
   */
  static async approveHighValueRule(ruleId: string, approverId: string): Promise<EvaluationResult> {
    const rule = await prisma.autoBuyRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.status !== 'PENDING_APPROVAL') {
      throw new Error('Rule not found or not in PENDING_APPROVAL status');
    }

    // Audit human approval
    const validUser = await prisma.user.findUnique({ where: { id: approverId } }).catch(() => null);
    await prisma.auditLog.create({
      data: {
        userId: validUser ? approverId : null,
        action: 'AUTO_BUY_HUMAN_APPROVED',
        resource: 'AutoBuyRule',
        resourceId: ruleId,
        reason: `Approved by staff ${approverId}`,
      },
    });

    // Reset status to ACTIVE and trigger immediate execution
    await prisma.autoBuyRule.update({
      where: { id: ruleId },
      data: { status: 'ACTIVE', failureReason: null },
    });

    return this.evaluateRule(ruleId, true);
  }

  /**
   * Evaluate and execute a specific rule atomically (AUTO-101 to AUTO-109)
   */
  static async evaluateRule(ruleId: string, bypassHumanApproval = false): Promise<EvaluationResult> {
    // AUTO-106: Global kill switch check
    if (this.isKillSwitchActive()) {
      return {
        ruleId,
        matched: false,
        executed: false,
        success: false,
        reason: 'KILL_SWITCH_ACTIVE: Auto-Buy system is halted by emergency kill switch',
      };
    }

    const rule = await prisma.autoBuyRule.findUnique({
      where: { id: ruleId },
      include: { user: true },
    });

    if (!rule || rule.status !== 'ACTIVE') {
      return { ruleId, matched: false, executed: false, success: false, reason: 'Rule not active or not found' };
    }

    // Check expiration
    if (rule.expiresAt && rule.expiresAt < new Date()) {
      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: { status: 'EXPIRED' },
      });
      return { ruleId, matched: false, executed: false, success: false, reason: 'Rule has expired' };
    }

    // Check scheduledAt
    if (rule.scheduledAt && rule.scheduledAt > new Date()) {
      return { ruleId, matched: false, executed: false, success: false, reason: 'Scheduled time not yet reached' };
    }

    // Check price & inventory conditions
    const match = await this.checkMatch(rule);
    if (match.blockedReason) {
      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: { lastCheckedAt: new Date(), failureReason: match.blockedReason },
      });

      // AUTO-108: Log safety blockage
      await prisma.auditLog.create({
        data: {
          userId: rule.userId,
          action: 'AUTO_BUY_SAFETY_BLOCKED',
          resource: 'AutoBuyRule',
          resourceId: rule.id,
          reason: match.blockedReason,
        },
      });

      return { ruleId, matched: false, executed: false, success: false, reason: match.blockedReason };
    }

    if (!match.matched) {
      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: { lastCheckedAt: new Date() },
      });
      return { ruleId, matched: false, executed: false, success: false, reason: 'Conditions (price or availability) not yet met' };
    }

    // AUTO-103: Daily and Monthly Budget Caps check
    const budgetCheck = await this.checkBudgetCaps(rule.userId, match.totalCost);
    if (!budgetCheck.allowed) {
      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: {
          status: 'ACTIVE',
          failureReason: budgetCheck.reason,
          lastCheckedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: rule.userId,
          action: 'AUTO_BUY_BUDGET_EXCEEDED',
          resource: 'AutoBuyRule',
          resourceId: rule.id,
          reason: budgetCheck.reason,
        },
      });

      return { ruleId, matched: true, executed: false, success: false, reason: budgetCheck.reason };
    }

    // AUTO-109: High-Value Threshold check (> 200M IRR requires human approval)
    if (match.totalCost > AUTO_BUY_SAFETY.HIGH_VALUE_THRESHOLD && !bypassHumanApproval) {
      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: {
          status: 'PENDING_APPROVAL',
          failureReason: `HIGH_VALUE_PENDING_APPROVAL: Purchase amount (${match.totalCost.toLocaleString('fa-IR')} IRR) requires human authorization`,
          lastCheckedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: rule.userId,
          action: 'AUTO_BUY_PENDING_HUMAN_APPROVAL',
          resource: 'AutoBuyRule',
          resourceId: rule.id,
          reason: `High-value purchase amount: ${match.totalCost} IRR`,
        },
      });

      await prisma.outboxEvent.create({
        data: {
          eventType: 'NOTIFICATION_DISPATCH',
          aggregateType: 'AUTO_BUY_RULE',
          aggregateId: rule.id,
          payload: wrapOutboxPayload({
            userId: rule.userId,
            channel: 'SMS',
            title: 'نیازمند تایید خرید با ارزش بالا',
            content: `شرایط خرید خودکار «${rule.title}» محقق شد اما به دلیل ارزش بالا نیازمند تایید شما در پنل کاربری است.`,
          }),
        },
      });

      return {
        ruleId,
        matched: true,
        executed: false,
        success: false,
        reason: 'HIGH_VALUE_PENDING_APPROVAL: Requires human approval',
      };
    }

    // AUTO-107: Atomic claim to guarantee idempotency and prevent duplicate purchase
    const claimCount: number = await prisma.$executeRaw`
      UPDATE AutoBuyRule
      SET status = 'TRIGGERED', lastCheckedAt = NOW()
      WHERE id = ${ruleId} AND status = 'ACTIVE'
    `;

    if (claimCount === 0) {
      return { ruleId, matched: true, executed: false, success: false, reason: 'Rule already claimed by another concurrent worker' };
    }

    // Verify wallet funds under lock
    const currency = rule.currency || 'IRR';
    const totalCostDecimal = new Prisma.Decimal(match.totalCost);

    const userAccount = await prisma.account.findUnique({
      where: {
        ownerType_ownerId_currency: {
          ownerType: 'USER',
          ownerId: rule.userId,
          currency,
        },
      },
    });

    if (!userAccount) {
      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: {
          status: 'FAILED_FUNDS',
          failureReason: 'User wallet account does not exist or has 0 balance',
          lastCheckedAt: new Date(),
        },
      });

      return { ruleId, matched: true, executed: false, success: false, reason: 'Insufficient wallet balance' };
    }

    const currentBalanceMoney = await GeneralLedgerService.getAccountBalance(userAccount.id, currency);
    const currentBalance = currentBalanceMoney.toNumber();

    if (currentBalance < match.totalCost) {
      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: {
          status: 'FAILED_FUNDS',
          failureReason: `موجودی ناکافی: نیاز به ${match.totalCost.toLocaleString('fa-IR')} تومان، موجودی: ${currentBalance.toLocaleString('fa-IR')} تومان`,
          lastCheckedAt: new Date(),
        },
      });

      return { ruleId, matched: true, executed: false, success: false, reason: 'Insufficient funds' };
    }

    // Funds sufficient: Execute canonical Booking Saga (SAGA-101)
    const bookingRef = `ITR-AUTO-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const booking = await prisma.booking.create({
        data: {
          reference: bookingRef,
          customerId: rule.userId,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'INITIATED',
          fulfillmentStatus: 'PENDING',
          ticketStatus: 'NOT_ISSUED',
          totalAmount: totalCostDecimal,
          currency,
          travelDate: rule.targetDate,
          items: {
            create: [
              {
                type: rule.serviceType === 'TOURS' ? 'TOUR' : rule.serviceType === 'FLIGHTS' ? 'FLIGHT' : 'HOTEL',
                netCost: totalCostDecimal,
                markup: new Prisma.Decimal(0),
                taxAmount: new Prisma.Decimal(0),
                feeAmount: new Prisma.Decimal(0),
                sellPrice: totalCostDecimal,
                details: JSON.stringify({
                  itemId: match.itemId,
                  description: match.description,
                  passengerCount: rule.passengerCount,
                  passengersJson: rule.passengerDetails,
                }),
              },
            ],
          },
          priceSnapshots: {
            create: [
              {
                baseAmount: totalCostDecimal,
                sellPrice: totalCostDecimal,
                currency,
                breakdownJson: JSON.stringify({ autoBuyRuleId: rule.id, totalCost: match.totalCost }),
              },
            ],
          },
          statusHistory: {
            create: [
              {
                fromStatus: 'NONE',
                toStatus: 'PENDING_PAYMENT',
                actor: 'AUTO_BUY_SYSTEM',
                reason: `Triggered by Auto-Buy Rule: ${rule.title}`,
              },
            ],
          },
        },
      });

      // AUTO-107: Idempotency key deterministically bound to rule and targetDate
      const idempotencyKey = `idemp-autobuy-${rule.id}-${rule.targetDate}`;
      const sagaRes = await BookingSagaCoordinator.executeBookingConfirmation({
        bookingId: booking.id,
        paymentMethod: 'wallet_irr',
        idempotencyKey,
      });

      if (!sagaRes.success) {
        throw new Error(sagaRes.error || 'Booking saga failed');
      }

      // Update rule to FULFILLED
      await prisma.autoBuyRule.update({
        where: { id: rule.id },
        data: {
          status: 'FULFILLED',
          bookingId: booking.id,
          lastCheckedAt: new Date(),
        },
      });

      // AUTO-108: Audit trail logging
      await prisma.auditLog.create({
        data: {
          userId: rule.userId,
          action: 'AUTO_BUY_PURCHASE_FULFILLED',
          resource: 'AutoBuyRule',
          resourceId: rule.id,
          newData: JSON.stringify({
            bookingId: booking.id,
            bookingRef: booking.reference,
            totalCost: match.totalCost,
          }),
        },
      });

      return {
        ruleId,
        matched: true,
        executed: true,
        success: true,
        bookingId: booking.id,
        reference: booking.reference,
        totalAmount: match.totalCost,
      };
    } catch (error: unknown) {
      console.error(`Auto-buy execution error for rule ${ruleId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'خطای سرور';

      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: {
          status: 'ACTIVE',
          failureReason: `خطا در هنگام نهایی‌سازی خرید: ${errorMessage}`,
          lastCheckedAt: new Date(),
        },
      });

      return {
        ruleId,
        matched: true,
        executed: true,
        success: false,
        reason: errorMessage,
      };
    }
  }

  /**
   * Batch sweep of all active rules
   */
  static async runSweep(): Promise<{ scanned: number; executed: number; results: EvaluationResult[] }> {
    if (this.isKillSwitchActive()) {
      console.warn('[AutoBuy] Sweep skipped: Kill switch is active');
      return { scanned: 0, executed: 0, results: [] };
    }

    const activeRules = await prisma.autoBuyRule.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
      take: 20,
    });

    const results: EvaluationResult[] = [];
    let executedCount = 0;

    for (const item of activeRules) {
      try {
        const res = await this.evaluateRule(item.id);
        results.push(res);
        if (res.executed && res.success) executedCount++;
      } catch (e: unknown) {
        console.error(`Error processing auto-buy rule ${item.id}:`, e);
      }
    }

    return { scanned: activeRules.length, executed: executedCount, results };
  }
}
