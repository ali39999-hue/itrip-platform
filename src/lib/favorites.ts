/**
 * Saved items (favorites) — device-local, per-namespace.
 * SSR-safe: storage access is guarded, so every call no-ops outside
 * the browser (and in tests without a storage stub).
 */
const KEY_PREFIX = 'firuzo:favorites:';

interface SafeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function safeStorage(): SafeStorage | null {
  try {
    const ls = (globalThis as { localStorage?: SafeStorage }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

export function loadFavorites(namespace: string): string[] {
  const ls = safeStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(KEY_PREFIX + namespace);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export function saveFavorites(namespace: string, ids: string[]): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(KEY_PREFIX + namespace, JSON.stringify(ids));
  } catch {
    // quota or privacy mode — favorites are best-effort
  }
}
