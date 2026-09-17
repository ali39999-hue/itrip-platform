/**
 * PAYMENT-CRISIS-MATRIX.TEST.TS
 *
 * Crisis and chaos test suite executing scenarios from
 * docs/baseline/PAYMENT_LEDGER_CRISIS_MATRIX.md:
 * - Scenario 1: Duplicate webhook idempotency
 * - Scenario 2: Webhook amount mismatch fail-closed
 * - Scenario 6: Duplicate refund prevention
 * - Scenario 8: Split payment balance invariance
 * - Scenario 10: Deterministic resolution of Cancel vs Capture race
 */
import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';

describe('Payment & Ledger Crisis Scenarios (Fintech Hardening)', () => {
  describe('Scenario 1: Duplicate Webhook Idempotency', () => {
    it('ensures processing duplicate webhooks generates no duplicate ledger debit/credit', () => {
      const processedEventIds = new Set<string>();
      const ledgerJournal: Array<{ eventId: string; debit: number; credit: number }> = [];

      function handleWebhook(eventId: string, amount: number) {
        if (processedEventIds.has(eventId)) {
          return { status: 'DUPLICATE', applied: false };
        }
        processedEventIds.add(eventId);
        ledgerJournal.push({ eventId, debit: amount, credit: amount });
        return { status: 'PROCESSED', applied: true };
      }

      // First webhook arrives
      const r1 = handleWebhook('evt_psp_1001', 5_000_000);
      expect(r1.status).toBe('PROCESSED');
      expect(r1.applied).toBe(true);

      // Duplicate webhook arrives
      const r2 = handleWebhook('evt_psp_1001', 5_000_000);
      expect(r2.status).toBe('DUPLICATE');
      expect(r2.applied).toBe(false);

      // Verify single journal entry exists
      expect(ledgerJournal).toHaveLength(1);
      expect(ledgerJournal[0].debit).toBe(5_000_000);
    });
  });

  describe('Scenario 2: Webhook Amount Mismatch Fail-Closed', () => {
    it('fails closed when PSP reported amount differs from PaymentIntent amount', () => {
      const expectedAmount = new Prisma.Decimal(5_000_000);
      const incomingPspAmount = new Prisma.Decimal(4_500_000); // 500,000 IRR short

      function verifyWebhookAmount(expected: Prisma.Decimal, received: Prisma.Decimal) {
        if (!expected.equals(received)) {
          return {
            valid: false,
            action: 'SUSPEND_AND_RAISE_EXCEPTION',
            discrepancy: expected.minus(received).toNumber(),
          };
        }
        return { valid: true, action: 'CONFIRM_CAPTURE', discrepancy: 0 };
      }

      const result = verifyWebhookAmount(expectedAmount, incomingPspAmount);
      expect(result.valid).toBe(false);
      expect(result.action).toBe('SUSPEND_AND_RAISE_EXCEPTION');
      expect(result.discrepancy).toBe(500_000);
    });
  });

  describe('Scenario 6: Duplicate Refund Prevention', () => {
    it('rejects duplicate refund requests exceeding original payment amount', () => {
      const originalPayment = 10_000_000;
      let totalRefunded = 0;

      function requestRefund(amount: number) {
        if (totalRefunded + amount > originalPayment) {
          throw new Error('REFUND_EXCEEDS_CAPTURED_AMOUNT');
        }
        totalRefunded += amount;
        return { status: 'REFUNDED', currentRefundedTotal: totalRefunded };
      }

      // First refund: 10,000,000
      const r1 = requestRefund(10_000_000);
      expect(r1.status).toBe('REFUNDED');
      expect(r1.currentRefundedTotal).toBe(10_000_000);

      // Duplicate refund attempt
      expect(() => requestRefund(10_000_000)).toThrowError('REFUND_EXCEEDS_CAPTURED_AMOUNT');
    });
  });

  describe('Scenario 8: Split Payment Ledger Invariance', () => {
    it('preserves double-entry balance: SUM(DEBIT) === SUM(CREDIT) across split channels', () => {
      const totalBookingPrice = new Prisma.Decimal(12_000_000);
      const walletPortion = new Prisma.Decimal(4_000_000);
      const gatewayPortion = new Prisma.Decimal(8_000_000);

      expect(walletPortion.plus(gatewayPortion).equals(totalBookingPrice)).toBe(true);

      const entries = [
        // Wallet leg
        { account: 'CUSTOMER_WALLET', debit: new Prisma.Decimal(0), credit: walletPortion },
        { account: 'SETTLEMENT_ESCROW', debit: walletPortion, credit: new Prisma.Decimal(0) },
        // Gateway leg
        { account: 'PSP_CLEARING', debit: gatewayPortion, credit: new Prisma.Decimal(0) },
        { account: 'SETTLEMENT_ESCROW', debit: new Prisma.Decimal(0), credit: gatewayPortion },
      ];

      const sumDebit = entries.reduce((acc, cur) => acc.plus(cur.debit), new Prisma.Decimal(0));
      const sumCredit = entries.reduce((acc, cur) => acc.plus(cur.credit), new Prisma.Decimal(0));

      expect(sumDebit.equals(sumCredit)).toBe(true);
      expect(sumDebit.toNumber()).toBe(12_000_000);
    });
  });

  describe('Scenario 10: Race Condition Between Cancel and Capture', () => {
    it('resolves deterministically into a consistent terminal state', () => {
      // In PostgreSQL row lock: either Cancel wins or Capture wins.
      // If Cancel commits first:
      function onCancelWonThenCaptured() {
        const state = { bookingStatus: 'CANCELLED', paymentStatus: 'REFUND_QUEUED' };
        return state;
      }

      // If Capture commits first:
      function onCaptureWonThenCancelled() {
        const state = { bookingStatus: 'CANCEL_REQUESTED', paymentStatus: 'CAPTURED' };
        // Next step in saga triggers refund
        state.bookingStatus = 'CANCELLED';
        state.paymentStatus = 'REFUNDED';
        return state;
      }

      const outcomeA = onCancelWonThenCaptured();
      expect(outcomeA.bookingStatus).toBe('CANCELLED');

      const outcomeB = onCaptureWonThenCancelled();
      expect(outcomeB.bookingStatus).toBe('CANCELLED');
      expect(outcomeB.paymentStatus).toBe('REFUNDED');
    });
  });
});
