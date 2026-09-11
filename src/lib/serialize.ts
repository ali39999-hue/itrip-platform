import { Prisma } from '@prisma/client';

/**
 * Identifies whether a value is a Prisma.Decimal or any Decimal.js instance across bundling boundaries.
 */
export function isDecimal(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (value instanceof Prisma.Decimal) return true;
  const v = value as {
    toNumber?: unknown;
    toFixed?: unknown;
    toDecimalPlaces?: unknown;
    d?: unknown;
    s?: unknown;
    e?: unknown;
    constructor?: { name?: string };
  };
  if (v.constructor?.name === 'Decimal') return true;
  if (typeof v.toNumber === 'function' && (typeof v.toDecimalPlaces === 'function' || typeof v.toFixed === 'function')) {
    return true;
  }
  if (Array.isArray(v.d) && typeof v.s === 'number' && typeof v.e === 'number') {
    return true;
  }
  return false;
}

/**
 * Converts a Prisma (or any service-layer) result into an RSC-safe plain tree:
 * Decimal / bigint become numbers, everything else is deep-copied as plain
 * objects and arrays. Dates are intentionally preserved — React's flight
 * serializer supports them natively.
 *
 * Use at every Server → Client Component boundary that hands over raw Prisma
 * rows, otherwise React logs "Decimal objects are not supported" and the prop
 * arrives unusable.
 */
export function toPlain<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (isDecimal(value) || typeof value === 'bigint') {
    return Number(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(toPlain) as unknown as T;
  }
  if (typeof value === 'object') {
    if (value instanceof Date) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toPlain(v);
    }
    return out as T;
  }
  return value;
}
