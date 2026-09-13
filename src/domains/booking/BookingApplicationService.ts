import { prisma } from '@/lib/prisma';
import { Money } from '@/lib/finance';
import type { SupportedCurrency } from '../currency/CurrencyService';
import { BookingStateMachine, BookingState } from './state-machine';
import { BookingDomainService } from './BookingDomainService';
import { PolicySnapshotDomainService } from './policy-snapshot';
import { PriceSnapshotDomainService } from '../pricing/PriceSnapshotDomainService';
import { QuoteDomainService } from '../pricing/QuoteDomainService';
import { InventoryEngine } from '../inventory/InventoryEngine';
import { BookingSagaOrchestrator } from './saga-orchestrator';
import { RefundDomainService, RefundResult } from '../refund/RefundDomainService';
import { getTenantAuthContext, assertTenantAccess } from '../identity/permission-service';
import { FLIGHTS, HOTELS, TOURS, TRANSFERS, VISA_SERVICES, ESIM_PACKAGES, INSURANCE_PLANS } from '@/lib/data';
import { getHotelById, getHotelByIdAsync } from '@/services/hotels-service';
import { getFlightPriceById, getLiveFlightPriceById } from '@/services/flights-service';
import { encryptSensitive } from '@/lib/security/crypto-vault';
import { businessMetrics } from '@/lib/observability/business-metrics';
import { ReferralDomainService } from '../referral/ReferralDomainService';
import crypto from 'crypto';

export interface PassengerPii {
  firstName: string;
  lastName: string;
  nationalId?: string;
  passportNo?: string;
  birthDate?: string;
  gender?: string;
}

export interface CreateBookingDraftCommand {
  actorId: string;
  type: string;
  itemId?: string;
  itemTitle?: string;
  count?: number;
  nights?: number;
  travelDate?: string;
  addonIds?: string[];
  addons?: { esim?: boolean; insurance?: boolean };
  passengers?: PassengerPii[];
  contactEmail?: string;
  contactPhone?: string;
  userRole?: string;
  referralCode?: string;
  source?: string;
}

export interface RepriceBookingCommand {
  actorId: string;
  bookingId: string;
  acceptPriceChange?: boolean;
  customerAcceptedPrice?: number | Money;
}

export interface ConfirmPaymentCommand {
  actorId: string;
  bookingId: string;
  idempotencyKey: string;
  paymentMethod: 'wallet_irr' | 'gateway_shetab' | 'wallet_usdt' | 'gateway_ecardo';
  holdToken?: string;
}

export interface CancelBookingCommand {
  actorId: string;
  bookingId: string;
  reason?: string;
}

export interface RequestRefundCommand {
  actorId: string;
  bookingId: string;
  idempotencyKey: string;
  reason?: string;
  penaltyPercentage?: number;
}

export class BookingApplicationService {
  /**
   * Resolves canonical supplier base price server-side
   */
  static async resolveServerBasePrice(type: string, itemId?: string): Promise<number | null> {
    if (!itemId) {
      if (type === 'TOUR' || type === 'TOURS') return TOURS[0]?.price ?? 85000000;
      return null;
    }

    const flight = FLIGHTS.find((f) => f.id === itemId);
    if (flight) return flight.price;

    const hotel = HOTELS.find((h) => h.id === itemId);
    if (hotel) return hotel.pricePerNight;

    const tour = TOURS.find((t) => t.id === itemId);
    if (tour) return tour.price;

    const transfer = TRANSFERS.find((tr) => tr.id === itemId);
    if (transfer) return transfer.price;

    const visa = VISA_SERVICES.find((v) => v.id === itemId);
    if (visa) return visa.price;

    const esim = ESIM_PACKAGES.find((e) => e.id === itemId);
    if (esim) return esim.price;

    const insurance = INSURANCE_PLANS.find((i) => i.id === itemId);
    if (insurance) return insurance.price;

    if (type === 'TOUR' || type === 'TOURS') {
      let dbTour: { price: unknown } | null = null;
      try {
        dbTour = await prisma.tour.findUnique({ where: { id: itemId } });
      } catch {
        dbTour = null;
      }
      if (dbTour) return Number(dbTour.price);

      if (itemId.startsWith('exp_')) {
        const { ContentDomainService } = await import('@/domains/content/ContentDomainService');
        const exps = await ContentDomainService.getExperiences().catch(() => []);
        const exp = (exps || []).find(
          (e: { id?: string; title?: string; titleEn?: string; fromPrice?: unknown }) =>
            e.id === itemId || `exp_${encodeURIComponent(e.titleEn || e.title || '')}` === itemId
        );
        if (exp && typeof exp.fromPrice === 'number') return exp.fromPrice;
      }

      // Synthetic tour-ish ids (AI planner / contextual / experiences) keep the
      // catalog fallback; anything else must resolve from DB or inventory —
      // pricing an unknown item at the demo tour price is a price-authority hole.
      if (itemId.startsWith('ctx-') || itemId.startsWith('exp_') || itemId.startsWith('plan_') || itemId.startsWith('int_')) {
        return TOURS[0]?.price ?? 85000000;
      }
      return null;
    }

    if (type === 'HOTEL') {
      const liveHotel = (await getHotelByIdAsync(itemId)) || getHotelById(itemId);
      if (liveHotel && typeof liveHotel.pricePerNight === 'number') {
        return liveHotel.pricePerNight;
      }
    }

    if (type === 'FLIGHT') {
      const livePartoPrice = itemId ? await getLiveFlightPriceById(itemId) : null;
      if (livePartoPrice !== null) return livePartoPrice;

      const livePrice = getFlightPriceById(itemId ?? '');
      if (livePrice !== null) return livePrice;
    }

    return null;
  }

  static resolveAddonPrice(kind: 'esim' | 'insurance'): number | null {
    if (kind === 'esim') {
      return ESIM_PACKAGES[0] ? ESIM_PACKAGES[0].price : null;
    }
    const plan = INSURANCE_PLANS[0];
    return plan ? plan.price : null;
  }

  static sanitizePassengers(passengers: PassengerPii[] | undefined) {
    return (passengers || []).map((p) => ({
      ...p,
      nationalId: p.nationalId ? encryptSensitive(p.nationalId) : p.nationalId,
      passportNo: p.passportNo ? encryptSensitive(p.passportNo) : p.passportNo,
    }));
  }

  /**
   * COMMAND 1: Create Booking Draft (BOOK-101)
   * Enforces command authorization, server pricing, policy snapshotting, hold creation,
   * quote generation, multidimensional consistency, and relational status history.
   */
  static async createDraft(cmd: CreateBookingDraftCommand) {
    if (!cmd.actorId) {
      throw new Error('Unauthorized: Actor ID required to create booking draft');
    }

    const tenantCtx = await getTenantAuthContext(cmd.actorId).catch(() => null);

    // 1. Resolve canonical base price server-side
    const baseUnitCost = await this.resolveServerBasePrice(cmd.type, cmd.itemId);
    if (baseUnitCost === null) {
      throw new Error('Unknown item or unavailable product');
    }

    const quantity = Math.max(1, cmd.count || 1);
    const nights = Math.max(1, cmd.nights || 1);

    let totalAddonsCost = 0;
    if (cmd.addons?.esim || cmd.addonIds?.includes('esim')) {
      const price = this.resolveAddonPrice('esim');
      if (price === null) throw new Error('Add-on unavailable: esim');
      totalAddonsCost += price;
    }
    if (cmd.addons?.insurance || cmd.addonIds?.includes('insurance')) {
      const price = this.resolveAddonPrice('insurance');
      if (price === null) throw new Error('Add-on unavailable: insurance');
      totalAddonsCost += price;
    }

    // 2. Validate referral code if provided (REF-001)
    const referralValidation = cmd.referralCode
      ? await ReferralDomainService.validateCode(cmd.referralCode, cmd.actorId)
      : null;

    const referralDiscountPercent = referralValidation?.valid ? referralValidation.discountPercent : 0;

    // 2b. Canonical server-side pricing
    const { pricing } = BookingDomainService.computeDraftPricing({
      productType: cmd.type,
      baseUnitCost,
      quantity,
      nights,
      totalAddonsCost,
      userRole: cmd.userRole || 'CUSTOMER',
      supplierId: cmd.itemId ? 'sup_dynamic' : 'sup_default_firuzo',
      currency: 'IRR',
      referralDiscountPercent,
      referralCode: referralValidation?.normalizedCode || cmd.referralCode,
    });

    const finalTotalAmount = pricing.sellPrice;
    const currency = 'IRR';

    // 3. User verification
    let user = await prisma.user.findUnique({ where: { id: cmd.actorId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: cmd.actorId,
          name: 'Firuzo User',
        },
      });
    }

    const reference = `ITR-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // 4. Hold inventory through InventoryEngine (INV-101)
    let holdToken: string | undefined = undefined;
    if (cmd.itemId) {
      const travelDate = cmd.travelDate || new Date().toISOString().split('T')[0];
      const holdRes = await InventoryEngine.createHold({
        inventoryItemId: cmd.itemId,
        date: travelDate,
        quantity,
        ttlMinutes: 15,
      });

      if (holdRes.success && holdRes.token) {
        holdToken = holdRes.token;
      }
    }

    let validInventoryItemId: string | null = null;
    if (cmd.itemId) {
      const dbItem = await prisma.inventoryItem.findUnique({ where: { id: cmd.itemId } }).catch(() => null);
      if (dbItem) validInventoryItemId = dbItem.id;
    }

    const targetStatus: BookingState = holdToken ? 'HELD' : 'DRAFT';
    if (targetStatus === 'HELD') {
      BookingStateMachine.assertTransition('DRAFT', 'HELD');
    }

    // Multidimensional consistency validation (BOOK-107)
    BookingStateMachine.assertConsistency({
      status: targetStatus,
      paymentStatus: 'INITIATED',
      fulfillmentStatus: 'PENDING',
      ticketStatus: 'NOT_ISSUED',
    });

    // 5. Canonical policy snapshot (BOOK-104)
    const policy = PolicySnapshotDomainService.createDefaultPolicy(cmd.type);
    const policySnapshot = PolicySnapshotDomainService.serialize(policy);

    // 6. Persist booking with relational history (BOOK-103) — NO stateHistory legacy writes!
    let booking;
    try {
      booking = await prisma.booking.create({
        data: {
          reference,
          customerId: cmd.actorId,
          organizationId: tenantCtx?.organizationId || null,
          branchId: tenantCtx?.branchId || null,
          status: targetStatus,
          paymentStatus: 'INITIATED',
          fulfillmentStatus: 'PENDING',
          ticketStatus: 'NOT_ISSUED',
          totalAmount: finalTotalAmount,
          currency,
          travelDate: cmd.travelDate || null,
          holdToken,
          policySnapshot,
          // Legacy stateHistory omitted intentionally (BOOK-103)
          items: {
            create: {
              type: cmd.type,
              inventoryItemId: validInventoryItemId,
              netCost: pricing.netCost,
              markup: pricing.markupAmount,
              taxAmount: pricing.taxAmount,
              feeAmount: pricing.serviceFee,
              sellPrice: finalTotalAmount,
              details: JSON.stringify({
                type: cmd.type,
                itemId: cmd.itemId,
                itemTitle: cmd.itemTitle,
                count: quantity,
                nights,
                travelDate: cmd.travelDate,
                addonIds: cmd.addonIds,
                addons: cmd.addons,
                contactEmail: cmd.contactEmail,
                contactPhone: cmd.contactPhone,
                passengers: this.sanitizePassengers(cmd.passengers),
                pricingBreakdown: {
                  netCost: pricing.netCost,
                  markupAmount: pricing.markupAmount,
                  taxAmount: pricing.taxAmount,
                  serviceFee: pricing.serviceFee,
                  sellPrice: pricing.sellPrice,
                  roundingDelta: pricing.roundingDelta,
                },
              }),
            },
          },
          statusHistory: {
            create: {
              fromStatus: 'INITIAL',
              toStatus: targetStatus,
              actor: cmd.actorId,
              reason: 'Booking draft created via canonical BookingApplicationService',
            },
          },
          referral: referralValidation
            ? {
                create: {
                  referralCodeId: referralValidation.referralCodeId || null,
                  rawCode: referralValidation.rawCode || cmd.referralCode || '',
                  status: referralValidation.status,
                  paxCount: (cmd.passengers && cmd.passengers.length > 0) ? cmd.passengers.length : quantity,
                  discountAmount: pricing.snapshot.discountAmount,
                  discountPercent: referralValidation.discountPercent,
                  applied: referralValidation.valid && Number(pricing.snapshot.discountAmount) > 0,
                  source: cmd.source || 'WEB',
                  registeredByUserId: cmd.actorId,
                },
              }
            : undefined,
        },
      });
    } catch (createErr) {
      if (holdToken) {
        await InventoryEngine.releaseHold(holdToken).catch(() => null);
      }
      throw createErr;
    }

    // 7. Link hold through engine without bypass (INV-101)
    if (holdToken) {
      await InventoryEngine.linkHoldToBooking(holdToken, booking.id);
    }

    // 8. Create Quote aggregate and canonical PriceSnapshot (MONEY-105, MONEY-106)
    await QuoteDomainService.createQuote({
      bookingId: booking.id,
      supplierRef: cmd.itemId ? `SUP-${cmd.type}-${cmd.itemId}` : undefined,
      breakdown: pricing.breakdown,
      ttlMinutes: 15,
    });

    // 9. Assign to Travel File / Trip (ERP-001)
    const { TravelFileDomainService } = await import('@/domains/erp/TravelFileDomainService');
    await TravelFileDomainService.assignBookingToTrip(cmd.actorId, booking.id, cmd.type).catch((err) => {
      console.warn('Non-fatal travel file assignment failed:', err);
    });

    businessMetrics.recordDraftCreated(cmd.type, finalTotalAmount);

    return {
      success: true as const,
      bookingId: booking.id,
      reference: booking.reference,
      totalAmount: finalTotalAmount,
      discountAmount: Number(pricing.snapshot.discountAmount),
      currency,
      status: booking.status,
      referralStatus: referralValidation ? referralValidation.status : undefined,
    };
  }

  /**
   * COMMAND 2: Authoritative Reprice Before Payment (MONEY-108, MONEY-109, MONEY-110)
   * Enforces quote expiration, recalculates price, and handles price change customer acceptance.
   */
  static async repriceBooking(cmd: RepriceBookingCommand) {
    const booking = await prisma.booking.findUnique({
      where: { id: cmd.bookingId },
      include: { items: true },
    });

    if (!booking) throw new Error('Booking not found');

    // Command authorization (BOOK-106)
    const tenantCtx = await getTenantAuthContext(cmd.actorId);
    assertTenantAccess(tenantCtx, {
      customerId: booking.customerId,
      organizationId: booking.organizationId,
      branchId: booking.branchId,
    });

    if (booking.status !== 'PENDING_PAYMENT' && booking.status !== 'HELD' && booking.status !== 'DRAFT') {
      throw new Error(`Cannot reprice booking in current state: ${booking.status}`);
    }

    // Recalculate fresh base costs server-side
    let totalBaseCost = 0;
    for (const item of booking.items) {
      let itemCount = 1;
      let parsedDetails: Record<string, unknown> = {};
      try {
        parsedDetails = item.details ? JSON.parse(item.details) : {};
        if (parsedDetails.count) itemCount = Number(parsedDetails.count) || 1;
      } catch {}

      const itemId = item.inventoryItemId || (typeof parsedDetails.itemId === 'string' ? parsedDetails.itemId : undefined);
      const freshPrice = await this.resolveServerBasePrice(item.type, itemId);
      if (freshPrice !== null) {
        totalBaseCost += freshPrice * itemCount;
      } else {
        totalBaseCost += Number(item.netCost);
      }
    }

    const { pricing } = BookingDomainService.computeDraftPricing({
      productType: booking.items[0]?.type || 'HOTEL',
      baseUnitCost: totalBaseCost,
      quantity: 1,
      nights: 1,
      userRole: 'CUSTOMER',
      currency: booking.currency as SupportedCurrency,
    });

    const oldTotalMoney = new Money(booking.totalAmount, booking.currency);
    const newTotalMoney = pricing.breakdown.sellPrice;
    const priceChanged = !oldTotalMoney.equals(newTotalMoney);
    const isPriceIncrease = newTotalMoney.greaterThan(oldTotalMoney);

    // Customer acceptance logic (MONEY-110)
    if (priceChanged && isPriceIncrease) {
      const customerAccepted =
        cmd.acceptPriceChange === true ||
        (cmd.customerAcceptedPrice &&
          new Money(cmd.customerAcceptedPrice, booking.currency).greaterThanOrEqual(newTotalMoney));

      if (!customerAccepted) {
        return {
          success: false,
          priceChanged: true,
          requiresCustomerAcceptance: true,
          oldTotalAmount: oldTotalMoney.toNumber(),
          newTotalAmount: newTotalMoney.toNumber(),
          priceDifference: newTotalMoney.sub(oldTotalMoney).toNumber(),
          currency: booking.currency,
          error: 'PRICE_INCREASED_REQUIRES_ACCEPTANCE: Price has changed from supplier. Customer acceptance is required.',
        };
      }
    }

    // Retrieve previous quote to replace it
    const latestQuote = await QuoteDomainService.getLatestQuoteForBooking(booking.id);
    if (latestQuote) {
      await QuoteDomainService.replaceQuote(latestQuote.quoteNumber, {
        bookingId: booking.id,
        supplierRef: latestQuote.supplierRef,
        breakdown: pricing.breakdown,
        ttlMinutes: 15,
      });
    } else {
      await QuoteDomainService.createQuote({
        bookingId: booking.id,
        breakdown: pricing.breakdown,
        ttlMinutes: 15,
      });
    }

    // Update booking total amount and write status history
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { totalAmount: newTotalMoney.toDecimal() },
      });

      if (priceChanged) {
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: booking.status,
            actor: cmd.actorId,
            reason: `Authoritative reprice: ${oldTotalMoney.toString()} -> ${newTotalMoney.toString()} (Customer accepted)`,
          },
        });
      }
    });

    if (priceChanged) {
      businessMetrics.recordPriceChange(oldTotalMoney.toNumber(), newTotalMoney.toNumber());
    }

    return {
      success: true,
      priceChanged,
      oldTotalAmount: oldTotalMoney.toNumber(),
      newTotalAmount: newTotalMoney.toNumber(),
      currency: booking.currency,
    };
  }

  /**
   * COMMAND 3: Confirm Payment (BOOK-101, MONEY-108)
   * Validates command authorization, enforces quote expiry, and delegates to BookingSagaOrchestrator.
   */
  static async confirmPayment(cmd: ConfirmPaymentCommand) {
    const booking = await prisma.booking.findUnique({
      where: { id: cmd.bookingId },
      select: { id: true, customerId: true, organizationId: true, branchId: true, status: true, totalAmount: true, currency: true },
    });
    if (!booking) throw new Error('Booking not found');

    // Command authorization (BOOK-106)
    const tenantCtx = await getTenantAuthContext(cmd.actorId);
    assertTenantAccess(tenantCtx, {
      customerId: booking.customerId,
      organizationId: booking.organizationId,
      branchId: booking.branchId,
    });

    if (['CONFIRMED', 'CANCELLED', 'REFUNDED', 'REFUND_INITIATED', 'CANCEL_REQUESTED', 'CANCELLING'].includes(booking.status)) {
      throw new Error(`Booking is not payable in its current state: ${booking.status}`);
    }

    // Server-side Quote Expiry Enforcement (MONEY-108)
    const latestSnapshot = await PriceSnapshotDomainService.getLatestSnapshot(booking.id);
    if (latestSnapshot && PriceSnapshotDomainService.isExpired(latestSnapshot)) {
      // Mark quote expired
      const latestQuote = await QuoteDomainService.getLatestQuoteForBooking(booking.id);
      if (latestQuote && latestQuote.status === 'ACTIVE') {
        await QuoteDomainService.expireQuote(latestQuote.quoteNumber, 'TTL window expired at checkout validation');
      }

      return {
        success: false,
        error: 'QUOTE_EXPIRED: Price quote has expired (15-minute TTL). Please reprice before payment.',
        requiresReprice: true,
      };
    }

    // Execute saga
    const result = await BookingSagaOrchestrator.confirmBookingSaga({
      bookingId: cmd.bookingId,
      idempotencyKey: cmd.idempotencyKey,
      paymentMethod: cmd.paymentMethod,
      holdToken: cmd.holdToken,
    });

    return { success: true, booking: result.booking };
  }

  /**
   * COMMAND 4: Cancel Booking (BOOK-101, BOOK-105, INV-101)
   */
  static async cancelBooking(cmd: CancelBookingCommand) {
    const booking = await prisma.booking.findUnique({
      where: { id: cmd.bookingId },
    });
    if (!booking) throw new Error('Booking not found');

    // Authorization: User owns booking or has ops override permission (BOOK-106)
    const tenantCtx = await getTenantAuthContext(cmd.actorId);
    try {
      assertTenantAccess(tenantCtx, {
        customerId: booking.customerId,
        organizationId: booking.organizationId,
        branchId: booking.branchId,
      });
    } catch {
      const hasOverride = tenantCtx.isSuperAdmin || tenantCtx.permissions.has('ops:override:cancel');
      if (!hasOverride) {
        throw new Error('Forbidden: Access denied to cancel booking');
      }
    }

    // Assert transition (BOOK-105)
    BookingStateMachine.assertTransition(booking.status as BookingState, 'CANCEL_REQUESTED');

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCEL_REQUESTED' },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: 'CANCEL_REQUESTED',
          actor: cmd.actorId,
          reason: cmd.reason || 'Customer cancellation request',
        },
      });

      // Release active hold if present (INV-101)
      if (booking.holdToken) {
        await InventoryEngine.releaseHold(booking.holdToken, tx);
      }
    });

    return { success: true, status: 'CANCEL_REQUESTED' };
  }

  /**
   * COMMAND 5: Request Refund (BOOK-101, REF-001)
   */
  static async requestRefund(cmd: RequestRefundCommand): Promise<RefundResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: cmd.bookingId },
    });
    if (!booking) throw new Error('Booking not found');

    const tenantCtx = await getTenantAuthContext(cmd.actorId);
    try {
      assertTenantAccess(tenantCtx, {
        customerId: booking.customerId,
        organizationId: booking.organizationId,
        branchId: booking.branchId,
      });
    } catch {
      const hasApprove = tenantCtx.isSuperAdmin || tenantCtx.permissions.has('booking:refund:approve');
      if (!hasApprove) {
        throw new Error('Forbidden: Access denied to request refund');
      }
    }

    return RefundDomainService.processRefund({
      bookingId: cmd.bookingId,
      idempotencyKey: cmd.idempotencyKey,
      reason: cmd.reason,
      penaltyPercentage: cmd.penaltyPercentage,
      approvedBy: cmd.actorId,
    });
  }
}
