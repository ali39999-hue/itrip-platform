'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { num } from '@/lib/format';
import { Check } from 'lucide-react';

const STEP_KEYS = [
  'package',
  'info',
  'deposit',
  'review',
  'settlement',
  'voucher',
] as const;

/**
 * RequestStepper — نوار شش‌مرحله‌ای ثابت مسیر رزرو بیزنس.
 * activeStep: 0..5 — مراحل قبل تیک می‌خورند، مرحله فعلی پررنگ،
 * بعدی‌ها خاکستری و هرگز قابل کلیک نیستند (سند: «مرحله‌های بعدی هرگز قابل کلیک نباشند»).
 * در موبایل افقی اسکرول می‌شود (استایل business.css).
 */
export function RequestStepper({ activeStep }: { activeStep: number }) {
  const t = useTranslations('Business.stepper');
  const locale = useLocale();

  return (
    <nav className="fz-stepper" aria-label={t('ariaLabel')}>
      <ol className="fz-container fz-stepper__in">
        {STEP_KEYS.map((key, i) => {
          const isDone = i < activeStep;
          const isCurrent = i === activeStep;
          const cls = isDone ? 'is-done' : isCurrent ? 'is-current' : '';
          return (
            <li key={key} className={`fz-step ${cls}`} aria-current={isCurrent ? 'step' : undefined}>
              <span className="fz-step__dot" aria-hidden="true">
                {isDone ? <Check size={16} strokeWidth={3} /> : num(i + 1, locale)}
              </span>
              <span className="fz-step__label">{t(key)}</span>
              {i < STEP_KEYS.length - 1 && <span className="fz-step__line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
