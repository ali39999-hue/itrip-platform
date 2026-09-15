'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { LOCALE_FONT_VAR } from '@/lib/fonts';

export function LocaleHtmlSync() {
  const locale = useLocale();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const isRtl = ['fa', 'ar'].includes(locale);
    const dir = isRtl ? 'rtl' : 'ltr';

    if (document.documentElement.dir !== dir) {
      document.documentElement.dir = dir;
    }
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }

    const fontVar = LOCALE_FONT_VAR[locale] ?? LOCALE_FONT_VAR.fa;
    if (fontVar) {
      document.documentElement.style.setProperty('--font-app-sans', fontVar.sans);
      document.documentElement.style.setProperty('--font-app-heading', fontVar.heading);
    }
  }, [locale]);

  return null;
}
