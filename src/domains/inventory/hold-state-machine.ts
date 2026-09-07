export type InventoryHoldStatus = 'ACTIVE' | 'CAPTURED' | 'RELEASED' | 'EXPIRED';

export interface HoldTransitionRule {
  from: InventoryHoldStatus[];
  to: InventoryHoldStatus;
  description: string;
}

export const VALID_HOLD_TRANSITIONS: HoldTransitionRule[] = [
  {
    from: ['ACTIVE'],
    to: 'CAPTURED',
    description: 'Hold captured and committed to booked allotment upon payment',
  },
  {
    from: ['ACTIVE'],
    to: 'RELEASED',
    description: 'Active hold released on booking draft abandonment or cancellation',
  },
  {
    from: ['ACTIVE'],
    to: 'EXPIRED',
    description: 'Active hold expired by hold sweeper after TTL window elapsed',
  },
  {
    from: ['CAPTURED'],
    to: 'RELEASED',
    description: 'Captured hold released during refund compensation with capacity restoration',
  },
];

export class InventoryHoldStateMachine {
  static readonly VALID_STATUSES: InventoryHoldStatus[] = ['ACTIVE', 'CAPTURED', 'RELEASED', 'EXPIRED'];

  static isValidStatus(status: string): status is InventoryHoldStatus {
    return this.VALID_STATUSES.includes(status as InventoryHoldStatus);
  }

  static canTransition(current: InventoryHoldStatus, next: InventoryHoldStatus): boolean {
    if (current === next) return true; // Idempotent same-status
    return VALID_HOLD_TRANSITIONS.some((r) => r.from.includes(current) && r.to === next);
  }

  static assertTransition(current: InventoryHoldStatus, next: InventoryHoldStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(
        `Invalid inventory hold state transition: cannot transition hold from ${current} to ${next}. Terminal or invalid transition prevented.`
      );
    }
  }

  static isTerminal(status: InventoryHoldStatus): boolean {
    return status === 'RELEASED' || status === 'EXPIRED';
  }
}
