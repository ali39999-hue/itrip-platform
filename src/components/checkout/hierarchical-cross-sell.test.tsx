// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HierarchicalCrossSell } from './HierarchicalCrossSell';

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('HierarchicalCrossSell Component', () => {
  it('suggests a matching flight when booking a hotel', () => {
    render(
      <HierarchicalCrossSell
        locale="fa"
        bookingType="hotels"
        title="هتل ۵ ستاره الیت ورد تقسیم، استانبول"
      />
    );

    expect(screen.getByText(/پرواز رفت و برگشت به استانبول را هم اضافه کنید؟/)).toBeDefined();
    expect(screen.getByText(/۱۰٪ تخفیف پکیج/)).toBeDefined();
    expect(screen.getByText(/افزودن پرواز به رزرو/)).toBeDefined();
  });

  it('suggests top hotels when booking a flight', () => {
    render(
      <HierarchicalCrossSell
        locale="fa"
        bookingType="flights"
        title="پرواز تهران به دبی"
      />
    );

    expect(screen.getByText(/اقامتگاه‌های برگزیده در دبی همزمان با ورود شما/)).toBeDefined();
    expect(screen.getByText(/رزرو اتاق هتل/)).toBeDefined();
  });

  it('allows toggling add service and dismissing the suggestion', () => {
    const onAdd = vi.fn();
    render(
      <HierarchicalCrossSell
        locale="fa"
        bookingType="hotels"
        title="هتل ترنج، کیش"
        onAddService={onAdd}
      />
    );

    const addBtn = screen.getByRole('button', { name: /افزودن پرواز به رزرو/ });
    fireEvent.click(addBtn);

    expect(screen.getByText(/پرواز افزوده شد/)).toBeDefined();
    expect(onAdd).toHaveBeenCalled();

    const dismissBtn = screen.getByRole('button', { name: /بستن پیشنهاد/ });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/پرواز رفت و برگشت به کیش را هم اضافه کنید؟/)).toBeNull();
  });
});
