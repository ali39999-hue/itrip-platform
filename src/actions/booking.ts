'use server';

import { prisma } from '@/lib/prisma';
import { bookingSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { safeAuth } from '@/auth';
import { BookingApplicationService } from '@/domains/booking/BookingApplicationService';
import { BookingDomainService } from '@/domains/booking/BookingDomainService';
import { getTenantAuthContext, assertTenantAccess } from '@/domains/identity/permission-service';
import { decryptSensitive } from '@/lib/security/crypto-vault';

export async function createBookingDraft(data: unknown): Promise<
  | { success: true; bookingId: string; reference: string; totalAmount: number; currency: string; status: string; error?: undefined }
  | { success: false; error: string; bookingId?: undefined }
> {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;
    const userRole = session.user.role || 'CUSTOMER';

    // 1. Validate data structure purely based on IDs/quantities
    const parsed = bookingSchema.parse(data);

    // 2. Delegate directly to canonical BookingApplicationService (BOOK-101, BOOK-102)
    const result = await BookingApplicationService.createDraft({
      actorId: userId,
      type: parsed.type,
      itemId: parsed.itemId,
      itemTitle: parsed.itemTitle,
      count: parsed.count,
      nights: parsed.nights,
      travelDate: parsed.travelDate,
      addonIds: parsed.addonIds,
      addons: parsed.addons,
      passengers: parsed.passengers,
      contactEmail: parsed.contactEmail,
      contactPhone: parsed.contactPhone,
      userRole,
    });

    return {
      success: true,
      bookingId: result.bookingId,
      reference: result.reference,
      totalAmount: result.totalAmount,
      currency: result.currency,
      status: result.status,
    };
  } catch (err: unknown) {
    console.error('createBookingDraft server error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create booking draft';
    return { success: false, error: message };
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

    // Delegate directly to canonical BookingApplicationService (BOOK-101, BOOK-102)
    const result = await BookingApplicationService.confirmPayment({
      actorId: session.user.id,
      bookingId,
      idempotencyKey,
      paymentMethod: method,
    });

    if (!result.success) {
      return result;
    }

    revalidatePath('/my-trips');
    revalidatePath('/wallet');
    return { success: true, booking: result.booking };
  } catch (err: unknown) {
    console.error('payBooking saga error:', err);
    const message = err instanceof Error ? err.message : 'Payment processing failed';
    return { success: false, error: message };
  }
}

/**
 * Server-authoritative reprice command for checkout (MONEY-108, MONEY-109, MONEY-110).
 * Delegates to canonical BookingApplicationService.
 */
export async function repriceBookingAction(
  bookingId: string,
  options?: { acceptPriceChange?: boolean; customerAcceptedPrice?: number }
) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };

    const res = await BookingApplicationService.repriceBooking({
      actorId: session.user.id,
      bookingId,
      acceptPriceChange: options?.acceptPriceChange,
      customerAcceptedPrice: options?.customerAcceptedPrice,
    });

    return {
      ...res,
      newTotalAmount: res.newTotalAmount,
      currency: res.currency,
    };
  } catch (err: unknown) {
    console.error('repriceBookingAction error:', err);
    const message = err instanceof Error ? err.message : 'Failed to reprice booking';
    return { success: false, error: message };
  }
}

export async function cancelBookingAction(bookingId: string, reason?: string) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };

    const res = await BookingApplicationService.cancelBooking({
      actorId: session.user.id,
      bookingId,
      reason,
    });

    revalidatePath('/my-trips');
    return res;
  } catch (err: unknown) {
    console.error('cancelBookingAction error:', err);
    const message = err instanceof Error ? err.message : 'Failed to cancel booking';
    return { success: false, error: message };
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

    // Strict Tenant Isolation & IDOR Check (IAM-002, IAM-003)
    const tenantCtx = await getTenantAuthContext(userId);
    try {
      assertTenantAccess(tenantCtx, {
        customerId: booking.customerId,
        organizationId: booking.organizationId,
        branchId: booking.branchId,
      });
    } catch {
      return { success: false, error: 'Forbidden: Access denied to booking', booking: null };
    }

    // Owner/tenant-authorized read: passenger PII in the details snapshot is
    // decrypted server-side so the raw ciphertext never reaches the client.
    const sanitizedBooking = {
      ...booking,
      items: booking.items.map((item) => {
        if (!item.details) return item;
        try {
          const parsedDetails = JSON.parse(item.details);
          if (Array.isArray(parsedDetails.passengers)) {
            parsedDetails.passengers = parsedDetails.passengers.map(
              (p: { nationalId?: string; passportNo?: string } & Record<string, unknown>) => ({
                ...p,
                nationalId: p.nationalId ? decryptSensitive(p.nationalId) : p.nationalId,
                passportNo: p.passportNo ? decryptSensitive(p.passportNo) : p.passportNo,
              })
            );
          }
          return { ...item, details: JSON.stringify(parsedDetails) };
        } catch {
          return item;
        }
      }),
    };

    return { success: true, booking: sanitizedBooking };
  } catch (err: unknown) {
    console.error('getBookingById server error:', err);
    return { success: false, error: 'Failed to fetch booking', booking: null };
  }
}

/**
 * Authoritative unified chronological timeline for a booking (BOOK-013).
 * Tenant and owner-scoped: users/agents can inspect full lifecycle audit trail.
 */
export async function getBookingTimelineAction(bookingId: string) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized', events: [] };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true, organizationId: true, branchId: true },
    });
    if (!booking) return { success: false, error: 'Booking not found', events: [] };

    const tenantCtx = await getTenantAuthContext(session.user.id);
    try {
      assertTenantAccess(tenantCtx, {
        customerId: booking.customerId,
        organizationId: booking.organizationId,
        branchId: booking.branchId,
      });
    } catch {
      return { success: false, error: 'Forbidden: Access denied to booking timeline', events: [] };
    }

    const events = await BookingDomainService.getBookingTimeline(bookingId);
    return { success: true, events };
  } catch (err: unknown) {
    console.error('getBookingTimelineAction server error:', err);
    return { success: false, error: 'Failed to fetch booking timeline', events: [] };
  }
}

export async function requestWalletTopUp(amountIrr: number) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };
    if (!Number.isFinite(amountIrr) || amountIrr < 10000) {
      return { success: false, error: 'Minimum top-up is 10,000' };
    }

    const { PaymentDomainService } = await import('@/domains/payments/PaymentDomainService');
    const { ShetabGatewayAdapter } = await import('@/domains/payments/gateway-port');
    const { Money } = await import('@/lib/finance');

    const idempotencyKey = `topup_intent_${session.user.id}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const moneyAmount = new Money(amountIrr, 'IRR');

    // Create durable PaymentIntent for this wallet charge (PAY-001)
    const intent = await PaymentDomainService.createPaymentIntent({
      bookingId: `wallet_topup_${session.user.id}`,
      amount: moneyAmount,
      currency: 'IRR',
      idempotencyKey,
      ttlMinutes: 20,
    });

    // In demo mode, immediately settle via ledger for local verification
    if (process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production') {
      const { GeneralLedgerService } = await import('@/domains/ledger/GeneralLedgerService');
      await GeneralLedgerService.postTopUp({
        groupId: `topup_grp_${intent.id}`,
        userId: session.user.id,
        amount: moneyAmount,
        currency: 'IRR',
        referenceId: intent.id,
      });
      revalidatePath('/wallet');
      return { success: true, intentId: intent.id };
    }

    // In production, initiate Shetab gateway payment request via adapter
    const adapter = new ShetabGatewayAdapter();
    const gwRes = await adapter.createPayment({
      intentId: intent.id,
      bookingId: intent.bookingId,
      amount: new Money(intent.amount, 'IRR'),
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/callback`,
      customerInfo: {
        email: session.user.email || undefined,
      },
    });

    return {
      success: true,
      intentId: intent.id,
      gatewayRef: gwRes.gatewayRef,
      redirectUrl: gwRes.redirectUrl,
    };
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
    const { Money } = await import('@/lib/finance');
    const { Prisma } = await import('@prisma/client');

    // Balance check straight from GeneralLedgerService with Decimal precision (MONEY-012)
    const account = await prisma.account.findFirst({
      where: { ownerType: 'USER', ownerId: session.user.id, currency: from },
    });
    const balance = account ? await GeneralLedgerService.getAccountBalance(account.id, from) : null;
    const fromMoney = new Money(amount, from);
    if (!balance || balance.lessThan(fromMoney)) {
      return { success: false, error: 'Insufficient balance' };
    }

    // 0.5% exchange spread retained as platform revenue.
    const converted = defaultCurrencyService.convert(amount, from, to);
    const toMoney = new Money(converted, to);
    const spreadMoney = toMoney.mul(new Prisma.Decimal('0.005')).round(2);

    await GeneralLedgerService.postFXConversion({
      groupId: `fx_${session.user.id}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      userId: session.user.id,
      fromCurrency: from,
      toCurrency: to,
      fromAmount: fromMoney,
      toAmount: toMoney,
      spreadAmount: spreadMoney,
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

    const { GeneralLedgerService } = await import('@/domains/ledger/GeneralLedgerService');
    const { Money } = await import('@/lib/finance');

    // Demo convenience: seed a starter wallet through the real ledger (TOPUP
    // entries) so wallet payments work in DEMO_MODE. Never runs in production.
    const DEMO_MODE = process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
    if (DEMO_MODE) {
      const existingAccounts = await prisma.account.count({ where: { ownerType: 'USER', ownerId: userId } });
      if (existingAccounts === 0) {
        await GeneralLedgerService.postTopUp({
          groupId: `demo_topup_${userId}_${Date.now()}`,
          userId,
          amount: new Money(150_000_000, 'IRR'),
          currency: 'IRR',
          referenceId: 'DEMO_SEED',
        });
        await GeneralLedgerService.postTopUp({
          groupId: `demo_topup_${userId}_${Date.now()}_usdt`,
          userId,
          amount: new Money(250, 'USDT'),
          currency: 'USDT',
          referenceId: 'DEMO_SEED',
        });
      }
    }

    // Authoritative Decimal-precise balance aggregation via GeneralLedgerService (MONEY-012)
    const balances = await GeneralLedgerService.getUserBalances(userId);

    const accounts = await prisma.account.findMany({
      where: { ownerType: 'USER', ownerId: userId },
      include: {
        entries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

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
      acc.entries.forEach((e) => {
        allEntries.push({
          id: e.id,
          groupId: e.groupId,
          direction: e.direction,
          amount: Number(e.amount),
          currency: e.currency,
          referenceType: e.referenceType,
          referenceId: e.referenceId,
          createdAt: e.createdAt,
        });
      });
    });

    allEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      success: true,
      balances: {
        IRR: balances.IRR ? balances.IRR.toNumber() : 0,
        USDT: balances.USDT ? balances.USDT.toNumber() : 0,
        AED: balances.AED ? balances.AED.toNumber() : 0,
      } as { IRR: number; USDT: number; AED: number },
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
