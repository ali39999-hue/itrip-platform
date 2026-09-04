import * as React from 'react';
import { LucideIcon, Search } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Search,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`w-full py-12 px-6 rounded-3xl bg-surface border border-line text-center flex flex-col items-center justify-center space-y-4 shadow-elev-1 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-mint/80 border border-brand/20 text-brand-dark grid place-items-center shadow-sm">
        <Icon size={28} />
      </div>
      <div className="max-w-md space-y-1.5">
        <h4 className="text-base md:text-lg font-black text-ink">{title}</h4>
        <p className="text-xs md:text-sm text-sub leading-relaxed">{description}</p>
      </div>
      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {actionText && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="h-11 px-5 rounded-xl bg-action hover:bg-gold-light text-ink font-black text-xs md:text-sm transition shadow-sm hover:shadow-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]"
            >
              {actionText}
            </button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="h-11 px-5 rounded-xl bg-soft hover:bg-line/40 text-ink font-bold text-xs md:text-sm transition border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
