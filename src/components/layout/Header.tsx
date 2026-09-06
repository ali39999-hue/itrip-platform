'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@/i18n/routing';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Logo } from './Logo';
import { CountrySwitcher } from './header/CountrySwitcher';
import { LocaleSwitcher } from './header/LocaleSwitcher';
import { DesktopNav, NAV_CATEGORIES } from './header/DesktopNav';
import { UserAccountMenu } from './header/UserAccountMenu';
import { useTranslations, useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('Nav');
  const ct = useTranslations('Common');
  const locale = useLocale();
  const isRtl = ['fa', 'ar'].includes(locale);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle Escape key when mobile drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen]);

  const drawerContent = mobileMenuOpen && mounted ? (
    <div className="lg:hidden fixed inset-0 z-[250] flex">
      {/* Backdrop Blur Overlay */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`relative z-10 w-full max-w-[320px] bg-surface h-full shadow-2xl flex flex-col justify-between border-e border-line animate-in ${
          isRtl ? 'slide-in-from-right-full' : 'slide-in-from-left-full'
        } duration-250`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-line flex items-center justify-between bg-soft/50">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={ct('aria.closeMenu')}
            className="w-10 h-10 rounded-xl bg-surface border border-line text-ink grid place-items-center active:scale-95 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Country & Locale Switcher in Drawer */}
        <div className="px-4 py-3 border-b border-line/60 bg-paper flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[10.5px] font-black text-sub block mb-1">
              {lt(locale, { fa: 'کشور مقصد سفر:', en: 'Destination:', ar: 'البلد الوجهة:', zh: '目的地国家：', ru: 'Направление:' })}
            </span>
            <CountrySwitcher />
          </div>
          <div className="shrink-0">
            <span className="text-[10.5px] font-black text-sub block mb-1">
              {lt(locale, { fa: 'زبان:', en: 'Language:', ar: 'اللغة:', zh: '语言：', ru: 'Язык:' })}
            </span>
            <LocaleSwitcher />
          </div>
        </div>

        {/* Scrollable Categories List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.key} className="space-y-1.5">
              <h4 className="text-[11px] font-black uppercase text-brand-dark px-1">
                {t(cat.key)}
              </h4>
              <div className="space-y-1">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between min-h-[48px] p-3 rounded-xl hover:bg-soft text-sm font-bold text-ink transition active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-soft grid place-items-center text-brand-dark shrink-0">
                          <Icon size={16} />
                        </div>
                        <span>{t(item.key)}</span>
                      </div>
                      {isRtl ? (
                        <ChevronLeft size={15} className="text-sub/60 shrink-0" />
                      ) : (
                        <ChevronRight size={15} className="text-sub/60 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Drawer Footer Notice */}
        <div className="p-4 border-t border-line bg-soft/40 text-center">
          <p className="text-[11px] text-sub font-bold m-0">
            پلتفرم سفر هوشمند فیروزه · پشتیبانی ۲۴/۷
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <header className="sticky top-0 z-[80] bg-surface/90 backdrop-blur-md border-b border-line/80">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Switchers */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Logo size="md" />

          <div className="hidden sm:flex items-center gap-2">
            <CountrySwitcher />
          </div>
          <div className="flex items-center">
            <LocaleSwitcher />
          </div>
        </div>

        {/* Desktop Navigation */}
        <DesktopNav />

        {/* User Account & Mobile Toggle */}
        <div className="flex items-center gap-2">
          <UserAccountMenu />

          {/* Mobile Menu Button with 44px touch target */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? ct('aria.closeMenu') : ct('aria.openMenu')}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden w-11 h-11 grid place-items-center rounded-2xl text-ink hover:bg-soft active:scale-95 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Render Mobile Drawer into document.body to escape header's backdrop-filter stacking context */}
      {mounted && typeof document !== 'undefined' && drawerContent && createPortal(drawerContent, document.body)}
    </header>
  );
}
