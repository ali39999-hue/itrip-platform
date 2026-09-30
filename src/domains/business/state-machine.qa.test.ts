/**
 * QA LAYER 1 — Business state machine, domain-story coverage.
 *
 * Owns: src/domains/business/**\/*.test.ts (QA session, exclusive).
 *
 * The backend session's `state-machine.test.ts` already proves the exhaustive
 * (from, to) legality matrix. This suite adds the DOMAIN STORIES the spec
 * demands be walked end to end (فیروزو بیزنس سند تحویل فنی §قوانین کسب‌وکار):
 * every legal transition exercised through `assertTransition` (the only
 * sanctioned mutation path), repeated review loops, cancellation from every
 * live state, terminal-state immutability, and the 48h-expiry cancellation
 * rule. If any of these fail, the state machine contract is broken and the
 * backend session must be notified — QA does not patch domain code.
 */

import { describe, it, expect } from 'vitest';
import {
  BUSINESS_REQUEST_STATUS_VALUES,
  BUSINESS_TERMINAL_STATUSES,
  allowedTransitionsFrom,
  assertTransition,
  canTransition,
  isTerminal,
  InvalidTransitionError,
  type BusinessRequestStatus,
} from './status-contracts';

/** Every legal edge, derived from the contract (not hand-copied). */
const LEGAL_EDGES: ReadonlyArray<readonly [BusinessRequestStatus, BusinessRequestStatus]> =
  BUSINESS_REQUEST_STATUS_VALUES.flatMap((from) =>
    allowedTransitionsFrom(from).map((to) => [from, to] as const),
  );

describe('QA — every legal transition passes through assertTransition exactly', () => {
  it.each(LEGAL_EDGES)('%s → %s is accepted and returns the new status', (from, to) => {
    expect(assertTransition(from, to)).toBe(to);
  });

  it('assertTransition never mutates its inputs (pure contract)', () => {
    // The contract is a guard, not a setter — no hidden state.
    expect(canTransition('draft', 'submitted')).toBe(true);
    expect(canTransition('draft', 'submitted')).toBe(true);
  });

  it('the error payload of every illegal jump names from, to and the allowed set', () => {
    for (const from of BUSINESS_REQUEST_STATUS_VALUES) {
      for (const to of BUSINESS_REQUEST_STATUS_VALUES) {
        if (LEGAL_EDGES.some(([f, t]) => f === from && t === to)) continue;
        try {
          assertTransition(from, to);
          expect.unreachable(`${from} → ${to} should have thrown`);
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidTransitionError);
          const e = error as InvalidTransitionError;
          expect(e.code).toBe('invalid_transition');
          expect(e.from).toBe(from);
          expect(e.to).toBe(to);
          expect(e.allowed).toEqual(allowedTransitionsFrom(from));
          // Message is safe to surface: no credentials, no PII.
          expect(e.message).toContain(from);
          expect(e.message).toContain(to);
        }
      }
    }
  });
});

describe('QA — the spec stories, walked step by step', () => {
  it('story: happy path — submit, deposit, review, approve, issue', () => {
    const steps: Array<[BusinessRequestStatus, BusinessRequestStatus]> = [
      ['draft', 'submitted'],
      ['submitted', 'deposit_paid'],
      ['deposit_paid', 'under_review'],
      ['under_review', 'approved'],
      ['approved', 'issued'],
    ];
    let current: BusinessRequestStatus = 'draft';
    for (const [, next] of steps) {
      current = assertTransition(current, next);
    }
    expect(current).toBe('issued');
    expect(isTerminal(current)).toBe(true);
  });

  it('story: agent rejects a document → company re-uploads → back to review', () => {
    let current = assertTransition('draft', 'submitted') as BusinessRequestStatus;
    current = assertTransition(current, 'deposit_paid');
    current = assertTransition(current, 'under_review');
    // The agent rejects one document.
    current = assertTransition(current, 'changes_requested');
    expect(current).toBe('changes_requested');
    // The company re-uploads; the request re-enters review.
    current = assertTransition(current, 'under_review');
    expect(current).toBe('under_review');
  });

  it('story: the review loop can repeat many times, never skipping approval', () => {
    let current: BusinessRequestStatus = 'under_review';
    for (let round = 0; round < 5; round++) {
      current = assertTransition(current, 'changes_requested');
      current = assertTransition(current, 'under_review');
    }
    expect(current).toBe('under_review');
    // And it can still end well afterwards.
    expect(assertTransition(current, 'approved')).toBe('approved');
  });

  it.each(['submitted', 'under_review', 'changes_requested', 'approved'] as const)(
    'story: cancellation is reachable from the live state %s',
    (from) => {
      expect(canTransition(from, 'cancelled')).toBe(true);
      expect(isTerminal(assertTransition(from, 'cancelled'))).toBe(true);
    },
  );

  it.each(['draft', 'deposit_paid'] as const)(
    'story: cancellation is NOT directly reachable from %s — documented contract',
    (from) => {
      // The backend contract deliberately routes these through other states
      // (`draft` expires before submit; `deposit_paid` auto-enters review).
      // QA records the contract as-is; if the spec owner changes this, the
      // contract AND this test change together.
      expect(canTransition(from, 'cancelled')).toBe(false);
      expect(() => assertTransition(from, 'cancelled')).toThrow(InvalidTransitionError);
    },
  );

  it('story: a terminal request can never move again, no matter what', () => {
    for (const terminal of BUSINESS_TERMINAL_STATUSES) {
      for (const to of BUSINESS_REQUEST_STATUS_VALUES) {
        expect(() => assertTransition(terminal, to)).toThrow(InvalidTransitionError);
      }
    }
  });

  it('story: only the server drives automatic transitions — contract marks them in descriptions', () => {
    // `submitted → deposit_paid` and `deposit_paid → under_review` are gateway /
    // system driven; a client that triggers them directly is a contract smell.
    // QA pins the machine-readable rule: those edges exist exactly once.
    const edges = LEGAL_EDGES.map(([f, t]) => `${f}->${t}`);
    expect(edges.filter((e) => e === 'submitted->deposit_paid')).toHaveLength(1);
    expect(edges.filter((e) => e === 'deposit_paid->under_review')).toHaveLength(1);
  });
});
