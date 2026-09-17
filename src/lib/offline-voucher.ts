/**
 * Offline Voucher Cache Utility for PWA & Airport Zero-Network Access (VOUCH-104 / §24).
 * Safely persists verified trip voucher snapshots in browser LocalStorage.
 *
 * Security & Governance:
 * 1. User Scoping: Storage keys are strictly scoped to the active userId to prevent cross-user
 *    data leakage on shared devices (airport kiosks, family tablets).
 * 2. PII Sanitization: National IDs and passport numbers are masked before local caching.
 * 3. TTL Expiry: Vouchers cached over 30 days are automatically pruned.
 * 4. Revocation Awareness: Revoked or cancelled vouchers are invalidated and never presented as valid.
 */

export interface OfflineVoucherItem {
  id: string;
  reference: string;
  externalPnr?: string | null;
  status: string;
  isRevoked?: boolean;
  serviceType: string;
  title: string;
  travelDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  origin?: string;
  destination?: string;
  airline?: string;
  flightNo?: string;
  hotelName?: string;
  roomType?: string;
  passengers: Array<{
    firstName?: string;
    lastName?: string;
    nationalId?: string;
    passportNo?: string;
  }>;
  totalAmount: number;
  currency: string;
  userId?: string | null;
  savedAt: string; // ISO string
}

const STORAGE_BASE = 'firuzo_offline_vouchers_v2';
const MAX_VOUCHER_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30-day retention ceiling

export function getOfflineStorageKey(userId?: string | null): string {
  const cleanUser = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '') : 'guest';
  return `${STORAGE_BASE}:${cleanUser}`;
}

export function saveVoucherOffline(
  voucher: Omit<OfflineVoucherItem, 'savedAt'>,
  userId?: string | null
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = getOfflineStorageKey(userId ?? voucher.userId);
    const raw = localStorage.getItem(key);
    let list: OfflineVoucherItem[] = raw ? JSON.parse(raw) : [];

    // Prune expired vouchers
    const now = Date.now();
    list = list.filter((v) => now - new Date(v.savedAt).getTime() < MAX_VOUCHER_AGE_MS);

    const existingIdx = list.findIndex((v) => v.reference === voucher.reference);
    const sanitizedPassengers = voucher.passengers?.map((p) => ({
      ...p,
      nationalId: p.nationalId ? `***${p.nationalId.slice(-4)}` : undefined,
      passportNo: p.passportNo ? `***${p.passportNo.slice(-4)}` : undefined,
    })) || [];

    const isRevoked =
      voucher.status === 'CANCELLED' ||
      voucher.status === 'REFUNDED' ||
      voucher.status === 'REVOKED' ||
      voucher.status === 'FAILED';

    const entry: OfflineVoucherItem = {
      ...voucher,
      userId: userId ?? voucher.userId ?? null,
      isRevoked,
      passengers: sanitizedPassengers,
      savedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = entry;
    } else {
      list.unshift(entry);
    }

    // Bound to 20 recent vouchers to prevent localStorage quota exhaustion
    const bounded = list.slice(0, 20);
    localStorage.setItem(key, JSON.stringify(bounded));
    return true;
  } catch (err) {
    console.error('Failed to save voucher offline:', err);
    return false;
  }
}

export function getOfflineVouchers(userId?: string | null): OfflineVoucherItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getOfflineStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const list: OfflineVoucherItem[] = JSON.parse(raw);
    const now = Date.now();
    // Return only non-expired, un-revoked vouchers
    return list.filter((v) => {
      const isFresh = now - new Date(v.savedAt).getTime() < MAX_VOUCHER_AGE_MS;
      return isFresh && !v.isRevoked;
    });
  } catch {
    return [];
  }
}

export function getOfflineVoucherByRef(reference: string, userId?: string | null): OfflineVoucherItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const list = getOfflineVouchers(userId);
    return list.find((v) => v.reference === reference) || null;
  } catch {
    return null;
  }
}

/**
 * Explicitly clears cached vouchers for a user on logout to prevent device leakage (§24).
 */
export function clearOfflineVouchersOnLogout(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getOfflineStorageKey(userId);
    localStorage.removeItem(key);
    // Also clean legacy v1 un-scoped key if present
    localStorage.removeItem('firuzo_offline_vouchers_v1');
  } catch {}
}
