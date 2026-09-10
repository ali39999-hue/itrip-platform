// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ExperienceDetailModal } from './ExperienceDetailModal';
import { useBookingStore } from '@/stores/booking-store';

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

const messages = {
  Common: {
    aria: { close: 'Close' },
  },
};

const mockExperience = {
  title: 'تور قایقی جنگل حرا',
  titleEn: 'Hara Mangrove Boat Tour',
  desc: 'گشت قایق محلی میان جنگل حرا و دلفین‌بینی جزیره هنگام',
  descEn: 'Local boat through the mangrove forest with Hengam dolphin watching',
  category: 'yacht' as const,
  where: 'قشم، خلیج فارس',
  whereEn: 'Qeshm, Persian Gulf',
  when: 'تمام سال',
  whenEn: 'Year-round',
  fromPrice: 850000,
};

describe('ExperienceDetailModal', () => {
  beforeEach(() => {
    useBookingStore.setState({ bookingContext: null });
  });

  it('renders experience details when open', () => {
    render(
      <NextIntlClientProvider locale="fa" messages={messages}>
        <ExperienceDetailModal
          experience={mockExperience}
          isOpen={true}
          onClose={vi.fn()}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('تور قایقی جنگل حرا')).toBeTruthy();
    expect(screen.getByText(/قشم، خلیج فارس/)).toBeTruthy();
    expect(screen.getByText('رزرو و ادامه به پرداخت')).toBeTruthy();
  });

  it('updates passenger count and calculates total price', () => {
    render(
      <NextIntlClientProvider locale="fa" messages={messages}>
        <ExperienceDetailModal
          experience={mockExperience}
          isOpen={true}
          onClose={vi.fn()}
        />
      </NextIntlClientProvider>
    );

    const increaseBtn = screen.getByRole('button', { name: 'افزایش مسافر' });
    fireEvent.click(increaseBtn);

    // 2 passengers * 850,000 = 1,700,000
    expect(screen.getByText('۱٬۷۰۰٬۰۰۰')).toBeTruthy();
  });

  it('sets booking context and navigates to checkout on book click', () => {
    render(
      <NextIntlClientProvider locale="fa" messages={messages}>
        <ExperienceDetailModal
          experience={mockExperience}
          isOpen={true}
          onClose={vi.fn()}
        />
      </NextIntlClientProvider>
    );

    const bookBtn = screen.getByRole('button', { name: /رزرو و ادامه به پرداخت/ });
    fireEvent.click(bookBtn);

    const context = useBookingStore.getState().bookingContext;
    expect(context).not.toBeNull();
    expect(context?.type).toBe('tours');
    expect(context?.title).toContain('تور قایقی جنگل حرا');
    expect(context?.amount).toBe(850000);
  });
});
