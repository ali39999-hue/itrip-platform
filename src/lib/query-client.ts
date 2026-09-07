import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

/**
 * Shared TanStack Query client (Frontend skill: server-state management).
 *
 * Why this matters for Firuzo: flight/hotel search pages currently fetch with
 * hand-rolled `fetch` + AbortController — no caching, no dedupe, no retry.
 * Centralizing the client lets us migrate screens one by one to `useQuery`
 * (stale-while-revalidate, request dedupe across components) without behavior
 * changes today: mounting the provider alone is a no-op for existing code.
 */

let browserClient: QueryClient | null = null;

/** Shared defaults for server and browser clients (single source of truth). */
function baseDefaultOptions(): DefaultOptions {
  return {
    queries: {
      // Travel search results stay interactive while revalidating in background.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      // Retry transient failures, but never hammer the API on client errors.
      retry: (failureCount, error) => {
        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? Number((error as { status: unknown }).status)
            : undefined;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  };
}

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server Components: always a fresh client per request (no shared cache).
    return new QueryClient({ defaultOptions: baseDefaultOptions() });
  }
  browserClient ??= new QueryClient({ defaultOptions: baseDefaultOptions() });
  return browserClient;
}

/** Stable query-key factories so caches stay consistent across screens. */
export const queryKeys = {
  flightsSearch: (params: Record<string, string | number>) =>
    ['flights', 'search', params] as const,
  hotelsSearch: (params: Record<string, string | number>) =>
    ['hotels', 'search', params] as const,
  wallet: () => ['wallet'] as const,
};
