/**
 * STATUS-CONTRACTS.TS
 *
 * Centralized, authoritative contracts for Prisma database boundaries,
 * state machine status definitions, branded types, and transition invariants.
 *
 * Enforces the 4 independent booking axes:
 * 1. BookingStatus (Workflow & Reservation lifecycle)
 * 2. PaymentStatus (Monetary authorization & settlement)
 * 3. FulfillmentStatus (Supplier contract & voucher provisioning)
 * 4. TicketStatus (E-Ticket coupon issuance & ticketing state)
 */
import { z } from 'zod';

// ============================================================================
// 1. CONSTANT MAPS & VALUE SETS (Single Source of Truth)
// ============================================================================

export const BOOKING_STATUS_VALUES = [
  'DRAFT',
  'HELD',
  'PENDING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'CONFIRMING_SUPPLIER',
  'CONFIRMED',
  'CANCEL_REQUESTED',
  'CANCELLING',
  'CANCELLED',
  'REFUND_INITIATED',
  'REFUNDED',
  'EXPIRED',
  'FAILED',
] as const;

export const PAYMENT_STATUS_VALUES = [
  'INITIATED',
  'PENDING_CUSTOMER',
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'VOIDED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;

export const FULFILLMENT_STATUS_VALUES = [
  'PENDING',
  'IN_PROGRESS',
  'CONFIRMED',
  'FAILED',
] as const;

export const TICKET_STATUS_VALUES = [
  'NOT_ISSUED',
  'ISSUING',
  'ISSUED',
  'VOIDED',
  'REFUND_PENDING',
  'REFUNDED',
] as const;

// ============================================================================
// 2. BRANDED TYPES FOR STRICT TYPE-CHECKING
// ============================================================================

declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type BrandedBookingStatus = Brand<(typeof BOOKING_STATUS_VALUES)[number], 'BookingStatus'>;
export type BrandedPaymentStatus = Brand<(typeof PAYMENT_STATUS_VALUES)[number], 'PaymentStatus'>;
export type BrandedFulfillmentStatus = Brand<(typeof FULFILLMENT_STATUS_VALUES)[number], 'FulfillmentStatus'>;
export type BrandedTicketStatus = Brand<(typeof TICKET_STATUS_VALUES)[number], 'TicketStatus'>;

// Re-export regular union types for compatibility
export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];
export type FulfillmentStatus = (typeof FULFILLMENT_STATUS_VALUES)[number];
export type TicketStatus = (typeof TICKET_STATUS_VALUES)[number];

// ============================================================================
// 3. RUNTIME TYPE GUARDS & ASSERTIONS
// ============================================================================

export function isBookingStatus(val: unknown): val is BookingStatus {
  return typeof val === 'string' && (BOOKING_STATUS_VALUES as readonly string[]).includes(val);
}

export function isPaymentStatus(val: unknown): val is PaymentStatus {
  return typeof val === 'string' && (PAYMENT_STATUS_VALUES as readonly string[]).includes(val);
}

export function isFulfillmentStatus(val: unknown): val is FulfillmentStatus {
  return typeof val === 'string' && (FULFILLMENT_STATUS_VALUES as readonly string[]).includes(val);
}

export function isTicketStatus(val: unknown): val is TicketStatus {
  return typeof val === 'string' && (TICKET_STATUS_VALUES as readonly string[]).includes(val);
}

export function assertBookingStatus(val: unknown): BookingStatus {
  if (!isBookingStatus(val)) {
    throw new TypeError(`Invalid BookingStatus: "${String(val)}". Allowed: ${BOOKING_STATUS_VALUES.join(', ')}`);
  }
  return val;
}

export function assertPaymentStatus(val: unknown): PaymentStatus {
  if (!isPaymentStatus(val)) {
    throw new TypeError(`Invalid PaymentStatus: "${String(val)}". Allowed: ${PAYMENT_STATUS_VALUES.join(', ')}`);
  }
  return val;
}

export function assertFulfillmentStatus(val: unknown): FulfillmentStatus {
  if (!isFulfillmentStatus(val)) {
    throw new TypeError(`Invalid FulfillmentStatus: "${String(val)}". Allowed: ${FULFILLMENT_STATUS_VALUES.join(', ')}`);
  }
  return val;
}

export function assertTicketStatus(val: unknown): TicketStatus {
  if (!isTicketStatus(val)) {
    throw new TypeError(`Invalid TicketStatus: "${String(val)}". Allowed: ${TICKET_STATUS_VALUES.join(', ')}`);
  }
  return val;
}

// ============================================================================
// 4. DATABASE BOUNDARY ZOD SCHEMAS
// ============================================================================

export const BookingStatusSchema = z.enum(BOOKING_STATUS_VALUES);
export const PaymentStatusSchema = z.enum(PAYMENT_STATUS_VALUES);
export const FulfillmentStatusSchema = z.enum(FULFILLMENT_STATUS_VALUES);
export const TicketStatusSchema = z.enum(TICKET_STATUS_VALUES);

export const BookingDatabaseBoundarySchema = z.object({
  status: BookingStatusSchema,
  paymentStatus: PaymentStatusSchema,
  fulfillmentStatus: FulfillmentStatusSchema,
  ticketStatus: TicketStatusSchema,
});

export type BookingDatabaseBoundary = z.infer<typeof BookingDatabaseBoundarySchema>;

/**
 * Validates a booking data object at the database boundary before creation or update.
 */
export function validateBookingStatusBoundary(data: {
  status?: unknown;
  paymentStatus?: unknown;
  fulfillmentStatus?: unknown;
  ticketStatus?: unknown;
}): Partial<BookingDatabaseBoundary> {
  const parsed: Partial<BookingDatabaseBoundary> = {};
  if (data.status !== undefined) parsed.status = assertBookingStatus(data.status);
  if (data.paymentStatus !== undefined) parsed.paymentStatus = assertPaymentStatus(data.paymentStatus);
  if (data.fulfillmentStatus !== undefined) parsed.fulfillmentStatus = assertFulfillmentStatus(data.fulfillmentStatus);
  if (data.ticketStatus !== undefined) parsed.ticketStatus = assertTicketStatus(data.ticketStatus);
  return parsed;
}

// ============================================================================
// 5. 4-AXIS STATE MACHINE LEGAL TRANSITION MATRICES
// ============================================================================

export const BOOKING_TRANSITION_MATRIX: Record<BookingStatus, readonly BookingStatus[]> = {
  DRAFT: ['HELD', 'PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'FAILED'],
  HELD: ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'EXPIRED', 'FAILED'],
  PENDING_PAYMENT: ['PAYMENT_CONFIRMED', 'EXPIRED', 'FAILED'],
  PAYMENT_CONFIRMED: ['CONFIRMING_SUPPLIER', 'CONFIRMED', 'FAILED', 'REFUND_INITIATED'],
  CONFIRMING_SUPPLIER: ['CONFIRMED', 'FAILED', 'REFUND_INITIATED'],
  CONFIRMED: ['CANCEL_REQUESTED'],
  CANCEL_REQUESTED: ['CANCELLING', 'CONFIRMED'],
  CANCELLING: ['CANCELLED', 'CONFIRMED'],
  CANCELLED: ['REFUND_INITIATED'],
  REFUND_INITIATED: ['REFUNDED', 'FAILED'],
  REFUNDED: [],
  EXPIRED: [],
  FAILED: [],
};

export const PAYMENT_TRANSITION_MATRIX: Record<PaymentStatus, readonly PaymentStatus[]> = {
  INITIATED: ['PENDING_CUSTOMER', 'AUTHORIZED', 'CAPTURED', 'FAILED'],
  PENDING_CUSTOMER: ['AUTHORIZED', 'CAPTURED', 'FAILED'],
  AUTHORIZED: ['CAPTURED', 'VOIDED', 'FAILED'],
  CAPTURED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  VOIDED: [],
  FAILED: [],
  REFUNDED: [],
};

export const FULFILLMENT_TRANSITION_MATRIX: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  PENDING: ['IN_PROGRESS', 'CONFIRMED', 'FAILED'],
  IN_PROGRESS: ['CONFIRMED', 'FAILED'],
  CONFIRMED: [],
  FAILED: [],
};

export const TICKET_TRANSITION_MATRIX: Record<TicketStatus, readonly TicketStatus[]> = {
  NOT_ISSUED: ['ISSUING'],
  ISSUING: ['ISSUED', 'NOT_ISSUED', 'VOIDED'],
  ISSUED: ['VOIDED', 'REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED'],
  VOIDED: [],
  REFUNDED: [],
};

export function canTransitionBooking(current: BookingStatus, next: BookingStatus): boolean {
  return BOOKING_TRANSITION_MATRIX[current].includes(next);
}

export function canTransitionPayment(current: PaymentStatus, next: PaymentStatus): boolean {
  return PAYMENT_TRANSITION_MATRIX[current].includes(next);
}

export function canTransitionFulfillment(current: FulfillmentStatus, next: FulfillmentStatus): boolean {
  return FULFILLMENT_TRANSITION_MATRIX[current].includes(next);
}

export function canTransitionTicket(current: TicketStatus, next: TicketStatus): boolean {
  return TICKET_TRANSITION_MATRIX[current].includes(next);
}
