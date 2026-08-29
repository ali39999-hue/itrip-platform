'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { Menu, X } from 'lucide-react';
import { CountrySwitcher } from './header/CountrySwitcher';
import { LocaleSwitcher } from './header/LocaleSwitcher';
import { DesktopNav, NAV_CATEGORIES } from './header/DesktopNav';
import { UserAccountMenu } from './header/UserAccountMenu';
import { useTranslations } from 'next-intl';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations('Nav');

  return (
    <header className="sticky top-0 z-[80] bg-surface/90 backdrop-blur-md border-b border-line/80">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Switchers */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-black text-[20px] text-brand-dark tracking-tight focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded"
          >
            <span className="w-8 h-8 rounded-xl bg-brand text-surface flex items-center justify-center font-black text-[16px] shadow-sm">
              iT
            </span>
            <span className="font-black">iTrip</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            <CountrySwitcher />
            <LocaleSwitcher />
          </div>
        </div>

        {/* Desktop Navigation */}
        <DesktopNav />

        {/* User Account & Mobile Toggle */}
        <div className="flex items-center gap-2">
          <UserAccountMenu />

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden w-10 h-10 grid place-items-center rounded-full text-ink hover:bg-soft transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-line bg-surface p-4 space-y-5 animate-in slide-in-from-top-2 duration-200 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-2 pb-3 border-b border-line">
            <CountrySwitcher />
            <LocaleSwitcher />
          </div>

          <div className="space-y-4">
            {NAV_CATEGORIES.map((cat) => (
              <div key={cat.key} className="space-y-1.5">
                <h4 className="text-[11px] font-black uppercase text-sub tracking-wider px-1">
                  {t(cat.key)}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-soft/50 hover:bg-soft text-[12.5px] font-bold text-ink transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                      >
                        <Icon size={15} className="text-brand-dark shrink-0" />
                        <span className="truncate">{t(item.key)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
