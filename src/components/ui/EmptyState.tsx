import * as React from 'react';
import { LucideIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon | React.ComponentType<{ className?: string; size?: number | string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Search,
  title,
  description,
  actionText,
  onAction,
  action,
  secondaryActionText,
  onSecondaryAction,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'w-full py-12 px-6 rounded-2xl bg-surface border border-line text-center flex flex-col items-center justify-center space-y-4 shadow-elev-1',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-mint/80 border border-brand/20 text-brand-dark grid place-items-center shadow-xs">
        <Icon className="w-7 h-7" size={28} />
      </div>
      <div className="max-w-md space-y-1.5">
        <h4 className="text-base md:text-lg font-black text-ink">{title}</h4>
        {description && <p className="text-xs md:text-sm text-sub leading-relaxed">{description}</p>}
      </div>
      {(action || actionText || secondaryAction || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {action ? (
            action
          ) : actionText && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="min-h-[44px] px-5 rounded-xl bg-action hover:bg-gold-light text-ink font-black text-xs md:text-sm transition shadow-sm hover:shadow-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]"
            >
              {actionText}
            </button>
          ) : null}
          {secondaryAction ? (
            secondaryAction
          ) : secondaryActionText && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="min-h-[44px] px-5 rounded-xl bg-soft hover:bg-line/40 text-ink font-bold text-xs md:text-sm transition border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]"
            >
              {secondaryActionText}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
