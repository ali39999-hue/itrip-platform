import { describe, it, expect, beforeEach } from 'vitest';
import { businessMetrics } from './business-metrics';

/**
 * Business Metrics & Telemetry Suite (OBS-005)
 */
describe('Business Telemetry & Conversion Metrics Suite (OBS-005)', () => {
  beforeEach(() => {
    businessMetrics.reset();
  });

  it('records searches, drafts, confirmations, and calculates checkout conversion rate', () => {
    businessMetrics.recordSearch('FLIGHT', 'THR-IST');
    businessMetrics.recordSearch('HOTEL', 'Tehran');

    // 10 drafts created
    for (let i = 0; i < 10; i++) {
      businessMetrics.recordDraftCreated('FLIGHT', 5_000_000);
    }

    // 4 bookings confirmed
    for (let i = 0; i < 4; i++) {
      businessMetrics.recordBookingConfirmed(`bkg_${i}`, 5_000_000);
    }

    const snapshot = businessMetrics.getSnapshot();
    expect(snapshot.counters.searchesTotal).toBe(2);
    expect(snapshot.counters.draftsCreated).toBe(10);
    expect(snapshot.counters.bookingsConfirmed).toBe(4);
    // 4 / 10 = 40%
    expect(snapshot.rates.checkoutConversionRate).toBe(40);
  });

  it('records payment captures, failures, and calculates payment success rate', () => {
    businessMetrics.recordPaymentCaptured('SHETAB_GATEWAY', 10_000_000);
    businessMetrics.recordPaymentCaptured('SHETAB_GATEWAY', 5_000_000);
    businessMetrics.recordPaymentCaptured('SHETAB_GATEWAY', 5_000_000);
    businessMetrics.recordPaymentFailed('SHETAB_GATEWAY', 'User cancelled on Shaparak');

    const snapshot = businessMetrics.getSnapshot();
    expect(snapshot.counters.paymentsCaptured).toBe(3);
    expect(snapshot.counters.paymentsFailed).toBe(1);
    // 3 / (3 + 1) = 75%
    expect(snapshot.rates.paymentSuccessRate).toBe(75);
  });

  it('tracks refunds, price changes, and stale sweeps', () => {
    businessMetrics.recordRefundProcessed('rfd_123', 2_000_000);
    businessMetrics.recordPriceChange(1_000_000, 1_200_000);
    businessMetrics.recordStaleBookingSwept(3);

    const snapshot = businessMetrics.getSnapshot();
    expect(snapshot.counters.refundsProcessed).toBe(1);
    expect(snapshot.counters.priceChangesDetected).toBe(1);
    expect(snapshot.counters.staleBookingsSwept).toBe(3);
  });
});
