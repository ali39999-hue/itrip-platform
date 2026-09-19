'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BookingPassenger } from '@/lib/types';
import type { BookingSummary } from '@/domains/booking/BookingDomainService';
import type { WalletBalances } from '@/domains/currency/CurrencyService';
import type { CheckoutPhase } from '@/components/checkout/CheckoutStepper';

export interface CartItem {
  id: string;
  type: 'FLIGHT' | 'HOTEL' | 'TOUR' | 'TRANSFER' | 'VISA' | 'ESIM' | 'INSURANCE' | 'CIP';
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
  /** Cart lifecycle: UNPAID from the moment the item is added until the linked
   *  booking is paid (the item is removed from the cart only on payment). */
  status?: 'UNPAID' | 'PAID';
  /** Draft booking this cart line was converted into (set at checkout). */
  bookingId?: string;
  /** Checkout phase to land on when the user resumes this item from the cart. */
  resumePhase?: CheckoutPhase;
}

// Cookie-backed storage so the unpaid cart survives across visits and is
// visible site-wide (first-party cookie, 30 days). Passengers form data is
// excluded from persistence (see partialize) to stay under the 4KB cookie cap.
const cookieStorage = {
  getItem: (name: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]!) : null;
  },
  setItem: (name: string, value: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  },
  removeItem: (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  },
};

interface BookingState {
  wallet: WalletBalances;
  bookingContext: BookingSummary | null;
  passengers: BookingPassenger[];
  cart: CartItem[];

  setBookingContext: (item: BookingSummary | null) => void;
  setPassengers: (p: BookingPassenger[]) => void;
  addToCart: (item: Omit<CartItem, 'id'> & { id?: string }) => void;
  updateCartItem: (id: string, patch: Partial<CartItem>) => void;
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
          const existingIdx = state.cart.findIndex(
            (c) => (item.id && c.id === item.id) || (c.type === item.type && c.title === item.title)
          );
          if (existingIdx >= 0) {
            const copy = [...state.cart];
            const found = copy[existingIdx]!;
            copy[existingIdx] = {
              ...found,
              ...item,
              id: found.id,
              count: found.count + item.count,
              status: item.status ?? found.status ?? 'UNPAID',
              bookingId: item.bookingId ?? found.bookingId,
              resumePhase: item.resumePhase ?? found.resumePhase,
            };
            return { cart: copy };
          }
          return { cart: [...state.cart, { ...item, id, status: item.status ?? 'UNPAID' }] };
        }),
      updateCartItem: (id, patch) =>
        set((state) => ({
          cart: state.cart.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeFromCart: (id) =>
        set((state) => ({
          cart: state.cart.filter((c) => c.id !== id),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'firuzo-booking-storage',
      version: 2,
      storage: createJSONStorage(() => cookieStorage),
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
        cart: state.cart,
      }),
    }
  )
);
