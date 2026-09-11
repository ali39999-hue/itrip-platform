/**
 * Offline Voucher Cache Utility for PWA & Airport Zero-Network Access.
 * Safely persists verified trip voucher snapshots in browser LocalStorage.
 */

export interface OfflineVoucherItem {
  id: string;
  reference: string;
  externalPnr?: string | null;
  status: string;
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
  savedAt: string; // ISO string
}

const STORAGE_KEY = 'firuzo_offline_vouchers_v1';

export function saveVoucherOffline(voucher: Omit<OfflineVoucherItem, 'savedAt'>): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: OfflineVoucherItem[] = raw ? JSON.parse(raw) : [];

    const existingIdx = list.findIndex((v) => v.reference === voucher.reference);
    const entry: OfflineVoucherItem = {
      ...voucher,
      savedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = entry;
    } else {
      list.unshift(entry);
    }

    // Keep at most 20 recent vouchers to prevent storage bloat
    const bounded = list.slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
    return true;
  } catch (err) {
    console.error('Failed to save voucher offline:', err);
    return false;
  }
}

export function getOfflineVouchers(): OfflineVoucherItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getOfflineVoucherByRef(reference: string): OfflineVoucherItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const list = getOfflineVouchers();
    return list.find((v) => v.reference === reference) || null;
  } catch {
    return null;
  }
}
