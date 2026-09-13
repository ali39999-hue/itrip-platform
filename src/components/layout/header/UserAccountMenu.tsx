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
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {/* ERP is reachable via the account page, nav dropdown and mobile drawer —
          a standalone header badge overcrowds the bar when signed in. */}

      {/* Support Icon Link */}
      <Link
        href="/support"
        aria-label={ct('aria.24hSupport')}
        className="hidden 2xl:grid w-8 h-8 place-items-center rounded-full bg-white/60 dark:bg-white/[0.07] backdrop-blur-md border border-white/40 dark:border-white/10 text-sub hover:text-ink transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none shrink-0"
      >
        <Headset size={15} />
      </Link>

      {/* Plan Button — glass pill */}
      <Link
        href="/plan"
        className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-white/[0.07] backdrop-blur-md border border-white/50 dark:border-white/10 text-ink hover:bg-white/85 dark:hover:bg-white/[0.12] text-[12px] font-bold tracking-tight transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none shadow-[0_1px_2px_rgba(5,63,62,0.06)]"
      >
        <Sparkles size={12} className="text-brand-dark" />
        <span>{t('plan')}</span>
      </Link>

      {/* Auth / Account CTA */}
      {user ? (
        <Link
          href="/account"
          title={(locale === 'fa' ? user.firstNameFa : (user.firstNameEn || user.firstNameFa)) || user.phone}
          aria-label={t('account')}
          className="min-h-[32px] min-w-[32px] justify-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand text-white hover:bg-brand-dark dark:bg-brand/20 dark:text-brand dark:border dark:border-brand/40 dark:hover:bg-brand/30 text-[12px] font-bold tracking-tight shadow-sm transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none shrink-0"
        >
          <UserRound size={13} />
          {/* Name pill where room exists; icon-only at 2xl where the bar is fullest */}
          <span className="hidden min-[420px]:inline 2xl:hidden truncate max-w-[90px] sm:max-w-none">
            {(locale === 'fa' ? user.firstNameFa : (user.firstNameEn || user.firstNameFa)) || user.phone}
          </span>
        </Link>
      ) : (
        <Link
          href="/auth"
          aria-label={t('signin')}
          className="min-h-[32px] min-w-[32px] justify-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-brand/15 backdrop-blur-md border border-white/50 dark:border-brand/30 text-ink dark:text-brand hover:bg-white/85 dark:hover:bg-brand/25 text-[12px] font-bold tracking-tight shadow-[0_1px_2px_rgba(5,63,62,0.06)] transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:scale-[0.98] shrink-0"
        >
          <UserRound size={13} className="text-sub dark:text-brand" />
          <span className="hidden min-[420px]:inline">{t('signin')}</span>
        </Link>
      )}
    </div>
  );
}
