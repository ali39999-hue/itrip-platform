import { describe, expect, it, beforeEach } from 'vitest';
import {
  loadRecentFlightSearches,
  saveRecentFlightSearch,
  clearRecentFlightSearches,
} from './recent-searches';

class LocalStorageStub {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

describe('recent flight searches (Phase 4 search memory)', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new LocalStorageStub();
  });

  it('saves and loads in newest-first order', () => {
    saveRecentFlightSearch({ from: 'THR', to: 'IST', depart: '2026-10-01' });
    saveRecentFlightSearch({ from: 'MHD', to: 'THR', depart: '2026-10-02' });
    const recents = loadRecentFlightSearches();
    expect(recents).toHaveLength(2);
    expect(recents[0].from).toBe('MHD');
    expect(recents[1].from).toBe('THR');
    expect(recents[0].savedAt).toBeGreaterThan(0);
  });

  it('dedupes by route regardless of case and moves it to the top', () => {
    saveRecentFlightSearch({ from: 'Tehran', to: 'Istanbul', depart: '2026-10-01' });
    saveRecentFlightSearch({ from: 'MHD', to: 'THR', depart: '2026-10-02' });
    saveRecentFlightSearch({ from: 'tehran', to: 'istanbul', depart: '2026-11-09' });
    const recents = loadRecentFlightSearches();
    expect(recents).toHaveLength(2);
    expect(recents[0]).toMatchObject({ from: 'tehran', to: 'istanbul', depart: '2026-11-09' });
  });

  it('caps the list at 5 entries', () => {
    for (let i = 0; i < 8; i += 1) {
      saveRecentFlightSearch({ from: `CITY${i}`, to: 'IST', depart: '2026-10-01' });
    }
    expect(loadRecentFlightSearches()).toHaveLength(5);
    expect(loadRecentFlightSearches()[0].from).toBe('CITY7');
  });

  it('ignores empty routes', () => {
    saveRecentFlightSearch({ from: '  ', to: 'IST', depart: '2026-10-01' });
    expect(loadRecentFlightSearches()).toHaveLength(0);
  });

  it('clears everything', () => {
    saveRecentFlightSearch({ from: 'THR', to: 'IST', depart: '2026-10-01' });
    clearRecentFlightSearches();
    expect(loadRecentFlightSearches()).toHaveLength(0);
  });

  it('is SSR-safe (no window) and tolerant of corrupt JSON', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => '{not json',
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadRecentFlightSearches()).toHaveLength(0);
    expect(() =>
      saveRecentFlightSearch({ from: 'THR', to: 'IST', depart: '2026-10-01' }),
    ).not.toThrow();
  });
});
