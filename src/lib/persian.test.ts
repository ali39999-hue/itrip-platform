import { describe, it, expect } from 'vitest';
import {
  en,
  fa,
  faNumber,
  faPercent,
  normalizeNationalId,
  formatNationalId,
  isNationalId,
  normalizeIban,
  isIban,
  formatIban,
  ibanBank,
  bankLabel,
  normalizeCardNumber,
  formatCardNumber,
  cardBank,
  isCardNumber,
} from './persian';

describe('persian.ts — digits', () => {
  it('converts Persian digits to ASCII and back', () => {
    expect(en('۱۲۳۴')).toBe('1234');
    expect(fa('1234')).toBe('۱۲۳۴');
  });

  it('groups thousands with the Persian separator', () => {
    expect(faNumber(1250000)).toBe('۱٬۲۵۰٬۰۰۰');
    expect(faNumber(999)).toBe('۹۹۹');
    expect(faNumber(0)).toBe('۰');
  });
});

describe('persian.ts — کد ملی', () => {
  it('accepts a known-valid 10-digit national ID with a leading zero', () => {
    expect(isNationalId('0079279511')).toBe(true);
    expect(isNationalId('۰۰۷۹۲۷۹۵۱۱')).toBe(true); // Persian digits accepted
  });

  it('rejects wrong checksums, repeated digits and short input', () => {
    expect(isNationalId('0079279512')).toBe(false);
    expect(isNationalId('1111111111')).toBe(false);
    expect(isNationalId('12345')).toBe(false);
  });

  it('normalizes and renders the 3-6-1 card grouping', () => {
    expect(normalizeNationalId('۰۰۱-۲۳۴۵۶۷-۸')).toBe('0012345678');
    expect(formatNationalId('0079279511')).toBe('۰۰۷-۹۲۷۹۵۱-۱');
  });
});

describe('persian.ts — شبا (IBAN mod-97)', () => {
  // Valid per the IBAN mod-97 check (bank code 017 = ملی); check digits 11.
  const VALID = 'IR110170000000101234567890';

  it('validates a correct IBAN (mod-97 = 1)', () => {
    expect(isIban(VALID)).toBe(true);
  });

  it('rejects a corrupted IBAN, wrong length and foreign IBANs', () => {
    expect(isIban('IR110170000000101234567891')).toBe(false);
    expect(isIban('IR11017000000010123456789')).toBe(false);
    expect(isIban('DE89370400440532013000')).toBe(false);
  });

  it('normalizes separators, Persian digits and lowercase ir prefix', () => {
    expect(normalizeIban('ir 110170000000101234567890')).toBe(VALID);
    expect(formatIban(VALID)).toBe('IR11 0170 0000 0010 1234 5678 90');
  });

  it('detects the bank from the 3-digit code and labels it', () => {
    expect(ibanBank(VALID)).toBe('ملی');
    expect(bankLabel('ملت')).toBe('بانک ملت');
    expect(bankLabel('پست بانک')).toBe('پست بانک');
  });
});

describe('persian.ts — کارت بانکی شتاب (Luhn & BIN)', () => {
  // Mellat test card passing Luhn:
  const MELLAT = '6104337812345674';

  it('detects issuing bank from 6-digit BIN', () => {
    expect(cardBank('6037991234567890')).toBe('بانک ملی ایران');
    expect(cardBank('6219861234567890')).toBe('بانک سامان');
    expect(cardBank(MELLAT)).toBe('بانک ملت');
    expect(cardBank('123456')).toBeNull();
  });

  it('validates 16-digit card via Luhn algorithm', () => {
    expect(isCardNumber(MELLAT)).toBe(true);
    expect(isCardNumber('6104337812345675')).toBe(false); // wrong checksum
    expect(isCardNumber('610433')).toBe(false); // short
  });

  it('normalizes and formats into 4-digit Persian groups', () => {
    expect(normalizeCardNumber('۶۱۰۴-۳۳۷۸-۱۲۳۴-۵۶۷۴')).toBe(MELLAT);
    expect(formatCardNumber(MELLAT)).toBe('۶۱۰۴ ۳۳۷۸ ۱۲۳۴ ۵۶۷۴');
  });

  it('formats percentages with Persian digits and sign', () => {
    expect(faPercent(50)).toBe('۵۰٪');
  });
});
