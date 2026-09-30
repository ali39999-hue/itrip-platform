import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  ExceptionSeverity,
  detectPaymentAmountMismatch,
  detectPaymentBookingStatusMismatch,
  detectRefundTotalExceedsPayment,
  detectUnprocessedWebhooks,
} from './three-way-reconciliation';

describe('Financial Reconciliation Scanner Suite (aroux30/site doctrine)', () => {
  describe('detectPaymentAmountMismatch', () => {
    it('returns null when payment amount matches booking total exactly', () => {
      const payment = {
        id: 'pi_123',
        amount: new Prisma.Decimal('15000000'),
        currency: 'IRR',
      };
      const booking = {
        id: 'bkg_456',
        totalAmount: new Prisma.Decimal('15000000'),
        currency: 'IRR',
      };

      const result = detectPaymentAmountMismatch(payment, booking);
      expect(result).toBeNull();
    });

    it('detects mismatch when payment amount disagrees with booking total', () => {
      const payment = {
        id: 'pi_123',
        amount: new Prisma.Decimal('12000000'),
        currency: 'IRR',
      };
      const booking = {
        id: 'bkg_456',
        totalAmount: new Prisma.Decimal('15000000'),
        currency: 'IRR',
      };

      const result = detectPaymentAmountMismatch(payment, booking);
      expect(result).not.toBeNull();
      expect(result?.findingType).toBe('PAYMENT_AMOUNT_MISMATCH');
      expect(result?.severity).toBe(ExceptionSeverity.HIGH);
      expect(result?.entityId).toBe('pi_123');
    });

    it('detects mismatch when currencies differ', () => {
      const payment = {
        id: 'pi_123',
        amount: new Prisma.Decimal('100'),
        currency: 'USD',
      };
      const booking = {
        id: 'bkg_456',
        totalAmount: new Prisma.Decimal('100'),
        currency: 'EUR',
      };

      const result = detectPaymentAmountMismatch(payment, booking);
      expect(result).not.toBeNull();
      expect(result?.findingType).toBe('PAYMENT_AMOUNT_MISMATCH');
    });
  });

  describe('detectPaymentBookingStatusMismatch', () => {
    it('returns null when settled payment has confirmed booking', () => {
      const payment = { id: 'pi_1', status: 'CAPTURED' };
      const booking = { id: 'bkg_1', status: 'CONFIRMED' };

      expect(detectPaymentBookingStatusMismatch(payment, booking)).toBeNull();
    });

    it('detects critical anomaly when payment is CAPTURED but booking is PENDING', () => {
      const payment = { id: 'pi_2', status: 'CAPTURED' };
      const booking = { id: 'bkg_2', status: 'PENDING' };

      const finding = detectPaymentBookingStatusMismatch(payment, booking);
      expect(finding).not.toBeNull();
      expect(finding?.findingType).toBe('PAYMENT_BOOKING_STATUS_MISMATCH');
      expect(finding?.severity).toBe(ExceptionSeverity.CRITICAL);
      expect(finding?.entityId).toBe('bkg_2');
    });

    it('detects anomaly when payment is SUCCEEDED but booking is UNPAID', () => {
      const payment = { id: 'pi_3', status: 'SUCCEEDED' };
      const booking = { id: 'bkg_3', status: 'UNPAID' };

      const finding = detectPaymentBookingStatusMismatch(payment, booking);
      expect(finding).not.toBeNull();
      expect(finding?.findingType).toBe('PAYMENT_BOOKING_STATUS_MISMATCH');
      expect(finding?.severity).toBe(ExceptionSeverity.CRITICAL);
    });
  });

  describe('detectRefundTotalExceedsPayment', () => {
    it('returns null when refunds are within payment boundary', () => {
      const payment = { id: 'pi_1', amount: new Prisma.Decimal('20000000'), currency: 'IRR' };
      const refunds = [
        { id: 'rfd_1', amount: new Prisma.Decimal('5000000'), status: 'APPROVED' },
        { id: 'rfd_2', amount: new Prisma.Decimal('10000000'), status: 'SETTLED' },
      ];

      expect(detectRefundTotalExceedsPayment(payment, refunds)).toBeNull();
    });

    it('ignores REJECTED or CANCELLED refunds in total calculation', () => {
      const payment = { id: 'pi_1', amount: new Prisma.Decimal('20000000'), currency: 'IRR' };
      const refunds = [
        { id: 'rfd_1', amount: new Prisma.Decimal('15000000'), status: 'APPROVED' },
        { id: 'rfd_2', amount: new Prisma.Decimal('50000000'), status: 'REJECTED' }, // rejected, not counted
      ];

      expect(detectRefundTotalExceedsPayment(payment, refunds)).toBeNull();
    });

    it('detects critical hazard when active refunds exceed original payment', () => {
      const payment = { id: 'pi_1', amount: new Prisma.Decimal('20000000'), currency: 'IRR' };
      const refunds = [
        { id: 'rfd_1', amount: new Prisma.Decimal('15000000'), status: 'APPROVED' },
        { id: 'rfd_2', amount: new Prisma.Decimal('10000000'), status: 'SETTLED' }, // total = 25M > 20M
      ];

      const finding = detectRefundTotalExceedsPayment(payment, refunds);
      expect(finding).not.toBeNull();
      expect(finding?.findingType).toBe('REFUND_TOTAL_EXCEEDS_PAYMENT');
      expect(finding?.severity).toBe(ExceptionSeverity.CRITICAL);
    });
  });

  describe('detectUnprocessedWebhooks', () => {
    it('identifies webhooks exceeding grace period', () => {
      const refTime = new Date('2026-03-25T12:00:00Z');
      const webhooks = [
        {
          id: 'wh_recent',
          status: 'RECEIVED',
          createdAt: new Date('2026-03-25T11:45:00Z'), // 15 mins ago, within 60m grace
          gatewayName: 'SHETAB',
          eventId: 'evt_1',
        },
        {
          id: 'wh_stuck',
          status: 'VERIFIED',
          createdAt: new Date('2026-03-25T10:00:00Z'), // 2 hours ago, exceeds 60m grace
          gatewayName: 'SHETAB',
          eventId: 'evt_2',
        },
        {
          id: 'wh_processed',
          status: 'PROCESSED',
          createdAt: new Date('2026-03-25T09:00:00Z'), // processed, ignored
          gatewayName: 'SHETAB',
          eventId: 'evt_3',
        },
      ];

      const findings = detectUnprocessedWebhooks(webhooks, 60, refTime);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.entityId).toBe('wh_stuck');
      expect(findings[0]?.findingType).toBe('WEBHOOK_UNPROCESSED');
      expect(findings[0]?.severity).toBe(ExceptionSeverity.MEDIUM);
    });
  });
});
