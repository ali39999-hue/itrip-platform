import { describe, it, expect } from 'vitest';
import { runWithCorrelationContext, getCorrelationId, getCorrelationContext } from './correlation-context';
import { BusinessMetricsDashboardService } from './BusinessMetricsDashboardService';
import { AlertingService } from './AlertingService';

describe('Wave 16: Observability, Tracing & Alerting Suite (OBS-101 to OBS-107)', () => {
  describe('OBS-101 & OBS-102: Correlation Context & End-to-End Trace Propagation', () => {
    it('flows correlationId, bookingId, paymentId, and sagaId across asynchronous context', async () => {
      const traceContext = {
        correlationId: 'corr-test-12345',
        requestId: 'req-test-67890',
        bookingId: 'bkg-test-111',
        paymentId: 'pay-test-222',
        sagaId: 'saga-test-333',
        supplierRequestId: 'sup-test-444',
      };

      await runWithCorrelationContext(traceContext, async () => {
        expect(getCorrelationId()).toBe('corr-test-12345');
        const activeCtx = getCorrelationContext();
        expect(activeCtx?.bookingId).toBe('bkg-test-111');
        expect(activeCtx?.paymentId).toBe('pay-test-222');
        expect(activeCtx?.sagaId).toBe('saga-test-333');
        expect(activeCtx?.supplierRequestId).toBe('sup-test-444');
      });
    });

    it('generates a fallback correlationId if executed within a default created context', () => {
      runWithCorrelationContext({}, () => {
        const id = getCorrelationId();
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
      });
    });
  });

  describe('OBS-104: Business Metrics Dashboard Telemetry', () => {
    it('computes conversion rate, booking volume, and payment health metrics', () => {
      BusinessMetricsDashboardService.recordSearch('FLIGHT', 'THR-IST');
      BusinessMetricsDashboardService.recordDraftCreated('FLIGHT', 25000000);
      BusinessMetricsDashboardService.recordBookingConfirmed('bkg-1', 25000000);
      BusinessMetricsDashboardService.recordPaymentCapture('SHETAB_SAMAN', 25000000);

      const dashboard = BusinessMetricsDashboardService.getDashboardSummary();
      expect(dashboard).toBeDefined();
      expect(dashboard.searchMetrics.flightSearches).toBeGreaterThanOrEqual(1);
      expect(dashboard.funnelMetrics.bookingConversionRatePercent).toBeGreaterThanOrEqual(0);
      expect(dashboard.financialMetrics.paymentCaptureRatePercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('OBS-107: Alerting Service & Production Threshold Rules', () => {
    it('evaluates health thresholds and detects anomalies', () => {
      const result = AlertingService.evaluateMetrics({
        totalRequests: 100,
        errorRequests: 5, // 5% > 2% threshold -> CRITICAL
        paymentCaptures: 90,
        paymentFailures: 10, // 10% > 5% threshold -> CRITICAL
        oldestQueueAgeMs: 400000, // 400s > 300s threshold -> CRITICAL
      });

      expect(result.triggeredAlerts.length).toBeGreaterThanOrEqual(2);
      expect(result.triggeredAlerts.some((a) => a.ruleId === 'RULE_HIGH_ERROR_RATE')).toBe(true);
      expect(result.triggeredAlerts.some((a) => a.ruleId === 'RULE_PAYMENT_FAILURE_RATE')).toBe(true);
    });

    it('returns empty triggered alerts when all operational parameters are within safe thresholds', () => {
      AlertingService.reset();
      const result = AlertingService.evaluateMetrics({
        totalRequests: 1000,
        errorRequests: 5, // 0.5% < 2%
        paymentCaptures: 99,
        paymentFailures: 1, // 1% < 5%
        oldestQueueAgeMs: 15000, // 15s < 300s
      });

      expect(result.triggeredAlerts.length).toBe(0);
    });
  });
});
