import { useMemo } from 'react';
import { formatMoney } from '@/lib/money';
import { ESIM_PRICE, INSURANCE_PRICE } from '../constants';
import type { CheckoutPricing, UseCheckoutPricingOptions } from '../types';

/**
 * Hook to compute base price, selected addons, discounts, total payable,
 * and pre-formatted localized currency strings.
 */
export function useCheckoutPricing({
  baseAmount = 34500000,
  currency = 'IRR',
  addEsim,
  addInsurance,
  discountAmount = 0,
  esimPrice = ESIM_PRICE,
  insurancePrice = INSURANCE_PRICE,
}: UseCheckoutPricingOptions): CheckoutPricing {
  return useMemo(() => {
    const addonsTotal = (addEsim ? esimPrice : 0) + (addInsurance ? insurancePrice : 0);
    const totalPayable = Math.max(0, baseAmount + addonsTotal - discountAmount);

    return {
      baseAmount,
      currency,
      addEsim,
      addInsurance,
      esimPrice,
      insurancePrice,
      addonsTotal,
      discountAmount,
      totalPayable,
      formattedBase: formatMoney(baseAmount, currency),
      formattedAddons: formatMoney(addonsTotal, currency),
      formattedDiscount: formatMoney(discountAmount, currency),
      formattedTotal: formatMoney(totalPayable, currency),
      formattedEsim: formatMoney(esimPrice, currency),
      formattedInsurance: formatMoney(insurancePrice, currency),
    };
  }, [baseAmount, currency, addEsim, addInsurance, discountAmount, esimPrice, insurancePrice]);
}
