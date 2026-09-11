'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BookingPassenger } from '@/lib/types';
import type { BookingSummary } from '@/domains/booking/BookingDomainService';
import type { WalletBalances } from '@/domains/currency/CurrencyService';

interface BookingState {
  wallet: WalletBalances;
  bookingContext: BookingSummary | null;
  passengers: BookingPassenger[];

  setBookingContext: (item: BookingSummary | null) => void;
  setPassengers: (p: BookingPassenger[]) => void;
}

let counter = Date.now();
function genId(prefix: string) {
  counter += 1;
  return `${prefix}-${counter.toString(36).toUpperCase()}`;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      // Display-only mirror for UI gating; the ledger is the sole balance
      // authority and every real mutation goes through server actions. The
      // seeded demo wallet exists only when the public demo flag is on.
      wallet: process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
        ? { IRR: 150_000_000, USDT: 250, AED: 400 }
        : { IRR: 0, USDT: 0, AED: 0 },
      bookingContext: null,
      passengers: [],

      setBookingContext: (item) => set({ bookingContext: item ? { ...item, id: item.id || genId('ctx') } : null }),
      setPassengers: (passengers) => set({ passengers }),
    }),
    {
      name: 'firuzo-booking-storage',
      version: 1,
      // v1 migration (BUG-007): purge previously persisted client-side
      // bookings/transactions/wallet — only UI context is kept client-side.
      migrate: (persisted) => {
        const legacy = (persisted ?? {}) as Record<string, unknown>;
        return {
          bookingContext: (legacy.bookingContext as BookingSummary | null) ?? null,
          passengers: (legacy.passengers as BookingPassenger[]) ?? [],
        };
      },
      // Client-side booking/wallet fabrication removed (BUG-007): no bookings,
      // transactions or balance mutations are ever written client-side.
      partialize: (state) => ({
        bookingContext: state.bookingContext,
        passengers: state.passengers,
      }),
    }
  )
);
