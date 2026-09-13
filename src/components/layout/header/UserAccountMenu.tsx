'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Link } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { UserRound, Headset, Sparkles } from 'lucide-react';

export function UserAccountMenu() {
  const locale = useLocale();
  const { user } = useAuthStore();
  const t = useTranslations('Nav');
  const ct = useTranslations('Common');

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* ERP is reachable via the account page, nav dropdown and mobile drawer —
          a standalone header badge overcrowds the bar when signed in. */}

      {/* Support Icon Link */}
      <Link
        href="/support"
        aria-label={ct('aria.24hSupport')}
        className="hidden 2xl:grid w-8 h-8 place-items-center rounded-full text-sub hover:text-brand-dark hover:bg-soft transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none shrink-0"
      >
        <Headset size={16} />
      </Link>

      {/* Plan Button */}
      <Link
        href="/plan"
        className="hidden 2xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-brand/40 text-brand-dark hover:bg-mint text-[12px] font-black transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <Sparkles size={13} className="text-brand" />
        <span>{t('plan')}</span>
      </Link>

      {/* Auth / Account CTA */}
      {user ? (
        <Link
          href="/account"
          title={(locale === 'fa' ? user.firstNameFa : (user.firstNameEn || user.firstNameFa)) || user.phone}
          aria-label={t('account')}
          className="min-h-[32px] min-w-[32px] justify-center inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-brand-dark text-surface hover:bg-deep text-[11px] sm:text-[12px] font-black shadow-sm transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none shrink-0"
        >
          <UserRound size={14} />
          {/* Name pill where room exists; icon-only at 2xl where the bar is fullest */}
          <span className="hidden min-[420px]:inline 2xl:hidden truncate max-w-[90px] sm:max-w-none">
            {(locale === 'fa' ? user.firstNameFa : (user.firstNameEn || user.firstNameFa)) || user.phone}
          </span>
        </Link>
      ) : (
        <Link
          href="/auth"
          className="min-h-[32px] min-w-[32px] justify-center inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full border border-brand/50 text-brand-dark hover:bg-mint text-[11px] sm:text-[12px] font-black shadow-2xs transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:scale-95 shrink-0"
        >
          <UserRound size={14} />
          <span className="hidden min-[420px]:inline">{t('signin')}</span>
        </Link>
      )}
    </div>
  );
}
