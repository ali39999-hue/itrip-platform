'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Globe, ChevronDown, Check } from 'lucide-react';

export const LOCALES = [
  { id: 'fa', label: 'فارسی', dir: 'RTL' },
  { id: 'en', label: 'English', dir: 'LTR' },
  { id: 'ar', label: 'العربية', dir: 'RTL' },
  { id: 'zh', label: '中文', dir: 'LTR' },
  { id: 'ru', label: 'Русский', dir: 'LTR' },
] as const;

function persistLocaleCookie(nextLocale: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

export function LocaleSwitcher() {
  const currentLocale = useLocale();
  const t = useTranslations('Common.aria');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cur = LOCALES.find((l) => l.id === currentLocale) || LOCALES[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', onDoc);
      return () => document.removeEventListener('pointerdown', onDoc);
    }
  }, [open]);

  function switchLocale(nextLocale: string) {
    const targetPath = pathname || '/';
    const qs = searchParams ? searchParams.toString() : '';
    const url = qs ? `${targetPath}?${qs}` : targetPath;

    persistLocaleCookie(nextLocale);

    router.replace(url, { locale: nextLocale });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('language')}
        className="min-h-[38px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[12px] sm:text-[13px] font-bold text-ink hover:bg-soft transition border border-line/80 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <Globe size={14} className="text-brand-dark shrink-0" />
        <span className="truncate max-w-[70px] sm:max-w-none">{cur.label}</span>
        <ChevronDown size={12} className={`text-sub shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+8px)] end-0 z-[100] w-40 sm:w-44 p-1.5 border border-line rounded-xl bg-surface shadow-elev-3 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {LOCALES.map((l) => (
            <button
              key={l.id}
              onClick={() => switchLocale(l.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] sm:text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                l.id === currentLocale ? 'bg-mint text-brand-dark' : 'text-ink hover:bg-soft'
              }`}
            >
              <span>{l.label}</span>
              {l.id === currentLocale && <Check size={13} className="text-brand-dark shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
