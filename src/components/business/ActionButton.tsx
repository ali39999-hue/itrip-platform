'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  /** primary تنها یک عدد در هر صفحه (سند تحویل) — رنگ --fz-action */
  variantName?: never;
  children: ReactNode;
  href?: string;
}

/**
 * ActionButton — دکمه‌های بیزنس.
 * - primary: فقط یک عدد در هر صفحه، رنگ --fz-action، ارتفاع ۵۶px
 * - secondary: دکمه برند تیره (--fz-brand)
 * - ghost: بدون پس‌زمینه، رنگ برند
 * وقتی href داده شود به‌صورت لینک استایل‌شده رندر می‌شود.
 */
export function ActionButton({
  variant = 'primary',
  children,
  href,
  className = '',
  ...rest
}: ActionButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'fz-btn--action'
      : variant === 'secondary'
        ? 'fz-btn--brand'
        : 'fz-btn--ghost';

  if (href) {
    return (
      <a href={href} className={`fz-btn ${variantClass} ${className}`.trim()}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={`fz-btn ${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
