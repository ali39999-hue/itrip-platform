/**
 * @packages/domain-types
 *
 * Canonical domain types, constant maps, branded types, and transition matrices
 * for iTrip platform, ERP, and background workers.
 */

// ============================================================================
// 1. CONSTANT MAPS (Single Source of Truth)
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
// 2. BRANDED TYPES
// ============================================================================

declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];
export type FulfillmentStatus = (typeof FULFILLMENT_STATUS_VALUES)[number];
export type TicketStatus = (typeof TICKET_STATUS_VALUES)[number];

export type BrandedBookingStatus = Brand<BookingStatus, 'BookingStatus'>;
export type BrandedPaymentStatus = Brand<PaymentStatus, 'PaymentStatus'>;
export type BrandedFulfillmentStatus = Brand<FulfillmentStatus, 'FulfillmentStatus'>;
export type BrandedTicketStatus = Brand<TicketStatus, 'TicketStatus'>;

// ============================================================================
// 3. RUNTIME GUARDS & ASSERTIONS
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

// ============================================================================
// 4. TRANSITION MATRICES
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
