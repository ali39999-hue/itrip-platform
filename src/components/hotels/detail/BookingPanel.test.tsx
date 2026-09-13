// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BookingPanel } from './BookingPanel';
import type { RoomType } from '@/lib/types';

const messages = {
  HotelDetail: {
    checkIn: 'ورود',
    checkOut: 'خروج',
    capacity: 'ظرفیت',
    passengersSummary: '{adults} بزرگسال، {children} کودک',
    continuePay: 'ادامه و پرداخت',
  },
  Common: { aria: { remove: 'حذف' } },
};

const liveRooms: RoomType[] = [
  { id: '10', name: 'دبل ویو دریا', capacity: 2, breakfast: true, pricePerNight: 5_500_000, available: 4 },
];

function makeBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sel: {} as Record<string, number>,
    setSel: vi.fn(),
    totals: { sub: 0, tax: 0, extra: 0, total: 0 },
    capacity: { a: 0, c: 0, n: 0 },
    adults: 2,
    children: 0,
    checkin: '2026-09-22',
    checkout: '2026-09-24',
    nights: [new Date('2026-09-22'), new Date('2026-09-23')],
    isLive: true,
    ...overrides,
  };
}

function renderPanel(booking: ReturnType<typeof makeBooking>, hotel?: { roomTypes: RoomType[] }) {
  return render(
    <NextIntlClientProvider locale="fa" messages={messages}>
      <BookingPanel booking={booking as never} hotel={hotel as never} onBook={vi.fn()} />
    </NextIntlClientProvider>
  );
}

describe('BookingPanel (hotel checkout side panel)', () => {
  it('renders with a live room selected without crashing (regression: PLANS["live"] undefined)', () => {
    // Live selections are keyed "<rid>|live"; the panel must not look the key
    // up in the static PLANS catalogue (which crashed on .refund).
    const booking = makeBooking({
      sel: { '10|live': 2 },
      totals: { sub: 11_000_000, tax: 1_100_000, extra: 0, total: 12_100_000 },
      capacity: { a: 4, c: 0, n: 2 },
    });
    renderPanel(booking, { roomTypes: liveRooms });

    expect(screen.getByText(/دبل ویو دریا/)).toBeTruthy();
    expect(screen.getByText('ادامه و پرداخت')).toBeTruthy();
    // No static plan info for live rooms → generic cancellation wording.
    expect(screen.getByText(/شرایط استرداد هتل/)).toBeTruthy();
  });

  it('renders static-plan selections with the free-cancellation note', () => {
    const booking = makeBooking({
      sel: { 'std|flex': 1 },
      totals: { sub: 9_000_000, tax: 900_000, extra: 0, total: 9_900_000 },
      capacity: { a: 2, c: 0, n: 1 },
      isLive: false,
    });
    renderPanel(booking);

    expect(screen.getByText(/اتاق استاندارد دو تخته/)).toBeTruthy();
    expect(screen.getByText(/کنسلی رایگان تا/)).toBeTruthy();
  });

  it('shows the empty-selection hint when no rooms are chosen', () => {
    renderPanel(makeBooking(), { roomTypes: liveRooms });
    expect(screen.getByText(/هنوز اتاقی انتخاب نکرده‌اید/)).toBeTruthy();
  });
});
