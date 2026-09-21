// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/',
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

import { DesktopNav, NAV_CATEGORIES, PRIMARY_NAV_LINKS } from './DesktopNav';

const messages = {
  Nav: {
    flights: 'Flights',
    hotels: 'Hotels',
    tours: 'Tours',
    plan: 'AI planner',
    explore: 'Explore',
    destinations: 'Destinations',
    travelogues: 'Travelogues',
    guide: 'Guide',
    visa: 'Visa',
    insurance: 'Insurance',
    transfer: 'Transfers',
    cip: 'CIP',
    trains: 'Trains',
    esim: 'eSIM',
    cityPass: 'City pass',
    snapp: 'Snapp',
    interpreter: 'Interpreter',
  },
  Common: { aria: { mainNavigation: 'Main navigation' } },
};

describe('DesktopNav IA (Phase 3)', () => {
  it('keeps flights/hotels/tours/plan as always-visible secondary links', () => {
    expect(PRIMARY_NAV_LINKS.map((l) => l.key)).toEqual(['flights', 'hotels', 'tours', 'plan']);
  });

  it('does not repeat flights/hotels/tours or expose admin/SOS in Explore', () => {
    const keys = NAV_CATEGORIES.flatMap((c) => c.items.map((i) => i.key));
    expect(keys).not.toContain('flights');
    expect(keys).not.toContain('hotels');
    expect(keys).not.toContain('tours');
    expect(keys).not.toContain('admin');
    expect(keys).not.toContain('sos');
    expect(keys).toContain('interpreter');
    expect(NAV_CATEGORIES.map((c) => c.key)).toEqual(['explore']);
  });

  it('renders Explore as a hub link to /book', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DesktopNav />
      </NextIntlClientProvider>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeTruthy();
    const explore = screen.getByRole('link', { name: /explore/i });
    expect(explore.getAttribute('href')).toBe('/book');
    expect(screen.getByRole('link', { name: 'Flights' }).getAttribute('href')).toBe('/flights/search');
    expect(screen.queryByRole('link', { name: /admin/i })).toBeNull();
  });
});
