// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { TourBookingWidget } from './TourBookingWidget';
import { useBookingStore } from '@/stores/booking-store';
import type { Tour } from '@/lib/types';

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockTour: Tour = {
  id: 't-test-cart',
  title: 'تور تست اصفهان',
  titleEn: 'Test Isfahan Tour',
  city: 'اصفهان',
  cityEn: 'Isfahan',
  durationDays: 3,
  price: 10_000_000,
  childPrice: 7_000_000,
  rating: 4.5,
  imageQuery: 'isfahan',
  includes: ['صبحانه'],
  category: 'cultural',
  currency: 'TOMAN',
  departureDates: [
    {
      id: 'dep-1',
      startDate: '2026-10-01',
      endDate: '2026-10-03',
      price: 10_000_000,
      childPrice: 7_000_000,
      currency: 'TOMAN',
      availableSeats: 10,
      guaranteed: true,
    },
  ],
};

function renderWidget() {
  return render(
    <NextIntlClientProvider locale="fa" messages={{}}>
      <TourBookingWidget tour={mockTour} selectedDateId="dep-1" onSelectDateId={vi.fn()} />
    </NextIntlClientProvider>
  );
}

describe('TourBookingWidget add-to-cart', () => {
  beforeEach(() => {
    useBookingStore.setState({ cart: [], bookingContext: null });
  });

  it('adds the configured tour to the unified cart with correct totals', () => {
    renderWidget();

    const addButton = screen.getByRole('button', { name: /افزودن به سبد خرید/ });
    fireEvent.click(addButton);

    const cart = useBookingStore.getState().cart;
    expect(cart.length).toBe(1);
    expect(cart[0]).toMatchObject({
      type: 'TOUR',
      title: 'تور تست اصفهان',
      count: 1,
      currency: 'TOMAN',
      travelDate: '2026-10-01',
    });
    // Drawer math must reproduce the widget total: unitPrice * count.
    expect(cart[0]!.unitPrice * cart[0]!.count).toBe(10_000_000);
    expect(cart[0]!.details).toMatchObject({ tourId: 't-test-cart', adults: 1, children: 0 });
  });

  it('merges repeated adds by incrementing count (no duplicate rows)', () => {
    renderWidget();

    const addButton = screen.getByRole('button', { name: /افزودن به سبد خرید/ });
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    const cart = useBookingStore.getState().cart;
    expect(cart.length).toBe(1);
    expect(cart[0]!.count).toBe(2);
  });

  it('does not add sold-out tours', () => {
    const soldOut = {
      ...mockTour,
      departureDates: [{ ...mockTour.departureDates![0]!, availableSeats: 0 }],
    };
    render(
      <NextIntlClientProvider locale="fa" messages={{}}>
        <TourBookingWidget tour={soldOut} selectedDateId="dep-1" onSelectDateId={vi.fn()} />
      </NextIntlClientProvider>
    );

    const addButton = screen.getByRole('button', { name: /افزودن به سبد خرید/ });
    expect(addButton.hasAttribute('disabled')).toBe(true);
    fireEvent.click(addButton);
    expect(useBookingStore.getState().cart.length).toBe(0);
  });
});
