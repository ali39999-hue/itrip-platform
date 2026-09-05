import { Money } from '@/lib/finance';

export interface TravelDateTime {
  localDateTime: string; // e.g. "2026-10-15T08:30:00"
  timezone: string;      // e.g. "Asia/Tehran", "Asia/Shanghai", "Europe/Istanbul"
  utcInstant: string;    // e.g. "2026-10-15T05:00:00.000Z"
}

export type SearchExecutionStatus =
  | 'LOADING'
  | 'PARTIAL_RESULTS'
  | 'RESULTS'
  | 'ZERO_RESULTS'
  | 'SUPPLIER_FAILURE'
  | 'PRICE_CHANGED'
  | 'RETRY';

export interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime?: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  p95LatencyMs: number;
  successCount: number;
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly resetTimeoutMs = 30_000; // 30 seconds

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === 'OPEN') {
      throw new Error('Circuit Breaker OPEN: Supplier temporarily unavailable');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }
}

/**
 * Creates an authoritative TravelDateTime preserving local date, timezone, and UTC instant (Section 25)
 */
export function createTravelDateTime(dateStr: string, timeStr: string, timezone: string = 'Asia/Tehran'): TravelDateTime {
  const localDateTime = `${dateStr}T${timeStr}:00`;
  // Approximate offset map for reliable non-browser node execution
  const tzOffsets: Record<string, string> = {
    'Asia/Tehran': '+03:30',
    'Asia/Dubai': '+04:00',
    'Asia/Shanghai': '+08:00',
    'Europe/Istanbul': '+03:00',
    UTC: '+00:00',
  };
  const offset = tzOffsets[timezone] || '+03:30';
  const isoWithOffset = `${localDateTime}${offset}`;
  const utcInstant = new Date(isoWithOffset).toISOString();

  return {
    localDateTime,
    timezone,
    utcInstant,
  };
}

export interface CanonicalFlightOffer {
  id: string;
  supplierCode: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  originIata: string;
  originCity: string;
  destinationIata: string;
  destinationCity: string;
  departure: TravelDateTime;
  arrival: TravelDateTime;
  durationMinutes: number;
  stops: number;
  basePrice: Money;
  currency: string;
  refundable: boolean;
  baggageAllowance: string;
}

export interface CanonicalSearchResponse<T> {
  status: SearchExecutionStatus;
  offers: T[];
  total: number;
  supplierHealth: {
    supplierCode: string;
    latencyMs: number;
    healthy: boolean;
  }[];
}
