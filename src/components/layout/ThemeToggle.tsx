'use client';

import { useEffect, useRef, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export const THEME_STORAGE_KEY = 'firuzo-theme';
export type Theme = 'light' | 'dark' | 'system';

function getSystemIsDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'system' ? getSystemIsDark() : theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
}

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'dark' || v === 'light' || v === 'system') return v;
    // legacy: null => follow system (layout inline script does the same)
    if (v === null) return 'system';
    return 'system';
  } catch {
    return 'system';
  }
}

/**
 * تگل تم با منوی هوور — سه حالت: روشن / تیره / هماهنگ با سیستم.
 * روی دسکتاپ با hover باز می‌شود، روی موبایل با کلیک.
 * در حالت system به prefers-color-scheme گوش می‌دهد و با تغییر تم OS همگام می‌شود.
 */
export function ThemeToggle() {
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  // mount: restore theme + start system listener
  useEffect(() => {
    setMounted(true);
    const stored = readStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  // when theme === system, react to OS changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    // modern browsers
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari <14 fallback
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [theme]);

  // close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function persist(next: Theme) {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
    setOpen(false);
  }

  function handleEnter() {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setOpen(true);
  }
  function handleLeave() {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120) as unknown as number;
  }

  const ariaLabel = lt(locale, {
    fa: 'تغییر حالت نمایش',
    en: 'Change appearance',
    ar: 'تغيير المظهر',
    zh: '切换外观',
    ru: 'Изменить тему',
  });

  // icon reflects current effective theme
  const CurrentIcon = !mounted
    ? Moon
    : theme === 'light'
      ? Sun
      : theme === 'dark'
        ? Moon
        : Monitor;

  const labels: Record<Theme, string> = {
    light: lt(locale, { fa: 'روشن', en: 'Light', ar: 'فاتح', zh: '浅色', ru: 'Светлая' }),
    dark: lt(locale, { fa: 'تیره', en: 'Dark', ar: 'داكن', zh: '深色', ru: 'Тёмная' }),
    system: lt(locale, { fa: 'سیستم', en: 'System', ar: 'النظام', zh: '跟随系统', ru: 'Система' }),
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        className="w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-ink hover:bg-soft active:scale-95 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer shrink-0"
      >
        <CurrentIcon size={19} aria-hidden="true" className={mounted ? '' : 'opacity-0'} />
      </button>

      {/* dropdown: hover on desktop, click on mobile — animated */}
      <div
        role="menu"
        aria-label={ariaLabel}
        className={`absolute top-[calc(100%+8px)] end-0 z-[120] min-w-[148px] p-1.5 rounded-2xl border border-line bg-surface shadow-elev-3 transition-all duration-150 origin-top ${
          open ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
        }`}
      >
        {(['light', 'dark', 'system'] as Theme[]).map((t) => {
          const active = theme === t;
          const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
          return (
            <button
              key={t}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => persist(t)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                active ? 'bg-mint text-brand-dark' : 'text-ink hover:bg-soft'
              }`}
            >
              <Icon size={15} className="shrink-0" aria-hidden="true" />
              <span className="flex-1 text-start">{labels[t]}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-brand-dark shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
        {/* hint when system */}
        <p className="px-2 pt-1.5 pb-0.5 text-[10.5px] font-medium leading-3 text-sub text-center">
          {lt(locale, {
            fa: 'در حالت «سیستم» تم دستگاه دنبال می‌شود',
            en: 'System follows your device setting',
            ar: 'وضع النظام يتبع إعداد جهازك',
            zh: '跟随系统将同步设备设置',
            ru: 'Системная тема повторяет настройки устройства',
          })}
        </p>
      </div>
    </div>
  );
}
