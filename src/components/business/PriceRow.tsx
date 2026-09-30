'use client';

import { useLocale } from 'next-intl';
import { BizPrice } from './BizText';

interface PriceRowProps {
  label: string;
  note?: string;
  /** مبلغ به ریال (عدد صحیح — از API) */
  amount: number;
  /** مبالغ کسر (کمک‌هزینه، پیش‌پرداخت): علامت منها و رنگ برند */
  negative?: boolean;
  /** ردیف جمع کل — درشت‌تر */
  total?: boolean;
}

/**
 * PriceRow — ردیف مبلغ در کارت‌های صورتحساب.
 * مبالغ کسر با علامت منها و رنگ برند (fz-price--credit) نمایش داده می‌شوند.
 */
export function PriceRow({ label, note, amount, negative = false, total = false }: PriceRowProps) {
  const locale = useLocale();
  const cls = `fz-price${negative ? ' fz-price--credit' : ''}${total ? ' fz-price--total' : ''}`;

  return (
    <div className={cls}>
      <span className={total ? undefined : 'fz-price__label fz-muted'}>
        {note ? (
          <>
            <b>{label}</b>
            <br />
            <span className="fz-faint">{note}</span>
          </>
        ) : (
          label
        )}
      </span>
      <span className="fz-price__amount">
        {negative && <span aria-label="minus">− </span>}
        <BizPrice rial={amount} locale={locale} />
      </span>
    </div>
  );
}
