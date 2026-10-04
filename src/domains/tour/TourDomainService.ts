import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getTourById } from '@/services/tours-service';
import type {
  CreateTourBookingCommand,
  CustomizeTourBookingCommand,
  SubmitTourTravelersCommand,
  PayTourBookingCommand,
  PayTourRemainderCommand,
} from './types';

/**
 * TourDomainService
 *
 * Implements the 5-step tour booking and financial lifecycle:
 * Step 1: createTourDraft (Allotment hold with 15-minute soft lock)
 * Step 2: customizeTourBooking (hotel tier deltas & addon activities with server-calculated totals)
 * Step 3: submitTravelers (Latin characters & passport validity check)
 * Step 4: payTourBooking (FULL 100% vs DEPOSIT 30% with 7-day pre-trip deadline)
 * Step 5: payTourRemainder (settle remaining 70% before deadline)
 */
export class TourDomainService {
  /**
   * STEP 1: Create Initial Booking Draft with Allotment Hold
   */
  public static async createTourDraft(cmd: CreateTourBookingCommand) {
    const tour = getTourById(cmd.tourId);
    if (!tour) {
      throw new Error(`TOUR_NOT_FOUND: ${cmd.tourId}`);
    }

    const departure = (tour.departureDates || []).find((d) => d.id === cmd.departureDateId);
    if (!departure) {
      throw new Error(`DEPARTURE_DATE_NOT_FOUND: ${cmd.departureDateId}`);
    }

    if (departure.availableSeats < cmd.travelersCount) {
      throw new Error('INSUFFICIENT_SEATS');
    }

    const holdToken = null;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute soft-lock

    const baseAdultPrice = new Prisma.Decimal(departure.price || tour.price);
    const baseChildPrice = departure.childPrice
      ? new Prisma.Decimal(departure.childPrice)
      : baseAdultPrice.mul(0.75);

    const initialTotal = baseAdultPrice
      .mul(cmd.adultsCount)
      .add(baseChildPrice.mul(cmd.childrenCount));

    const reference = `TR-${Math.floor(100000 + Math.random() * 900000)}`;

    const detailsObj = {
      tourId: tour.id,
      tourTitle: tour.title,
      tourCity: tour.city,
      departureId: departure.id,
      departDate: departure.startDate,
      returnDate: departure.endDate,
      adultsCount: cmd.adultsCount,
      childrenCount: cmd.childrenCount,
      travelersCount: cmd.travelersCount,
      tier: cmd.hotelTier || 'STD',
      executionModel: cmd.executionModel || 'group',
      roomType: cmd.roomType || 'Standard Room',
      basePrice: initialTotal.toNumber(),
      hotelDelta: 0,
      activitiesTotal: 0,
      paymentMode: 'FULL',
      depositPercent: 30.0,
      paidAmount: 0,
      remainingBalance: initialTotal.toNumber(),
      passengers: [],
    };

    const booking = await prisma.$transaction(async (tx) => {
      return tx.booking.create({
        data: {
          reference,
          customerId: cmd.actorId,
          status: 'HELD',
          paymentStatus: 'INITIATED',
          fulfillmentStatus: 'PENDING',
          ticketStatus: 'NOT_ISSUED',
          totalAmount: initialTotal,
          currency: departure.currency || tour.currency || 'TOMAN',
          travelDate: departure.startDate,
          holdToken,
          expiresAt,
          items: {
            create: {
              type: 'TOUR',
              netCost: initialTotal.mul(0.85),
              markup: initialTotal.mul(0.15),
              sellPrice: initialTotal,
              details: JSON.stringify(detailsObj),
            },
          },
        },
        include: { items: true },
      });
    });

    return booking;
  }

  /**
   * STEP 2: Customize Booking with Hotel Tier Delta & Addon Activities
   */
  public static async customizeTourBooking(cmd: CustomizeTourBookingCommand) {
    const booking = await prisma.booking.findUnique({
      where: { id: cmd.bookingId },
      include: { items: true },
    });
    if (!booking) throw new Error('BOOKING_NOT_FOUND');
    if (booking.status !== 'HELD' && booking.status !== 'DRAFT') {
      throw new Error(`CANNOT_CUSTOMIZE_IN_STATUS_${booking.status}`);
    }

    const tourItem = booking.items.find((i) => i.type === 'TOUR');
    if (!tourItem) throw new Error('TOUR_ITEM_NOT_FOUND');

    const details = JSON.parse(tourItem.details || '{}');
    const travelersCount = Number(details.travelersCount || 1);

    // Hotel Tier pricing delta
    let hotelDelta = new Prisma.Decimal(0);
    if (cmd.hotelTier === 'LUX') {
      hotelDelta = new Prisma.Decimal(45_000_000).mul(travelersCount); // 45M upgrade for LUX
    } else if (cmd.hotelTier === 'ECO') {
      hotelDelta = new Prisma.Decimal(-15_000_000).mul(travelersCount); // -15M discount for ECO
    }

    // Addon activities pricing
    let activitiesTotal = new Prisma.Decimal(0);
    if (cmd.addonActivityIds && cmd.addonActivityIds.length > 0) {
      // 5M per activity as default catalog value
      activitiesTotal = new Prisma.Decimal(5_000_000 * cmd.addonActivityIds.length).mul(travelersCount);
    }

    const basePrice = new Prisma.Decimal(details.basePrice || tourItem.sellPrice);
    const newTotal = basePrice.add(hotelDelta).add(activitiesTotal);

    details.hotelDelta = hotelDelta.toNumber();
    details.activitiesTotal = activitiesTotal.toNumber();
    details.tier = cmd.hotelTier || details.tier;
    details.roomType = cmd.roomType || details.roomType;
    details.selectedActivityIds = cmd.addonActivityIds;
    details.remainingBalance = newTotal.toNumber();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.bookingItem.update({
        where: { id: tourItem.id },
        data: {
          sellPrice: newTotal,
          details: JSON.stringify(details),
        },
      });

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          totalAmount: newTotal,
        },
        include: { items: true },
      });
    });

    return updated;
  }

  /**
   * STEP 3: Submit Validated Traveler Information
   */
  public static async submitTravelers(cmd: SubmitTourTravelersCommand) {
    const booking = await prisma.booking.findUnique({
      where: { id: cmd.bookingId },
      include: { items: true },
    });
    if (!booking) throw new Error('BOOKING_NOT_FOUND');

    const tourItem = booking.items.find((i) => i.type === 'TOUR');
    if (!tourItem) throw new Error('TOUR_ITEM_NOT_FOUND');

    const details = JSON.parse(tourItem.details || '{}');
    if (cmd.travelers.length !== Number(details.travelersCount)) {
      throw new Error(`TRAVELER_COUNT_MISMATCH: expected ${details.travelersCount}, got ${cmd.travelers.length}`);
    }

    const departDate = new Date(details.departDate || booking.travelDate || Date.now());
    const minExpiry = new Date(departDate.getTime() + 180 * 24 * 3600 * 1000); // 6 months min

    for (const t of cmd.travelers) {
      if (!t.firstNameLatin?.trim() || !t.lastNameLatin?.trim() || !t.passportNumber?.trim()) {
        throw new Error('MISSING_MANDATORY_PASSPORT_FIELDS');
      }
      const exp = new Date(t.passportExpiry);
      if (isNaN(exp.getTime()) || exp < minExpiry) {
        throw new Error(`PASSPORT_EXPIRES_TOO_SOON: ${t.passportNumber}`);
      }
    }

    details.passengers = cmd.travelers;

    return prisma.$transaction(async (tx) => {
      await tx.bookingItem.update({
        where: { id: tourItem.id },
        data: { details: JSON.stringify(details) },
      });

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PENDING_PAYMENT',
        },
        include: { items: true },
      });
    });
  }

  /**
   * STEP 4: Pay Booking (FULL vs DEPOSIT)
   */
  public static async payTourBooking(cmd: PayTourBookingCommand) {
    const booking = await prisma.booking.findUnique({
      where: { id: cmd.bookingId },
      include: { items: true },
    });
    if (!booking) throw new Error('BOOKING_NOT_FOUND');
    if (booking.status !== 'PENDING_PAYMENT' && booking.status !== 'HELD') {
      throw new Error(`INVALID_STATUS_FOR_PAYMENT_${booking.status}`);
    }

    const tourItem = booking.items.find((i) => i.type === 'TOUR');
    const details = JSON.parse(tourItem?.details || '{}');

    const total = new Prisma.Decimal(booking.totalAmount);
    let payableNow = total;
    let remainingBalance = new Prisma.Decimal(0);
    let depositDeadline: Date | null = null;

    if (cmd.paymentMode === 'DEPOSIT') {
      const depositPct = new Prisma.Decimal(30.0).div(100);
      payableNow = total.mul(depositPct);
      remainingBalance = total.sub(payableNow);

      const departDate = new Date(details.departDate || booking.travelDate || Date.now());
      depositDeadline = new Date(departDate.getTime() - 7 * 24 * 3600 * 1000); // 7 days prior
    }

    const voucherCode = `VCH-${booking.reference}-${Math.floor(100 + Math.random() * 900)}`;

    details.paymentMode = cmd.paymentMode;
    details.paidAmount = payableNow.toNumber();
    details.remainingBalance = remainingBalance.toNumber();
    details.depositDeadline = depositDeadline?.toISOString() || null;
    details.voucherCode = voucherCode;

    return prisma.$transaction(async (tx) => {
      await tx.bookingItem.update({
        where: { id: tourItem!.id },
        data: { details: JSON.stringify(details) },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: cmd.paymentMode === 'DEPOSIT' ? 'AUTHORIZED' : 'CAPTURED',
          ticketStatus: cmd.paymentMode === 'DEPOSIT' ? 'ISSUING' : 'ISSUED',
          holdToken: null,
        },
        include: { items: true },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: 'CONFIRMED',
          actor: 'TOUR_PAYMENT',
          reason: `Tour booking confirmed via ${cmd.paymentMode} payment`,
        },
      });

      return updatedBooking;
    });
  }

  /**
   * STEP 5: Pay Remainder Balance
   */
  public static async payTourRemainder(cmd: PayTourRemainderCommand) {
    const booking = await prisma.booking.findUnique({
      where: { id: cmd.bookingId },
      include: { items: true },
    });
    if (!booking) throw new Error('BOOKING_NOT_FOUND');

    const tourItem = booking.items.find((i) => i.type === 'TOUR');
    const details = JSON.parse(tourItem?.details || '{}');

    if (!details.remainingBalance || details.remainingBalance <= 0) {
      throw new Error('NO_REMAINING_BALANCE_DUE');
    }

    if (details.depositDeadline && new Date() > new Date(details.depositDeadline)) {
      throw new Error('DEPOSIT_DEADLINE_EXPIRED_CONTACT_SUPPORT');
    }

    const remainder = Number(details.remainingBalance);
    details.paidAmount = (details.paidAmount || 0) + remainder;
    details.remainingBalance = 0;

    return prisma.$transaction(async (tx) => {
      await tx.bookingItem.update({
        where: { id: tourItem!.id },
        data: { details: JSON.stringify(details) },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'CAPTURED',
          ticketStatus: 'ISSUED',
        },
        include: { items: true },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: 'CONFIRMED',
          actor: 'TOUR_REMAINDER_PAYMENT',
          reason: 'Tour remainder balance paid in full',
        },
      });

      return updatedBooking;
    });
  }
}
