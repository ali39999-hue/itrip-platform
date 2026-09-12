import { describe, it, expect } from 'vitest';
import { countryPaymentCapabilities, type CountryId } from './countries';

/**
 * Country-reactive checkout: payment method visibility must follow the
 * selected country. Iranian domestic rails exist only in Iran; the eCardo
 * gateway serves every country with a sensible default instrument.
 */
describe('countryPaymentCapabilities', () => {
  it('exposes Iranian domestic rails only for Iran', () => {
    const iran = countryPaymentCapabilities('iran');
    expect(iran.shetab).toBe(true);
    expect(iran.cardTransfer).toBe(true);
    expect(iran.shetabInstrument).toBe(true);
    expect(iran.defaultInstrument).toBe('shetab_card');
  });

  it('defaults China to the WeChat/Alipay instrument', () => {
    const china = countryPaymentCapabilities('china');
    expect(china.shetab).toBe(false);
    expect(china.cardTransfer).toBe(false);
    expect(china.shetabInstrument).toBe(false);
    expect(china.defaultInstrument).toBe('wechat_alipay');
  });

  it('defaults every other country to international cards', () => {
    const others: CountryId[] = ['russia', 'turkey', 'uae', 'georgia', 'oman'];
    for (const c of others) {
      const caps = countryPaymentCapabilities(c);
      expect(caps.shetab).toBe(false);
      expect(caps.cardTransfer).toBe(false);
      expect(caps.shetabInstrument).toBe(false);
      expect(caps.defaultInstrument).toBe('visa_mastercard');
    }
  });
});
