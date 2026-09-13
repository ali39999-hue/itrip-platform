import { NextResponse } from 'next/server';

/**
 * Single response convention for /api routes (audit 2026-09-12):
 *   success -> { success: true, ...payload }
 *   failure -> { success: false, error: message }
 *
 * Existing route bodies already return `{ success: false, error }` (majority),
 * bare `{ error }`, or raw payloads. When migrating a route, keep every
 * previously returned field at the top level (additive change) so existing
 * consumers keep parsing. Routes with EXTERNAL contracts (payments/webhook
 * eCardo IPN, health probes) must not change shape.
 */
export function apiSuccess<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ...data, success: true }, { status });
}

export function apiError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}
