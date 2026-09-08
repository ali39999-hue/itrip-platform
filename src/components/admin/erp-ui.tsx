'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Page header — single consistent hero for every ERP module           */
/* ------------------------------------------------------------------ */

export function ErpPageHeader({
  eyebrow,
  title,
  description,
  icon,
  meta,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-elev-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(420px 160px at 12% 0%, rgba(0,169,165,0.12), transparent 65%), radial-gradient(380px 150px at 88% 10%, rgba(240,166,42,0.10), transparent 60%)',
        }}
      />
      <div className="relative flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3.5 min-w-0">
          {icon && (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-deep text-mint-bright shadow-elev-1">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-brand-dark">
                {eyebrow}
              </p>
            )}
            <h1 className="truncate text-xl font-black text-ink sm:text-2xl">{title}</h1>
            {description && (
              <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-sub sm:text-[13px]">
                {description}
              </p>
            )}
            {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

type Tone = 'brand' | 'gold' | 'rose' | 'violet' | 'sky' | 'green' | 'neutral';

const TONE_TILE: Record<Tone, string> = {
  brand: 'bg-brand/12 text-brand-dark',
  gold: 'bg-gold-soft text-price',
  rose: 'bg-rose-warm/10 text-rose-warm',
  violet: 'bg-tour/10 text-tour',
  sky: 'bg-flight/10 text-flight',
  green: 'bg-success/10 text-success',
  neutral: 'bg-soft text-sub',
};

export function ErpStatCard({
  icon,
  label,
  value,
  hint,
  tone = 'brand',
  href,
  dir,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}) {
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', TONE_TILE[tone])}>
          {icon}
        </span>
        <span className="min-w-0 truncate text-[11px] font-bold text-sub">{label}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="num min-w-0 truncate text-xl font-black text-ink" dir={dir ?? 'auto'}>
          {value}
        </p>
        {hint && (
          <span className="shrink-0 text-[11px] font-black text-sub/80">{hint}</span>
        )}
      </div>
    </>
  );

  const cls =
    'group relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-elev-1 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

  if (href) {
    return (
      <Link href={href} className={cn(cls, 'block')}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

/* ------------------------------------------------------------------ */
/* Section card                                                        */
/* ------------------------------------------------------------------ */

export function ErpSectionCard({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-line bg-surface shadow-elev-1',
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-soft text-brand-dark">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {typeof title === 'string' ? (
                <h2 className="truncate text-[15px] font-black text-ink">{title}</h2>
              ) : (
                title
              )}
              {subtitle && <p className="mt-0.5 text-[11px] font-medium text-sub">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

const BADGE_TONE: Record<Tone, string> = {
  brand: 'bg-mint text-brand-dark border-brand/25',
  gold: 'bg-gold-soft text-price border-gold/30',
  rose: 'bg-rose-warm/10 text-rose-warm border-rose-warm/25',
  violet: 'bg-tour/10 text-tour border-tour/25',
  sky: 'bg-flight/10 text-flight border-flight/25',
  green: 'bg-success/10 text-success border-success/25',
  neutral: 'bg-soft text-sub border-line',
};

export function ErpBadge({
  tone = 'neutral',
  children,
  dot = false,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-nowrap',
        BADGE_TONE[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function ErpEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-soft text-sub/60">
        {icon}
      </span>
      <h3 className="mt-4 text-sm font-black text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-xs font-medium leading-relaxed text-sub">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alert                                                               */
/* ------------------------------------------------------------------ */

export function ErpAlert({
  tone = 'neutral',
  children,
  onDismiss,
  dismissLabel = 'Dismiss',
}: {
  tone?: 'success' | 'error' | 'warn' | 'info' | 'neutral';
  children: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  const map = {
    success: 'border-success/25 bg-success/8 text-ink',
    error: 'border-destructive/25 bg-destructive/8 text-ink',
    warn: 'border-gold/30 bg-gold-soft/60 text-ink',
    info: 'border-brand/25 bg-brand/8 text-ink',
    neutral: 'border-line bg-soft/60 text-ink',
  } as const;
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'error'
        ? AlertCircle
        : tone === 'warn'
          ? TriangleAlert
          : Info;
  const iconColor =
    tone === 'success'
      ? 'text-success'
      : tone === 'error'
        ? 'text-destructive'
        : tone === 'warn'
          ? 'text-price'
          : tone === 'info'
            ? 'text-brand-dark'
            : 'text-sub';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-bold',
        map[tone],
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon size={17} className={cn('shrink-0', iconColor)} aria-hidden="true" />
        <span className="min-w-0">{children}</span>
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sub transition hover:bg-surface hover:text-ink"
        >
          {dismissLabel}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal — accessible, RTL-aware, escape + backdrop close              */
/* ------------------------------------------------------------------ */

export function ErpModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fade-soft fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-deep/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'sheet-up my-8 w-full overflow-hidden rounded-3xl border border-line bg-surface shadow-elev-3',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-black text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs font-medium text-sub">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft text-sub transition hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-soft/40 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented tabs                                                      */
/* ------------------------------------------------------------------ */

export function ErpTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel ?? 'Tabs'}
      className="flex items-center gap-2 overflow-x-auto border-b border-line pb-3 scrollbar-none"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-black whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              active
                ? 'bg-deep text-surface shadow-elev-1'
                : 'border border-line bg-surface text-sub hover:border-brand/40 hover:text-ink',
            )}
          >
            {o.icon}
            <span>{o.label}</span>
            {typeof o.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-black',
                  active ? 'bg-surface/20 text-surface' : 'bg-soft text-ink',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hint — friendly glossary popover for jargon (SLA, Outbox, …)        */
/* Works on hover (desktop) and tap (touch): button toggles a card.    */
/* ------------------------------------------------------------------ */

export function ErpHint({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  return (
    <span ref={boxRef} className="relative inline-flex items-center align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        title={label}
        className="grid h-5 w-5 place-items-center rounded-full bg-soft text-[11px] font-black text-sub transition hover:bg-mint hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        ؟
      </button>
      {open && (
        <span
          role="note"
          className="absolute bottom-full z-50 mb-2 w-56 rounded-xl border border-line bg-deep p-3 text-start text-[11px] font-medium leading-relaxed text-surface shadow-elev-2 fade-soft start-0"
        >
          <span className="mb-1 block font-black text-mint-bright">{label}</span>
          {children}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton rows                                                       */
/* ------------------------------------------------------------------ */

export function ErpSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-2xl bg-soft', className)} />;
}

export const erpFieldCls =
  'w-full min-h-11 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] font-medium text-ink placeholder:text-sub/60 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25';

export const erpLabelCls = 'mb-1.5 block text-xs font-black text-ink';

export const erpPrimaryBtnCls =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-deep px-4 py-2.5 text-xs font-black text-surface shadow-elev-1 transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98] disabled:opacity-50';

export const erpGhostBtnCls =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-black text-sub transition hover:border-brand/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]';

export const erpDangerBtnCls =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-warm px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-warm active:scale-[0.98] disabled:opacity-50';
