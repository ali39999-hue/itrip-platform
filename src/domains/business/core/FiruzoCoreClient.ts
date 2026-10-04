import type { Prisma } from '@prisma/client';

/**
 * FiruzoCoreClient — the ONLY boundary through which the Business (Specialized
 * Experiences) domain may touch Firuzo core capabilities.
 *
 * Rationale (5.txt §5 "Database مشترک ممنوع"): the child must reach the core
 * through an API/SDK-like contract, never by querying core tables directly.
 * Today the adapter is in-process (same DB); tomorrow it becomes HTTP with the
 * exact same interface — domain code must not change.
 *
 * Enforcement: `src/domains/business/**` must not import `@/lib/prisma` or any
 * core domain module directly (ESLint no-restricted-imports). Every core
 * interaction listed here goes through verified core services:
 *  - Inventory: InventoryEngine (createHold/captureHold/releaseHold/…)
 *  - Booking state: BookingStateMachine / BookingDomainService.transitionStatus
 *  - Ledger: GeneralLedgerService.postRevenueRealization
 *  - Exceptions: OperationalExceptionService.raiseException (ERP-009 dedupe)
 */

/** Minimal tenant view the child needs from core identity. */
export interface CoreUserView {
  id: string;
  name?: string;
  isActive: boolean;
  /** Preferred currency code, e.g. 'IRR' | 'TOMAN'. */
  currency: string;
}

export interface CoreTenantContext {
  organizationId: string | null;
  isSuperAdmin: boolean;
}

export interface CoreHoldParams {
  inventoryItemId: string;
  /** YYYY-MM-DD */
  date: string;
  quantity: number;
  ttlMinutes?: number;
  bookingId?: string;
}

export interface CoreHoldResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: string;
}

export interface CoreReleaseResult {
  success: boolean;
  error?: string;
}

export interface CoreCompensateResult {
  success: boolean;
  capacityRestored: boolean;
  error?: string;
}

export interface CoreCreateBookingParams {
  userId: string;
  /** Must be 'EXPERIENCE' — the vertical's only core booking product type. */
  type: 'EXPERIENCE';
  /** The child-domain booking reference (BEX-…) for cross-domain tracing. */
  businessBookingRef: string;
  totalAmount: string; // Decimal-as-string (Prisma.Decimal compatible) — no Number() ever
  currency: string;
  /** YYYY-MM-DD */
  travelDate: string;
  details: Record<string, unknown>;
  idempotencyKey: string;
  holdToken?: string;
  organizationId?: string;
}

export interface CoreCreateBookingResult {
  id: string;
  reference: string;
}

export interface CoreTransitionParams {
  bookingId: string;
  next: string; // validated against core BookingStatus values
  actor: string;
  reason?: string;
  correlationId?: string;
}

export interface CoreTransitionResult {
  success: boolean;
  fromStatus: string;
  toStatus: string;
}

export interface CoreRevenueItem {
  netCost: string; // Decimal-as-string
  sellPrice: string;
  taxAmount: string;
  feeAmount: string;
}

export interface CoreRevenueRealizationParams {
  bookingId: string;
  items: CoreRevenueItem[];
}

export interface CoreRaiseExceptionParams {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entityType: string;
  entityId: string;
  title?: string;
  organizationId?: string;
  description: string;
  slaMinutes?: number;
}

/**
 * Transaction-scoped subset: business code never opens prisma.$transaction on
 * its own — it asks the core client to run a unit of work so hold capture,
 * booking transition and ledger posting stay in ONE atomic transaction.
 */
export interface CoreTx {
  captureHold: (token: string) => Promise<CoreReleaseResult>;
  releaseHold: (token: string) => Promise<CoreReleaseResult>;
  compensateCapturedHold: (token: string) => Promise<CoreCompensateResult>;
  transitionCoreBooking: (
    params: Omit<CoreTransitionParams, 'correlationId'>
  ) => Promise<CoreTransitionResult>;
  postRevenueRealization: (params: CoreRevenueRealizationParams) => Promise<void>;
}

/** Typed params for the child → core event producer contract (T0311). */
export interface CoreEmitEventParams {
  /** Core outbox eventType, e.g. 'NOTIFICATION_DISPATCH'. */
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string;
  causationId?: string;
  payload: Record<string, unknown>;
}

export interface FiruzoCoreClient {
  // --- Identity / tenant (read-only core access) ---
  getUser(userId: string): Promise<CoreUserView | null>;
  getTenantContext(userId: string): Promise<CoreTenantContext>;

  // --- Inventory (delegates to InventoryEngine) ---
  createHold(params: CoreHoldParams): Promise<CoreHoldResult>;
  captureHold(token: string, tx?: Prisma.TransactionClient): Promise<CoreReleaseResult>;
  releaseHold(token: string, tx?: Prisma.TransactionClient): Promise<CoreReleaseResult>;
  compensateCapturedHold(
    token: string,
    tx?: Prisma.TransactionClient
  ): Promise<CoreCompensateResult>;
  sweepExpiredHolds(): Promise<number>;

  // --- Booking (delegates to BookingStateMachine / BookingDomainService) ---
  assertBookingTransition(current: string, next: string): void;
  createCoreBooking(params: CoreCreateBookingParams): Promise<CoreCreateBookingResult>;
  transitionCoreBooking(params: CoreTransitionParams): Promise<CoreTransitionResult>;

  // --- Ledger (delegates to GeneralLedgerService) ---
  postRevenueRealization(
    params: CoreRevenueRealizationParams,
    tx?: Prisma.TransactionClient
  ): Promise<void>;

  // --- Exceptions (delegates to OperationalExceptionService, ERP-009 dedupe) ---
  raiseException(params: CoreRaiseExceptionParams): Promise<string>;

  // --- Events (delegates to the core Outbox; T0311 producer contract) ---
  emitDomainEvent(params: CoreEmitEventParams, tx?: Prisma.TransactionClient): Promise<{ id: string }>;

  // --- Transactional boundary ---
  runInTransaction<T>(fn: (tx: CoreTx) => Promise<T>): Promise<T>;
}
