/**
 * Canonical Booking Domain Service (BOOK-001, MONEY-001)
 * Encapsulates price breakdowns and business validations.
 * Client-side mock booking confirmations and in-memory fund locks have been retired;
 * all bookings must be processed server-side through BookingStateMachine and BookingSagaOrchestrator.
 */

import type { Booking } from '@/lib/types';
import type { SupportedCurrency } from '../currency/CurrencyService';
import { TaxEngine } from '@/lib/finance/tax-engine';

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

    // Use dynamic TaxEngine with Decimal arithmetic
    const taxCalc = TaxEngine.calculateTax({
      taxableAmount: taxable,
      currency,
      jurisdiction: 'IR',
      serviceType: 'GENERAL',
    });
    const taxAmount = taxCalc.taxAmount.toNumber();
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
}
