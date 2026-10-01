'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { num } from '@/lib/format';

/**
 * BizHeader — هدر اختصاصی بخش فیروزو بیزنس.
 * لوگوی فیروزو + بدج «بیزنس»؛ در صفحات داخل مسیر رزرو (requestCode داده‌شده)
 * به‌جای منو شماره درخواست نمایش داده می‌شود.
 * زیر هدر سراسری سایت قرار می‌گیرد و جای هدر اصلی را نمی‌گیرد.
 */
export function BizHeader({ requestCode }: { requestCode?: string | null }) {
  const t = useTranslations('Business.header');

  return (
    <header className="fz-header">
      <div className="fz-container fz-header__in">
        <div className="fz-row" style={{ gap: 12, justifyContent: 'flex-start' }}>
          <Link className="fz-logo" href="/business" aria-label={t('homeAria')}>
            <span className="fz-logo__mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12l4 6-10 12L2 9z" />
                <path d="M2 9h20" />
              </svg>
            </span>
            <span className="fz-logo__word">فیروزو</span>
          </Link>
          <span className="fz-badge fz-badge--biz">{t('badge')}</span>
        </div>

        {requestCode ? (
          <div className="fz-header__meta">
            <span>{t('requestCode')}</span>
            <span className="fz-strong fz-num" style={{ color: 'var(--fz-text)' }} dir="ltr">
              {requestCode}
            </span>
          </div>
        ) : (
          <nav className="fz-nav" aria-label={t('navAria')}>
            <a href="#biz-packages">{t('navPackages')}</a>
            <a href="#biz-how">{t('navHow')}</a>
            <a href="#biz-support">{t('navSupport')}</a>
          </nav>
        )}

        {!requestCode && (
          <div className="fz-header__meta fz-faint">{t('tagline')}</div>
        )}
      </div>
    </header>
  );
}

/** ارقام فارسی/لوکال برای استپر شش‌مرحله‌ای — ۱۲۳ در fa، 123 در سایر لوکال‌ها */
export function localizedDigit(n: number, locale: string): string {
  return num(n, locale);
}
