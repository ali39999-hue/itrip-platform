'use client';

import React from 'react';
import { Loader2, ChevronUp } from 'lucide-react';
import { num } from '@/lib/format';

export interface StickyCTAProps {
  /** Primary action button label (e.g. "ادامه و تکمیل رزرو", "پرداخت نهایی") */
  ctaLabel: string;
  /** Primary action callback */
  onClick: () => void;
  /** Main price value (number in Toman/IRR or formatted string) */
  price?: number | string;
  /** Currency label (e.g. "تومان", "IRR", "USD") */
  currencyLabel?: string;
  /** Label above or beside price (e.g. "مبلغ قابل پرداخت", "قیمت هر شب") */
  priceLabel?: string;
  /** Sub-caption under price (e.g. "شامل مالیات و عوارض") */
  priceSubtitle?: string;
  /** Optional clickable price details sheet trigger */
  onPriceDetailsClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading spinner state */
  loading?: boolean;
  /** Badge text (e.g. "تضمین نرخ", "فوری") */
  badge?: string;
  /** Secondary action button (e.g. "بازگشت", "قوانین استرداد") */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional custom class */
  className?: string;
}

/**
 * Mobile-first sticky bottom action bar.
 * Designed specifically for high conversion and one-thumb usability
 * on mobile checkouts, hotel room reservation, and flight booking flows.
 */
export function StickyCTA({
  ctaLabel,
  onClick,
  price,
  currencyLabel = 'تومان',
  priceLabel = 'مبلغ قابل پرداخت',
  priceSubtitle,
  onPriceDetailsClick,
  disabled = false,
  loading = false,
  badge,
  secondaryAction,
  className = '',
}: StickyCTAProps) {
  const formattedPrice =
    typeof price === 'number' ? num(price, 'fa') : price !== undefined ? String(price) : null;

  return (
    <aside
      aria-label="نوار رزرو و پرداخت سریع"
      className={`fixed inset-x-0 bottom-0 z-[80] border-t border-line/80 bg-surface/95 backdrop-blur-xl shadow-[0_-10px_35px_rgba(5,63,62,.10)] lg:hidden transition-all duration-200 ${className}`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
    >
      <div className="max-w-lg mx-auto px-4 pt-3 pb-1 flex items-center justify-between gap-3">
        {/* Left: Price summary (or secondary action) */}
        {formattedPrice ? (
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {badge && (
              <span className="self-start text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 mb-0.5">
                {badge}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-ink tracking-tight">
                {formattedPrice}
              </span>
              <span className="text-[11px] font-black text-sub">{currencyLabel}</span>
            </div>
            {onPriceDetailsClick ? (
              <button
                type="button"
                onClick={onPriceDetailsClick}
                className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-brand hover:text-brand-dark active:underline text-start"
              >
                <span>{priceLabel} (جزئیات)</span>
                <ChevronUp size={12} aria-hidden="true" />
              </button>
            ) : (
              <span className="text-[10px] font-bold text-sub/80 truncate">
                {priceSubtitle || priceLabel}
              </span>
            )}
          </div>
        ) : secondaryAction ? (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="min-h-[48px] px-3 rounded-2xl border border-line bg-soft/60 text-sub font-black text-xs hover:text-ink active:scale-95 transition"
          >
            {secondaryAction.label}
          </button>
        ) : null}

        {/* Right: Primary Call to Action */}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || loading}
          className={`min-h-[50px] px-6 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
            disabled
              ? 'bg-line/70 text-sub/50 cursor-not-allowed shadow-none'
              : 'bg-action hover:bg-action-hover active:bg-action-active text-ink active:scale-[0.98] shadow-[0_6px_20px_rgba(240,166,42,0.35)]'
          } ${formattedPrice ? 'shrink-0' : 'w-full'}`}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span>در حال پردازش...</span>
            </>
          ) : (
            <span>{ctaLabel}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
