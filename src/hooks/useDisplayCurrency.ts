'use client';

import { useLocale } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { chargeContext, formatMoney } from '@/lib/money';
import { lt } from '@/lib/lt';

/**
 * Returns a currency-aware price formatter for the currently selected country.
 *
 * All prices inside the codebase are stored in **Toman** (base unit).
 * This hook reads the active country from the persisted Zustand store
 * and returns helpers that convert + format to the country's local currency.
 */
export function useDisplayCurrency() {
  const country = useCountryStore((s) => s.country);
  const locale = useLocale();
  const ctx = chargeContext(country);

  /** Convert an amount in Toman to the country's local currency and format with label. */
  const formatAmount = (amountToman: number): string =>
    formatMoney(amountToman, ctx.currency, locale);

  /** Short currency label for the current country (e.g. "تومان", "Lira", "درهم"). */
  const currencyLabel = lt(locale, ctx.label);

  return {
    country,
    currency: ctx.currency,
    currencyLabel,
    formatAmount,
    isHome: ctx.isHome,
    taxRate: ctx.taxRate,
    taxLabel: lt(locale, ctx.taxLabel),
    gatewayFeeRate: ctx.gatewayFeeRate,
    gatewayFeeLabel: lt(locale, ctx.gatewayFeeLabel),
  } as const;
}
