export type QuoteStatus = 'ACTIVE' | 'EXPIRED' | 'REPLACED';

export interface QuoteTransitionRule {
  from: QuoteStatus[];
  to: QuoteStatus;
  description: string;
}

export const VALID_QUOTE_TRANSITIONS: QuoteTransitionRule[] = [
  {
    from: ['ACTIVE'],
    to: 'EXPIRED',
    description: 'Quote validity window elapsed (server-side TTL enforcement)',
  },
  {
    from: ['ACTIVE'],
    to: 'REPLACED',
    description: 'Quote superseded by a newly calculated authoritative quote or reprice',
  },
];

export class QuoteStateMachine {
  static readonly VALID_STATUSES: QuoteStatus[] = ['ACTIVE', 'EXPIRED', 'REPLACED'];

  static isValidStatus(status: string): status is QuoteStatus {
    return this.VALID_STATUSES.includes(status as QuoteStatus);
  }

  static canTransition(current: QuoteStatus, next: QuoteStatus): boolean {
    if (current === next) return true; // Idempotent same-state
    return VALID_QUOTE_TRANSITIONS.some((r) => r.from.includes(current) && r.to === next);
  }

  static assertTransition(current: QuoteStatus, next: QuoteStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(
        `Invalid quote state transition: cannot transition quote from ${current} to ${next}. Terminal states (EXPIRED, REPLACED) cannot be modified.`
      );
    }
  }

  static isTerminal(status: QuoteStatus): boolean {
    return status === 'EXPIRED' || status === 'REPLACED';
  }
}
