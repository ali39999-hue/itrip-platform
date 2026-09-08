'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react';

/**
 * Reusable result-state primitive (UX skill: loading / empty / error /
 * unavailable states). Gives every search list the same accessible,
 * touch-friendly states instead of one-off markup per page.
 *
 * Copy comes from `Common.states` so all 5 locales stay covered;
 * pages may override title/description for context-specific guidance.
 */
export type ResultStateVariant = 'loading' | 'empty' | 'error' | 'unavailable';

interface ResultStateProps {
  variant: ResultStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Number of skeleton cards for the loading variant. */
  skeletonCount?: number;
}

export function ResultState({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  skeletonCount = 3,
}: ResultStateProps) {
  const t = useTranslations('Common.states');

  if (variant === 'loading') {
    return (
      <div role="status" aria-live="polite" aria-label={t('loading')} className="flex flex-col gap-4">
        <span className="sr-only">{t('loading')}</span>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-44 rounded-2xl border border-line bg-surface p-6 animate-pulse"
          >
            <div className="h-4 w-1/3 rounded-lg bg-soft" />
            <div className="mt-4 h-3 w-2/3 rounded-lg bg-soft" />
            <div className="mt-2 h-3 w-1/2 rounded-lg bg-soft" />
          </div>
        ))}
      </div>
    );
  }

  const isError = variant === 'error' || variant === 'unavailable';
  const Icon = isError ? AlertTriangle : Inbox;
  const defaultTitle = isError ? t('errorTitle') : t('emptyTitle');

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className="rounded-2xl border border-line bg-surface p-10 text-center shadow-sm"
    >
      <div
        aria-hidden="true"
        className={`mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl ${
          isError ? 'bg-destructive/10 text-destructive' : 'bg-soft text-sub'
        }`}
      >
        <Icon size={24} />
      </div>
      <h3 className="mb-1 text-base font-black text-ink">{title ?? defaultTitle}</h3>
      {description && (
        <p className="mx-auto mb-4 max-w-md text-xs font-bold leading-relaxed text-sub">
          {description}
        </p>
      )}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 text-xs font-black text-white transition hover:bg-brand-dark active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>{actionLabel ?? t('retry')}</span>
        </button>
      )}
    </div>
  );
}
