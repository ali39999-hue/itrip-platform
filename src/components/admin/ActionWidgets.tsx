'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Ticket, ArrowDownRight, FileBadge, Percent, Plane, AlertCircle, Clock, CheckCircle2, ArrowUpLeft } from 'lucide-react';
import { lt, LText } from '@/lib/lt';
import { ErpBadge, ErpEmptyState } from './erp-ui';
import { cn } from '@/lib/utils';

/** Server-mapped shape coming from OperationalException rows. */
export interface PendingTaskDTO {
  id: string;
  exceptionType: string;
  title: string;
  subtitle: string;
  severity: string;
  detectedAt: string;
}

const TYPE_META: Record<string, { icon: typeof Ticket; label: LText; tile: string }> = {
  PAYMENT_MISMATCH: { icon: ArrowDownRight, label: { fa: 'عدم تطابق پرداخت', en: 'Payment Mismatch', ar: 'عدم تطابق الدفع', zh: '支付不一致', ru: 'Расхождение платежа' }, tile: 'bg-rose-warm/10 text-rose-warm' },
  REFUND_TIMEOUT: { icon: ArrowDownRight, label: { fa: 'تاخیر استرداد', en: 'Refund Timeout', ar: 'تأخر الاسترداد', zh: '退款超时', ru: 'Задержка возврата' }, tile: 'bg-rose-warm/10 text-rose-warm' },
  TICKET_NOT_ISSUED: { icon: Ticket, label: { fa: 'بلیط صادر نشده', en: 'Ticket Not Issued', ar: 'لم يتم إصدار التذكرة', zh: '未出票', ru: 'Билет не выписан' }, tile: 'bg-brand/10 text-brand-dark' },
  PRICE_MISMATCH: { icon: Percent, label: { fa: 'عدم تطابق قیمت', en: 'Price Mismatch', ar: 'عدم تطابق السعر', zh: '价格不一致', ru: 'Расхождение цены' }, tile: 'bg-tour/10 text-tour' },
  SUPPLIER_TIMEOUT: { icon: Plane, label: { fa: 'تایم‌اوت تامین‌کننده', en: 'Supplier Timeout', ar: 'انقطاع المورد', zh: '供应商超时', ru: 'Тайм-аут поставщика' }, tile: 'bg-flight/10 text-flight' },
  SUPPLIER_STATEMENT_MISMATCH: { icon: FileBadge, label: { fa: 'مغایرت صورت‌حساب', en: 'Statement Mismatch', ar: 'عدم تطابق الكشف', zh: '对账单不一致', ru: 'Расхождение выписки' }, tile: 'bg-gold-soft text-price' },
  DEFAULT: { icon: AlertCircle, label: { fa: 'استثنای عملیاتی', en: 'Operational Exception', ar: 'استثناء تشغيلي', zh: '运营异常', ru: 'Операционное исключение' }, tile: 'bg-soft text-sub' },
};

function severityTone(severity: string): 'rose' | 'gold' | 'neutral' {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'rose';
  if (severity === 'MEDIUM') return 'gold';
  return 'neutral';
}

function urgencyLabel(severity: string, locale: string): string {
  const t = severityTone(severity);
  if (t === 'rose') return lt(locale, { fa: 'فوری', en: 'Urgent', ar: 'عاجل', zh: '紧急', ru: 'Срочно' });
  if (t === 'gold') return lt(locale, { fa: 'متوسط', en: 'Medium', ar: 'متوسط', zh: '中等', ru: 'Средний' });
  return lt(locale, { fa: 'عادی', en: 'Normal', ar: 'عادي', zh: '普通', ru: 'Обычный' });
}

function formatTimeAgo(iso: string, locale: string): string {
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diffMs = new Date(iso).getTime() - Date.now();
    const minutes = Math.round(diffMs / 60000);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    return rtf.format(Math.round(hours / 24), 'day');
  } catch {
    return iso;
  }
}

export function ActionWidgets({ tasks }: { tasks: PendingTaskDTO[] }) {
  const locale = useLocale();
  return (
    <section aria-label={lt(locale, { fa: 'نیاز به بررسی', en: 'Action required', ar: 'يتطلب إجراءً', zh: '需要处理', ru: 'Требует действий' })} className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-elev-1">
      <header className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-warm/10 text-rose-warm">
            <AlertCircle size={17} aria-hidden="true" />
          </span>
          <h2 className="truncate text-[15px] font-black text-ink">
            {lt(locale, { fa: 'نیاز به بررسی', en: 'Action Required', ar: 'يتطلب إجراءً', zh: '需要处理', ru: 'Требует действий' })}
          </h2>
        </div>
        <span className={cn('grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black text-surface', tasks.length > 0 ? 'bg-rose-warm' : 'bg-success')}>
          {tasks.length}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <ErpEmptyState
            icon={<CheckCircle2 size={26} className="text-success" aria-hidden="true" />}
            title={lt(locale, { fa: 'صف بررسی خالی است', en: 'All clear — nothing to review', ar: 'لا توجد عناصر معلقة', zh: '没有待处理事项', ru: 'Нет ожидающих элементов' })}
            description={lt(locale, { fa: 'استثنائات عملیاتی جدید به‌محض ثبت در اینجا ظاهر می‌شوند.', en: 'New operational exceptions appear here as they are filed.', ar: 'تظهر الاستثناءات الجديدة هنا.', zh: '新的运营异常会显示在这里。', ru: 'Новые исключения появятся здесь.' })}
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {tasks.map((task) => {
              const meta = TYPE_META[task.exceptionType] || TYPE_META.DEFAULT;
              const Icon = meta.icon;
              return (
                <li key={task.id}>
                  <Link
                    href="/admin/exceptions"
                    className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                  >
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', meta.tile)}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <b className="truncate text-[13px] font-black text-ink">{task.title}</b>
                        <ErpBadge tone={severityTone(task.severity)}>{urgencyLabel(task.severity, locale)}</ErpBadge>
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] font-bold text-sub">
                        <span className="truncate">{lt(locale, meta.label)} · {task.subtitle}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
                          <Clock size={11} aria-hidden="true" /> {formatTimeAgo(task.detectedAt, locale)}
                        </span>
                      </span>
                    </span>
                    <ArrowUpLeft size={15} aria-hidden="true" className="shrink-0 text-line transition group-hover:text-brand rtl:rotate-90" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="border-t border-line/70 bg-soft/40 px-4 py-2.5">
          <Link href="/admin/exceptions" className="text-[11px] font-black text-brand-dark transition hover:text-brand">
            {lt(locale, { fa: 'مشاهده همه در مرکز خطا ←', en: 'View all in Exception Center →', ar: 'عرض الكل في مركز الاستثناءات', zh: '在异常中心查看全部', ru: 'Все в центре исключений' })}
          </Link>
        </div>
      )}
    </section>
  );
}
