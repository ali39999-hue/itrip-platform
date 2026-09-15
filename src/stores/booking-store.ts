'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BookingPassenger } from '@/lib/types';
import type { BookingSummary } from '@/domains/booking/BookingDomainService';
import type { WalletBalances } from '@/domains/currency/CurrencyService';

export interface CartItem {
  id: string;
  type: 'FLIGHT' | 'HOTEL' | 'TOUR' | 'TRANSFER' | 'VISA' | 'ESIM' | 'INSURANCE';
  title: string;
  subtitle?: string;
  supplier?: string;
  count: number;
  nights?: number;
  unitPrice: number;
  currency: string;
  travelDate: string;
  inventoryItemId?: string;
  details?: Record<string, unknown>;
}

interface BookingState {
  wallet: WalletBalances;
  bookingContext: BookingSummary | null;
  passengers: BookingPassenger[];
  cart: CartItem[];

  setBookingContext: (item: BookingSummary | null) => void;
  setPassengers: (p: BookingPassenger[]) => void;
  addToCart: (item: Omit<CartItem, 'id'> & { id?: string }) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

let counter = Date.now();
function genId(prefix: string) {
  counter += 1;
  return `${prefix}-${counter.toString(36).toUpperCase()}`;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      wallet: (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true')
        ? { IRR: 150_000_000, USDT: 250, AED: 400 }
        : { IRR: 0, USDT: 0, AED: 0 },
      bookingContext: null,
      passengers: [],
      cart: [],

      setBookingContext: (item) => set({ bookingContext: item ? { ...item, id: item.id || genId('ctx') } : null }),
      setPassengers: (passengers) => set({ passengers }),
      addToCart: (item) =>
        set((state) => {
          const id = item.id || genId('cart');
          // If already exists with same item ID and type, increment count
          const existingIdx = state.cart.findIndex((c) => c.id === id || (c.type === item.type && c.title === item.title));
          if (existingIdx >= 0) {
            const copy = [...state.cart];
            const found = copy[existingIdx]!;
            copy[existingIdx] = { ...found, count: found.count + item.count };
            return { cart: copy };
          }
          return { cart: [...state.cart, { ...item, id }] };
        }),
      removeFromCart: (id) =>
        set((state) => ({
          cart: state.cart.filter((c) => c.id !== id),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'firuzo-booking-storage',
      version: 2,
      migrate: (persisted) => {
        const legacy = (persisted ?? {}) as Record<string, unknown>;
        return {
          bookingContext: (legacy.bookingContext as BookingSummary | null) ?? null,
          passengers: (legacy.passengers as BookingPassenger[]) ?? [],
          cart: (legacy.cart as CartItem[]) ?? [],
        };
      },
      partialize: (state) => ({
        bookingContext: state.bookingContext,
        passengers: state.passengers,
        cart: state.cart,
      }),
    }
  )
);
