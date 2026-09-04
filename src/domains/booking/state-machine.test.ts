import { describe, it, expect } from 'vitest';
import { BookingStateMachine, type BookingState } from './state-machine';
import { calculatePricing, roundCurrency } from '@/lib/pricing/engine';

describe('Unit Tests: Booking State Machine Full Coverage', () => {
  it('allows valid forward transitions from DRAFT through CONFIRMED', () => {
    expect(BookingStateMachine.canTransition('DRAFT', 'HELD')).toBe(true);
    expect(BookingStateMachine.canTransition('HELD', 'PENDING_PAYMENT')).toBe(true);
    expect(BookingStateMachine.canTransition('PENDING_PAYMENT', 'PAYMENT_CONFIRMED')).toBe(true);
    expect(BookingStateMachine.canTransition('PAYMENT_CONFIRMED', 'CONFIRMED')).toBe(true);
  });

  it('allows cancellation flow according to business rules', () => {
    expect(BookingStateMachine.canTransition('CONFIRMED', 'CANCEL_REQUESTED')).toBe(true);
    expect(BookingStateMachine.canTransition('CANCEL_REQUESTED', 'CANCELLING')).toBe(true);
    expect(BookingStateMachine.canTransition('CANCELLING', 'CANCELLED')).toBe(true);
  });

  it('allows refund flow starting after cancellation', () => {
    expect(BookingStateMachine.canTransition('CANCELLED', 'REFUND_INITIATED')).toBe(true);
    expect(BookingStateMachine.canTransition('REFUND_INITIATED', 'REFUNDED')).toBe(true);
  });

  it('prevents invalid backward transitions', () => {
    expect(BookingStateMachine.canTransition('CONFIRMED', 'DRAFT')).toBe(false);
    expect(BookingStateMachine.canTransition('REFUNDED', 'HELD')).toBe(false);
    expect(BookingStateMachine.canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
  });

  it('assertTransition throws on illegal transitions', () => {
    expect(() => {
      BookingStateMachine.assertTransition('CANCELLED', 'CONFIRMED');
    }).toThrow(/Invalid state transition/i);
  });

  it('handles terminal states correctly', () => {
    const terminalStates: BookingState[] = ['EXPIRED', 'FAILED', 'REFUNDED'];
    for (const state of terminalStates) {
      expect(BookingStateMachine.canTransition(state, 'CONFIRMED')).toBe(false);
      expect(BookingStateMachine.canTransition(state, 'DRAFT')).toBe(false);
    }
  });
});

describe('Unit Tests: Pricing Engine Calculations', () => {
  it('calculates hotel pricing with 10% markup and 9% tax for customer', () => {
    const pricing = calculatePricing({
      userRole: 'CUSTOMER',
      productType: 'HOTEL',
      basePrice: 10_000_000,
      currency: 'IRR',
    });

    expect(pricing.netCost).toBe(10_000_000);
    expect(pricing.markupAmount).toBe(1_000_000); // 10%
    expect(pricing.taxAmount).toBe(990_000); // 9% of (10M + 1M)
    expect(pricing.sellPrice).toBeGreaterThan(pricing.netCost);
    expect(pricing.currency).toBe('IRR');
  });

  it('applies lower wholesale markup for AGENT/B2B roles', () => {
    const customerPricing = calculatePricing({
      userRole: 'CUSTOMER',
      productType: 'FLIGHT',
      basePrice: 5_000_000,
      currency: 'IRR',
    });

    const agentPricing = calculatePricing({
      userRole: 'AGENT',
      productType: 'FLIGHT',
      basePrice: 5_000_000,
      currency: 'IRR',
    });

    expect(agentPricing.markupAmount).toBeLessThan(customerPricing.markupAmount);
  });

  it('exempts international eSIM from domestic tax', () => {
    const pricing = calculatePricing({
      userRole: 'CUSTOMER',
      productType: 'ESIM',
      basePrice: 1_000_000,
      currency: 'IRR',
      isDomestic: false,
    });

    expect(pricing.taxAmount).toBe(0);
  });

  it('correctly rounds currencies per platform policy', () => {
    const irrRound = roundCurrency(1234567, 'IRR');
    expect(irrRound.rounded % 10000).toBe(0);

    const usdtRound = roundCurrency(12.3456, 'USDT');
    expect(usdtRound.rounded).toBe(12.35);
  });
});
