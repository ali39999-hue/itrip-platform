'use server';

import { prisma } from '@/lib/prisma';
import { bookingSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { safeAuth } from '@/auth';
import { BookingApplicationService } from '@/domains/booking/BookingApplicationService';
import { BookingDomainService } from '@/domains/booking/BookingDomainService';
import { ReferralDomainService } from '@/domains/referral/ReferralDomainService';
import { getTenantAuthContext, assertTenantAccess } from '@/domains/identity/permission-service';
import { decryptSensitive } from '@/lib/security/crypto-vault';

export async function createBookingDraft(data: unknown): Promise<
  | { success: true; bookingId: string; reference: string; totalAmount: number; discountAmount?: number; currency: string; status: string; referralStatus?: string; error?: undefined }
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
      referralCode: parsed.referralCode,
      source: parsed.source || 'WEB',
    });

    return {
      success: true,
      bookingId: result.bookingId,
      reference: result.reference,
      totalAmount: result.totalAmount,
      discountAmount: result.discountAmount,
      currency: result.currency,
      status: result.status,
      referralStatus: result.referralStatus,
    };
  } catch (err: unknown) {
    console.error('createBookingDraft server error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create booking draft';
    return { success: false, error: message };
  }
}

/**
 * Validates a referral code on demand before form submission.
 */
export async function validateReferralCodeAction(code: string) {
  try {
    const session = await safeAuth().catch(() => null);
    const userId = session?.user?.id;
    const res = await ReferralDomainService.validateCode(code, userId);
    return {
      success: true,
      valid: res.valid,
      status: res.status,
      discountPercent: res.discountPercent,
      leaderName: res.leaderName,
      reason: res.reason,
    };
  } catch (err) {
    console.error('validateReferralCodeAction error:', err);
    return { success: false, valid: false, error: 'Failed to validate referral code' };
  }
}

export async function payBooking(
  bookingId: string,
  method: 'wallet_irr' | 'gateway_shetab' | 'gateway_ecardo',
  idempotencyKey: string
) {
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
 * Direct eCardo Gateway Payment Initialization (corridor Iran-China / International)
 * Generates an official payment session URL on ecardo.ir and redirects user directly.
 */
export async function initiateEcardoPayment(bookingId: string, currency?: string) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true, totalAmount: true, currency: true, status: true },
    });

    if (!booking) return { success: false, error: 'Booking not found' };
    if (['CONFIRMED', 'CANCELLED', 'REFUNDED'].includes(booking.status)) {
      return { success: false, error: 'Booking is not payable in its current state' };
    }

    const { EcardoGatewayAdapter } = await import('@/domains/payments/gateway-port');
    const { Money } = await import('@/lib/finance');
    const { getAppBaseUrl } = await import('@/lib/runtime-url');

    const targetCurrency = (currency || booking.currency || 'USD').toUpperCase();
    const adapter = new EcardoGatewayAdapter();

    const paymentRes = await adapter.createPayment({
      intentId: `intent_ecardo_${booking.id}`,
      bookingId: booking.id,
      amount: new Money(booking.totalAmount, targetCurrency),
      callbackUrl: `${getAppBaseUrl()}/api/payments/ecardo/callback?bookingId=${booking.id}&order_id=${booking.id}`,
      customerInfo: {
        email: session.user.email || undefined,
      },
    });

    if (paymentRes.success && paymentRes.redirectUrl) {
      await prisma.payment.upsert({
        where: { idempotencyKey: `ecardo_${booking.id}_${paymentRes.gatewayRef}` },
        update: {
          gatewayRef: paymentRes.gatewayRef,
          status: 'PENDING',
        },
        create: {
          bookingId: booking.id,
          method: 'gateway_ecardo',
          gatewayRef: paymentRes.gatewayRef,
          amount: booking.totalAmount,
          currency: targetCurrency,
          status: 'PENDING',
          idempotencyKey: `ecardo_${booking.id}_${paymentRes.gatewayRef}`,
        },
      });

      return {
        success: true,
        redirectUrl: paymentRes.redirectUrl,
        gatewayRef: paymentRes.gatewayRef,
      };
    }

    return {
      success: false,
      error: paymentRes.error || 'Failed to initialize Ecardo payment',
    };
  } catch (err: unknown) {
    console.error('initiateEcardoPayment error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Ecardo payment initialization error',
    };
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

    const sanitizedBookings = bookings.map((b) => ({
      ...b,
      totalAmount: Number(b.totalAmount),
      items: b.items.map((it) => ({
        ...it,
        netCost: Number(it.netCost),
        markup: Number(it.markup),
        taxAmount: Number(it.taxAmount),
        feeAmount: Number(it.feeAmount),
        sellPrice: Number(it.sellPrice),
      })),
    }));

    return { success: true, bookings: sanitizedBookings };
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

export async function requestWalletTopUp(
  amount: number,
  options?: { currency?: string; gateway?: 'shetab' | 'ecardo' }
) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };
    const currency = (options?.currency || 'IRR').toUpperCase();
    const gateway = options?.gateway || (currency === 'IRR' ? 'shetab' : 'ecardo');

    const minAmount = (currency === 'IRR' || currency === 'IRT') ? 10000 : 1;
    if (!Number.isFinite(amount) || amount < minAmount) {
      return { success: false, error: `Minimum top-up is ${minAmount} ${currency}` };
    }

    const { PaymentDomainService } = await import('@/domains/payments/PaymentDomainService');
    const { ShetabGatewayAdapter, EcardoGatewayAdapter } = await import('@/domains/payments/gateway-port');
    const { Money } = await import('@/lib/finance');

    const idempotencyKey = `topup_intent_${session.user.id}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const moneyAmount = new Money(amount, currency);

    // Create durable PaymentIntent for this wallet charge (PAY-001)
    const intent = await PaymentDomainService.createPaymentIntent({
      bookingId: `wallet_topup_${session.user.id}`,
      amount: moneyAmount,
      currency,
      idempotencyKey,
      ttlMinutes: 20,
    });

    // In demo mode without real gateway config, settle via ledger for local verification
    if (process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production' && !process.env.ECARDO_PUBLIC_KEY) {
      const { GeneralLedgerService } = await import('@/domains/ledger/GeneralLedgerService');
      await GeneralLedgerService.postTopUp({
        groupId: `topup_grp_${intent.id}`,
        userId: session.user.id,
        amount: moneyAmount,
        currency,
        referenceId: intent.id,
      });
      revalidatePath('/wallet');
      return { success: true, intentId: intent.id };
    }

    // Initiate gateway payment request via selected adapter (Ecardo or Shetab)
    const adapter = gateway === 'ecardo' ? new EcardoGatewayAdapter() : new ShetabGatewayAdapter();
    const gwRes = await adapter.createPayment({
      intentId: intent.id,
      bookingId: intent.bookingId,
      amount: new Money(intent.amount, currency),
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
        balances: { IRR: 0, USDT: 0, AED: 0, USD: 0, CNY: 0 },
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

    const moneyMap = balances as unknown as Record<string, { toNumber?: () => number } | undefined>;
    return {
      success: true,
      balances: {
        IRR: moneyMap.IRR?.toNumber ? moneyMap.IRR.toNumber() : 0,
        USDT: moneyMap.USDT?.toNumber ? moneyMap.USDT.toNumber() : 0,
        AED: moneyMap.AED?.toNumber ? moneyMap.AED.toNumber() : 0,
        USD: moneyMap.USD?.toNumber ? moneyMap.USD.toNumber() : 0,
        CNY: moneyMap.CNY?.toNumber ? moneyMap.CNY.toNumber() : 0,
      },
      transactions: allEntries,
    };
  } catch (err: unknown) {
    console.error('getWallet server error:', err);
    return {
      success: false,
      error: 'Failed to fetch wallet',
      balances: { IRR: 0, USDT: 0, AED: 0, USD: 0, CNY: 0 },
      transactions: [],
    };
  }
}
