/**
 * Supplier Transport Layer (SUP-103, SUP-107, SUP-108, SUP-109)
 *
 * Centralized HTTP transport for external supplier integrations with:
 * 1. Configurable request timeouts.
 * 2. Dynamic authentication headers.
 * 3. Bounded exponential backoff with retry on transient network/5xx errors.
 * 4. Raw response capture for audit and dispute resolution.
 * 5. Circuit Breaker integration and fallback routing.
 * 6. Supplier request correlation (supplierRequestId).
 * 7. Real-time supplier latency and health tracking.
 */

import { CircuitBreaker } from './supplier-orchestration';
import crypto from 'crypto';

export interface TransportRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  maxRetries?: number;
  supplierCode: string;
  endpoint: string;
}

export interface TransportResponse<T = unknown> {
  ok: boolean;
  statusCode: number;
  data: T;
  rawResponse: string;
  latencyMs: number;
  supplierRequestId: string;
  retriesAttempted: number;
}

export interface SupplierHealthRecord {
  supplierCode: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timedOutRequests: number;
  averageLatencyMs: number;
  recentLatencies: number[];
}

export class SupplierTransport {
  private static circuitBreakers = new Map<string, CircuitBreaker>();
  private static healthRegistry = new Map<string, SupplierHealthRecord>();

  /**
   * Get or initialize a circuit breaker for a given supplier
   */
  static getCircuitBreaker(supplierCode: string): CircuitBreaker {
    let cb = this.circuitBreakers.get(supplierCode);
    if (!cb) {
      cb = new CircuitBreaker();
      this.circuitBreakers.set(supplierCode, cb);
    }
    return cb;
  }

  /**
   * Get health metrics snapshot for a supplier (SUP-107)
   */
  static getHealth(supplierCode: string): SupplierHealthRecord {
    let health = this.healthRegistry.get(supplierCode);
    if (!health) {
      health = {
        supplierCode,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        timedOutRequests: 0,
        averageLatencyMs: 0,
        recentLatencies: [],
      };
      this.healthRegistry.set(supplierCode, health);
    }
    return health;
  }

  /**
   * Reset health and circuit breaker state for testing
   */
  static resetForTesting() {
    this.circuitBreakers.clear();
    this.healthRegistry.clear();
  }

  /**
   * Execute external supplier HTTP request through the hardened transport pipeline
   */
  static async request<T = unknown>(options: TransportRequestOptions): Promise<TransportResponse<T>> {
    const cb = this.getCircuitBreaker(options.supplierCode);
    const health = this.getHealth(options.supplierCode);

    // SUP-108: Verify Circuit Breaker state before making external network call
    if (cb.getState() === 'OPEN') {
      throw new Error(`CIRCUIT_BREAKER_OPEN: Supplier ${options.supplierCode} is temporarily unavailable`);
    }

    // SUP-109: Generate unique supplierRequestId
    const supplierRequestId = `req_sup_${options.supplierCode.toLowerCase()}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const timeoutMs = options.timeoutMs || 5000;
    const maxRetries = options.maxRetries ?? 2;

    let attempt = 0;
    let lastError: Error | null = null;
    const startTime = Date.now();

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        health.totalRequests++;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Correlation-Id': supplierRequestId,
          'X-Supplier-Request-Id': supplierRequestId,
          ...options.headers,
        };

        const res = await fetch(options.endpoint, {
          method: options.method || 'POST',
          headers,
          body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);
        const latencyMs = Date.now() - startTime;
        const rawText = await res.text();

        let parsedData: T;
        try {
          parsedData = JSON.parse(rawText) as T;
        } catch {
          parsedData = rawText as unknown as T;
        }

        if (!res.ok) {
          // 4xx client errors (except 429 rate limit) should NOT be retried
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            cb.recordFailure();
            health.failedRequests++;
            return {
              ok: false,
              statusCode: res.status,
              data: parsedData,
              rawResponse: rawText,
              latencyMs,
              supplierRequestId,
              retriesAttempted: attempt,
            };
          }
          throw new Error(`Supplier ${options.supplierCode} returned HTTP ${res.status}: ${rawText.slice(0, 200)}`);
        }

        // Success: record circuit breaker and health metrics
        cb.recordSuccess();
        health.successfulRequests++;
        health.recentLatencies.push(latencyMs);
        if (health.recentLatencies.length > 50) health.recentLatencies.shift();
        health.averageLatencyMs = Math.round(
          health.recentLatencies.reduce((a, b) => a + b, 0) / health.recentLatencies.length
        );

        return {
          ok: true,
          statusCode: res.status,
          data: parsedData,
          rawResponse: rawText,
          latencyMs,
          supplierRequestId,
          retriesAttempted: attempt,
        };
      } catch (err: unknown) {
        clearTimeout(timer);
        lastError = err instanceof Error ? err : new Error(String(err));
        const isTimeout = lastError.name === 'AbortError' || lastError.message.includes('abort');

        if (isTimeout) {
          health.timedOutRequests++;
        }
        health.failedRequests++;
        attempt++;

        if (attempt <= maxRetries) {
          // Bounded jittered backoff: 100ms * 2^attempt
          const backoff = Math.min(100 * Math.pow(2, attempt), 2000) + Math.random() * 50;
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    // All retries failed
    cb.recordFailure();
    throw new Error(
      `SUPPLIER_TRANSPORT_ERROR: [${options.supplierCode}] failed after ${maxRetries + 1} attempts (${supplierRequestId}): ${lastError?.message}`
    );
  }
}
