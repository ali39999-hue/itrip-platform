/**
 * OBS-104: Canonical Business Metrics Dashboard Service
 *
 * Tracks critical business and operational telemetry:
 * - Search Volume (by vertical: Flight, Hotel, Tour)
 * - Booking Conversion Funnel (Draft -> Confirmed)
 * - Payment Capture & Success Rates
 * - Refund Execution Latency (Avg & P95)
 * - Gross Merchandise Value (GMV)
 */

import { createLogger } from './logger';

export interface RefundLatencyEntry {
  refundId: string;
  latencyMs: number;
  recordedAt: number;
}

export interface BusinessMetricsDashboardReport {
  timestamp: string;
  period: 'all_time' | 'rolling_snapshot';
  searchMetrics: {
    totalSearches: number;
    flightSearches: number;
    hotelSearches: number;
    tourSearches: number;
  };
  funnelMetrics: {
    draftsCreated: number;
    bookingsConfirmed: number;
    bookingConversionRatePercent: number; // (confirmed / drafts) * 100
  };
  financialMetrics: {
    grossMerchandiseValue: number; // GMV in Toman / Base Currency
    paymentsCaptured: number;
    paymentsFailed: number;
    totalPaymentAttempts: number;
    paymentCaptureRatePercent: number; // (captured / total) * 100
    capturedVolume: number;
  };
  refundMetrics: {
    totalRefundsProcessed: number;
    totalRefundAmount: number;
    avgRefundLatencyMs: number;
    p95RefundLatencyMs: number;
  };
}

class BusinessMetricsDashboardServiceClass {
  private logger = createLogger('business-metrics-dashboard');

  private searches = {
    flight: 0,
    hotel: 0,
    tour: 0,
  };

  private draftsCreated = 0;
  private bookingsConfirmed = 0;
  private grossMerchandiseValue = 0;

  private paymentsCaptured = 0;
  private paymentsFailed = 0;
  private capturedVolume = 0;

  private refundLatencies: RefundLatencyEntry[] = [];
  private totalRefundAmount = 0;

  recordSearch(vertical: 'FLIGHT' | 'HOTEL' | 'TOUR', destination?: string): void {
    if (vertical === 'FLIGHT') this.searches.flight++;
    else if (vertical === 'HOTEL') this.searches.hotel++;
    else if (vertical === 'TOUR') this.searches.tour++;

    this.logger.info('Recorded Search Event', { vertical, destination });
  }

  recordDraftCreated(vertical: string, amount: number): void {
    this.draftsCreated++;
    this.logger.info('Recorded Booking Draft Created', { vertical, amount });
  }

  recordBookingConfirmed(bookingId: string, amount: number, vertical?: string): void {
    this.bookingsConfirmed++;
    this.grossMerchandiseValue += Math.max(0, amount);
    this.logger.info('Recorded Booking Confirmation', {
      bookingId,
      amount,
      vertical,
      currentGmv: this.grossMerchandiseValue,
    });
  }

  recordPaymentCapture(gateway: string, amount: number): void {
    this.paymentsCaptured++;
    this.capturedVolume += Math.max(0, amount);
    this.logger.info('Recorded Payment Captured', { gateway, amount });
  }

  recordPaymentFailure(gateway: string, reason: string): void {
    this.paymentsFailed++;
    this.logger.warn('Recorded Payment Failure', { gateway, reason });
  }

  recordRefundLatency(refundId: string, latencyMs: number, amount: number = 0): void {
    const cleanLatency = Math.max(0, latencyMs);
    this.refundLatencies.push({
      refundId,
      latencyMs: cleanLatency,
      recordedAt: Date.now(),
    });
    this.totalRefundAmount += Math.max(0, amount);

    // Keep bounded history (last 1000 data points)
    if (this.refundLatencies.length > 1000) {
      this.refundLatencies.splice(0, this.refundLatencies.length - 1000);
    }

    this.logger.info('Recorded Refund Latency', { refundId, latencyMs: cleanLatency, amount });
  }

  getDashboardSummary(): BusinessMetricsDashboardReport {
    const totalSearches = this.searches.flight + this.searches.hotel + this.searches.tour;

    const bookingConversionRatePercent =
      this.draftsCreated > 0
        ? Number(((this.bookingsConfirmed / this.draftsCreated) * 100).toFixed(2))
        : 0;

    const totalPaymentAttempts = this.paymentsCaptured + this.paymentsFailed;
    const paymentCaptureRatePercent =
      totalPaymentAttempts > 0
        ? Number(((this.paymentsCaptured / totalPaymentAttempts) * 100).toFixed(2))
        : 100;

    // Calculate latency metrics
    let avgRefundLatencyMs = 0;
    let p95RefundLatencyMs = 0;

    if (this.refundLatencies.length > 0) {
      const sorted = [...this.refundLatencies].map((e) => e.latencyMs).sort((a, b) => a - b);
      const sum = sorted.reduce((acc, val) => acc + val, 0);
      avgRefundLatencyMs = Math.round(sum / sorted.length);

      const p95Index = Math.min(
        Math.floor(sorted.length * 0.95),
        sorted.length - 1
      );
      p95RefundLatencyMs = sorted[p95Index];
    }

    return {
      timestamp: new Date().toISOString(),
      period: 'all_time',
      searchMetrics: {
        totalSearches,
        flightSearches: this.searches.flight,
        hotelSearches: this.searches.hotel,
        tourSearches: this.searches.tour,
      },
      funnelMetrics: {
        draftsCreated: this.draftsCreated,
        bookingsConfirmed: this.bookingsConfirmed,
        bookingConversionRatePercent,
      },
      financialMetrics: {
        grossMerchandiseValue: this.grossMerchandiseValue,
        paymentsCaptured: this.paymentsCaptured,
        paymentsFailed: this.paymentsFailed,
        totalPaymentAttempts,
        paymentCaptureRatePercent,
        capturedVolume: this.capturedVolume,
      },
      refundMetrics: {
        totalRefundsProcessed: this.refundLatencies.length,
        totalRefundAmount: this.totalRefundAmount,
        avgRefundLatencyMs,
        p95RefundLatencyMs,
      },
    };
  }

  reset(): void {
    this.searches = { flight: 0, hotel: 0, tour: 0 };
    this.draftsCreated = 0;
    this.bookingsConfirmed = 0;
    this.grossMerchandiseValue = 0;
    this.paymentsCaptured = 0;
    this.paymentsFailed = 0;
    this.capturedVolume = 0;
    this.refundLatencies = [];
    this.totalRefundAmount = 0;
  }
}

export const businessMetricsDashboard = new BusinessMetricsDashboardServiceClass();
export const BusinessMetricsDashboardService = businessMetricsDashboard;
