import { describe, expect, it } from 'vitest';
import { getQueryClient, queryKeys } from './query-client';

describe('getQueryClient', () => {
  it('returns a client with travel-safe defaults', () => {
    const client = getQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60_000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(0);
  });

  it('does not retry 4xx errors but retries transient failures', () => {
    const client = getQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;
    expect(typeof retry).toBe('function');
    if (typeof retry === 'function') {
      expect(retry(0, { status: 404 } as never)).toBe(false);
      expect(retry(0, new Error('network'))).toBe(true);
      expect(retry(2, new Error('network'))).toBe(false);
    }
  });
});

describe('queryKeys', () => {
  it('builds stable keys', () => {
    expect(queryKeys.flightsSearch({ from: 'THR', to: 'MHD' })).toEqual([
      'flights',
      'search',
      { from: 'THR', to: 'MHD' },
    ]);
    expect(queryKeys.wallet()).toEqual(['wallet']);
  });
});
