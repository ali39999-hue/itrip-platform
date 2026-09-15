// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useHotelFilters } from './useHotelFilters';

const messages = {};

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="fa" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

function mockFetchOnceRejectThenSucceed() {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error('network down'))
    .mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { hotels: [], total: 0, totalPages: 1 } }),
    });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useHotelFilters error channel', () => {
  it('surfaces a localized error on fetch failure instead of failing silently', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchOnceRejectThenSucceed();

    const { result } = renderHook(() => useHotelFilters({ initialCity: 'تهران' }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 8000 });
    expect(result.current.error).toBeTruthy();
    expect(typeof result.current.error).toBe('string');
    errSpy.mockRestore();
  });

  it('retry() clears the error and refetches successfully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchOnceRejectThenSucceed();

    const { result } = renderHook(() => useHotelFilters({ initialCity: 'تهران' }), { wrapper });

    await waitFor(() => expect(result.current.error).toBeTruthy(), { timeout: 8000 });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.error).toBeNull(), { timeout: 8000 });
    expect(result.current.loading).toBe(false);
    errSpy.mockRestore();
  });
});
