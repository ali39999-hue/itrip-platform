/**
 * Canonical search-query param resolution (UX-P2-002).
 *
 * Deep links historically shipped three spellings for the same intent:
 * `city` (new links), `destination` (legacy SearchWidget), `q` (generic).
 * Pages must resolve through this helper instead of chaining `params.get`
 * so canonical keys always win over legacy aliases.
 */
export interface SearchParamsLike {
  get(key: string): string | null;
}

/** Canonical first, then legacy aliases. */
export const CITY_PARAM_KEYS = ['city', 'destination', 'q'] as const;

export function firstParam(params: SearchParamsLike, keys: readonly string[]): string {
  for (const key of keys) {
    const value = params.get(key);
    if (value && value.trim() !== '') return value.trim();
  }
  return '';
}
