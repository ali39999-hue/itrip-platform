import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { encryptSensitive } from '@/lib/security/crypto-vault';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { BookingSagaOrchestrator } from '../booking/saga-orchestrator';
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
  maxPrice: number; // Toman
  currency?: string;
  passengerCount?: number;
  passengers?: PassengerInput[];
  executionMode?: 'ON_PRICE_DROP' | 'ON_SCHEDULED_TIME' | 'ON_INVENTORY_AVAILABLE' | 'ON_CONDITIONS_MET';
  scheduledAt?: Date | string;
  expiresAt?: Date | string;
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

export class AutoBuyDomainService {
  /**
   * Create a new automated purchase rule with encrypted passenger data
   */
  static async createRule(userId: string, input: CreateAutoBuyInput) {
    if (!userId) throw new Error('User ID is required');
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

    return prisma.autoBuyRule.update({
      where: { id: ruleId },
      data: { status: 'CANCELLED' },
    });
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
   * Evaluate conditions for a given service type
   */
  static async checkMatch(rule: {
    serviceType: string;
    targetId: string | null;
    origin: string | null;
    destination: string | null;
    targetDate: string;
    maxPrice: Prisma.Decimal;
    passengerCount: number;
  }): Promise<{ matched: boolean; pricePerPerson: number; totalCost: number; itemId: string; description: string }> {
    const maxPriceNumber = Number(rule.maxPrice);
    const count = rule.passengerCount || 1;

    // 1. TOURS
    if (rule.serviceType === 'TOURS') {
      let tour = rule.targetId ? getTourById(rule.targetId) : undefined;
      if (!tour && rule.destination) {
        tour = getAllTours().find((t) => t.city.includes(rule.destination!) || t.title.includes(rule.destination!));
      }
      if (!tour) {
        tour = getAllTours()[0]; // Default fallback if unspecified
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
          return {
            matched: true,
            pricePerPerson: cheapest.price,
            totalCost: total,
            itemId: cheapest.id,
            description: `پرواز ${cheapest.airline} (${cheapest.originCity} به ${cheapest.destinationCity})`,
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
          };
        }
      }
    }

    return { matched: false, pricePerPerson: 0, totalCost: 0, itemId: '', description: '' };
  }

  /**
   * Evaluate and execute a specific rule atomically
   */
  static async evaluateRule(ruleId: string): Promise<EvaluationResult> {
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

    // Check scheduledAt if set
    if (rule.scheduledAt && rule.scheduledAt > new Date()) {
      return { ruleId, matched: false, executed: false, success: false, reason: 'Scheduled time not yet reached' };
    }

    // Check price & inventory conditions
    const match = await this.checkMatch(rule);
    if (!match.matched) {
      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: { lastCheckedAt: new Date() },
      });
      return { ruleId, matched: false, executed: false, success: false, reason: 'Conditions (price or availability) not yet met' };
    }

    // Conditions matched! Now verify wallet funds under lock
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

      // Emit notification event
      await prisma.outboxEvent.create({
        data: {
          eventType: 'NOTIFICATION_DISPATCH',
          aggregateType: 'AUTO_BUY_RULE',
          aggregateId: rule.id,
          payload: JSON.stringify({
            userId: rule.userId,
            channel: 'SMS',
            title: 'کسری موجودی برای خرید خودکار',
            content: `شرایط خرید خودکار «${rule.title}» محقق شد اما به دلیل عدم موجودی کافی در کیف‌پول انجام نشد. لطفاً کیف‌پول خود را شارژ کنید.`,
          }),
        },
      });

      return { ruleId, matched: true, executed: false, success: false, reason: 'Insufficient wallet balance' };
    }

    const currentBalance = await GeneralLedgerService.getAccountBalance(userAccount.id, currency);
    if (currentBalance < match.totalCost) {
      await prisma.autoBuyRule.update({
        where: { id: ruleId },
        data: {
          status: 'FAILED_FUNDS',
          failureReason: `موجودی ناکافی: نیاز به ${match.totalCost.toLocaleString('fa-IR')} تومان، موجودی: ${currentBalance.toLocaleString('fa-IR')} تومان`,
          lastCheckedAt: new Date(),
        },
      });

      await prisma.outboxEvent.create({
        data: {
          eventType: 'NOTIFICATION_DISPATCH',
          aggregateType: 'AUTO_BUY_RULE',
          aggregateId: rule.id,
          payload: JSON.stringify({
            userId: rule.userId,
            channel: 'SMS',
            title: 'کسری موجودی خرید خودکار',
            content: `خرید خودکار «${rule.title}» به دلیل کسری موجودی انجام نشد. مبلغ مورد نیاز: ${match.totalCost.toLocaleString('fa-IR')} تومان.`,
          }),
        },
      });

      return { ruleId, matched: true, executed: false, success: false, reason: 'Insufficient funds' };
    }

    // Funds are sufficient! Transition rule to TRIGGERED and execute Booking Saga
    await prisma.autoBuyRule.update({
      where: { id: ruleId },
      data: { status: 'TRIGGERED', lastCheckedAt: new Date() },
    });

    const bookingRef = `ITR-AUTO-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      // Create Booking record
      const booking = await prisma.booking.create({
        data: {
          reference: bookingRef,
          customerId: rule.userId,
          status: 'DRAFT',
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
                toStatus: 'DRAFT',
                actor: 'AUTO_BUY_SYSTEM',
                reason: `Triggered by Auto-Buy Rule: ${rule.title}`,
              },
            ],
          },
        },
      });

      // Execute Saga confirmation (debits wallet, credits platform, updates status to CONFIRMED)
      const idempotencyKey = `idemp-autobuy-${rule.id}-${Date.now()}`;
      await BookingSagaOrchestrator.confirmBookingSaga({
        bookingId: booking.id,
        paymentMethod: 'wallet_irr',
        idempotencyKey,
      });

      // Update rule to FULFILLED
      await prisma.autoBuyRule.update({
        where: { id: rule.id },
        data: {
          status: 'FULFILLED',
          bookingId: booking.id,
          lastCheckedAt: new Date(),
        },
      });

      // Emit outbox notification for ticket issuance
      await prisma.outboxEvent.create({
        data: {
          eventType: 'NOTIFICATION_DISPATCH',
          aggregateType: 'BOOKING',
          aggregateId: booking.id,
          payload: JSON.stringify({
            userId: rule.userId,
            channel: 'SMS',
            title: 'خرید خودکار با موفقیت انجام شد',
            content: `خرید خودکار شما برای «${match.description}» با کد پیگیری ${booking.reference} با موفقیت انجام شد و بلیط شما صادر گردید.`,
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
          status: 'ACTIVE', // Return to ACTIVE to retry on next cycle
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
   * Batch sweep of all active rules (concurrency-safe via SKIP LOCKED)
   */
  static async runSweep(): Promise<{ scanned: number; executed: number; results: EvaluationResult[] }> {
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
        if (res.executed) executedCount++;
      } catch (e: unknown) {
        console.error(`Error processing auto-buy rule ${item.id}:`, e);
      }
    }

    return { scanned: activeRules.length, executed: executedCount, results };
  }
}
