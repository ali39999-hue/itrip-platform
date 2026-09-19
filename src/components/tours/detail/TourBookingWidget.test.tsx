// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { TourBookingWidget } from './TourBookingWidget';
import { useBookingStore } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { PENDING_TOUR_CART_KEY } from '@/hooks/usePendingCartRestoration';
import type { Tour } from '@/lib/types';

const mockPush = vi.fn();
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/tours/t-test-cart',
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

const mockUser = {
  id: 'usr-1',
  phone: '09123456789',
  firstNameFa: 'علی',
  lastNameFa: 'تست',
  kycApproved: true,
  role: 'customer' as const,
};

describe('TourBookingWidget add-to-cart', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    useAuthStore.setState({ user: null });
    useBookingStore.setState({ cart: [], bookingContext: null });
  });

  it('blocks guest/unregistered users from adding to cart and redirects to auth with pending item saved', () => {
    renderWidget();

    // The desktop add-to-cart button
    const addButton = screen.getAllByRole('button', { name: /افزودن به سبد خرید/ })[0]!;
    fireEvent.click(addButton);

    // Cart remains empty
    expect(useBookingStore.getState().cart.length).toBe(0);

    // Item was saved to sessionStorage
    const saved = sessionStorage.getItem(PENDING_TOUR_CART_KEY);
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed).toMatchObject({
      type: 'TOUR',
      title: 'تور تست اصفهان',
      count: 1,
      currency: 'TOMAN',
    });

    // Error toast was triggered informing user to sign in
    expect(toast.error).toHaveBeenCalledWith('برای افزودن به سبد خرید، لطفاً ابتدا وارد حساب کاربری خود شوید.');

    // User is redirected to auth with callbackUrl
    expect(mockPush).toHaveBeenCalledWith('/auth?callbackUrl=%2Ftours%2Ft-test-cart');
  });

  it('adds the configured tour to the unified cart with correct totals when user is logged in', () => {
    useAuthStore.setState({ user: mockUser });
    renderWidget();

    const addButton = screen.getAllByRole('button', { name: /افزودن به سبد خرید/ })[0]!;
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

    // Success toast is shown
    expect(toast.success).toHaveBeenCalledWith('تور به سبد خرید اضافه شد');
  });

  it('merges repeated adds by incrementing count (no duplicate rows) for logged in user', () => {
    useAuthStore.setState({ user: mockUser });
    renderWidget();

    const addButton = screen.getAllByRole('button', { name: /افزودن به سبد خرید/ })[0]!;
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    const cart = useBookingStore.getState().cart;
    expect(cart.length).toBe(1);
    expect(cart[0]!.count).toBe(2);
    expect(toast.success).toHaveBeenCalledTimes(2);
  });

  it('does not add sold-out tours', () => {
    useAuthStore.setState({ user: mockUser });
    const soldOut = {
      ...mockTour,
      departureDates: [{ ...mockTour.departureDates![0]!, availableSeats: 0 }],
    };
    render(
      <NextIntlClientProvider locale="fa" messages={{}}>
        <TourBookingWidget tour={soldOut} selectedDateId="dep-1" onSelectDateId={vi.fn()} />
      </NextIntlClientProvider>
    );

    const addButton = screen.getAllByRole('button', { name: /افزودن به سبد خرید/ })[0]!;
    expect(addButton.hasAttribute('disabled')).toBe(true);
    fireEvent.click(addButton);
    expect(useBookingStore.getState().cart.length).toBe(0);
  });
});
