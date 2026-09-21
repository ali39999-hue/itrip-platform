// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

const pathnameState = { current: '/' };
const authState: { user: { id: string } | null } = { user: null };

vi.mock('@/i18n/routing', () => ({
  usePathname: () => pathnameState.current,
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (sel: (s: { user: { id: string } | null }) => unknown) =>
    sel({ user: authState.user }),
}));

import { BottomNav, BOTTOM_NAV_ITEMS, isHotelOrTourDetail } from './BottomNav';

const navMessages = {
  Nav: {
    home: 'Home',
    explore: 'Explore',
    myTrips: 'My trips',
    wallet: 'Wallet',
    account: 'Account',
    ariaLabel: 'Mobile navigation',
  },
};

function renderNav() {
  return render(
    <NextIntlClientProvider locale="en" messages={navMessages}>
      <BottomNav />
    </NextIntlClientProvider>,
  );
}

describe('BottomNav IA (Phase 3)', () => {
  beforeEach(() => {
    pathnameState.current = '/';
    authState.user = null;
  });

  it('exposes five primary destinations with Explore on /book', () => {
    expect(BOTTOM_NAV_ITEMS.map((it) => [it.labelKey, it.href])).toEqual([
      ['home', '/'],
      ['explore', '/book'],
      ['myTrips', '/my-trips'],
      ['wallet', '/wallet'],
      ['account', '/account'],
    ]);
  });

  it('renders Explore (not Search) and keeps the nav on the Explore hub', () => {
    pathnameState.current = '/book';
    renderNav();
    expect(screen.getByLabelText('Mobile navigation')).toBeTruthy();
    const explore = screen.getByRole('link', { name: /explore/i });
    expect(explore.getAttribute('href')).toBe('/book');
    expect(explore.getAttribute('aria-current')).toBe('page');
  });

  it('hides on checkout but not on hotel search', () => {
    pathnameState.current = '/checkout';
    const { unmount } = renderNav();
    expect(screen.queryByLabelText('Mobile navigation')).toBeNull();
    unmount();

    pathnameState.current = '/hotels/search';
    renderNav();
    expect(screen.getByLabelText('Mobile navigation')).toBeTruthy();
  });

  it('sends guests to auth for trips and account', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /my trips/i }).getAttribute('href')).toBe(
      '/auth?callbackUrl=/my-trips',
    );
    expect(screen.getByRole('link', { name: /account/i }).getAttribute('href')).toBe(
      '/auth?callbackUrl=/account',
    );
  });
});

describe('isHotelOrTourDetail', () => {
  it('treats listing/search as not detail', () => {
    expect(isHotelOrTourDetail('/hotels')).toBe(false);
    expect(isHotelOrTourDetail('/hotels/search')).toBe(false);
    expect(isHotelOrTourDetail('/tours')).toBe(false);
  });

  it('treats id pages as detail', () => {
    expect(isHotelOrTourDetail('/hotels/abc-hotel')).toBe(true);
    expect(isHotelOrTourDetail('/fa/tours/istanbul-day')).toBe(true);
  });
});
