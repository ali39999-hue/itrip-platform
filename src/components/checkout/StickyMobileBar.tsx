'use client';

import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

/**
 * Sticky mobile conversion bar (UX benchmark: sticky CTA lifts booking
 * conversion; guest-checkout research shows the total must stay visible).
 *
 * - Fixed above the bottom nav on mobile only (`lg:hidden`), safe-area aware.
 * - Shows the payable total at all times — never a blind "Pay" button.
 * - Works as a form submitter (`formId`) or a plain action (`onCta`).
 * - `motion` entrance + `prefers-reduced-motion` respected by the library.
 */
interface StickyMobileBarProps {
  totalCaption: string;
  total: string;
  ctaLabel: string;
  formId?: string;
  onCta?: () => void;
  pending?: boolean;
  pendingLabel?: string;
  disabled?: boolean;
}

export function StickyMobileBar({
  totalCaption,
  total,
  ctaLabel,
  formId,
  onCta,
  pending = false,
  pendingLabel,
  disabled = false,
}: StickyMobileBarProps) {
  const isDisabled = disabled || pending;
  const className =
    'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-action px-6 text-sm font-black text-ink shadow-md transition hover:bg-action-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

  const inner = pending ? (
    <>
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      <span>{pendingLabel ?? ctaLabel}</span>
    </>
  ) : (
    <span>{ctaLabel}</span>
  );

  return (
    <motion.div
      initial={{ y: 48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className="fixed inset-x-0 z-40 px-4 lg:hidden"
      style={{ bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="glass-card flex items-center gap-3 rounded-2xl p-3">
        <div className="min-w-0 flex-1 ps-1">
          <span className="block text-[10px] font-bold text-sub">{totalCaption}</span>
          <span className="num block truncate font-mono text-base font-black text-price" aria-live="polite">
            {total}
          </span>
        </div>
        {formId ? (
          <button type="submit" form={formId} disabled={isDisabled} className={className}>
            {inner}
          </button>
        ) : (
          <button type="button" onClick={onCta} disabled={isDisabled} className={className}>
            {inner}
          </button>
        )}
      </div>
    </motion.div>
  );
}
