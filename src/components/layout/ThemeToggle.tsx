'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export const THEME_STORAGE_KEY = 'firuzo-theme';

/**
 * سوییچ حالت روشن/تیره — کلاس `.dark` را روی <html> می‌چرخاند و انتخاب را
 * در localStorage نگه می‌دارد. اعمال اولیه (بدون فلش) توسط اسکریپت inline
 * در head انجام می‌شود؛ این دکمه فقط وضعیت جاری را می‌خواند و برمی‌گرداند.
 */
export function ThemeToggle() {
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    } catch { /* private mode */ }
  }

  const label = dark
    ? lt(locale, {
        fa: 'فعال‌سازی حالت روشن', en: 'Switch to light mode',
        ar: 'التبديل إلى الوضع الفاتح', zh: '切换到浅色模式', ru: 'Включить светлую тему',
      })
    : lt(locale, {
        fa: 'فعال‌سازی حالت تیره', en: 'Switch to dark mode',
        ar: 'التبديل إلى الوضع الداكن', zh: '切换到深色模式', ru: 'Включить тёмную тему',
      });

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={mounted ? dark : undefined}
      className="w-11 h-11 grid place-items-center rounded-2xl text-ink hover:bg-soft active:scale-95 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer"
    >
      {/* دو مرحله‌ای تا SSR و کلاینت هم‌نظر بمانند (اسکریپت head ممکن است قبل از هیدریشن .dark گذاشته باشد) */}
      {mounted ? (
        dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />
      ) : (
        <Moon size={19} className="opacity-0" aria-hidden="true" />
      )}
    </button>
  );
}
