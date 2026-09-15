'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Link } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { UserRound, Headset, Sparkles, ShieldCheck } from 'lucide-react';
import { lt } from '@/lib/lt';

export function UserAccountMenu() {
  const locale = useLocale();
  const { user } = useAuthStore();
  const t = useTranslations('Nav');
  const ct = useTranslations('Common');

  const isAdminOrPersonnel = Boolean(
    user?.role && ['admin', 'ADMIN', 'SUPER_ADMIN', 'OPS', 'FINANCE', 'OPERATOR'].includes(user.role)
  );

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {/* ERP Direct Link for Admins & Personnel */}
      {isAdminOrPersonnel && (
        <Link
          href="/admin"
          aria-label={lt(locale, { fa: 'سامانه مدیریت (ERP)', en: 'Admin ERP Panel', ar: 'لوحة الإدارة', zh: '管理后台', ru: 'Панель ERP' })}
          className="min-h-[44px] px-3 py-1 rounded-full bg-amber-500/20 dark:bg-amber-400/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30 text-[12px] font-black tracking-tight transition flex items-center gap-1.5 shrink-0 shadow-2xs"
        >
          <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
          <span className="hidden min-[480px]:inline">{lt(locale, { fa: 'پنل ادمین', en: 'ERP Admin', ar: 'الإدارة', zh: '管理', ru: 'ERP' })}</span>
        </Link>
      )}

      {/* Support Icon Link */}
      <Link
        href="/support"
        aria-label={ct('aria.24hSupport')}
        className="hidden 2xl:grid h-11 w-11 place-items-center rounded-full bg-white/60 dark:bg-white/[0.07] backdrop-blur-md border border-white/40 dark:border-white/10 text-sub hover:text-ink transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none shrink-0"
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
          className="min-h-[44px] min-w-[44px] justify-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand text-white hover:bg-brand-dark dark:bg-brand/20 dark:text-brand dark:border dark:border-brand/40 dark:hover:bg-brand/30 text-[12px] font-bold tracking-tight shadow-sm transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none shrink-0"
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
          className="min-h-[44px] min-w-[44px] justify-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-brand/15 backdrop-blur-md border border-white/50 dark:border-brand/30 text-ink dark:text-brand hover:bg-white/85 dark:hover:bg-brand/25 text-[12px] font-bold tracking-tight shadow-[0_1px_2px_rgba(5,63,62,0.06)] transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:scale-[0.98] shrink-0"
        >
          <UserRound size={13} className="text-sub dark:text-brand" />
          <span className="hidden min-[420px]:inline">{t('signin')}</span>
        </Link>
      )}
    </div>
  );
}
