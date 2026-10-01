'use client';

import { useLocale, useTranslations } from 'next-intl';
import { num } from '@/lib/format';
import { Check } from 'lucide-react';

export type TimelineStepState = 'done' | 'doing' | 'waiting';

export interface TimelineStep {
  title: string;
  note?: string;
  state: TimelineStepState;
}

/** تگ همراه هر مرحله تایم‌لاین — متن دارد؛ رنگ به‌تنهایی حامل معنا نیست */
const STATE_TAG_KEY: Record<TimelineStepState, string> = {
  done: 'done',
  doing: 'doing',
  waiting: 'waiting',
};

/**
 * StatusTimeline — تایم‌لاین عمودی مراحل بررسی.
 * سه حالت: done (تیک سبز)، doing (نقطه نارنجی)، waiting (خاکستری).
 */
export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  const t = useTranslations('Business.timeline');
  const locale = useLocale();

  return (
    <div className="fz-timeline" role="list">
      {steps.map((step, i) => (
        <div key={i} role="listitem" className={`fz-tl is-${step.state}`}>
          <div className="fz-tl__rail">
            <span className="fz-tl__dot" aria-hidden="true">
              {step.state === 'done' ? (
                <Check size={18} strokeWidth={3} />
              ) : step.state === 'doing' ? (
                '•'
              ) : (
                num(i + 1, locale)
              )}
            </span>
            <span className="fz-tl__line" aria-hidden="true" />
          </div>
          <div className="fz-tl__body">
            <div className="fz-tl__title">
              <span>{step.title}</span>
              <span
                className={`fz-tag${
                  step.state === 'done'
                    ? ' fz-tag--ok'
                    : step.state === 'doing'
                      ? ' fz-tag--warn'
                      : ''
                }`}
              >
                {t(STATE_TAG_KEY[step.state])}
              </span>
            </div>
            {step.note && <p className="fz-muted" style={{ fontSize: 14 }}>{step.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
