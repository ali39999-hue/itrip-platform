import { describe, expect, it, beforeEach } from 'vitest';
import { loadFavorites, saveFavorites } from './favorites';

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

describe('favorites (Phase 5 — save)', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new LocalStorageStub();
  });

  it('saves and loads per namespace without leaking between namespaces', () => {
    saveFavorites('flight', ['f1', 'f2']);
    saveFavorites('hotel', ['h1']);
    expect(loadFavorites('flight')).toEqual(['f1', 'f2']);
    expect(loadFavorites('hotel')).toEqual(['h1']);
    expect(loadFavorites('tour')).toEqual([]);
  });

  it('round-trips an overwrite', () => {
    saveFavorites('flight', ['f1']);
    saveFavorites('flight', ['f2', 'f3']);
    expect(loadFavorites('flight')).toEqual(['f2', 'f3']);
  });

  it('is SSR-safe and tolerant of corrupt JSON', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => 'nope{',
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadFavorites('flight')).toEqual([]);
    expect(() => saveFavorites('flight', ['f1'])).not.toThrow();
  });
});
