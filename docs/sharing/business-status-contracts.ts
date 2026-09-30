/**
 * Business request status contract — single source of truth for the six-status
 * machine (plus `cancelled`) defined by the technology-tour spec.
 *
 * The status is set ONLY on the server. The client renders from this contract
 * and never assigns a status itself. Attempting a jump (e.g. `draft` straight to
 * `approved`) is not a soft failure: it throws `InvalidTransitionError`, which
 * the API layer maps to HTTP 409 with code `invalid_transition`.
 *
 * Money is whole Rial and amounts are Int — see the note on the Prisma models.
 */

export const BUSINESS_REQUEST_STATUS_VALUES = [
  'draft',
  'submitted',
  'deposit_paid',
  'under_review',
  'changes_requested',
  'approved',
  'issued',
  'cancelled',
] as const;

export type BusinessRequestStatus = (typeof BUSINESS_REQUEST_STATUS_VALUES)[number];

export const BUSINESS_REQUEST_STATUS_SET: ReadonlySet<string> = new Set(BUSINESS_REQUEST_STATUS_VALUES);

export function isBusinessRequestStatus(value: unknown): value is BusinessRequestStatus {
  return typeof value === 'string' && BUSINESS_REQUEST_STATUS_SET.has(value);
}

export function assertBusinessRequestStatus(value: unknown): asserts value is BusinessRequestStatus {
  if (!isBusinessRequestStatus(value)) {
    throw new InvalidBusinessStatusError(String(value));
  }
}

/** Thrown for an unknown status string. */
export class InvalidBusinessStatusError extends Error {
  readonly received: string;

  constructor(received: string) {
    super(`Unknown business request status: "${received}"`);
    this.name = 'InvalidBusinessStatusError';
    this.received = received;
  }
}

/**
 * Thrown when a transition is not on the legal chain. Carries a stable `code`
 * so the API returns machine-readable `409 invalid_transition` rather than an
 * opaque message.
 */
export class InvalidTransitionError extends Error {
  readonly code = 'invalid_transition';
  readonly from: BusinessRequestStatus;
  readonly to: BusinessRequestStatus;
  readonly allowed: readonly BusinessRequestStatus[];

  constructor(from: BusinessRequestStatus, to: BusinessRequestStatus, allowed: readonly BusinessRequestStatus[]) {
    super(
      `Illegal business request transition ${from} → ${to}. ` +
        `Allowed from ${from}: ${allowed.length ? allowed.join(', ') : '(none — terminal state)'}`,
    );
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
    this.allowed = allowed;
  }
}

export interface BusinessTransitionRule {
  from: BusinessRequestStatus;
  to: BusinessRequestStatus;
  description: string;
}

/**
 * The legal chain, walked one step at a time — no jumps.
 *
 *   draft ──▶ submitted ──▶ deposit_paid ──▶ under_review ──┬─▶ approved ──▶ issued
 *                 (user)      (gateway)       (system)       │
 *                                                            └─▶ changes_requested
 *   any non-terminal ──▶ cancelled
 *
 * `changes_requested → under_review` is the agent re-submitting after the
 * company re-uploads a rejected document. `deposit_paid → under_review` is the
 * system entering review the moment the deposit callback succeeds. Both are
 * automatic, never client-driven.
 */
export const BUSINESS_REQUEST_TRANSITIONS: readonly BusinessTransitionRule[] = [
  { from: 'draft', to: 'submitted', description: 'User submits the completed form' },
  { from: 'submitted', to: 'deposit_paid', description: 'Gateway deposit callback succeeded' },
  { from: 'submitted', to: 'cancelled', description: 'Deposit window expired or user withdrew' },
  { from: 'deposit_paid', to: 'under_review', description: 'System enters review after deposit' },
  { from: 'under_review', to: 'changes_requested', description: 'Agent rejected a document' },
  { from: 'under_review', to: 'approved', description: 'Agent approved every document' },
  { from: 'changes_requested', to: 'under_review', description: 'Company re-uploaded; back to review' },
  { from: 'approved', to: 'issued', description: 'Gateway settlement callback succeeded' },
  { from: 'approved', to: 'cancelled', description: 'Settlement window expired or agent cancelled' },
  { from: 'under_review', to: 'cancelled', description: 'Agent cancelled the request' },
  { from: 'changes_requested', to: 'cancelled', description: 'User withdrew the request' },
] as const;

/** Statuses that can still move. `issued` and `cancelled` are terminal. */
export const BUSINESS_TERMINAL_STATUSES: readonly BusinessRequestStatus[] = ['issued', 'cancelled'] as const;

const TRANSITIONS_BY_FROM = (() => {
  const map = new Map<BusinessRequestStatus, BusinessTransitionRule[]>();
  for (const rule of BUSINESS_REQUEST_TRANSITIONS) {
    const list = map.get(rule.from) ?? [];
    list.push(rule);
    map.set(rule.from, list);
  }
  return map;
})();

export function allowedTransitionsFrom(from: BusinessRequestStatus): readonly BusinessRequestStatus[] {
  return (TRANSITIONS_BY_FROM.get(from) ?? []).map((r) => r.to);
}

export function canTransition(from: unknown, to: unknown): boolean {
  if (!isBusinessRequestStatus(from) || !isBusinessRequestStatus(to)) return false;
  return allowedTransitionsFrom(from).includes(to);
}

export function isTerminal(status: unknown): boolean {
  return isBusinessRequestStatus(status) && BUSINESS_TERMINAL_STATUSES.includes(status);
}

/**
 * Asserts the transition is legal, or throws. This is the only way a status may
 * change — a direct `update` that skips it is a regression.
 */
export function assertTransition(from: unknown, to: unknown): BusinessRequestStatus {
  const fromOk = isBusinessRequestStatus(from) ? from : null;
  if (!fromOk) throw new InvalidBusinessStatusError(String(from));
  if (!isBusinessRequestStatus(to)) throw new InvalidBusinessStatusError(String(to));

  if (allowedTransitionsFrom(fromOk).includes(to)) return to;
  throw new InvalidTransitionError(fromOk, to, allowedTransitionsFrom(fromOk));
}
