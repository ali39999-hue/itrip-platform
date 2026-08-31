/**
 * Pure Booking Domain Service
 * Encapsulates transactional business logic for booking creation, fund lock lifecycles,
 * price breakdowns, and refund workflows.
 */

import type { Booking, BookingPassenger } from '@/lib/types';
import type { SupportedCurrency } from '../currency/CurrencyService';

export type LockState = 'LOCKED' | 'CAPTURED' | 'RELEASED' | 'EXPIRED';

export interface BookingFundLock {
  id: string;
  bookingId: string;
  amount: number;
  currency: SupportedCurrency;
  state: LockState;
  createdAt: number;
  expiresAt: number;
}

export interface MoneyBreakdown {
  baseAmount: number;
  addonsAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: SupportedCurrency;
}

export interface BookingSummary {
  type: Booking['type'];
  title: string;
  subtitle: string;
  amount: number;
  currency?: SupportedCurrency;
  travelDate: string;
  meta?: Record<string, string>;
  id?: string;
}

export class BookingDomainService {
  /**
   * Calculate detailed price breakdown for a booking
   */
  static calculatePriceBreakdown(
    baseAmount: number,
    addons: { price: number }[] = [],
    discountRate: number = 0,
    currency: SupportedCurrency = 'IRR'
  ): MoneyBreakdown {
    const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
    const gross = baseAmount + addonsTotal;
    const discountAmount = Math.round(gross * discountRate);
    const taxable = gross - discountAmount;
    const taxAmount = Math.round(taxable * 0.09); // Standard 9% VAT
    const totalAmount = taxable + taxAmount;

    return {
      baseAmount,
      addonsAmount: addonsTotal,
      taxAmount,
      discountAmount,
      totalAmount,
      currency,
    };
  }

  /**
   * Create an initial fund lock
   */
  static createFundLock(
    bookingId: string,
    amount: number,
    currency: SupportedCurrency,
    walletBalance: number,
    ttlMs: number = 60_000
  ): { lock: BookingFundLock; newBalance: number } | null {
    if (walletBalance < amount) {
      return null;
    }

    const now = Date.now();
    const lockId = `lock-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const lock: BookingFundLock = {
      id: lockId,
      bookingId,
      amount,
      currency,
      state: 'LOCKED',
      createdAt: now,
      expiresAt: now + ttlMs,
    };

    return {
      lock,
      newBalance: walletBalance - amount,
    };
  }

  /**
   * Transition lock state to CAPTURED
   */
  static captureLock(lock: BookingFundLock): BookingFundLock {
    return {
      ...lock,
      state: 'CAPTURED',
    };
  }

  /**
   * Transition lock state to RELEASED
   */
  static releaseLock(lock: BookingFundLock): BookingFundLock {
    return {
      ...lock,
      state: 'RELEASED',
    };
  }

  /**
   * Generate confirmed booking entity
   */
  static createConfirmedBooking(
    context: BookingSummary,
    passengers: BookingPassenger[],
    paymentMethod: Booking['paymentMethod'],
    addOns: string[] = []
  ): Booking {
    const reference = 'IRP' + Math.floor(Math.random() * 900000 + 100000);
    const now = new Date().toISOString();
    const id = `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    return {
      id,
      reference,
      type: context.type,
      status: 'confirmed',
      title: context.title,
      subtitle: context.subtitle,
      amount: context.amount,
      currency: 'IRR',
      createdAt: now,
      travelDate: context.travelDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      passengers,
      addOns,
      paymentMethod,
      qrPayload: `FIRUZO|${reference}|${context.type.toUpperCase()}`,
    };
  }
}
