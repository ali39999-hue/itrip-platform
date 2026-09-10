'use client';

import React from 'react';

export interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  role?: string;
  'aria-label'?: string;
}

/**
 * Mobile-first Card component with standard touch padding,
 * subtle surface styling, and tactile active/hover transitions.
 */
export function MobileCard({
  children,
  className = '',
  onClick,
  interactive = false,
  role,
  'aria-label': ariaLabel,
}: MobileCardProps) {
  const isClickable = interactive || Boolean(onClick);

  return (
    <div
      role={role || (isClickable ? 'button' : undefined)}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={ariaLabel}
      className={`rounded-2xl sm:rounded-3xl border border-line bg-surface p-4 sm:p-5 shadow-xs transition-all ${
        isClickable
          ? 'cursor-pointer active:scale-[0.99] active:bg-soft/50 hover:border-brand/40 hover:shadow-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
