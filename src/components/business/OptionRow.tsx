'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface OptionRowProps {
  selected: boolean;
  title: string;
  note?: string;
  tag?: string;
  /** radio (تکی) یا checkbox (چندتایی) — عنصر واقعی، نه div (سند تحویل) */
  type?: 'radio' | 'checkbox';
  /** نام گروه رادیو */
  groupName?: string;
  onSelect: () => void;
  /** بلوکی که فقط با انتخاب این گزینه باز می‌شود (مثل فرم فیش بانکی) */
  revealContent?: ReactNode;
  revealed?: boolean;
}

/**
 * OptionRow — ردیف انتخاب (روش پرداخت، خدمات افزوده).
 * سند: «role="radio" یا checkbox واقعی، نه div». از button با role و
 * aria-checked استفاده می‌کنیم تا keyboard و screen reader درست کار کنند.
 */
export function OptionRow({
  selected,
  title,
  note,
  tag,
  type = 'radio',
  groupName,
  onSelect,
  revealContent,
  revealed = false,
}: OptionRowProps) {
  const t = useTranslations('Business.common');
  const isCheck = type === 'checkbox';

  return (
    <div className="fz-stack" style={{ gap: 8 }}>
      <button
        type="button"
        role={isCheck ? 'checkbox' : 'radio'}
        aria-checked={selected}
        aria-pressed={isCheck ? undefined : undefined}
        name={type === 'radio' ? groupName : undefined}
        className={`fz-option${isCheck ? ' fz-option--check' : ''}${selected ? ' is-selected' : ''}`}
        onClick={onSelect}
      >
        <span className="fz-option__mark" aria-hidden="true" />
        <span className="fz-option__body">
          <span className="fz-option__title">{title}</span>
          {note && <span className="fz-faint">{note}</span>}
        </span>
        {tag && (
          <span className={`fz-tag${selected ? ' fz-tag--ok' : ''}`}>{tag}</span>
        )}
        <span className="fz-sr">{selected ? t('selected') : t('notSelected')}</span>
      </button>
      {revealContent && revealed && (
        <div className="fz-card fz-card--sub" style={{ borderStyle: 'dashed', borderColor: 'var(--fz-brand)' }}>
          {revealContent}
        </div>
      )}
    </div>
  );
}
