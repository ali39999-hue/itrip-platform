export type RefundState =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PROCESSING'
  | 'REFUNDED'
  | 'SETTLED'
  | 'FAILED';

export class InvalidRefundTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid refund state transition from '${from}' to '${to}'`);
    this.name = 'InvalidRefundTransitionError';
  }
}

/**
 * Refund State Machine (REF-102)
 * Manages explicit lifecycle states:
 * REQUESTED -> APPROVED -> PROCESSING -> REFUNDED -> SETTLED (or FAILED)
 */
export class RefundStateMachine {
  private static readonly VALID_TRANSITIONS: Record<RefundState, readonly RefundState[]> = {
    REQUESTED: ['APPROVED', 'FAILED'],
    APPROVED: ['PROCESSING', 'FAILED'],
    PROCESSING: ['REFUNDED', 'SETTLED', 'FAILED'],
    REFUNDED: ['SETTLED', 'FAILED'],
    SETTLED: [],
    FAILED: [],
  };

  private static readonly TERMINAL_STATES: ReadonlySet<RefundState> = new Set([
    'SETTLED',
    'FAILED',
  ]);

  private static readonly PENDING_STATES: ReadonlySet<RefundState> = new Set([
    'REQUESTED',
    'APPROVED',
    'PROCESSING',
  ]);

  private static readonly COMPLETED_STATES: ReadonlySet<RefundState> = new Set([
    'REFUNDED',
    'SETTLED',
  ]);

  static canTransition(from: RefundState, to: RefundState): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  static assertTransition(from: RefundState, to: RefundState): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidRefundTransitionError(from, to);
    }
  }

  static isTerminal(state: RefundState): boolean {
    return this.TERMINAL_STATES.has(state);
  }

  static isPending(state: RefundState): boolean {
    return this.PENDING_STATES.has(state);
  }

  static isCompleted(state: RefundState): boolean {
    return this.COMPLETED_STATES.has(state);
  }
}
