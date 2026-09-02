'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { UserRound, Headset, Sparkles, ShieldCheck } from 'lucide-react';

export function UserAccountMenu() {
  const { user } = useAuthStore();
  const t = useTranslations('Nav');
  const ct = useTranslations('Common');

  return (
    <div className="flex items-center gap-2">
      {/* Admin ERP Quick Badge */}
      {user?.role === 'admin' && (
        <Link
          href="/admin"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint text-brand-dark hover:bg-brand hover:text-surface text-[12px] font-black border border-brand/20 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <ShieldCheck size={14} />
          <span>ERP</span>
        </Link>
      )}

      {/* Support Icon Link */}
      <Link
        href="/support"
        aria-label={ct('aria.24hSupport')}
        className="hidden sm:grid w-9 h-9 place-items-center rounded-full text-sub hover:text-brand-dark hover:bg-soft transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <Headset size={18} />
      </Link>

      {/* Plan Button */}
      <Link
        href="/plan"
        className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-brand/40 text-brand-dark hover:bg-mint text-[13px] font-black transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <Sparkles size={14} className="text-brand" />
        <span>{t('plan')}</span>
      </Link>

      {/* Auth / Account CTA */}
      {user ? (
        <Link
          href="/account"
          className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand text-surface hover:bg-brand-dark text-[13px] font-black shadow-sm transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <UserRound size={15} />
          <span>{user.firstNameFa || user.phone}</span>
        </Link>
      ) : (
        <Link
          href="/auth"
          className="min-h-[38px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-action hover:bg-action-hover text-[#14201f] text-[13px] font-black shadow-sm transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:scale-95"
        >
          <UserRound size={15} />
          <span>{t('signin')}</span>
        </Link>
      )}
    </div>
  );
}
