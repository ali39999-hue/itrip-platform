'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { ArrowLeft, ArrowRight, Search, Headphones } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { useLocale } from 'next-intl';

export interface MobileHeaderProps {
  /** Optional title to display instead of logo */
  title?: string;
  /** Optional subtitle or route capsule (e.g. "تهران به مشهد • ۲۴ اسفند") */
  subtitle?: string;
  /** Whether to show back navigation button */
  showBack?: boolean;
  /** Custom back action (defaults to router.back()) */
  onBack?: () => void;
  /** Search button click handler */
  onSearchClick?: () => void;
  /** Support quick dial click handler */
  onSupportClick?: () => void;
  /** Custom right/end action buttons */
  actions?: React.ReactNode;
  /** Sticky header position */
  sticky?: boolean;
  /** Custom class */
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  onSearchClick,
  onSupportClick,
  actions,
  sticky = true,
  className = '',
}: MobileHeaderProps) {
  const router = useRouter();
  const locale = useLocale();
  const isRtl = ['fa', 'ar'].includes(locale);

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <header
      className={`${
        sticky ? 'sticky top-0' : 'relative'
      } z-[75] w-full border-b border-line/70 bg-surface/95 backdrop-blur-xl transition-shadow lg:hidden ${className}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 6px)' }}
    >
      <div className="flex h-14 items-center justify-between px-3.5 gap-2">
        {/* Leading: Back button or Logo */}
        <div className="flex items-center gap-2 min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-xl border border-line bg-soft/60 hover:bg-soft text-ink grid place-items-center active:scale-95 transition"
              aria-label="بازگشت به صفحه قبل"
            >
              <BackIcon size={20} />
            </button>
          ) : (
            <Logo size="sm" />
          )}

          {/* Title or Route Capsule */}
          {title ? (
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-sm font-black text-ink truncate leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-[10.5px] font-bold text-sub truncate leading-tight mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          ) : subtitle ? (
            <button
              type="button"
              onClick={onSearchClick}
              className="px-3 py-1.5 rounded-full bg-soft border border-line flex items-center gap-1.5 text-start active:scale-95 transition min-w-0"
            >
              <Search size={13} className="text-brand shrink-0" />
              <span className="text-xs font-black text-ink truncate max-w-[170px] sm:max-w-xs">
                {subtitle}
              </span>
            </button>
          ) : null}
        </div>

        {/* Trailing Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}

          {onSearchClick && !subtitle && (
            <button
              type="button"
              onClick={onSearchClick}
              className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-xl border border-line bg-soft/60 hover:bg-soft text-ink grid place-items-center active:scale-95 transition"
              aria-label="جستجو"
            >
              <Search size={18} />
            </button>
          )}

          {onSupportClick && (
            <button
              type="button"
              onClick={onSupportClick}
              className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-xl border border-line bg-soft/60 hover:bg-soft text-brand-dark grid place-items-center active:scale-95 transition"
              aria-label="پشتیبانی ۲۴ ساعته"
            >
              <Headphones size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
