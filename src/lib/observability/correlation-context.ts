/**
 * OBS-101 & OBS-102: Canonical Correlation Context Engine
 *
 * Propagates requestId, correlationId, bookingId, paymentId, sagaId,
 * and supplierRequestId end-to-end across async boundaries, domains,
 * and background workers using Node.js AsyncLocalStorage.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';

export interface CorrelationContext {
  requestId?: string;
  correlationId?: string;
  bookingId?: string;
  paymentId?: string;
  sagaId?: string;
  supplierRequestId?: string;
  userId?: string;
  tenantId?: string;
  [key: string]: unknown;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Creates a normalized correlation context, generating UUIDs if not supplied.
 */
export function createCorrelationContext(
  initial: Partial<CorrelationContext> = {}
): CorrelationContext {
  const correlationId = initial.correlationId || crypto.randomUUID();
  const requestId = initial.requestId || crypto.randomUUID();

  return {
    ...initial,
    correlationId,
    requestId,
  };
}

/**
 * Executes a function within an explicit CorrelationContext scope.
 */
export function runWithCorrelationContext<T>(
  context: Partial<CorrelationContext>,
  fn: () => T
): T {
  const normalized = createCorrelationContext(context);
  return storage.run(normalized, fn);
}

/**
 * Retrieves the active CorrelationContext from the current async execution stack.
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore();
}

/**
 * Returns the current active correlationId, if present.
 */
export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

/**
 * Returns the current active requestId, if present.
 */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/**
 * Updates the current active context in place with additional domain identifiers
 * (e.g. associating bookingId or paymentId during execution).
 */
export function updateCorrelationContext(partial: Partial<CorrelationContext>): void {
  const current = storage.getStore();
  if (current) {
    Object.assign(current, partial);
  }
}
