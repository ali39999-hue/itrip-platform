'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Booking, BookingPassenger, WalletTransaction } from '@/lib/types';
import type { BookingSummary } from '@/domains/booking/BookingDomainService';
import {
  defaultCurrencyService,
  type WalletBalances,
  type SupportedCurrency,
} from '@/domains/currency/CurrencyService';

interface BookingState {
  wallet: WalletBalances;
  bookingContext: BookingSummary | null;
  passengers: BookingPassenger[];
  bookings: Booking[];
  transactions: WalletTransaction[];

  setBookingContext: (item: BookingSummary | null) => void;
  setPassengers: (p: BookingPassenger[]) => void;

  addDirectBooking: (booking: Omit<Booking, 'id' | 'reference' | 'createdAt'>) => Booking;
  refundBooking: (bookingId: string) => void;
  deposit: (wallet: SupportedCurrency, amount: number, method: string) => void;
  exchange: (from: SupportedCurrency, to: SupportedCurrency, amount: number) => boolean;
}

let counter = Date.now();
function genId(prefix: string) {
  counter += 1;
  return `${prefix}-${counter.toString(36).toUpperCase()}`;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      // Real balances come from the server (getWallet). The seeded demo wallet
      // exists only when the public demo flag is on, so production always
      // starts at zero.
      wallet: process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
        ? { IRR: 150_000_000, USDT: 250, AED: 400 }
        : { IRR: 0, USDT: 0, AED: 0 },
      bookingContext: null,
      passengers: [],
      bookings: [],
      transactions: [],

      setBookingContext: (item) => set({ bookingContext: item ? { ...item, id: item.id || genId('ctx') } : null }),
      setPassengers: (passengers) => set({ passengers }),

      addDirectBooking: (data) => {
        const reference = `DIR-${Math.floor(Math.random() * 900000 + 100000)}`;
        const booking: Booking = {
          ...data,
          id: genId('bk'),
          reference,
          createdAt: new Date().toISOString(),
          status: 'confirmed',
          qrPayload: `FIRUZO|${reference}|${data.type.toUpperCase()}`,
        };
        set({
          bookings: [booking, ...get().bookings],
        });
        return booking;
      },

      refundBooking: (bookingId) => {
        const { bookings, wallet, transactions } = get();
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking || booking.status === 'cancelled') return;

        const currency = (booking.currency || 'IRR') as SupportedCurrency;
        const refundAmount = booking.amount;

        set({
          bookings: bookings.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' as const } : b)),
          wallet: {
            ...wallet,
            [currency]: (wallet[currency] || 0) + refundAmount,
          },
          transactions: [
            {
              id: genId('tx'),
              type: 'refund',
              wallet: currency,
              amount: refundAmount,
              description: `استرداد وجه رزرو ${booking.title}`,
              createdAt: new Date().toISOString(),
              status: 'completed',
            },
            ...transactions,
          ],
        });
      },

      deposit: (wallet, amount, method) => {
        const { wallet: currentWallet, transactions } = get();
        set({
          wallet: {
            ...currentWallet,
            [wallet]: (currentWallet[wallet] || 0) + amount,
          },
          transactions: [
            {
              id: genId('tx'),
              type: 'deposit',
              wallet,
              amount,
              description: `شارژ کیف پول (${method})`,
              createdAt: new Date().toISOString(),
              status: 'completed',
            },
            ...transactions,
          ],
        });
      },

      exchange: (from, to, amount) => {
        const { wallet, transactions } = get();
        if ((wallet[from] || 0) < amount) return false;

        const converted = defaultCurrencyService.convert(amount, from, to);
        if (converted === null) return false;

        set({
          wallet: {
            ...wallet,
            [from]: wallet[from] - amount,
            [to]: (wallet[to] || 0) + converted,
          },
          transactions: [
            {
              id: genId('tx'),
              type: 'exchange',
              wallet: from,
              amount,
              description: `تبدیل ${amount} ${from} به ${converted} ${to}`,
              createdAt: new Date().toISOString(),
              status: 'completed',
            },
            ...transactions,
          ],
        });
        return true;
      },
    }),
    {
      name: 'firuzo-booking-storage',
      partialize: (state) => ({
        bookings: state.bookings,
        wallet: state.wallet,
        transactions: state.transactions,
      }),
    }
  )
);
