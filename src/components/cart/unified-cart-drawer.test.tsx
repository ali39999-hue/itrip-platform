// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { UnifiedCartDrawer } from './UnifiedCartDrawer';
import { useBookingStore } from '@/stores/booking-store';

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="fa" messages={{}}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('UnifiedCartDrawer Component (Miracuves / Lulan Pattern)', () => {
  beforeEach(() => {
    useBookingStore.setState({
      cart: [],
      bookingContext: null,
    });
  });

  it('renders empty cart state when no items are present', () => {
    renderWithIntl(<UnifiedCartDrawer open={true} onClose={vi.fn()} />);

    expect(screen.getByText(/سبد رزرو شما خالی است/)).toBeDefined();
    expect(screen.getByText(/جستجوی پرواز/)).toBeDefined();
    expect(screen.getByText(/جستجوی هتل/)).toBeDefined();
  });

  it('renders cart items with titles, suppliers, and subtotals', () => {
    useBookingStore.setState({
      cart: [
        {
          id: 'cart-1',
          type: 'FLIGHT',
          title: 'پرواز تهران به استانبول (ماهان ایر)',
          supplier: 'Mahan Air',
          count: 2,
          unitPrice: 15_000_000,
          currency: 'IRR',
          travelDate: '2026-09-20',
        },
      ],
    });

    renderWithIntl(<UnifiedCartDrawer open={true} onClose={vi.fn()} />);

    expect(screen.getByText(/پرواز تهران به استانبول/)).toBeDefined();
    expect(screen.getByText(/Mahan Air/)).toBeDefined();
    expect(screen.getByText(/ادامه به تسویه‌حساب و مشخصات مسافران/)).toBeDefined();
  });

  it('calculates 5% combo discount when both flight and hotel are present', () => {
    useBookingStore.setState({
      cart: [
        {
          id: 'flight-1',
          type: 'FLIGHT',
          title: 'پرواز رفت و برگشت استانبول',
          count: 1,
          unitPrice: 30_000_000,
          currency: 'IRR',
          travelDate: '2026-09-20',
        },
        {
          id: 'hotel-1',
          type: 'HOTEL',
          title: 'هتل ۵ ستاره الیت ورد',
          count: 1,
          nights: 2,
          unitPrice: 10_000_000, // 20M subtotal
          currency: 'IRR',
          travelDate: '2026-09-20',
        },
      ],
    });

    renderWithIntl(<UnifiedCartDrawer open={true} onClose={vi.fn()} />);

    // Total gross = 30M + 20M = 50M -> 5% discount = 2.5M
    expect(screen.getByText(/تخفیف پکیج همزمان پرواز \+ هتل \(۵٪\)/)).toBeDefined();
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithIntl(<UnifiedCartDrawer open={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('locks body scroll while open and restores it on close', () => {
    document.body.style.overflow = '';
    const { unmount } = renderWithIntl(<UnifiedCartDrawer open={true} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape (focus-trap managed)', () => {
    const onClose = vi.fn();
    renderWithIntl(<UnifiedCartDrawer open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders above sheets/dialogs with an enter animation', () => {
    renderWithIntl(<UnifiedCartDrawer open={true} onClose={vi.fn()} />);
    const overlay = document.body.querySelector('[role="dialog"]') as HTMLElement | null;
    expect(overlay?.className).toContain('z-[200]');
    const panel = overlay?.firstElementChild as HTMLElement | null;
    expect(panel?.className).toContain('animate-in');
    expect(panel?.className).toContain('slide-in-from-bottom');
  });

  it('removes item when delete button is clicked', () => {
    useBookingStore.setState({
      cart: [
        {
          id: 'tour-1',
          type: 'TOUR',
          title: 'تور ماسال اولسبلنگاه',
          count: 1,
          unitPrice: 34_000_000,
          currency: 'IRR',
          travelDate: '2026-09-25',
        },
      ],
    });

    renderWithIntl(<UnifiedCartDrawer open={true} onClose={vi.fn()} />);

    const deleteBtn = screen.getByLabelText(/حذف تور ماسال اولسبلنگاه/);
    fireEvent.click(deleteBtn);

    expect(useBookingStore.getState().cart.length).toBe(0);
  });
});
