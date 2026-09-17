/**
 * PACKAGES-MONOREPO.TEST.TS
 *
 * Verifies that internal monorepo packages (@packages/domain-types, @packages/contracts,
 * @packages/money, @packages/test-fixtures) resolve cleanly with strict type contracts.
 */
import { describe, it, expect } from 'vitest';
import {
  BOOKING_STATUS_VALUES,
  assertBookingStatus,
  isPaymentStatus,
} from '../../packages/domain-types/src';
import {
  BookingStatusSchema,
  PassengerInputSchema,
  createSuccessResponse,
} from '../../packages/contracts/src';
import { Money } from '../../packages/money/src';
import { MOCK_TEST_USER, MOCK_FLIGHT_OFFER } from '../../packages/test-fixtures/src';

describe('Internal Monorepo Packages Contract Verification (Item 10)', () => {
  it('@packages/domain-types: exports authoritative status values and guards', () => {
    expect(BOOKING_STATUS_VALUES).toContain('CONFIRMED');
    expect(isPaymentStatus('CAPTURED')).toBe(true);
    expect(assertBookingStatus('HELD')).toBe('HELD');
  });

  it('@packages/contracts: validates Zod boundary schemas and response builders', () => {
    const validPassenger = {
      firstName: 'Ali',
      lastName: 'Hosseini',
      nationalId: '0012345678',
      birthDate: '1995-04-12',
      gender: 'MALE' as const,
      nationality: 'IR',
    };

    const parsed = PassengerInputSchema.safeParse(validPassenger);
    expect(parsed.success).toBe(true);
    expect(BookingStatusSchema.safeParse('CONFIRMED').success).toBe(true);

    const response = createSuccessResponse({ orderId: 'ord_123' }, 'corr_abc');
    expect(response.success).toBe(true);
    expect(response.correlationId).toBe('corr_abc');
  });

  it('@packages/money: performs exact decimal calculations without floating point error', () => {
    const m1 = new Money(1_000_000, 'IRR');
    const m2 = new Money(500_000, 'IRR');
    const total = m1.add(m2);

    expect(total.toNumber()).toBe(1_500_000);
    expect(total.currency).toBe('IRR');
  });

  it('@packages/test-fixtures: provides standardized mocks for test suites', () => {
    expect(MOCK_TEST_USER.role).toBe('CUSTOMER');
    expect(MOCK_FLIGHT_OFFER.origin).toBe('THR');
  });
});
