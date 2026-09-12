'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { bookingSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { safeAuth } from '@/auth';
import { BookingApplicationService } from '@/domains/booking/BookingApplicationService';
import { BookingDomainService } from '@/domains/booking/BookingDomainService';
import { ReferralDomainService } from '@/domains/referral/ReferralDomainService';
import { getTenantAuthContext, assertTenantAccess } from '@/domains/identity/permission-service';
import { decryptSensitive } from '@/lib/security/crypto-vault';
import { acquireIdempotencyLock, completeIdempotency } from '@/lib/security/idempotency';
import { toPlain } from '@/lib/serialize';

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

    // 1b. Idempotency guard (BUG-003): replaying the same key returns the
    // original draft instead of creating a duplicate HELD booking.
    const idemScope = `user:${userId}`;
    if (parsed.idempotencyKey) {
      const lock = acquireIdempotencyLock<{
        bookingId: string; reference: string; totalAmount: number; discountAmount?: number; currency: string; status: string; referralStatus?: string;
      }>(parsed.idempotencyKey, idemScope, parsed);
      if (!lock.acquired) {
        if (lock.status === 'COMPLETED') {
          return { success: true, ...lock.cachedResponse.body };
        }
        if (lock.status === 'IN_PROGRESS') {
          return { success: false, error: 'درخواست قبلی در حال پردازش است؛ چند لحظه بعد دوباره تلاش کنید.' };
        }
        return { success: false, error: lock.error || 'درخواست تکراری نامعتبر است.' };
      }
    }

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

    const successPayload = {
      bookingId: result.bookingId,
      reference: result.reference,
      totalAmount: result.totalAmount,
      discountAmount: result.discountAmount,
      currency: result.currency,
      status: result.status,
      referralStatus: result.referralStatus,
    };

    if (parsed.idempotencyKey) {
      completeIdempotency(parsed.idempotencyKey, idemScope, 200, successPayload);
    }

    return { success: true, ...successPayload };
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
 * Supports dynamic currency conversion (DCC) and payment instrument selection.
 * Automatically converts booking base amount (IRR) into target currency (USD, USDT, CNY, IRR).
 */
export async function initiateEcardoPayment(
  bookingId: string,
  options?: {
    targetCurrency?: string;
    paymentInstrument?: 'visa_mastercard' | 'crypto_usdt' | 'wechat_alipay' | 'shetab_card';
  } | string
) {
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

    const { EcardoGatewayAdapter, mapToEcardoCurrency, normalizeEcardoCurrencyToPlatform } = await import('@/domains/payments/gateway-port');
    const { Money } = await import('@/lib/finance');
    const { CURRENCY_TO_TOMAN } = await import('@/lib/money');
    const { getRequestBaseUrl } = await import('@/lib/runtime-url');
    const { headers } = await import('next/headers');

    const headerMap = await headers().catch(() => null);
    const origin = getRequestBaseUrl(headerMap || undefined);

    // Payment instrument pins the currency rail; otherwise the client-selected
    // country currency (from the country switcher) is used. Unsupported country
    // currencies (TRY/AED/GEL/RUB/OMR) map to USD, the eCardo fallback rail.
    const paymentInstrument = typeof options === 'object' ? options?.paymentInstrument : undefined;

    const instrumentCurrency =
      (typeof options === 'object' && options?.paymentInstrument === 'crypto_usdt') ? 'USDT' :
      (typeof options === 'object' && options?.paymentInstrument === 'wechat_alipay') ? 'CNY' :
      (typeof options === 'object' && options?.paymentInstrument === 'shetab_card') ? 'IRR' : undefined;

    const rawTargetCurrency =
      instrumentCurrency ||
      (typeof options === 'string' ? options : options?.targetCurrency) ||
      'USD';

    const targetCurrency = mapToEcardoCurrency(rawTargetCurrency);

    const sourceCurrency = (booking.currency || 'IRR').toUpperCase();
    const sourceMoney = new Money(booking.totalAmount, sourceCurrency);

    // Automatic FX conversion (MONEY-001, MONEY-004).
    // Booking amounts are stored in Toman (platform IRR unit), so conversion
    // uses the Toman reference table (CURRENCY_TO_TOMAN) — the CurrencyService
    // rates are rial-based and would mis-scale by 10x here.
    const tomanAmount = sourceMoney.toNumber();
    let convertedAmount: number;
    if (targetCurrency === 'IRT' || sourceCurrency === targetCurrency) {
      convertedAmount = Math.round(tomanAmount);
    } else if (targetCurrency === 'USDT') {
      convertedAmount = Math.round((tomanAmount / CURRENCY_TO_TOMAN.USDT) * 100) / 100;
    } else if (targetCurrency === 'CNY') {
      convertedAmount = Math.round((tomanAmount / CURRENCY_TO_TOMAN.CNY) * 100) / 100;
    } else {
      convertedAmount = Math.round((tomanAmount / (CURRENCY_TO_TOMAN.USD || 1)) * 100) / 100;
    }
    const paymentMoney = new Money(convertedAmount, targetCurrency);
    const fxSnapshot: import('@/lib/finance').FxSnapshot = {
      transactionCurrency: sourceCurrency,
      transactionAmount: sourceMoney,
      baseCurrency: targetCurrency,
      baseAmount: paymentMoney,
      fxRate: new (Prisma.Decimal)(CURRENCY_TO_TOMAN[targetCurrency === 'IRT' ? 'IRR' : targetCurrency] || 1),
      fxSource: 'REFERENCE_TOMAN_TABLE',
      fxTimestamp: new Date(),
    };

    const adapter = new EcardoGatewayAdapter();

    const paymentRes = await adapter.createPayment({
      intentId: `intent_ecardo_${booking.id}`,
      bookingId: booking.id,
      amount: paymentMoney,
      callbackUrl: `${origin}/api/payments/ecardo/callback?bookingId=${booking.id}&order_id=${booking.id}`,
      customerInfo: {
        email: session.user.email || undefined,
      },
    });

    if (paymentRes.success && paymentRes.redirectUrl) {
      const payloadMeta = JSON.stringify({
        originalAmount: booking.totalAmount.toString(),
        originalCurrency: sourceCurrency,
        settledAmount: paymentMoney.toString(),
        settledCurrency: targetCurrency,
        fxRate: fxSnapshot?.fxRate.toString() || '1.0',
        fxSource: fxSnapshot?.fxSource || 'PARITY',
        paymentInstrument,
      });

      // Platform-side records store the normalized unit (eCardo IRT == platform IRR/Toman)
      const recordCurrency = normalizeEcardoCurrencyToPlatform(targetCurrency);
      await prisma.payment.upsert({
        where: { idempotencyKey: `ecardo_${booking.id}_${paymentRes.gatewayRef}` },
        update: {
          gatewayRef: paymentRes.gatewayRef,
          amount: paymentMoney.toDecimal(),
          currency: recordCurrency,
          status: 'PENDING',
          rawPayload: payloadMeta,
        },
        create: {
          bookingId: booking.id,
          method: 'gateway_ecardo',
          gatewayRef: paymentRes.gatewayRef,
          amount: paymentMoney.toDecimal(),
          currency: recordCurrency,
          status: 'PENDING',
          idempotencyKey: `ecardo_${booking.id}_${paymentRes.gatewayRef}`,
          rawPayload: payloadMeta,
        },
      });

      return {
        success: true,
        redirectUrl: paymentRes.redirectUrl,
        gatewayRef: paymentRes.gatewayRef,
        amount: paymentMoney.toNumber(),
        currency: recordCurrency,
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
    // Decimals are strictly converted to plain numbers for RSC boundary compliance.
    const invoice = await prisma.invoice.findFirst({
      where: { bookingId: id },
      select: { id: true, invoiceNumber: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedBooking = {
      ...booking,
      invoice: invoice ? { id: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status } : null,
      totalAmount: Number(booking.totalAmount),
      items: booking.items.map((item) => {
        let details = item.details;
        if (item.details) {
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
            details = JSON.stringify(parsedDetails);
          } catch {
            // Keep details as is
          }
        }
        return {
          ...item,
          netCost: Number(item.netCost),
          markup: Number(item.markup),
          taxAmount: Number(item.taxAmount),
          feeAmount: Number(item.feeAmount),
          sellPrice: Number(item.sellPrice),
          details,
        };
      }),
    };

    return { success: true, booking: toPlain(sanitizedBooking) };
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

    // Gateway dispatch through the canonical pipeline so a Payment record with
    // the gatewayRef is persisted — the eCardo IPN handler resolves the wallet
    // capture by that ref and credits the ledger via postTopUp.
    const { headers } = await import('next/headers');
    const { getRequestBaseUrl } = await import('@/lib/runtime-url');
    const headerMap = await headers().catch(() => null);
    const origin = getRequestBaseUrl(headerMap || undefined);
    const callbackUrl = `${origin}/api/payments/callback?bookingId=wallet_topup_${session.user.id}&order_id=wallet_topup_${session.user.id}`;

    const method = gateway === 'ecardo' ? 'gateway_ecardo' as const : 'gateway_shetab' as const;
    const gwRes = await PaymentDomainService.processPayment({
      bookingId: `wallet_topup_${session.user.id}`,
      idempotencyKey,
      method,
      amount: moneyAmount,
      currency,
      callbackUrl,
      customerInfo: {
        email: session.user.email || undefined,
      },
    });

    if (!gwRes.success || !gwRes.redirectUrl) {
      return { success: false, error: gwRes.error || 'Failed to process top-up' };
    }

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

    // The ledger's FIN-102 dedupe keys on (referenceType, referenceId) globally,
    // so referenceId must be unique per exchange — a constant made every
    // exchange after the first one a silent no-op. The groupId doubles as that
    // unique reference (replays of the same exchange still dedupe).
    const exchangeGroupId = `fx_${session.user.id}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    await GeneralLedgerService.postFXConversion({
      groupId: exchangeGroupId,
      userId: session.user.id,
      fromCurrency: from,
      toCurrency: to,
      fromAmount: fromMoney,
      toAmount: toMoney,
      spreadAmount: spreadMoney,
      referenceId: exchangeGroupId,
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

/**
 * Multi-Product Unified Cart Booking Action (Miracuves / Lulan Pattern).
 * Atomically creates a consolidated booking for heterogeneous items (e.g. Flight + Hotel + Transfer).
 */
export async function createMultiItemBookingDraftAction(params: {
  items: Array<{
    type: string;
    itemId: string;
    title: string;
    count: number;
    nights?: number;
    unitPrice: number;
    travelDate: string;
    inventoryItemId?: string;
    details?: Record<string, unknown>;
  }>;
  currency?: string;
  contactEmail?: string;
  contactPhone?: string;
  passengers?: Array<Record<string, unknown>>;
}) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized' };
    }
    const { UnifiedCartService } = await import('@/domains/booking/UnifiedCartService');
    const result = await UnifiedCartService.createMultiItemBooking({
      actorId: session.user.id,
      items: params.items,
      currency: params.currency,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      passengers: params.passengers,
    });
    return result;
  } catch (err: unknown) {
    console.error('createMultiItemBookingDraftAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create multi-item booking',
    };
  }
}

export async function calculateMultiItemPricingAction(
  items: Array<{
    type: string;
    itemId: string;
    title: string;
    count: number;
    nights?: number;
    unitPrice: number; // display-only hint — server re-resolves every line (BUG-001)
    travelDate: string;
  }>,
  currency = 'IRR'
) {
  try {
    const { UnifiedCartService } = await import('@/domains/booking/UnifiedCartService');
    const resolved = await UnifiedCartService.resolveServerCartPricing(items, currency);
    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }
    const pricing = UnifiedCartService.calculateCartPricing(resolved.pricedItems, currency);
    return { success: true, pricing };
  } catch (err: unknown) {
    console.error('calculateMultiItemPricingAction error:', err);
    return { success: false, error: 'Failed to calculate cart pricing' };
  }
}

/**
 * Ingests an external booking confirmation SMS or text into user's My Trips (DaPlanStan pattern).
 */
export async function importExternalBookingAction(rawText: string) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized' };
    }
    const { TravelIngestionService } = await import('@/domains/booking/TravelIngestionService');
    const result = await TravelIngestionService.importExternalBooking({
      userId: session.user.id,
      rawText,
    });
    if (result.success) {
      revalidatePath('/my-trips');
    }
    return result;
  } catch (err: unknown) {
    console.error('importExternalBookingAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to import external booking',
    };
  }
}


