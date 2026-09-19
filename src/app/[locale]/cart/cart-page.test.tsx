// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import CartPage from './page';
import { useBookingStore } from '@/stores/booking-store';

const mockPush = vi.fn();
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="fa" messages={{}}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('CartPage Component (/cart)', () => {
  beforeEach(() => {
    mockPush.mockReset();
    useBookingStore.setState({
      cart: [],
      bookingContext: null,
    });
  });

  it('renders empty cart state with exploratory links when cart has no items', () => {
    renderWithIntl(<CartPage />);

    expect(screen.getByText('سبد خرید شما خالی است')).toBeDefined();
    expect(screen.getByText('پروازها')).toBeDefined();
    expect(screen.getByText('هتل‌ها')).toBeDefined();
    expect(screen.getByText('تشریفات CIP')).toBeDefined();
    expect(screen.getByText('بیمه مسافرتی')).toBeDefined();
  });

  it('renders cart item lines with calculation and routes to checkout on click', () => {
    useBookingStore.setState({
      cart: [
        {
          id: 'cart-cip-1',
          type: 'CIP',
          title: 'تشریفات اختصاصی CIP - فرودگاه امام خمینی',
          subtitle: 'پرواز خروجی • ۲ مسافر',
          supplier: 'CIP-IKA',
          count: 2,
          unitPrice: 99000000, // 9.9M Toman in Rials
          currency: 'IRR',
          travelDate: '2026-10-01',
        },
      ],
    });

    renderWithIntl(<CartPage />);

    expect(screen.getByText('تشریفات اختصاصی CIP - فرودگاه امام خمینی')).toBeDefined();
    expect(screen.getByText('پرواز خروجی • ۲ مسافر')).toBeDefined();

    const checkoutButtons = screen.getAllByText(/ادامه/);
    expect(checkoutButtons.length).toBeGreaterThan(0);

    fireEvent.click(checkoutButtons[0]);
    expect(mockPush).toHaveBeenCalledWith('/checkout');
  });

  it('allows removing an item from the cart', () => {
    useBookingStore.setState({
      cart: [
        {
          id: 'cart-ins-1',
          type: 'INSURANCE',
          title: 'بیمه مسافرتی بیمه کوثر',
          count: 1,
          unitPrice: 1742400,
          currency: 'IRR',
          travelDate: '2026-10-05',
        },
      ],
    });

    renderWithIntl(<CartPage />);
    expect(screen.getByText('بیمه مسافرتی بیمه کوثر')).toBeDefined();

    // The cart page renders in the default locale (fa): the remove button
    // carries a localized per-item aria-label («حذف {title} از سبد خرید»).
    const removeButton = screen.getByLabelText(/بیمه کوثر از سبد خرید/);
    fireEvent.click(removeButton);

    expect(useBookingStore.getState().cart.length).toBe(0);
  });
});
