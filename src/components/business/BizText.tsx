'use client';

import { num, currencyLabel } from '@/lib/format';
import type { ReactNode } from 'react';

/**
 * نمایش مبلغ در UI بیزنس — همه مبالغ از API به ریال عدد صحیح می‌آیند
 * و در نمایش به تومان تبدیل می‌شوند (تقسیم بر ۱۰، بدون اعشار).
 * اعداد مطابق لوکال (فارسی برای fa) نمایش داده می‌شوند؛ در دیتابیس/API لاتین‌اند.
 */
export function BizPrice({
  rial,
  locale,
  showUnit = true,
  className,
}: {
  rial: number;
  locale: string;
  showUnit?: boolean;
  className?: string;
}) {
  const toman = rial / 10;
  const unit = currencyLabel('IRT', 'تومان', locale);
  return (
    <span className={`fz-num${className ? ` ${className}` : ''}`}>
      {num(toman, locale)}
      {showUnit ? ` ${unit}` : ''}
    </span>
  );
}

/** متن ترجمه‌شده‌ای که در children ترکیبی هم کار می‌کند — برای خطاهای فیلد */
export function BizFieldError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <span className="fz-field__error" role="alert">
      {children}
    </span>
  );
}
