/**
 * Recent flight searches (Phase 4 — search session memory).
 * Local and private: entries live in localStorage on the device only.
 * SSR-safe — storage access is guarded, so every call no-ops outside
 * the browser (and in tests without a storage stub).
 */
export interface RecentFlightSearch {
  from: string;
  to: string;
  depart: string;
  savedAt: number;
}

const KEY = 'firuzo:recent-flight-searches';
const MAX = 5;

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

function readStore(): RecentFlightSearch[] {
  const ls = safeStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentFlightSearch =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as RecentFlightSearch).from === 'string' &&
        typeof (e as RecentFlightSearch).to === 'string' &&
        typeof (e as RecentFlightSearch).depart === 'string' &&
        typeof (e as RecentFlightSearch).savedAt === 'number',
    );
  } catch {
    return [];
  }
}

function writeStore(entries: RecentFlightSearch[]) {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    // quota or privacy mode — recents are best-effort
  }
}

export function loadRecentFlightSearches(max = MAX): RecentFlightSearch[] {
  return readStore().slice(0, max);
}

export function saveRecentFlightSearch(entry: Omit<RecentFlightSearch, 'savedAt'>): void {
  const from = entry.from.trim();
  const to = entry.to.trim();
  if (!from || !to) return;
  // Re-searching a route moves it to the top with the fresh date.
  const rest = readStore().filter(
    (e) => !(e.from.toLowerCase() === from.toLowerCase() && e.to.toLowerCase() === to.toLowerCase()),
  );
  writeStore([{ from, to, depart: entry.depart.trim(), savedAt: Date.now() }, ...rest]);
}

export function clearRecentFlightSearches(): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.removeItem(KEY);
  } catch {
    // noop
  }
}
