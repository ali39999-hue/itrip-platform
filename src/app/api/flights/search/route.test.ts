import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * SEC — internal error leakage (AGENTS.md §1: "Never leak internal error messages").
 * The route previously returned `error.message` verbatim to the client, exposing
 * provider/DB details. It must now return a stable code + correlation id only.
 */
const state = vi.hoisted(() => ({
  shouldThrow: true,
  secret: 'SECRET_INTERNAL_DETAIL_db_password_xyz',
}));

vi.mock('@/services/flights-service', () => ({
  searchFlights: () => {
    if (state.shouldThrow) throw new Error(state.secret);
    return { data: [{ id: 'f1' }], total: 1, page: 1, limit: 25 };
  },
  searchFlightsFromFlights: () => [],
}));

vi.mock('@/services/flight-cache-service', () => ({
  overlayLiveFlights: async () => ({ data: [{ id: 'f1' }], meta: { source: 'static' } }),
}));

import { GET } from './route';

function req(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, headers ? { headers } : undefined);
}

describe('GET /api/flights/search — error hygiene', () => {
  beforeEach(() => {
    state.shouldThrow = true;
  });

  it('returns a safe envelope instead of the internal message', async () => {
    const res = await GET(req('http://localhost:3000/api/flights/search?from=THR&to=MHD&depart=2026-10-01'));
    expect(res.status).toBe(500);
    const body = await res.json();

    expect(JSON.stringify(body)).not.toContain(state.secret);
    expect(JSON.stringify(body)).not.toContain('SECRET_INTERNAL_DETAIL');
    expect(body.error).toBe('Internal Server Error');
    expect(body.code).toBe('FLIGHT_SEARCH_FAILED');
    expect(body.requestId).toBeTruthy();
  });

  it('propagates an inbound correlation id and echoes it on the response', async () => {
    const res = await GET(
      req('http://localhost:3000/api/flights/search', { 'x-correlation-id': 'corr-test-123' }),
    );
    const body = await res.json();
    expect(body.requestId).toBe('corr-test-123');
    expect(res.headers.get('x-correlation-id')).toBe('corr-test-123');
  });

  it('still returns the success payload on the happy path', async () => {
    state.shouldThrow = false;
    const res = await GET(req('http://localhost:3000/api/flights/search?from=THR&to=MHD&depart=2026-10-01'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});