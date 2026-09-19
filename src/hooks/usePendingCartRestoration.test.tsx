// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { usePendingCartRestoration, PENDING_TOUR_CART_KEY } from './usePendingCartRestoration';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore } from '@/stores/booking-store';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="fa" messages={{}}>
      {children}
    </NextIntlClientProvider>
  );
}

describe('usePendingCartRestoration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    useAuthStore.setState({ user: null });
    useBookingStore.setState({ cart: [] });
  });

  it('does nothing when user is not logged in', () => {
    const pendingItem = {
      type: 'TOUR',
      title: 'تور تست کیش',
      subtitle: 'کیش • 2026-10-01',
      count: 2,
      unitPrice: 5_000_000,
      currency: 'TOMAN',
      travelDate: '2026-10-01',
      details: { tourId: 't-test', adults: 2, children: 0 },
    };
    sessionStorage.setItem(PENDING_TOUR_CART_KEY, JSON.stringify(pendingItem));

    renderHook(() => usePendingCartRestoration(), { wrapper });

    expect(useBookingStore.getState().cart.length).toBe(0);
    expect(sessionStorage.getItem(PENDING_TOUR_CART_KEY)).not.toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('restores pending tour cart item when user logs in and displays alert', () => {
    const pendingItem = {
      type: 'TOUR',
      title: 'تور تست شیراز',
      subtitle: 'شیراز • 2026-10-05',
      count: 1,
      unitPrice: 8_000_000,
      currency: 'TOMAN',
      travelDate: '2026-10-05',
      details: { tourId: 't-shiraz', adults: 1, children: 0 },
    };
    sessionStorage.setItem(PENDING_TOUR_CART_KEY, JSON.stringify(pendingItem));

    useAuthStore.setState({
      user: {
        id: 'usr-1',
        phone: '09123456789',
        firstNameFa: 'تست',
        lastNameFa: 'کاربر',
        kycApproved: true,
        role: 'customer',
      },
    });

    renderHook(() => usePendingCartRestoration(), { wrapper });

    const cart = useBookingStore.getState().cart;
    expect(cart.length).toBe(1);
    expect(cart[0]!.title).toBe('تور تست شیراز');
    expect(cart[0]!.count).toBe(1);
    expect(sessionStorage.getItem(PENDING_TOUR_CART_KEY)).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('تور به سبد خرید اضافه شد');
  });

  it('ignores invalid json without crashing', () => {
    sessionStorage.setItem(PENDING_TOUR_CART_KEY, 'invalid-json{{{');
    useAuthStore.setState({
      user: {
        id: 'usr-2',
        phone: '09123456789',
        firstNameFa: 'تست',
        lastNameFa: 'کاربر',
        kycApproved: true,
        role: 'customer',
      },
    });

    expect(() => {
      renderHook(() => usePendingCartRestoration(), { wrapper });
    }).not.toThrow();
    expect(useBookingStore.getState().cart.length).toBe(0);
  });
});
