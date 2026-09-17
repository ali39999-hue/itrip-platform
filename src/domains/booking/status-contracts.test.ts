/**
 * STATUS-CONTRACTS.TEST.TS
 *
 * Contract verification, property-based invariants, and transition matrix
 * tests for the 4-axis Booking state machine and Prisma boundaries.
 */
import { describe, it, expect } from 'vitest';
import {
  BOOKING_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  FULFILLMENT_STATUS_VALUES,
  TICKET_STATUS_VALUES,
  isBookingStatus,
  isPaymentStatus,
  isFulfillmentStatus,
  isTicketStatus,
  assertBookingStatus,
  assertPaymentStatus,
  validateBookingStatusBoundary,
  canTransitionBooking,
  canTransitionPayment,
  BOOKING_TRANSITION_MATRIX,
  PAYMENT_TRANSITION_MATRIX,
  BookingStatus,
  PaymentStatus,
} from './status-contracts';

describe('Status Contracts & Boundary Validation', () => {
  describe('Value Completeness & Guards', () => {
    it('accepts all valid BookingStatus values', () => {
      for (const status of BOOKING_STATUS_VALUES) {
        expect(isBookingStatus(status)).toBe(true);
        expect(assertBookingStatus(status)).toBe(status);
      }
    });

    it('rejects invalid or typoed BookingStatus values', () => {
      const invalid = ['draft', 'Pending', 'COMPLETE', 'UNKNOWN', ''];
      for (const val of invalid) {
        expect(isBookingStatus(val)).toBe(false);
        expect(() => assertBookingStatus(val)).toThrowError(/Invalid BookingStatus/);
      }
    });

    it('accepts all valid PaymentStatus values', () => {
      for (const status of PAYMENT_STATUS_VALUES) {
        expect(isPaymentStatus(status)).toBe(true);
        expect(assertPaymentStatus(status)).toBe(status);
      }
    });

    it('rejects invalid PaymentStatus values', () => {
      expect(isPaymentStatus('SUCCESS')).toBe(false); // Valid is CAPTURED
      expect(isPaymentStatus('PENDING')).toBe(false); // Valid is PENDING_CUSTOMER
    });

    it('accepts all Fulfillment and Ticket statuses', () => {
      for (const status of FULFILLMENT_STATUS_VALUES) {
        expect(isFulfillmentStatus(status)).toBe(true);
      }
      for (const status of TICKET_STATUS_VALUES) {
        expect(isTicketStatus(status)).toBe(true);
      }
    });
  });

  describe('Database Boundary Validation', () => {
    it('successfully validates a legal 4-axis record', () => {
      const boundary = validateBookingStatusBoundary({
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        fulfillmentStatus: 'CONFIRMED',
        ticketStatus: 'ISSUED',
      });

      expect(boundary).toEqual({
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        fulfillmentStatus: 'CONFIRMED',
        ticketStatus: 'ISSUED',
      });
    });

    it('throws error when a typoed status is passed to boundary', () => {
      expect(() => {
        validateBookingStatusBoundary({
          status: 'CONFIRM' as unknown as BookingStatus, // Missing ED
        });
      }).toThrowError(/Invalid BookingStatus/);
    });
  });

  describe('Transition Matrix & Invariant Verification', () => {
    it('allows legal forward transitions for BookingStatus', () => {
      expect(canTransitionBooking('DRAFT', 'HELD')).toBe(true);
      expect(canTransitionBooking('HELD', 'PENDING_PAYMENT')).toBe(true);
      expect(canTransitionBooking('PENDING_PAYMENT', 'PAYMENT_CONFIRMED')).toBe(true);
      expect(canTransitionBooking('PAYMENT_CONFIRMED', 'CONFIRMED')).toBe(true);
      expect(canTransitionBooking('CONFIRMED', 'CANCEL_REQUESTED')).toBe(true);
    });

    it('strictly forbids illegal jumps or backward regressions', () => {
      // Cannot jump from DRAFT directly to CONFIRMED
      expect(canTransitionBooking('DRAFT', 'CONFIRMED')).toBe(false);
      // Terminal states cannot transition to anything
      expect(canTransitionBooking('REFUNDED', 'DRAFT')).toBe(false);
      expect(canTransitionBooking('REFUNDED', 'CONFIRMED')).toBe(false);
      expect(canTransitionBooking('FAILED', 'CONFIRMED')).toBe(false);
      expect(canTransitionBooking('EXPIRED', 'PAYMENT_CONFIRMED')).toBe(false);
    });

    it('verifies PaymentStatus transition invariants', () => {
      expect(canTransitionPayment('INITIATED', 'PENDING_CUSTOMER')).toBe(true);
      expect(canTransitionPayment('PENDING_CUSTOMER', 'CAPTURED')).toBe(true);
      expect(canTransitionPayment('CAPTURED', 'REFUNDED')).toBe(true);
      // Cannot refund before capture
      expect(canTransitionPayment('INITIATED', 'REFUNDED')).toBe(false);
      expect(canTransitionPayment('AUTHORIZED', 'REFUNDED')).toBe(false);
    });

    it('property-based test: every node in transition matrix must be a recognized value', () => {
      for (const [fromState, allowedNextStates] of Object.entries(BOOKING_TRANSITION_MATRIX)) {
        expect(BOOKING_STATUS_VALUES).toContain(fromState as BookingStatus);
        for (const next of allowedNextStates) {
          expect(BOOKING_STATUS_VALUES).toContain(next);
        }
      }

      for (const [fromState, allowedNextStates] of Object.entries(PAYMENT_TRANSITION_MATRIX)) {
        expect(PAYMENT_STATUS_VALUES).toContain(fromState as PaymentStatus);
        for (const next of allowedNextStates) {
          expect(PAYMENT_STATUS_VALUES).toContain(next);
        }
      }
    });
  });
});
