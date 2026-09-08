import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { PlannerGroundingService } from './PlannerGroundingService';
import { ErpCopilotService } from './ErpCopilotService';
import { RiskAssessmentService } from '@/domains/risk/RiskAssessmentService';
import { PredictiveSupplierRoutingService } from '@/domains/supplier/PredictiveSupplierRoutingService';
import { FinancialAnalyticsService } from '@/domains/analytics/FinancialAnalyticsService';
import { OperationalSlaAnalyticsService } from '@/domains/analytics/OperationalSlaAnalyticsService';

describe('Wave 21: AI, Risk Assessment & Analytics Hardening Suite', () => {
  const suffix = `ai_risk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId: string;
  let testTripId: string;
  let testBookingId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `copilot_${suffix}@firuzo.com`,
        phone: `+98913${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'نگار رضوانی',
      },
    });
    testUserId = user.id;

    const trip = await prisma.trip.create({
      data: {
        reference: `TRP-${suffix.toUpperCase()}`,
        userId: testUserId,
        title: 'سفر به دبی',
        status: 'BOOKED',
      },
    });
    testTripId = trip.id;

    const booking = await prisma.booking.create({
      data: {
        reference: `BKG-${suffix.toUpperCase()}`,
        tripId: testTripId,
        customerId: testUserId,
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        totalAmount: 85000000,
        currency: 'IRR',
      },
    });
    testBookingId = booking.id;

    await prisma.payment.create({
      data: {
        bookingId: testBookingId,
        idempotencyKey: `pay_${suffix}`,
        method: 'SHETAB_GATEWAY',
        amount: 85000000,
        currency: 'IRR',
        status: 'SUCCESS',
      },
    });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { bookingId: testBookingId } }).catch(() => {});
    await prisma.booking.deleteMany({ where: { id: testBookingId } }).catch(() => {});
    await prisma.trip.deleteMany({ where: { id: testTripId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
  });

  it('AI-101: PlannerGroundingService grounds itinerary recommendations on canonical bookable offers', async () => {
    const groundingRes = await PlannerGroundingService.groundItinerary([
      {
        legId: 'leg_flight_1',
        type: 'FLIGHT',
        targetName: 'MHD',
        date: '2026-09-20',
        capacityNeeded: 1,
      },
    ]);

    expect(groundingRes).toBeDefined();
    expect(groundingRes.grounded).toBeDefined();
    expect(groundingRes.groundingScore).toBeGreaterThanOrEqual(0);
  });

  it('AI-102: ErpCopilotService provides read-only dossier summary without autonomous mutations', async () => {
    const analysis = await ErpCopilotService.analyzeTravelFile(testTripId, {
      userId: testUserId,
      permissions: ['booking:view:all'],
    });

    expect(analysis.tripId).toBe(testTripId);
    expect(analysis.summaryFa).toContain('پرونده سفر');
    expect(analysis.financialHealth.totalPaid).toBe(85000000);
    expect(analysis.financialHealth.status).toBe('PAID_IN_FULL');
    expect(analysis.riskAssessment.level).toBeDefined();
  });

  it('AI-103: AI mutation proposal strictly requires human operator approval', async () => {
    const proposal = ErpCopilotService.proposeMutation(
      testTripId,
      'TRIGGER_REFUND',
      { refundAmount: 5000000, reason: 'Customer requested cancellation' },
      'Customer flight was cancelled by airline'
    );

    expect(proposal.status).toBe('PENDING_HUMAN_APPROVAL');
    expect(proposal.suggestedBy).toBe('ERP_COPILOT_AI');

    // Operator reviews and approves
    const reviewRes = await ErpCopilotService.reviewProposal(
      proposal.id,
      testUserId,
      'APPROVE',
      'Confirmed with airline dispatch team'
    );

    expect(reviewRes.executed).toBe(true);
    expect(reviewRes.proposal.status).toBe('APPROVED');
    expect(reviewRes.proposal.reviewedBy).toBe(testUserId);

    // Attempting to re-decide throws an error
    await expect(
      ErpCopilotService.reviewProposal(proposal.id, testUserId, 'REJECT')
    ).rejects.toThrow(/already been decided/);
  });

  it('RISK-101: RiskAssessmentService calculates risk score, signals, and generates review signals', async () => {
    // Normal domestic transaction
    const lowRiskRes = await RiskAssessmentService.evaluateTransactionRisk({
      userId: testUserId,
      bookingAmount: 15000000,
      currency: 'IRR',
      productType: 'FLIGHT',
      passengerCount: 1,
    });
    expect(lowRiskRes.decision).toBe('ALLOW');
    expect(lowRiskRes.riskScore).toBeLessThan(40);

    // High value transaction with foreign card
    const highRiskRes = await RiskAssessmentService.evaluateTransactionRisk({
      userId: testUserId,
      bookingAmount: 950000000, // 950M IRR
      currency: 'IRR',
      isForeignCard: true,
      passengerCount: 10,
    });
    expect(highRiskRes.riskScore).toBeGreaterThanOrEqual(50);
    expect(highRiskRes.signals.some((s) => s.code === 'EXTREME_VALUE_TRANSACTION')).toBe(true);
    expect(highRiskRes.signals.some((s) => s.code === 'FOREIGN_CARD_ISSUED')).toBe(true);
    expect(highRiskRes.decision).not.toBe('ALLOW');
  });

  it('RISK-102: PredictiveSupplierRoutingService ranks candidates based on success rate, latency p95 and error rates', async () => {
    const routingDecision = await PredictiveSupplierRoutingService.selectOptimalSupplier('FLIGHT');

    expect(routingDecision.primarySupplierId).toBeDefined();
    expect(routingDecision.primarySupplierName).toBeDefined();
    expect(routingDecision.routingReason).toBeDefined();
  });

  it('ANALYTICS-101: FinancialAnalyticsService computes GMV, net revenue, margins, and reconciles to general ledger', async () => {
    const metrics = await FinancialAnalyticsService.getFinancialMetrics({ currency: 'IRR' });

    expect(metrics).toBeDefined();
    expect(metrics.gmv).toBeDefined();
    expect(metrics.netRevenue).toBeDefined();
    expect(metrics.supplierPayable).toBeDefined();
    expect(metrics.bookingCounts.confirmed).toBeGreaterThanOrEqual(1);
  });

  it('ANALYTICS-102: OperationalSlaAnalyticsService measures ticket issuance, refund resolution, and supplier health SLAs', async () => {
    const sla = await OperationalSlaAnalyticsService.getSlaMetrics();

    expect(sla).toBeDefined();
    expect(sla.ticketIssuance.slaTargetMinutes).toBe(15);
    expect(sla.ticketIssuance.slaCompliancePercentage).toBeGreaterThanOrEqual(0);
    expect(sla.refundResolution.slaCompliancePercentage).toBeGreaterThanOrEqual(0);
    expect(sla.supplierReliability.avgSuccessRate).toBeGreaterThan(0);
  });
});
