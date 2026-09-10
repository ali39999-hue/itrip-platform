// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { StickyCTA } from './StickyCTA';
import { StatusBadge } from './StatusBadge';
import { PriceBreakdownSheet } from './PriceBreakdownSheet';
import { PassengerPicker } from './PassengerPicker';
import { MobileCard } from './MobileCard';
import { SortSheet } from './SortSheet';

const messages = {
  Common: {
    aria: { close: 'Close' },
    states: { loading: 'Loading...', errorTitle: 'Error', emptyTitle: 'Empty' },
  },
};

function renderWithIntl(ui: React.ReactElement, locale = 'fa') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('Mobile Design System Components', () => {
  describe('StickyCTA', () => {
    it('renders price, currency and primary CTA button', () => {
      const onClick = vi.fn();
      renderWithIntl(
        <StickyCTA
          ctaLabel="رزرو نهایی"
          price={4500000}
          currencyLabel="تومان"
          priceLabel="مبلغ کل"
          onClick={onClick}
        />
      );

      expect(screen.getByText('رزرو نهایی')).toBeTruthy();
      expect(screen.getByText('تومان')).toBeTruthy();
      const button = screen.getByRole('button', { name: 'رزرو نهایی' });
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders disabled state correctly', () => {
      const onClick = vi.fn();
      renderWithIntl(
        <StickyCTA
          ctaLabel="ادامه"
          onClick={onClick}
          disabled={true}
        />
      );
      const button = screen.getByRole('button', { name: 'ادامه' });
      expect(button.hasAttribute('disabled')).toBe(true);
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('renders loading spinner when loading is true', () => {
      renderWithIntl(
        <StickyCTA
          ctaLabel="پرداخت"
          onClick={vi.fn()}
          loading={true}
        />
      );
      expect(screen.getByText('در حال پردازش...')).toBeTruthy();
    });
  });

  describe('StatusBadge', () => {
    it('renders CONFIRMED status with emerald green style', () => {
      const { container } = renderWithIntl(<StatusBadge status="CONFIRMED" />);
      expect(screen.getByText('تایید شده')).toBeTruthy();
      expect(container.firstChild).toHaveProperty('className');
      expect((container.firstChild as HTMLElement).className).toContain('emerald');
    });

    it('renders PENDING status with amber style', () => {
      const { container } = renderWithIntl(<StatusBadge status="PENDING_PAYMENT" />);
      expect(screen.getByText('در انتظار پرداخت')).toBeTruthy();
      expect((container.firstChild as HTMLElement).className).toContain('amber');
    });

    it('renders CANCELLED status with neutral/red style', () => {
      renderWithIntl(<StatusBadge status="CANCELLED" />);
      expect(screen.getByText('لغو شده')).toBeTruthy();
    });

    it('renders REFUNDED status with purple style', () => {
      renderWithIntl(<StatusBadge status="REFUNDED" />);
      expect(screen.getByText('مسترد شده')).toBeTruthy();
    });
  });

  describe('MobileCard', () => {
    it('handles interactive clicks and keyboard enter', () => {
      const onClick = vi.fn();
      renderWithIntl(
        <MobileCard onClick={onClick} interactive>
          <p>Card Content</p>
        </MobileCard>
      );

      const card = screen.getByRole('button');
      fireEvent.click(card);
      expect(onClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(card, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('PriceBreakdownSheet', () => {
    it('renders itemized price lines and final total', () => {
      const items = [
        { label: 'بلیت رفت و برگشت', amount: 8000000 },
        { label: 'تخفیف معرف', amount: 500000, isDiscount: true },
      ];

      renderWithIntl(
        <PriceBreakdownSheet
          open={true}
          onOpenChange={vi.fn()}
          items={items}
          totalAmount={7500000}
          currencyLabel="تومان"
        />
      );

      expect(screen.getByText('بلیت رفت و برگشت')).toBeTruthy();
      expect(screen.getByText('تخفیف معرف')).toBeTruthy();
      expect(screen.getByText(/مبلغ کل نهایی/)).toBeTruthy();
    });
  });

  describe('PassengerPicker', () => {
    it('updates passenger count and prevents infants exceeding adults', () => {
      const onChange = vi.fn();
      renderWithIntl(
        <PassengerPicker
          open={true}
          onOpenChange={vi.fn()}
          value={{ adults: 1, childrenCount: 0, infants: 0 }}
          onChange={onChange}
        />
      );

      expect(screen.getByText('بزرگسال')).toBeTruthy();
      expect(screen.getByText('کودک')).toBeTruthy();
      expect(screen.getByText('نوزاد')).toBeTruthy();

      const confirmBtn = screen.getByRole('button', { name: /تایید/ });
      fireEvent.click(confirmBtn);
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('SortSheet', () => {
    it('renders options and fires onChange when selected', () => {
      const onChange = vi.fn();
      const options = [
        { id: 'price', label: 'ارزان‌ترین' },
        { id: 'fast', label: 'سریع‌ترین' },
      ];

      renderWithIntl(
        <SortSheet
          open={true}
          onOpenChange={vi.fn()}
          options={options}
          value="price"
          onChange={onChange}
        />
      );

      expect(screen.getByText('ارزان‌ترین')).toBeTruthy();
      expect(screen.getByText('سریع‌ترین')).toBeTruthy();

      fireEvent.click(screen.getByText('سریع‌ترین'));
      expect(onChange).toHaveBeenCalledWith('fast');
    });
  });
});
