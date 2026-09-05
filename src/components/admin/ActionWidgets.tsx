'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Ticket, ArrowDownRight, FileBadge, Percent, Plane, AlertCircle, Clock, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { lt, LText } from '@/lib/lt';

/** Server-mapped shape coming from OperationalException rows. */
export interface PendingTaskDTO {
  id: string;
  exceptionType: string;
  title: string;
  subtitle: string;
  severity: string;
  detectedAt: string;
}

const TYPE_META: Record<string, { icon: typeof Ticket; label: LText; bg: string }> = {
  PAYMENT_MISMATCH: { icon: ArrowDownRight, label: { fa: 'عدم تطابق پرداخت', en: 'Payment Mismatch', ar: 'عدم تطابق الدفع', zh: '支付不一致', ru: 'Расхождение платежа' }, bg: 'bg-rose-warm/10 text-rose-warm' },
  REFUND_TIMEOUT: { icon: ArrowDownRight, label: { fa: 'تاخیر استرداد', en: 'Refund Timeout', ar: 'تأخر الاسترداد', zh: '退款超时', ru: 'Задержка возврата' }, bg: 'bg-rose-warm/10 text-rose-warm' },
  TICKET_NOT_ISSUED: { icon: Ticket, label: { fa: 'بلیط صادر نشده', en: 'Ticket Not Issued', ar: 'لم يتم إصدار التذكرة', zh: '未出票', ru: 'Билет не выписан' }, bg: 'bg-brand/10 text-brand' },
  PRICE_MISMATCH: { icon: Percent, label: { fa: 'عدم تطابق قیمت', en: 'Price Mismatch', ar: 'عدم تطابق السعر', zh: '价格不一致', ru: 'Расхождение цены' }, bg: 'bg-tour/10 text-tour' },
  SUPPLIER_TIMEOUT: { icon: Plane, label: { fa: 'تایم‌اوت تامین‌کننده', en: 'Supplier Timeout', ar: 'انقطاع المورد', zh: '供应商超时', ru: 'Тайм-аут поставщика' }, bg: 'bg-flight/10 text-flight' },
  SUPPLIER_STATEMENT_MISMATCH: { icon: FileBadge, label: { fa: 'مغایرت صورت‌حساب', en: 'Statement Mismatch', ar: 'عدم تطابق الكشف', zh: '对账单不一致', ru: 'Расхождение выписки' }, bg: 'bg-gold/10 text-gold' },
  DEFAULT: { icon: AlertCircle, label: { fa: 'استثنای عملیاتی', en: 'Operational Exception', ar: 'استثناء تشغيلي', zh: '运营异常', ru: 'Операционное исключение' }, bg: 'bg-soft text-sub' },
};

const URGENCY_META: Record<string, { label: LText; color: string }> = {
  high: { label: { fa: 'فوری', en: 'Urgent', ar: 'عاجل', zh: '紧急', ru: 'Срочно' }, color: 'text-rose-warm bg-rose-warm/10' },
  medium: { label: { fa: 'متوسط', en: 'Medium', ar: 'متوسط', zh: '中等', ru: 'Средний' }, color: 'text-price bg-gold-soft' },
  low: { label: { fa: 'عادی', en: 'Normal', ar: 'عادي', zh: '普通', ru: 'Обычный' }, color: 'text-sub bg-soft' },
};

function severityToUrgency(severity: string): 'high' | 'medium' | 'low' {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'high';
  if (severity === 'MEDIUM') return 'medium';
  return 'low';
}

function formatTimeAgo(iso: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}

export function ActionWidgets({ tasks }: { tasks: PendingTaskDTO[] }) {
  const locale = useLocale();
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AlertCircle size={20} className="text-rose-warm" />
          <h2 className="text-[16px] font-black text-ink m-0">{lt(locale, { fa: 'نیاز به بررسی (Action Required)', en: 'Action Required', ar: 'يتطلب إجراءً', zh: '需要处理', ru: 'Требует действий' })}</h2>
        </div>
        <span className={`min-w-6 h-6 px-2 rounded-full text-surface text-[12px] font-black grid place-items-center ${tasks.length > 0 ? 'bg-rose-warm' : 'bg-success'}`}>{tasks.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-success" />
            <p className="text-[13px] font-black text-ink">
              {lt(locale, { fa: 'مورد باز برای بررسی وجود ندارد', en: 'No pending items to review', ar: 'لا توجد عناصر معلقة', zh: '没有待处理事项', ru: 'Нет ожидающих элементов' })}
            </p>
            <p className="text-[11px] font-bold text-sub">
              {lt(locale, { fa: 'استثنائات عملیاتی جدید به‌محض ثبت در اینجا ظاهر می‌شوند', en: 'New operational exceptions appear here as they are filed', ar: 'تظهر الاستثناءات الجديدة هنا', zh: '新的运营异常会显示在这里', ru: 'Новые исключения появятся здесь' })}
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const meta = TYPE_META[task.exceptionType] || TYPE_META.DEFAULT;
            const urg = URGENCY_META[severityToUrgency(task.severity)];
            const Icon = meta.icon;

            return (
              <Link key={task.id} href="/admin/exceptions" className="w-full text-start p-4 border-b border-line/50 hover:bg-soft/30 transition flex gap-3 last:border-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <b className="text-[13.5px] font-black text-ink truncate leading-snug">{task.title}</b>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${urg.color}`}>{lt(locale, urg.label)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-sub">
                    <span className="truncate">{task.subtitle}</span>
                    <span className="inline-flex items-center gap-1 shrink-0"><Clock size={11} /> {formatTimeAgo(task.detectedAt, locale)}</span>
                  </div>
                </div>
                <ChevronLeft size={16} className="text-line group-hover:text-brand transition self-center shrink-0" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
