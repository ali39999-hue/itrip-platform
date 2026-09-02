import { describe, it, expect } from 'vitest';
import { dualDate } from '@/lib/jalali';
import { toLocalCurrency, formatMoney, chargeContext } from '@/lib/money';
import { num } from '@/lib/format';
import { CurrencyService } from '@/domains/currency/CurrencyService';
import { BookingDomainService } from '@/domains/booking/BookingDomainService';

describe('Unit Tests: Jalali & Date Utilities', () => {
  it('converts ISO date to dual Gregorian, Jalali, and weekday format correctly', () => {
    const res = dualDate('2026-03-21');
    expect(res.g).toBeDefined();
    expect(res.j).toBeDefined();
    expect(res.weekday).toBeDefined();
  });

  it('handles invalid date strings gracefully', () => {
    const res = dualDate('invalid-date');
    expect(res.g).toBe('');
    expect(res.j).toBe('');
  });
});

describe('Unit Tests: Money & Currency Calculations', () => {
  it('converts Toman to other local currencies correctly', () => {
    const tryAmt = toLocalCurrency(29000, 'TRY');
    expect(tryAmt).toBe(10);

    const irrAmt = toLocalCurrency(500000, 'IRR');
    expect(irrAmt).toBe(500000);
  });

  it('formats money with correct localized labels', () => {
    const formattedFa = formatMoney(50000, 'IRR', 'fa');
    expect(formattedFa).toContain('تومان');

    const formattedEn = formatMoney(29000, 'TRY', 'en');
    expect(formattedEn).toContain('Lira');
  });

  it('resolves charge context per destination country', () => {
    const turkeyCtx = chargeContext('turkey');
    expect(turkeyCtx.currency).toBe('TRY');
    expect(turkeyCtx.isHome).toBe(false);

    const iranCtx = chargeContext('iran');
    expect(iranCtx.currency).toBe('IRR');
    expect(iranCtx.isHome).toBe(true);
  });
});

describe('Unit Tests: Format Utilities', () => {
  it('formats numbers for Persian and English locales', () => {
    const faNum = num(12345, 'fa');
    expect(faNum).toBe('۱۲٬۳۴۵');

    const enNum = num(12345, 'en');
    expect(enNum).toBe('12,345');
  });
});

describe('Unit Tests: Currency & Booking Domain Services', () => {
  it('performs accurate domain currency conversions with CurrencyService', () => {
    const service = new CurrencyService();
    const convertedUsdt = service.convert(100, 'USDT', 'IRR');
    expect(convertedUsdt).toBeGreaterThan(0);

    const formatted = service.formatMoney(50000, 'IRR');
    expect(formatted).toContain('ریال');
  });

  it('calculates price breakdowns with VAT using BookingDomainService', () => {
    const breakdown = BookingDomainService.calculatePriceBreakdown(1000000, [{ price: 200000 }], 0.1, 'IRR');
    expect(breakdown.baseAmount).toBe(1000000);
    expect(breakdown.addonsAmount).toBe(200000);
    expect(breakdown.discountAmount).toBe(120000);
    expect(breakdown.totalAmount).toBeGreaterThan(1000000);
  });

  it('generates confirmed bookings with BookingDomainService', () => {
    const booking = BookingDomainService.createConfirmedBooking(
      {
        type: 'hotels',
        title: 'Farvardin Hotel',
        subtitle: '2 nights',
        amount: 5000000,
        travelDate: '2026-04-01',
      },
      [
        {
          firstNameFa: 'علی',
          lastNameFa: 'محمدی',
          firstNameEn: 'Ali',
          lastNameEn: 'Mohammadi',
          passportNo: 'A12345678',
          gender: 'male',
          nationalId: '0012345678',
          birthDate: '1990-01-01',
        },
      ],
      'wallet_irr'
    );

    expect(booking.id).toBeDefined();
    expect(booking.reference).toMatch(/^FIR-\d+/);
    expect(booking.status).toBe('confirmed');
  });
});
