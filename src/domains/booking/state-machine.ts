export type BookingStatus =
  | 'DRAFT'
  | 'HELD'
  | 'PENDING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'CONFIRMING_SUPPLIER'
  | 'CONFIRMED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLING'
  | 'CANCELLED'
  | 'REFUND_INITIATED'
  | 'REFUNDED'
  | 'EXPIRED'
  | 'FAILED';

// Alias for backwards compatibility
export type BookingState = BookingStatus;

export type PaymentStatus =
  | 'INITIATED'
  | 'PENDING_CUSTOMER'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'VOIDED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type FulfillmentStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'CONFIRMED'
  | 'FAILED';

export type TicketStatus =
  | 'NOT_ISSUED'
  | 'ISSUING'
  | 'ISSUED'
  | 'VOIDED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export interface StateTransitionRule<T extends string> {
  from: T[];
  to: T;
  description: string;
}

export const VALID_BOOKING_TRANSITIONS: StateTransitionRule<BookingStatus>[] = [
  { from: ['DRAFT'], to: 'HELD', description: 'Hold inventory allotment' },
  { from: ['DRAFT', 'HELD'], to: 'PENDING_PAYMENT', description: 'Final server price agreed' },
  { from: ['HELD', 'PENDING_PAYMENT'], to: 'EXPIRED', description: 'TTL expired before payment' },
  { from: ['HELD', 'PENDING_PAYMENT', 'DRAFT'], to: 'PAYMENT_CONFIRMED', description: 'Payment authorized/captured' },
  { from: ['PAYMENT_CONFIRMED'], to: 'CONFIRMING_SUPPLIER', description: 'Awaiting on-request supplier response' },
  { from: ['PAYMENT_CONFIRMED', 'CONFIRMING_SUPPLIER'], to: 'CONFIRMED', description: 'Instant or supplier confirmed' },
  { from: ['CONFIRMING_SUPPLIER'], to: 'REFUND_INITIATED', description: 'Supplier rejected on-request' },
  { from: ['PAYMENT_CONFIRMED'], to: 'FAILED', description: 'Issuing or internal failure' },
  { from: ['CONFIRMED'], to: 'CANCEL_REQUESTED', description: 'Customer requested cancellation' },
  { from: ['CANCEL_REQUESTED'], to: 'CANCELLING', description: 'Cancellation saga initiated' },
  { from: ['CANCELLING'], to: 'CANCELLED', description: 'Supplier cancellation accepted' },
  { from: ['CANCELLING'], to: 'CONFIRMED', description: 'Supplier rejected cancellation request' },
  { from: ['CANCELLED'], to: 'REFUND_INITIATED', description: 'Posting ledger refund entries' },
  { from: ['REFUND_INITIATED'], to: 'REFUNDED', description: 'Refund completed and funds settled' },
];

export const VALID_PAYMENT_TRANSITIONS: StateTransitionRule<PaymentStatus>[] = [
  { from: ['INITIATED'], to: 'PENDING_CUSTOMER', description: 'Redirected to gateway' },
  { from: ['INITIATED', 'PENDING_CUSTOMER'], to: 'AUTHORIZED', description: 'Funds authorized on card' },
  { from: ['INITIATED', 'PENDING_CUSTOMER', 'AUTHORIZED'], to: 'CAPTURED', description: 'Funds settled/captured' },
  { from: ['INITIATED', 'PENDING_CUSTOMER', 'AUTHORIZED'], to: 'FAILED', description: 'Payment declined or cancelled' },
  { from: ['AUTHORIZED'], to: 'VOIDED', description: 'Authorization voided before capture' },
  { from: ['CAPTURED'], to: 'PARTIALLY_REFUNDED', description: 'Partial refund processed' },
  { from: ['CAPTURED', 'PARTIALLY_REFUNDED'], to: 'REFUNDED', description: 'Full refund settled' },
];

export const VALID_FULFILLMENT_TRANSITIONS: StateTransitionRule<FulfillmentStatus>[] = [
  { from: ['PENDING'], to: 'IN_PROGRESS', description: 'Supplier reservation requested' },
  { from: ['PENDING', 'IN_PROGRESS'], to: 'CONFIRMED', description: 'Supplier issued voucher/booking' },
  { from: ['PENDING', 'IN_PROGRESS'], to: 'FAILED', description: 'Supplier rejected or timed out' },
];

export const VALID_TICKET_TRANSITIONS: StateTransitionRule<TicketStatus>[] = [
  { from: ['NOT_ISSUED'], to: 'ISSUING', description: 'Queued to GDS/Airline issuing robot' },
  { from: ['ISSUING'], to: 'ISSUED', description: 'Ticket e-ticket number generated' },
  { from: ['ISSUED'], to: 'VOIDED', description: 'Voided within 24hr ticketing window' },
  { from: ['ISSUED'], to: 'REFUND_PENDING', description: 'Refund requested on ticket' },
  { from: ['REFUND_PENDING'], to: 'REFUNDED', description: 'Airline coupon marked refunded' },
];

export const VALID_TRANSITIONS = VALID_BOOKING_TRANSITIONS;

export class BookingStateMachine {
  static canTransition(current: BookingStatus, next: BookingStatus): boolean {
    return VALID_BOOKING_TRANSITIONS.some((r) => r.from.includes(current) && r.to === next);
  }

  static assertTransition(current: BookingStatus, next: BookingStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Invalid state transition: Cannot transition booking from ${current} to ${next}`);
    }
  }

  static canTransitionPayment(current: PaymentStatus, next: PaymentStatus): boolean {
    return VALID_PAYMENT_TRANSITIONS.some((r) => r.from.includes(current) && r.to === next);
  }

  static assertPaymentTransition(current: PaymentStatus, next: PaymentStatus): void {
    if (!this.canTransitionPayment(current, next)) {
      throw new Error(`Invalid payment state transition: Cannot transition payment from ${current} to ${next}`);
    }
  }

  static canTransitionFulfillment(current: FulfillmentStatus, next: FulfillmentStatus): boolean {
    return VALID_FULFILLMENT_TRANSITIONS.some((r) => r.from.includes(current) && r.to === next);
  }

  static assertFulfillmentTransition(current: FulfillmentStatus, next: FulfillmentStatus): void {
    if (!this.canTransitionFulfillment(current, next)) {
      throw new Error(`Invalid fulfillment state transition: Cannot transition fulfillment from ${current} to ${next}`);
    }
  }

  static canTransitionTicket(current: TicketStatus, next: TicketStatus): boolean {
    return VALID_TICKET_TRANSITIONS.some((r) => r.from.includes(current) && r.to === next);
  }

  static assertTicketTransition(current: TicketStatus, next: TicketStatus): void {
    if (!this.canTransitionTicket(current, next)) {
      throw new Error(`Invalid ticket state transition: Cannot transition ticket from ${current} to ${next}`);
    }
  }
}
