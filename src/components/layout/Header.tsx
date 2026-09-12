'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@/i18n/routing';
import { Menu, X, ChevronRight, Search, UserRound, LogOut, Briefcase, Wallet, Users, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from './Logo';
import { CountrySwitcher } from './header/CountrySwitcher';
import { LocaleSwitcher } from './header/LocaleSwitcher';
import { DesktopNav, NAV_CATEGORIES } from './header/DesktopNav';
import { UserAccountMenu } from './header/UserAccountMenu';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';
import { useTranslations, useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuthStore();
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
    <div className="xl:hidden fixed inset-0 z-[250] flex">
      {/* Backdrop Blur Overlay */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('ariaLabel')}
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

        {/* User Profile & Account Actions in Mobile Drawer */}
        {user ? (
          <div className="p-3.5 border-b border-line bg-surface">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition"
              >
                <div className="w-10 h-10 rounded-full shadow-xs bg-gradient-to-br from-brand to-brand-dark text-surface flex items-center justify-center text-sm font-black shrink-0">
                  {user.firstNameFa?.[0] || user.firstNameEn?.[0] || <UserRound size={18} />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-ink truncate">
                    {((locale === 'fa' ? user.firstNameFa : (user.firstNameEn || user.firstNameFa)) || user.phone)}
                  </h3>
                  <span className="text-[10.5px] font-bold text-brand-dark flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>{lt(locale, { fa: 'داشبورد کاربری', en: 'User Dashboard', ar: 'لوحة الحساب', zh: '用户控制台', ru: 'Личный кабинет' })}</span>
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="min-h-[44px] px-3 rounded-xl bg-rose-warm/15 text-rose-warm hover:bg-rose-warm/25 flex items-center gap-1.5 text-xs font-black shrink-0 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-warm"
                title={lt(locale, { fa: 'خروج از حساب', en: 'Sign Out', ar: 'تسجيل الخروج', zh: '退出登录', ru: 'Выйти' })}
              >
                <LogOut size={14} />
                <span>{lt(locale, { fa: 'خروج', en: 'Logout', ar: 'خروج', zh: '退出', ru: 'Выход' })}</span>
              </button>
            </div>

            {/* Quick Account Navigation Grid */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <Link
                href="/my-trips"
                onClick={() => setMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-soft hover:bg-mint/40 text-center transition min-h-[44px]"
              >
                <Briefcase size={15} className="text-brand-dark mb-0.5" />
                <span className="text-[10.5px] font-black text-ink">{t('myTrips')}</span>
              </Link>
              <Link
                href="/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-soft hover:bg-mint/40 text-center transition min-h-[44px]"
              >
                <Wallet size={15} className="text-brand-dark mb-0.5" />
                <span className="text-[10.5px] font-black text-ink">{t('wallet')}</span>
              </Link>
              <Link
                href="/account/travelers"
                onClick={() => setMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-soft hover:bg-mint/40 text-center transition min-h-[44px]"
              >
                <Users size={15} className="text-brand-dark mb-0.5" />
                <span className="text-[10.5px] font-black text-ink">{lt(locale, { fa: 'مسافران', en: 'Travelers', ar: 'المسافرون', zh: '旅客', ru: 'Пассажиры' })}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-3.5 border-b border-line bg-surface">
            <Link
              href="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] rounded-xl bg-brand text-surface hover:bg-brand-dark flex items-center justify-center gap-2 text-xs font-black shadow-xs active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <UserRound size={15} />
              <span>{lt(locale, { fa: 'ورود یا ثبت‌نام در فیروزو', en: 'Sign In / Register', ar: 'تسجيل الدخول / التسجيل', zh: '登录 / 注册', ru: 'Вход / Регистрация' })}</span>
            </Link>
          </div>
        )}

        {/* Quick Country & Locale Switcher in Drawer */}
        <div className="px-4 py-3 border-b border-line/60 bg-paper flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[10.5px] font-black text-sub block mb-1">
              {lt(locale, { fa: 'کشور مقصد سفر:', en: 'Destination:', ar: 'البلد الوجهة:', zh: '目的地国家：', ru: 'Направление:' })}
            </span>
            <CountrySwitcher showFullName />
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
                      <ChevronRight size={15} className="text-sub/60 shrink-0 rtl:rotate-180" aria-hidden="true" />
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
            {lt(locale, {
              fa: 'پلتفرم سفر هوشمند فیروزو · پشتیبانی ۲۴/۷',
              en: 'Firuzo Smart Travel Platform · 24/7 Support',
              ar: 'منصة فيروزو للسفر الذكي · دعم ٢٤/٧',
              zh: 'Firuzo 智能旅游平台 · 24/7 全天候支持',
              ru: 'Платформа умных путешествий Firuzo · Поддержка 24/7',
            })}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <header className="sticky top-0 z-[80] bg-surface/90 backdrop-blur-md border-b border-line/80 pt-[env(safe-area-inset-top,0px)]">
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8 h-16 flex items-center justify-between gap-2 md:gap-3 2xl:gap-4">
        {/* Brand Logo & Switchers */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <Logo size="sm" hideTextOnMobile />

          {/* در موبایل (< sm) جا برای این دو نمی‌ماند و گروه اکشن‌ها بیرون از
              viewport می‌افتد؛ نسخه کامل این دو در drawer منو موجود است. */}
          <div className="hidden sm:flex items-center">
            <CountrySwitcher />
          </div>
          <div className="hidden sm:flex items-center">
            <LocaleSwitcher />
          </div>
        </div>

        {/* Desktop Navigation */}
        <DesktopNav />

        {/* Search, User Account & Mobile Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Dark / Light Mode Toggle */}
          <ThemeToggle />

          {/* Quick Command Search Button (Ctrl+K / Cmd+K) */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Search or jump to (Ctrl+K)"
            className="hidden sm:inline-flex items-center justify-center gap-1.5 h-10 px-2.5 2xl:px-3 rounded-xl bg-soft/80 hover:bg-soft border border-line/80 text-sub hover:text-ink text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-2xs cursor-pointer"
          >
            <Search size={15} className="text-brand-dark" aria-hidden="true" />
            <kbd className="hidden 2xl:inline-block px-1.5 py-0.5 rounded bg-surface border border-line text-[10px] font-mono font-black text-sub">
              ⌘K
            </kbd>
          </button>

          <UserAccountMenu />

          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Search"
            className="sm:hidden w-11 h-11 grid place-items-center rounded-2xl text-ink hover:bg-soft active:scale-95 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <Search size={19} />
          </button>

          {/* Mobile Menu Button with 44px touch target */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? ct('aria.closeMenu') : ct('aria.openMenu')}
            aria-expanded={mobileMenuOpen}
            className="xl:hidden w-11 h-11 grid place-items-center rounded-2xl text-ink hover:bg-soft active:scale-95 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Render Mobile Drawer into document.body to escape header's backdrop-filter stacking context */}
      {mounted && typeof document !== 'undefined' && drawerContent && createPortal(drawerContent, document.body)}
    </header>
  );
}
