'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Booking, BookingPassenger, WalletTransaction } from '@/lib/types';
import {
  BookingDomainService,
  type BookingSummary,
  type BookingFundLock,
} from '@/domains/booking/BookingDomainService';
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
  lockedAmounts: BookingFundLock[];

  setBookingContext: (item: BookingSummary | null) => void;
  setPassengers: (p: BookingPassenger[]) => void;

  lockFunds: (amount: number, currency: SupportedCurrency, bookingId: string) => boolean;
  confirmBooking: (paymentMethod: Booking['paymentMethod'], addOns?: string[]) => Booking | null;
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
        const result = BookingDomainService.createFundLock(bookingId, amount, currency, wallet[currency]);
        if (!result) return false;

        set({
          wallet: { ...wallet, [currency]: result.newBalance },
          lockedAmounts: [...get().lockedAmounts, result.lock],
          transactions: [
            {
              id: genId('tx'),
              type: 'withdraw',
              wallet: currency as WalletTransaction['wallet'],
              amount,
              description: `قفل وجه تراکنش ${bookingId}`,
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
        if (!bookingContext || !bookingContext.id) return null;

        // Deterministic Lock resolution by exact context ID
        const lockIndex = lockedAmounts.findIndex((l) => l.bookingId === bookingContext.id && l.state === 'LOCKED');
        let updatedLocks = [...lockedAmounts];
        const newTransactions = [...get().transactions];

        if (lockIndex !== -1) {
          const currentLock = lockedAmounts[lockIndex];
          const capturedLock = BookingDomainService.captureLock(currentLock);
          updatedLocks = lockedAmounts.filter((_, idx) => idx !== lockIndex);

          newTransactions.unshift({
            id: genId('tx'),
            type: 'payment',
            wallet: capturedLock.currency,
            amount: capturedLock.amount,
            description: `پرداخت نهایی رزرو ${bookingContext.title}`,
            createdAt: new Date().toISOString(),
            status: 'completed',
          });
        }

        const booking = BookingDomainService.createConfirmedBooking(
          bookingContext,
          passengers,
          paymentMethod,
          addOns
        );

        set({
          bookings: [booking, ...get().bookings],
          bookingContext: null,
          lockedAmounts: updatedLocks,
          transactions: newTransactions,
        });

        return booking;
      },

      addDirectBooking: (data) => {
        const reference = 'FIR-' + Math.floor(Math.random() * 900000 + 100000);
        const booking: Booking = {
          ...data,
          id: genId('bk'),
          reference,
          createdAt: new Date().toISOString(),
          qrPayload: data.qrPayload || `FIRUZO|${reference}|${data.type.toUpperCase()}`,
        };
        set({
          bookings: [booking, ...get().bookings],
          transactions: [
            {
              id: genId('tx'),
              type: 'payment',
              wallet: (data.currency as SupportedCurrency) || 'IRR',
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

        // Staged refund workflow simulation
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
              description: `استرداد و بازگشت وجه ${booking.reference}`,
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
        const { wallet } = get();
        if (wallet[from] < amount) return false;

        const converted = defaultCurrencyService.convert(amount, from, to);
        set({
          wallet: {
            ...wallet,
            [from]: wallet[from] - amount,
            [to]: wallet[to] + converted,
          },
          transactions: [
            {
              id: genId('tx'),
              type: 'exchange',
              wallet: from,
              amount,
              resultAmount: converted,
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
    { name: 'firuzo-bookings' }
  )
);

