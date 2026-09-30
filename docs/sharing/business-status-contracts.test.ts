/**
 * Business request state machine — exhaustive transition coverage.
 *
 * The spec requires the full legal chain be walked with no jumps, and that an
 * illegal jump be rejected. This suite enumerates EVERY (from, to) pair across
 * the eight statuses, so a newly added status cannot pass silently.
 */

import { describe, it, expect } from 'vitest';
import {
  BUSINESS_REQUEST_STATUS_VALUES,
  BUSINESS_REQUEST_TRANSITIONS,
  BUSINESS_TERMINAL_STATUSES,
  allowedTransitionsFrom,
  assertTransition,
  canTransition,
  isBusinessRequestStatus,
  isTerminal,
  InvalidBusinessStatusError,
  InvalidTransitionError,
  type BusinessRequestStatus,
} from './status-contracts';

describe('BusinessStateMachine — status contract', () => {
  it('exposes exactly the six statuses plus cancelled', () => {
    expect(BUSINESS_REQUEST_STATUS_VALUES).toHaveLength(8);
    expect(BUSINESS_REQUEST_STATUS_VALUES).toEqual([
      'draft',
      'submitted',
      'deposit_paid',
      'under_review',
      'changes_requested',
      'approved',
      'issued',
      'cancelled',
    ]);
  });

  it('recognises valid statuses and rejects anything else', () => {
    for (const status of BUSINESS_REQUEST_STATUS_VALUES) {
      expect(isBusinessRequestStatus(status)).toBe(true);
    }
    expect(isBusinessRequestStatus('DRAFT')).toBe(false); // case-sensitive by design
    expect(isBusinessRequestStatus('')).toBe(false);
    expect(isBusinessRequestStatus(null)).toBe(false);
    expect(isBusinessRequestStatus(undefined)).toBe(false);
    expect(isBusinessRequestStatus(42)).toBe(false);
  });

  it('marks issued and cancelled terminal, everything else live', () => {
    expect([...BUSINESS_TERMINAL_STATUSES].sort()).toEqual(['cancelled', 'issued']);
    for (const status of BUSINESS_REQUEST_STATUS_VALUES) {
      const expected = status === 'issued' || status === 'cancelled';
      expect(isTerminal(status)).toBe(expected);
    }
  });
});

describe('BusinessStateMachine — exhaustive (from, to) matrix', () => {
  // Build the set of legal pairs once, then assert every other pair is illegal.
  const legal = new Set<string>(
    BUSINESS_REQUEST_TRANSITIONS.map((r) => `${r.from}->${r.to}`),
  );

  it.each(
    BUSINESS_REQUEST_STATUS_VALUES.flatMap((from) =>
      BUSINESS_REQUEST_STATUS_VALUES.map((to) => [from, to] as const),
    ),
  )('%s -> %s is %s', (from, to) => {
    const shouldBeLegal = legal.has(`${from}->${to}`);
    expect(canTransition(from, to)).toBe(shouldBeLegal);
  });

  it('covers every legal pair with a non-empty description', () => {
    for (const rule of BUSINESS_REQUEST_TRANSITIONS) {
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });

  it('never lists a transition out of a terminal status', () => {
    for (const rule of BUSINESS_REQUEST_TRANSITIONS) {
      expect(BUSINESS_TERMINAL_STATUSES).not.toContain(rule.from);
    }
  });

  it('lists no duplicate transitions', () => {
    const seen = new Set<string>();
    for (const rule of BUSINESS_REQUEST_TRANSITIONS) {
      const key = `${rule.from}->${rule.to}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe('BusinessStateMachine — jump rejection (409 invalid_transition)', () => {
  it.each([
    ['draft', 'approved'],
    ['draft', 'issued'],
    ['draft', 'deposit_paid'],
    ['submitted', 'approved'],
    ['submitted', 'issued'],
    ['under_review', 'issued'],
    ['changes_requested', 'approved'],
    ['approved', 'under_review'],
    ['deposit_paid', 'approved'],
  ] as Array<[BusinessRequestStatus, BusinessRequestStatus]>)(
    'rejects the jump %s -> %s with a stable error code',
    (from, to) => {
      expect(() => assertTransition(from, to)).toThrow(InvalidTransitionError);
      try {
        assertTransition(from, to);
      } catch (error) {
        expect((error as InvalidTransitionError).code).toBe('invalid_transition');
        expect((error as InvalidTransitionError).from).toBe(from);
        expect((error as InvalidTransitionError).to).toBe(to);
      }
    },
  );

  it('rejects every transition out of a terminal status', () => {
    for (const terminal of BUSINESS_TERMINAL_STATUSES) {
      expect(allowedTransitionsFrom(terminal)).toHaveLength(0);
      for (const to of BUSINESS_REQUEST_STATUS_VALUES) {
        expect(() => assertTransition(terminal, to)).toThrow(InvalidTransitionError);
      }
    }
  });

  it('rejects an unknown status rather than coercing it', () => {
    expect(() => assertTransition('draft', 'APPROVED')).toThrow(InvalidBusinessStatusError);
    expect(() => assertTransition('nonsense', 'approved')).toThrow(InvalidBusinessStatusError);
  });
});

describe('BusinessStateMachine — the happy path', () => {
  it('walks draft → issued one legal step at a time', () => {
    const path: BusinessRequestStatus[] = [
      'draft',
      'submitted',
      'deposit_paid',
      'under_review',
      'approved',
      'issued',
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i], path[i + 1])).toBe(true);
      expect(assertTransition(path[i], path[i + 1])).toBe(path[i + 1]);
    }
    expect(isTerminal('issued')).toBe(true);
  });

  it('walks the rejected-document loop back into review', () => {
    expect(canTransition('under_review', 'changes_requested')).toBe(true);
    expect(canTransition('changes_requested', 'under_review')).toBe(true);
  });

  it('allows cancellation from live states only', () => {
    const cancellable = BUSINESS_REQUEST_STATUS_VALUES.filter((s) =>
      allowedTransitionsFrom(s).includes('cancelled'),
    );
    expect(cancellable.sort()).toEqual(['approved', 'changes_requested', 'submitted', 'under_review']);
  });
});
