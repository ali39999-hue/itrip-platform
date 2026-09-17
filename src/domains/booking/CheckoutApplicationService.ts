/**
 * CheckoutApplicationService
 *
 * Dedicated application orchestration service for the checkout workflow.
 * Decouples Checkout UI from deep domain models and infrastructure gateways:
 *
 *   Checkout UI (src/app/[locale]/checkout/page.tsx)
 *       ↓
 *   CheckoutApplicationService (src/domains/booking/CheckoutApplicationService.ts)
 *       ↓
 *   [BookingApplicationService, UnifiedCartService, PaymentDomainService, Pricing, Identity]
 *
 * Invariants:
 * 1. Server is authoritative for all financial math, taxes, VAT, and discounts.
 * 2. Zero negative prices or unvalidated floating-point totals.
 * 3. Consistent idempotency keys per checkout session.
 * 4. Transparent price change detection before payment capture.
 */

import { calculateCountryPricing, type CountryPricingCalculation } from '@/lib/money';
import type { CountryId } from '@/lib/countries';
import type { Passenger } from '@/lib/validations';
import { ESIM_PRICE, INSURANCE_PRICE } from './addon-prices';

export interface CheckoutBreakdownParams {
  baseAmount: number;
  addEsim: boolean;
  addInsurance: boolean;
  referralDiscountAmount: number;
  country: CountryId;
  paymentMethod: string;
}

export interface CheckoutBreakdownResult {
  addonsTotal: number;
  subtotalBeforeFees: number;
  countryPricing: CountryPricingCalculation;
  totalPayable: number;
  effectiveDiscount: number;
}

export interface NormalizedPassengerData {
  passengers: Passenger[];
  totalTravelers: number;
  hasIncompleteRequiredFields: boolean;
}

export interface PaymentDispatchResolution {
  type: 'GATEWAY_REDIRECT' | 'DIRECT_CONFIRM' | 'PRICE_DRIFT' | 'ERROR';
  redirectUrl?: string;
  bookingReference?: string;
  errorMessage?: string;
  priceShift?: {
    oldAmount: number;
    newAmount: number;
    diff: number;
    currency: string;
  };
}

export class CheckoutApplicationService {
  /**
   * Calculates comprehensive checkout pricing breakdown
   */
  static calculateBreakdown(params: CheckoutBreakdownParams): CheckoutBreakdownResult {
    const base = Math.max(0, Number.isFinite(params.baseAmount) ? params.baseAmount : 0);
    const addonsTotal = (params.addEsim ? ESIM_PRICE : 0) + (params.addInsurance ? INSURANCE_PRICE : 0);
    const discount = Math.max(0, Number.isFinite(params.referralDiscountAmount) ? params.referralDiscountAmount : 0);

    // Subtotal cannot drop below 0
    const subtotalBeforeFees = Math.max(0, base + addonsTotal - discount);

    const countryPricing = calculateCountryPricing({
      subtotal: subtotalBeforeFees,
      countryId: params.country,
      gateway: params.paymentMethod,
    });

    return {
      addonsTotal,
      subtotalBeforeFees,
      countryPricing,
      totalPayable: countryPricing.totalPayable,
      effectiveDiscount: discount,
    };
  }

  /**
   * Normalizes passenger manifest entries, trimming and standardizing fields
   */
  static normalizePassengerManifest(
    rawPassengers: Passenger[],
    expectedCount: number,
    isDomestic: boolean = false
  ): NormalizedPassengerData {
    const totalTravelers = Math.max(1, expectedCount);
    const sliced = rawPassengers.slice(0, totalTravelers);

    const passengers: Passenger[] = sliced.map((p) => ({
      firstName: (p.firstName || '').trim(),
      lastName: (p.lastName || '').trim(),
      nationalId: (p.nationalId || '').trim(),
      passportNo: (p.passportNo || '').trim(),
      passportExpiryDate: (p.passportExpiryDate || '').trim(),
      birthDate: (p.birthDate || '').trim(),
      gender: p.gender || 'MALE',
    }));

    let hasIncomplete = false;
    for (const p of passengers) {
      if (!p.firstName || !p.lastName) {
        hasIncomplete = true;
        break;
      }
      if (isDomestic) {
        if (!p.nationalId) {
          hasIncomplete = true;
          break;
        }
      } else {
        if (!p.passportNo) {
          hasIncomplete = true;
          break;
        }
      }
    }

    return {
      passengers,
      totalTravelers,
      hasIncompleteRequiredFields: hasIncomplete,
    };
  }

  /**
   * Evaluates price change drift before payment capture
   */
  static evaluatePriceDrift(params: {
    serverRepriceAmount: number;
    checkoutExpectedAmount: number;
    currency: string;
    acceptedByCustomer: boolean;
  }): {
    hasDrift: boolean;
    diff: number;
    requiresConfirmation: boolean;
  } {
    const diff = params.serverRepriceAmount - params.checkoutExpectedAmount;
    const hasDrift = Math.abs(diff) > 0;
    const requiresConfirmation = hasDrift && !params.acceptedByCustomer;

    return {
      hasDrift,
      diff,
      requiresConfirmation,
    };
  }

  /**
   * Generates deterministic idempotency scope key for a checkout session
   */
  static generateIdempotencyKey(sessionId: string, bookingId?: string): string {
    return `chk_${sessionId}_${bookingId || 'draft'}`;
  }
}
