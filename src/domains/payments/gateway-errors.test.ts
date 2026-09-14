import { describe, it, expect } from 'vitest';
import {
  translateGatewayError,
  translatePspError,
  ZARINPAL_ERRORS,
  MELLAT_ERRORS,
  SAMAN_ERRORS,
  ZIBAL_ERRORS,
} from './gateway-errors';

describe('translateGatewayError — internal adapter/system codes', () => {
  it('translates adapter errorCodes into the requested locale', () => {
    expect(translateGatewayError('GATEWAY_NOT_CONFIGURED', 'fa')).toContain('درگاه پرداخت');
    expect(translateGatewayError('GATEWAY_NOT_CONFIGURED', 'en')).toContain('unavailable');
    expect(translateGatewayError('TIMESTAMP_EXPIRED', 'fa')).toContain('منقضی');
    expect(translateGatewayError('AMOUNT_MISMATCH', 'fa')).toContain('مطابقت ندارد');
    expect(translateGatewayError('NETWORK_ERROR', 'zh')).toContain('网关');
  });

  it('translates English system phrases that surface raw in checkout', () => {
    expect(translateGatewayError('Unauthorized', 'fa')).toContain('وارد حساب');
    expect(translateGatewayError('Booking not found', 'fa')).toContain('یافت نشد');
    expect(translateGatewayError('booking NOT FOUND', 'fa')).toContain('یافت نشد');
    expect(translateGatewayError('Booking is not payable in its current state', 'fa')).toContain(
      'قابل پرداخت نیست'
    );
  });

  it('trims surrounding whitespace before matching', () => {
    expect(translateGatewayError('  Invalid idempotency key  ', 'fa')).toContain('تکراری');
  });

  it('returns null for unknown, empty or whitespace-only inputs so callers keep their fallback copy', () => {
    expect(translateGatewayError('SOMETHING_RANDOM', 'fa')).toBeNull();
    expect(translateGatewayError('', 'fa')).toBeNull();
    expect(translateGatewayError('   ', 'fa')).toBeNull();
    expect(translateGatewayError(null, 'fa')).toBeNull();
    expect(translateGatewayError(undefined, 'en')).toBeNull();
  });
});

describe('translatePspError — factual PSP code dictionaries', () => {
  it('maps Zarinpal codes to their documented Persian meanings', () => {
    expect(translatePspError('zarinpal', -33)).toContain('مطابقت ندارد');
    expect(translatePspError('zarinpal', 101)).toContain('قبلاً تایید');
    expect(translatePspError('zarinpal', '-41')).toContain('نامعتبر');
  });

  it('normalizes Persian and Arabic digits inside numeric strings', () => {
    expect(translatePspError('zibal', '۱۰۲')).toContain('مرچنت یافت نشد');
    expect(translatePspError('mellat', '١٢')).toContain('کافی نیست');
  });

  it('resolves provider aliases (behpardakht→Mellat, sep/samankish→Saman)', () => {
    expect(translatePspError('behpardakht', 13)).toContain('رمز دوم');
    expect(translatePspError('SEP', 5)).toContain('موجودی کافی نیست');
    expect(translatePspError('samankish', 1)).toContain('لغو شد');
  });

  it('returns null for unknown providers, unknown codes, or missing input', () => {
    expect(translatePspError('ecardo', 12)).toBeNull();
    expect(translatePspError('zarinpal', 99999)).toBeNull();
    expect(translatePspError('', 12)).toBeNull();
    expect(translatePspError(null, 12)).toBeNull();
    expect(translatePspError('zarinpal', '')).toBeNull();
    expect(translatePspError('zarinpal', 'not-a-number')).toBeNull();
  });

  it('keeps success codes alongside failure codes (used to detect double-verify)', () => {
    expect(ZARINPAL_ERRORS[100]).toBeTruthy();
    expect(ZARINPAL_ERRORS[101]).toBeTruthy();
    expect(MELLAT_ERRORS[0]).toBeTruthy();
    expect(SAMAN_ERRORS[2]).toBeTruthy();
    expect(ZIBAL_ERRORS[100]).toBeTruthy();
  });
});
