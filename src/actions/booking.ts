'use server';

import { prisma } from '@/lib/prisma';
import { bookingSchema } from '@/lib/validations';
import { calculatePricing } from '@/lib/pricing/engine';
import { FLIGHTS, HOTELS, TOURS, TRANSFERS, VISA_SERVICES, ESIM_PACKAGES, INSURANCE_PLANS } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { safeAuth } from '@/auth';
import { BookingSagaOrchestrator } from '@/domains/booking/saga-orchestrator';

import { InventoryEngine } from '@/domains/inventory/InventoryEngine';
import crypto from 'crypto';

// Addon prices resolve from the same catalog the UI uses — no magic numbers.
function resolveAddonPrice(kind: 'esim' | 'insurance'): number | null {
  if (kind === 'esim') {
    const pkg = ESIM_PACKAGES[0];
    return pkg ? pkg.price : null;
  }
  const plan = INSURANCE_PLANS[0];
  return plan ? plan.price : null;
}

/**
 * Resolves the canonical base price for an item from the product catalog.
 * Returns null when the item is unknown so callers can fail closed instead of
 * silently pricing it at an arbitrary fallback.
 */
function resolveServerBasePrice(type: string, itemId?: string): number | null {
  if (!itemId) {
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

  return null;
}

export async function createBookingDraft(data: unknown) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;
    const userRole = session.user.role || 'CUSTOMER';

    // 1. Validate data structure purely based on IDs/quantities
    const parsed = bookingSchema.parse(data);

    // 2. Compute canonical price strictly on the server using pricing engine.
    //    Unknown items fail closed — never priced from client input.
    const baseUnitCost = resolveServerBasePrice(parsed.type, parsed.itemId);
    if (baseUnitCost === null) {
      return { success: false, error: 'Unknown item or unavailable product' };
    }
    const quantity = parsed.count || 1;
    const nights = parsed.nights || 1;
    const totalBaseItemCost = parsed.type === 'HOTEL' ? baseUnitCost * nights * quantity : baseUnitCost * quantity;

    let totalAddonsCost = 0;
    if (parsed.addons?.esim || parsed.addonIds?.includes('esim')) {
      const price = resolveAddonPrice('esim');
      if (price === null) return { success: false, error: 'Add-on unavailable' };
      totalAddonsCost += price;
    }
    if (parsed.addons?.insurance || parsed.addonIds?.includes('insurance')) {
      const price = resolveAddonPrice('insurance');
      if (price === null) return { success: false, error: 'Add-on unavailable' };
      totalAddonsCost += price;
    }

    const rawNetCost = totalBaseItemCost + totalAddonsCost;

    const pricing = calculatePricing({
      userRole,
      supplierId: parsed.itemId ? 'sup_dynamic' : 'sup_default_firuzo',
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
          email: session.user.email || undefined,
          name: session.user.name || 'Firuzo User',
        },
      });
    }

    // Random suffix avoids same-millisecond unique collisions on the reference.
    const reference = `ITR-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    let holdToken = undefined;
    if (parsed.itemId) {
      // Hold inventory for the actual travel date (not "today").
      const travelDate = parsed.travelDate || new Date().toISOString().split('T')[0];
      // Attempt to create a hold linked to this booking for traceability.
      const holdRes = await InventoryEngine.createHold({
        inventoryItemId: parsed.itemId,
        date: travelDate,
        quantity: quantity,
        ttlMinutes: 15,
      });

      if (holdRes.success && holdRes.token) {
        holdToken = holdRes.token;
      }
      // A failed hold does not block the draft: ON_REQUEST products may have
      // no allotments. The booking is created as DRAFT in that case.
    }

    // 3.5 Check if parsed.itemId maps to an actual InventoryItem row in DB
    let validInventoryItemId: string | null = null;
    if (parsed.itemId) {
      const dbItem = await prisma.inventoryItem.findUnique({ where: { id: parsed.itemId } }).catch(() => null);
      if (dbItem) validInventoryItemId = dbItem.id;
    }

    // 4. Create Booking in DRAFT or HELD state
    const booking = await prisma.booking.create({
      data: {
        reference,
        customerId: userId,
        status: holdToken ? 'HELD' : 'DRAFT',
        totalAmount: finalTotalAmount,
        currency,
        holdToken,
        items: {
          create: {
            type: parsed.type,
            inventoryItemId: validInventoryItemId,
            netCost: pricing.netCost,
            markup: pricing.markupAmount,
            taxAmount: pricing.taxAmount,
            feeAmount: pricing.serviceFee,
            sellPrice: finalTotalAmount,
            details: JSON.stringify({
              ...parsed,
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
      },
    });

    // Link the hold back to the booking for release/refund traceability.
    if (holdToken) {
      await prisma.inventoryHold.updateMany({ where: { token: holdToken }, data: { bookingId: booking.id } });
    }

    return { success: true, bookingId: booking.id, totalAmount: finalTotalAmount, currency };
  } catch (err: unknown) {
    console.error('createBookingDraft server error:', err);
    return { success: false, error: 'Failed to create booking draft' };
  }
}

export async function payBooking(bookingId: string, method: 'wallet_irr' | 'gateway_shetab', idempotencyKey: string) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };

    // Validate idempotencyKey as a non-empty string
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return { success: false, error: 'Invalid idempotency key' };
    }

    // Ownership check: a user may only pay for their own booking.
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true, status: true },
    });
    if (!booking) return { success: false, error: 'Booking not found' };

    const isPrivileged = session.user.role === 'SUPER_ADMIN';
    if (booking.customerId !== session.user.id && !isPrivileged) {
      return { success: false, error: 'Forbidden' };
    }
    if (['CONFIRMED', 'CANCELLED', 'REFUNDED', 'REFUND_INITIATED', 'CANCEL_REQUESTED', 'CANCELLING'].includes(booking.status)) {
      return { success: false, error: 'Booking is not payable in its current state' };
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
    const session = await safeAuth();
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
    const session = await safeAuth();
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
    // FINANCE/OPS hold booking:view:all; customers only see their own bookings.
    const canViewAll = ['SUPER_ADMIN', 'FINANCE', 'OPS'].includes(session.user.role);
    if (booking.customerId !== userId && !canViewAll) {
      return { success: false, error: 'Forbidden', booking: null };
    }

    return { success: true, booking };
  } catch (err: unknown) {
    console.error('getBookingById server error:', err);
    return { success: false, error: 'Failed to fetch booking', booking: null };
  }
}

export async function requestWalletTopUp(amountIrr: number) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };
    if (!Number.isFinite(amountIrr) || amountIrr < 10000) {
      return { success: false, error: 'Minimum top-up is 10,000' };
    }

    // Real PSP (Shetab IPG) is not wired yet; in demo mode the top-up is
    // recorded through the real ledger so balances stay consistent.
    if (process.env.DEMO_MODE !== 'true' || process.env.NODE_ENV === 'production') {
      return { success: false, error: 'Payment gateway is not configured yet' };
    }

    const { GeneralLedgerService } = await import('@/domains/ledger/GeneralLedgerService');
    await GeneralLedgerService.postTopUp({
      groupId: `topup_${session.user.id}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      userId: session.user.id,
      amount: Math.round(amountIrr),
      currency: 'IRR',
      referenceId: 'DEMO_TOPUP',
    });
    revalidatePath('/wallet');
    return { success: true };
  } catch (err: unknown) {
    console.error('requestWalletTopUp server error:', err);
    return { success: false, error: 'Failed to process top-up' };
  }
}

export async function exchangeWalletCurrency(from: 'IRR' | 'USDT' | 'AED', to: 'IRR' | 'USDT' | 'AED', amount: number) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };
    if (from === to) return { success: false, error: 'Source and target currencies must differ' };
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    const { GeneralLedgerService } = await import('@/domains/ledger/GeneralLedgerService');
    const { defaultCurrencyService } = await import('@/domains/currency/CurrencyService');

    // Balance check straight from the ledger.
    const account = await prisma.account.findFirst({
      where: { ownerType: 'USER', ownerId: session.user.id, currency: from },
    });
    let balance = 0;
    if (account) {
      const [credits, debits] = await Promise.all([
        prisma.ledgerEntry.aggregate({ where: { accountId: account.id, direction: 'CREDIT' }, _sum: { amount: true } }),
        prisma.ledgerEntry.aggregate({ where: { accountId: account.id, direction: 'DEBIT' }, _sum: { amount: true } }),
      ]);
      balance = (Number(credits._sum.amount) || 0) - (Number(debits._sum.amount) || 0);
    }
    if (balance < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    // 0.5% exchange spread retained as platform revenue.
    const converted = defaultCurrencyService.convert(amount, from, to);
    const spread = converted * 0.005;

    await GeneralLedgerService.postFXConversion({
      groupId: `fx_${session.user.id}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      userId: session.user.id,
      fromCurrency: from,
      toCurrency: to,
      fromAmount: amount,
      toAmount: converted,
      spreadAmount: Math.round(spread * 100) / 100,
      referenceId: 'WALLET_EXCHANGE',
    });
    revalidatePath('/wallet');
    return { success: true };
  } catch (err: unknown) {
    console.error('exchangeWalletCurrency server error:', err);
    return { success: false, error: 'Exchange failed' };
  }
}

export async function getWallet() {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return {
        success: false,
        error: 'Unauthorized',
        balances: { IRR: 0, USDT: 0, AED: 0 },
        transactions: [],
      };
    }
    const userId = session.user.id;

    // Demo convenience: seed a starter wallet through the real ledger (TOPUP
    // entries) so wallet payments work in DEMO_MODE. Never runs in production.
    const DEMO_MODE = process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
    if (DEMO_MODE) {
      const existingAccounts = await prisma.account.count({ where: { ownerType: 'USER', ownerId: userId } });
      if (existingAccounts === 0) {
        const { GeneralLedgerService } = await import('@/domains/ledger/GeneralLedgerService');
        await GeneralLedgerService.postTopUp({
          groupId: `demo_topup_${userId}_${Date.now()}`,
          userId,
          amount: 150_000_000,
          currency: 'IRR',
          referenceId: 'DEMO_SEED',
        });
        await GeneralLedgerService.postTopUp({
          groupId: `demo_topup_${userId}_${Date.now()}_usdt`,
          userId,
          amount: 250,
          currency: 'USDT',
          referenceId: 'DEMO_SEED',
        });
      }
    }

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
      // A user may hold multiple accounts per currency — accumulate, don't overwrite.
      balances[acc.currency] = (balances[acc.currency] ?? 0) + curBalance;
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
