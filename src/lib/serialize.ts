import { Prisma } from '@prisma/client';

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
  if (value instanceof Prisma.Decimal || typeof value === 'bigint') {
    return Number(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(toPlain) as unknown as T;
  }
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toPlain(v);
    }
    return out as T;
  }
  return value;
}
