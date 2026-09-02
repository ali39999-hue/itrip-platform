export type BookingState =
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

export interface StateTransitionRule {
  from: BookingState[];
  to: BookingState;
  description: string;
}

export const VALID_TRANSITIONS: StateTransitionRule[] = [
  { from: ['DRAFT'], to: 'HELD', description: 'Hold inventory allotment' },
  { from: ['DRAFT', 'HELD'], to: 'PENDING_PAYMENT', description: 'Final server price agreed' },
  { from: ['HELD', 'PENDING_PAYMENT'], to: 'EXPIRED', description: 'TTL expired before payment' },
  { from: ['PENDING_PAYMENT', 'DRAFT'], to: 'PAYMENT_CONFIRMED', description: 'Payment authorized/captured' },
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

export class BookingStateMachine {
  static canTransition(current: BookingState, next: BookingState): boolean {
    if (current === next) return true;
    return VALID_TRANSITIONS.some((r) => r.from.includes(current) && r.to === next);
  }

  static assertTransition(current: BookingState, next: BookingState): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Invalid state transition: Cannot transition booking from ${current} to ${next}`);
    }
  }
}
