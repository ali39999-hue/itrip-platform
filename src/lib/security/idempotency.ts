import crypto from 'crypto';

/**
 * Idempotency Key Manager (ASVS V4.1 / V6.1)
 *
 * Guarantees that mutating operations (payments, booking confirmations,
 * wallet debits, refunds) cannot be executed multiple times if replayed
 * or sent concurrently.
 */

export type IdempotencyStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface IdempotencyRecord<T = unknown> {
  key: string;
  scope: string; // userId, tenantId, or 'global'
  payloadFingerprint: string;
  status: IdempotencyStatus;
  response?: {
    statusCode: number;
    body: T;
  };
  error?: string;
  createdAt: number;
  expiresAt: number;
}

export type AcquireResult<T = unknown> =
  | { acquired: true }
  | {
      acquired: false;
      status: 'IN_PROGRESS';
      retryAfterSeconds: number;
    }
  | {
      acquired: false;
      status: 'COMPLETED';
      cachedResponse: {
        statusCode: number;
        body: T;
      };
    }
  | {
      acquired: false;
      status: 'MISMATCH';
      error: string;
    }
  | {
      acquired: false;
      status: 'FAILED';
      error: string;
    };

// In-memory store with TTL eviction
class InMemoryIdempotencyStore {
  private store = new Map<string, IdempotencyRecord<unknown>>();

  private buildStoreKey(scope: string, key: string): string {
    return `${scope}:${key}`;
  }

  get<T>(scope: string, key: string): IdempotencyRecord<T> | null {
    const storeKey = this.buildStoreKey(scope, key);
    const record = this.store.get(storeKey);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this.store.delete(storeKey);
      return null;
    }
    return record as IdempotencyRecord<T>;
  }

  set<T>(record: IdempotencyRecord<T>): void {
    const storeKey = this.buildStoreKey(record.scope, record.key);
    this.store.set(storeKey, record as IdempotencyRecord<unknown>);
  }

  delete(scope: string, key: string): void {
    const storeKey = this.buildStoreKey(scope, key);
    this.store.delete(storeKey);
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryStore = new InMemoryIdempotencyStore();

/**
 * Computes deterministic SHA-256 fingerprint of request payload.
 */
export function computePayloadFingerprint(payload: unknown): string {
  if (payload === undefined || payload === null) {
    return 'empty';
  }

  // Normalize JSON formatting to ensure determinism across key orders
  const normalize = (obj: unknown): unknown => {
    if (obj !== null && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(normalize);
      }
      const record = obj as Record<string, unknown>;
      return Object.keys(record)
        .sort()
        .reduce((result: Record<string, unknown>, key) => {
          result[key] = normalize(record[key]);
          return result;
        }, {});
    }
    return obj;
  };

  const serialized = JSON.stringify(normalize(payload));
  return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}

/**
 * Attempts to acquire an idempotency lock for a given key and payload.
 *
 * @param key Unique key provided in headers (e.g. `Idempotency-Key`)
 * @param scope Security boundary (e.g. `user:123` or `tenant:b2b-456`)
 * @param payload Request body or parameter object
 * @param ttlSeconds Lock duration in seconds (default: 300 = 5 minutes)
 */
export function acquireIdempotencyLock<T = unknown>(
  key: string,
  scope: string,
  payload: unknown,
  ttlSeconds: number = 300
): AcquireResult<T> {
  if (!key || typeof key !== 'string') {
    return {
      acquired: false,
      status: 'MISMATCH',
      error: 'Invalid or missing idempotency key',
    };
  }

  const fingerprint = computePayloadFingerprint(payload);
  const existing = memoryStore.get<T>(scope, key);

  if (!existing) {
    // Brand new key -> acquire lock
    const now = Date.now();
    memoryStore.set<T>({
      key,
      scope,
      payloadFingerprint: fingerprint,
      status: 'IN_PROGRESS',
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    });
    return { acquired: true };
  }

  // Key already exists -> check payload fingerprint
  if (existing.payloadFingerprint !== fingerprint) {
    return {
      acquired: false,
      status: 'MISMATCH',
      error: 'Idempotency key reused with different request payload (tampering prevented)',
    };
  }

  if (existing.status === 'IN_PROGRESS') {
    return {
      acquired: false,
      status: 'IN_PROGRESS',
      retryAfterSeconds: Math.max(1, Math.ceil((existing.expiresAt - Date.now()) / 1000)),
    };
  }

  if (existing.status === 'COMPLETED' && existing.response) {
    return {
      acquired: false,
      status: 'COMPLETED',
      cachedResponse: existing.response,
    };
  }

  return {
    acquired: false,
    status: 'FAILED',
    error: existing.error || 'Previous operation failed under this idempotency key',
  };
}

/**
 * Marks an idempotency record as successfully completed and stores the cached response.
 */
export function completeIdempotency<T = unknown>(
  key: string,
  scope: string,
  statusCode: number,
  responseBody: T
): void {
  const existing = memoryStore.get<T>(scope, key);
  if (!existing) return;

  memoryStore.set<T>({
    ...existing,
    status: 'COMPLETED',
    response: {
      statusCode,
      body: responseBody,
    },
  });
}

/**
 * Marks an idempotency record as failed.
 */
export function failIdempotency(key: string, scope: string, errorMessage: string): void {
  const existing = memoryStore.get(scope, key);
  if (!existing) return;

  memoryStore.set({
    ...existing,
    status: 'FAILED',
    error: errorMessage,
  });
}

/**
 * Releases/removes an idempotency record (e.g. upon validation rollback).
 */
export function releaseIdempotencyLock(key: string, scope: string): void {
  memoryStore.delete(scope, key);
}

/**
 * For testing purposes: clears the in-memory idempotency store.
 */
export function resetIdempotencyStoreForTesting(): void {
  memoryStore.clear();
}
