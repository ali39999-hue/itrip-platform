'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Booking, BookingPassenger, WalletTransaction } from '@/lib/types';

interface WalletBalances {
  IRR: number;
  USDT: number;
  AED: number;
}

interface BookingSummary {
  type: Booking['type'];
  title: string;
  subtitle: string;
  amount: number;
  travelDate: string;
  meta?: Record<string, string>;
  id?: string;
}

interface BookingState {
  wallet: WalletBalances;
  bookingContext: BookingSummary | null;
  passengers: BookingPassenger[];
  bookings: Booking[];
  transactions: WalletTransaction[];
  lockedAmounts: { bookingId: string; amount: number; currency: keyof WalletBalances; expiresAt: number }[];

  setBookingContext: (item: BookingSummary | null) => void;
  setPassengers: (p: BookingPassenger[]) => void;

  lockFunds: (amount: number, currency: keyof WalletBalances, bookingId: string) => boolean;
  confirmBooking: (paymentMethod: Booking['paymentMethod'], addOns?: string[]) => Booking | null;
  addDirectBooking: (booking: Omit<Booking, 'id' | 'reference' | 'createdAt'>) => Booking;
  refundBooking: (bookingId: string) => void;
  deposit: (wallet: keyof WalletBalances, amount: number, method: string) => void;
  exchange: (from: keyof WalletBalances, to: keyof WalletBalances, amount: number) => boolean;
}

let counter = Date.now();
function genId(prefix: string) {
  counter += 1;
  return `${prefix}-${counter.toString(36).toUpperCase()}`;
}

const EXCHANGE_RATES: Record<string, number> = {
  'IRR_USDT': 0.000000024,
  'USDT_IRR': 41800000,
  'IRR_AED': 0.00000088,
  'AED_IRR': 1140000,
  'USDT_AED': 3.67,
  'AED_USDT': 0.2725,
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      wallet: { IRR: 150_000_000, USDT: 250, AED: 400 },
      bookingContext: null,
      passengers: [],
      bookings: [],
      transactions: [],
      lockedAmounts: [],

      setBookingContext: (item) => set({ bookingContext: item ? { ...item, id: item.id || genId('ctx') } : null }),
      setPassengers: (passengers) => set({ passengers }),

      lockFunds: (amount, currency, bookingId) => {
        const { wallet } = get();
        if (wallet[currency] < amount) return false;
        set({
          wallet: { ...wallet, [currency]: wallet[currency] - amount },
          lockedAmounts: [
            ...get().lockedAmounts,
            { bookingId, amount, currency, expiresAt: Date.now() + 30_000 },
          ],
          transactions: [
            {
              id: genId('tx'),
              type: 'withdraw',
              wallet: currency as WalletTransaction['wallet'],
              amount,
              description: `قفل وجه موقت برای رزرو ${bookingId}`,
              createdAt: new Date().toISOString(),
              status: 'locked',
            },
            ...get().transactions,
          ],
        });
        return true;
      },

      confirmBooking: (paymentMethod, addOns = []) => {
        const { bookingContext, passengers, lockedAmounts } = get();
        if (!bookingContext) return null;
        // Find lock by the unique context ID, fallback to 'pending' if it was hardcoded
        const lock = lockedAmounts.find((l) => l.bookingId === bookingContext.id || l.bookingId === 'pending');
        if (lock) {
          setTimeout(() => {
            set((s) => ({
              lockedAmounts: s.lockedAmounts.filter((l) => l.bookingId !== lock.bookingId),
            }));
          }, 100);
        }
        if (lock) {
          set((s) => ({
            transactions: [
              {
                id: genId('tx'),
                type: 'payment',
                wallet: lock.currency,
                amount: lock.amount,
                description: `پرداخت نهایی رزرو ${bookingContext.title}`,
                createdAt: new Date().toISOString(),
                status: 'completed',
              },
              ...s.transactions,
            ],
          }));
        }
        const reference = 'IRP' + Math.floor(Math.random() * 900000 + 100000);
        const booking: Booking = {
          id: genId('bk'),
          reference,
          type: bookingContext.type,
          status: 'confirmed',
          title: bookingContext.title,
          subtitle: bookingContext.subtitle,
          amount: bookingContext.amount,
          currency: 'IRR',
          createdAt: new Date().toISOString(),
          travelDate: bookingContext.travelDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          passengers,
          addOns,
          paymentMethod,
          qrPayload: `ITRIP|${reference}|${bookingContext.type.toUpperCase()}`,
        };
        set({ bookings: [booking, ...get().bookings], bookingContext: null });
        return booking;
      },

      addDirectBooking: (data) => {
        const reference = 'IRP' + Math.floor(Math.random() * 900000 + 100000);
        const booking: Booking = {
          ...data,
          id: genId('bk'),
          reference,
          createdAt: new Date().toISOString(),
          qrPayload: data.qrPayload || `ITRIP|${reference}|${data.type.toUpperCase()}`,
        };
        set({
          bookings: [booking, ...get().bookings],
          transactions: [
            {
              id: genId('tx'),
              type: 'payment',
              wallet: data.currency || 'IRR',
              amount: data.amount,
              description: `پرداخت سفارش ${data.title}`,
              createdAt: new Date().toISOString(),
              status: 'completed',
            },
            ...get().transactions,
          ],
        });
        return booking;
      },

      refundBooking: (bookingId) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        if (!booking || booking.status !== 'confirmed') return;
        set({
          bookings: get().bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'refunded' as const } : b
          ),
          wallet: { ...get().wallet, IRR: get().wallet.IRR + booking.amount },
          transactions: [
            {
              id: genId('tx'),
              type: 'refund',
              wallet: 'IRR',
              amount: booking.amount,
              description: `بازگشت وجه استرداد ${booking.reference}`,
              createdAt: new Date().toISOString(),
              status: 'completed',
            },
            ...get().transactions,
          ],
        });
      },

      deposit: (walletName, amount, method) => {
        set({
          wallet: { ...get().wallet, [walletName]: get().wallet[walletName] + amount },
          transactions: [
            {
              id: genId('tx'),
              type: 'deposit',
              wallet: walletName,
              amount,
              description: `شارژ کیف پول از طریق ${method}`,
              createdAt: new Date().toISOString(),
              status: 'completed',
            },
            ...get().transactions,
          ],
        });
      },

      exchange: (from, to, amount) => {
        const rate = EXCHANGE_RATES[`${from}_${to}`];
        if (!rate) return false;
        const { wallet } = get();
        if (wallet[from] < amount) return false;
        const result = amount * rate;
        set({
          wallet: { ...wallet, [from]: wallet[from] - amount, [to]: wallet[to] + result },
          transactions: [
            {
              id: genId('tx'),
              type: 'exchange',
              wallet: from,
              amount,
              resultAmount: result,
              resultWallet: to,
              description: `تبدیل ${amount.toLocaleString()} ${from} به ${to}`,
              createdAt: new Date().toISOString(),
              status: 'completed',
            },
            ...get().transactions,
          ],
        });
        return true;
      },
    }),
    { name: 'itrip-bookings' }
  )
);
