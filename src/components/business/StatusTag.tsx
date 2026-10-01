'use client';

import { useTranslations } from 'next-intl';

export type StatusTagState = 'ok' | 'warn' | 'pending';

/**
 * StatusTag — تگ وضعیت.
 * سبز = تایید، نارنجی = نیاز به اصلاح، خاکستری = در انتظار.
 * سند: «رنگ به‌تنهایی حامل معنا نیست و متن هم دارد» — متن ترجمه‌شده الزامی است.
 */
export function StatusTag({ state }: { state: StatusTagState }) {
  const t = useTranslations('Business.statusTag');

  const cls =
    state === 'ok' ? 'fz-tag fz-tag--ok' : state === 'warn' ? 'fz-tag fz-tag--warn' : 'fz-tag';

  return <span className={cls}>{t(state)}</span>;
}
