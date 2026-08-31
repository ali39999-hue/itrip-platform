'use client';

import { useLocale } from 'next-intl';
import { PENDING_TASKS } from '@/lib/admin-mock';
import { Ticket, ArrowDownRight, FileBadge, MessageSquare, AlertCircle, Clock, ChevronLeft } from 'lucide-react';
import { lt, LText } from '@/lib/lt';

const TYPE_META: Record<string, { icon: typeof Ticket; label: LText; bg: string }> = {
  ticket: { icon: Ticket, label: { fa: 'تیکت پشتیبانی', en: 'Support Ticket', ar: 'تذكرة دعم', zh: '客服工单', ru: 'Тикет поддержки' }, bg: 'bg-brand/10 text-brand' },
  refund: { icon: ArrowDownRight, label: { fa: 'درخواست استرداد', en: 'Refund Request', ar: 'طلب استرداد', zh: '退款请求', ru: 'Заявка на возврат' }, bg: 'bg-rose-warm/10 text-rose-warm' },
  visa: { icon: FileBadge, label: { fa: 'تایید مدارک ویزا', en: 'Visa Document Review', ar: 'اعتماد مستندات التأشيرة', zh: '签证材料审核', ru: 'Проверка визовых документов' }, bg: 'bg-flight/10 text-flight' },
  review: { icon: MessageSquare, label: { fa: 'بررسی نظر', en: 'Review Moderation', ar: 'مراجعة التعليق', zh: '评论审核', ru: 'Модерация отзыва' }, bg: 'bg-tour/10 text-tour' },
};

const URGENCY_META: Record<string, { label: LText; color: string }> = {
  high: { label: { fa: 'فوری', en: 'Urgent', ar: 'عاجل', zh: '紧急', ru: 'Срочно' }, color: 'text-rose-warm bg-rose-warm/10' },
  medium: { label: { fa: 'متوسط', en: 'Medium', ar: 'متوسط', zh: '中等', ru: 'Средний' }, color: 'text-price bg-gold-soft' },
  low: { label: { fa: 'عادی', en: 'Normal', ar: 'عادي', zh: '普通', ru: 'Обычный' }, color: 'text-sub bg-soft' },
};

export function ActionWidgets() {
  const locale = useLocale();
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AlertCircle size={20} className="text-rose-warm" />
          <h2 className="text-[16px] font-black text-ink m-0">{lt(locale, { fa: 'نیاز به بررسی (Action Required)', en: 'Action Required', ar: 'يتطلب إجراءً', zh: '需要处理', ru: 'Требует действий' })}</h2>
        </div>
        <span className="min-w-6 h-6 px-2 rounded-full bg-rose-warm text-surface text-[12px] font-black grid place-items-center">{PENDING_TASKS.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {PENDING_TASKS.map((task) => {
          const meta = TYPE_META[task.type];
          const urg = URGENCY_META[task.urgency];
          const Icon = meta.icon;

          return (
            <button key={task.id} className="w-full text-start p-4 border-b border-line/50 hover:bg-soft/30 transition flex gap-3 last:border-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
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
                  <span className="inline-flex items-center gap-1 shrink-0"><Clock size={11} /> {task.timeAgo}</span>
                </div>
              </div>
              <ChevronLeft size={16} className="text-line group-hover:text-brand transition self-center shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
