'use server';

import { prisma } from '@/lib/prisma';
import { bookingSchema } from '@/lib/validations';
import { calculatePricing } from '@/lib/pricing/engine';
import { FLIGHTS, HOTELS, TOURS, TRANSFERS, VISA_SERVICES, ESIM_PACKAGES, INSURANCE_PLANS } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { BookingSagaOrchestrator } from '@/domains/booking/saga-orchestrator';

const ESIM_PRICE_FALLBACK = 2800000;
const INSURANCE_PRICE_FALLBACK = 1900000;

function resolveServerBasePrice(type: string, itemId?: string): number {
  if (!itemId) {
    if (type === 'FLIGHT') return FLIGHTS[0]?.price ?? 28500000;
    if (type === 'HOTEL') return HOTELS[0]?.pricePerNight ?? 42000000;
    if (type === 'TOUR') return TOURS[0]?.price ?? 85000000;
    if (type === 'TRANSFER') return TRANSFERS[0]?.price ?? 3200000;
    if (type === 'VISA') return VISA_SERVICES[0]?.price ?? 48000000;
    if (type === 'ESIM') return ESIM_PACKAGES[0]?.price ?? 2800000;
    if (type === 'INSURANCE') return INSURANCE_PLANS[0]?.price ?? 350000;
    return 34500000;
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

  return 34500000;
}

export async function createBookingDraft(data: unknown) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;
    const userRole = session.user.role || 'CUSTOMER';

    // 1. Validate data structure purely based on IDs/quantities
    const parsed = bookingSchema.parse(data);

    // 2. Compute canonical price strictly on the server using pricing engine
    const baseUnitCost = resolveServerBasePrice(parsed.type, parsed.itemId);
    const quantity = parsed.count || 1;
    const nights = parsed.nights || 1;
    const totalBaseItemCost = parsed.type === 'HOTEL' ? baseUnitCost * nights * quantity : baseUnitCost * quantity;

    let totalAddonsCost = 0;
    if (parsed.addons?.esim || parsed.addonIds?.includes('esim')) {
      totalAddonsCost += ESIM_PRICE_FALLBACK;
    }
    if (parsed.addons?.insurance || parsed.addonIds?.includes('insurance')) {
      totalAddonsCost += INSURANCE_PRICE_FALLBACK;
    }

    const rawNetCost = totalBaseItemCost + totalAddonsCost;

    const pricing = calculatePricing({
      userRole,
      supplierId: 'sup_default_firuzo',
      productType: parsed.type,
      basePrice: rawNetCost,
      currency: 'IRR',
    });

    const finalTotalAmount = pricing.sellPrice;
    const currency = 'IRR';

    // 3. Ensure user exists in DB
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: session.user.email || 'user@firuzo.com',
          name: session.user.name || 'Firuzo User',
          passwordHash: 'dummy',
        },
      });
    }

    // Generate unique reference (e.g. ITR-Timestamp)
    const reference = `ITR-${Date.now()}`;

    // 4. Create Booking in DRAFT state
    const booking = await prisma.booking.create({
      data: {
        reference,
        customerId: userId,
        status: 'DRAFT',
        totalAmount: finalTotalAmount,
        currency,
        items: {
          create: {
            type: parsed.type,
            netCost: pricing.netCost,
            markup: pricing.markupAmount + pricing.serviceFee,
            sellPrice: finalTotalAmount,
            details: JSON.stringify({
              ...parsed,
              pricingBreakdown: {
                netCost: pricing.netCost,
                markupAmount: pricing.markupAmount,
                serviceFee: pricing.serviceFee,
                sellPrice: pricing.sellPrice,
              },
            }),
          },
        },
      },
    });

    return { success: true, bookingId: booking.id, totalAmount: finalTotalAmount, currency };
  } catch (err: unknown) {
    console.error('createBookingDraft server error:', err);
    return { success: false, error: 'Failed to create booking draft' };
  }
}

export async function payBooking(bookingId: string, method: 'wallet_irr' | 'gateway_shetab', idempotencyKey: string) {
  try {
    const session = await auth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };

    // Validate idempotencyKey as a non-empty string
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return { success: false, error: 'Invalid idempotency key' };
    }

    const result = await BookingSagaOrchestrator.confirmBookingSaga({
      bookingId,
      idempotencyKey,
      paymentMethod: method,
    });

    revalidatePath('/my-trips');
    revalidatePath('/wallet');
    return { success: true, booking: result.booking };
  } catch (err: unknown) {
    console.error('payBooking saga error:', err);
    return { success: false, error: 'Payment processing failed' };
  }
}

export async function getMyBookings() {
  try {
    const session = await auth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized', bookings: [] };
    const userId = session.user.id;

    const bookings = await prisma.booking.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });

    return { success: true, bookings };
  } catch (err: unknown) {
    console.error('getMyBookings server error:', err);
    return { success: false, error: 'Failed to fetch bookings', bookings: [] };
  }
}

export async function getBookingById(id: string) {
  try {
    const session = await auth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized', booking: null };
    const userId = session.user.id;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        items: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!booking) return { success: false, error: 'Booking not found', booking: null };
    if (booking.customerId !== userId && session.user.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Forbidden', booking: null };
    }

    return { success: true, booking };
  } catch (err: unknown) {
    console.error('getBookingById server error:', err);
    return { success: false, error: 'Failed to fetch booking', booking: null };
  }
}

export async function getWallet() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return {
        success: false,
        error: 'Unauthorized',
        balances: { IRR: 0, USDT: 0, AED: 0 },
        transactions: [],
      };
    }
    const userId = session.user.id;

    const accounts = await prisma.account.findMany({
      where: { ownerType: 'USER', ownerId: userId },
      include: {
        entries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const balances: Record<string, number> = { IRR: 0, USDT: 0, AED: 0 };
    const allEntries: Array<{
      id: string;
      groupId: string;
      direction: string;
      amount: number;
      currency: string;
      referenceType: string | null;
      referenceId: string | null;
      createdAt: Date;
    }> = [];

    accounts.forEach((acc) => {
      let curBalance = 0;
      acc.entries.forEach((e) => {
        const amt = Number(e.amount);
        if (e.direction === 'CREDIT') {
          curBalance += amt;
        } else {
          curBalance -= amt;
        }
        allEntries.push({
          id: e.id,
          groupId: e.groupId,
          direction: e.direction,
          amount: amt,
          currency: e.currency,
          referenceType: e.referenceType,
          referenceId: e.referenceId,
          createdAt: e.createdAt,
        });
      });
      balances[acc.currency] = curBalance;
    });

    allEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      success: true,
      balances: {
        IRR: balances.IRR ?? 0,
        USDT: balances.USDT ?? 0,
        AED: balances.AED ?? 0,
      },
      transactions: allEntries,
    };
  } catch (err: unknown) {
    console.error('getWallet server error:', err);
    return {
      success: false,
      error: 'Failed to fetch wallet',
      balances: { IRR: 0, USDT: 0, AED: 0 },
      transactions: [],
    };
  }
}
