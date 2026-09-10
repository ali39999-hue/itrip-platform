'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export type BadgeStatus =
  | 'CONFIRMED'
  | 'PAID'
  | 'ISSUED'
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'PROCESSING'
  | 'HELD'
  | 'INITIATED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'ACTIVE';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const locale = useLocale();
  const normalized = status?.toUpperCase() || 'PENDING';

  const config: Record<
    string,
    {
      bg: string;
      text: string;
      border: string;
      icon: React.ComponentType<{ size: number; className?: string }>;
      label: { fa: string; en: string; ar: string; zh: string; ru: string };
    }
  > = {
    CONFIRMED: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200/80 dark:border-emerald-800/50',
      icon: CheckCircle2,
      label: { fa: 'تایید شده', en: 'Confirmed', ar: 'مؤكد', zh: '已确认', ru: 'Подтверждено' },
    },
    PAID: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200/80 dark:border-emerald-800/50',
      icon: CheckCircle2,
      label: { fa: 'پرداخت شده', en: 'Paid', ar: 'مدفوع', zh: '已支付', ru: 'Оплачено' },
    },
    ISSUED: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200/80 dark:border-emerald-800/50',
      icon: CheckCircle2,
      label: { fa: 'صادر شده', en: 'Issued', ar: 'تم الإصدار', zh: '已出票', ru: 'Оформлено' },
    },
    ACTIVE: {
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-200/80 dark:border-sky-800/50',
      icon: Sparkles,
      label: { fa: 'در حال سفر', en: 'Active', ar: 'نشط', zh: '进行中', ru: 'Активно' },
    },
    PENDING: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-800 dark:text-amber-400',
      border: 'border-amber-200/80 dark:border-amber-800/50',
      icon: Clock,
      label: { fa: 'در انتظار تایید', en: 'Pending', ar: 'قيد الانتظار', zh: '待确认', ru: 'В ожидании' },
    },
    PENDING_PAYMENT: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-800 dark:text-amber-400',
      border: 'border-amber-200/80 dark:border-amber-800/50',
      icon: Clock,
      label: { fa: 'در انتظار پرداخت', en: 'Pending Payment', ar: 'في انتظار الدفع', zh: '待付款', ru: 'Ожидает оплаты' },
    },
    HELD: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-800 dark:text-amber-400',
      border: 'border-amber-200/80 dark:border-amber-800/50',
      icon: Clock,
      label: { fa: 'رزرو موقت (قفل ظرفیت)', en: 'Held', ar: 'محجوز مؤقتاً', zh: '临时保留', ru: 'Забронировано временно' },
    },
    PROCESSING: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200/80 dark:border-blue-800/50',
      icon: Clock,
      label: { fa: 'در حال پردازش', en: 'Processing', ar: 'قيد المعالجة', zh: '处理中', ru: 'В обработке' },
    },
    CANCELLED: {
      bg: 'bg-zinc-100 dark:bg-zinc-800/50',
      text: 'text-zinc-700 dark:text-zinc-400',
      border: 'border-zinc-200 dark:border-zinc-700',
      icon: XCircle,
      label: { fa: 'لغو شده', en: 'Cancelled', ar: 'ملغى', zh: '已取消', ru: 'Отменено' },
    },
    FAILED: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-200/80 dark:border-rose-800/50',
      icon: AlertCircle,
      label: { fa: 'ناموفق', en: 'Failed', ar: 'فشل', zh: '失败', ru: 'Не удалось' },
    },
    EXPIRED: {
      bg: 'bg-stone-100 dark:bg-stone-800/50',
      text: 'text-stone-600 dark:text-stone-400',
      border: 'border-stone-200 dark:border-stone-700',
      icon: AlertCircle,
      label: { fa: 'منقضی شده', en: 'Expired', ar: 'منتهي الصلاحية', zh: '已过期', ru: 'Истекло' },
    },
    REFUNDED: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-200/80 dark:border-purple-800/50',
      icon: RotateCcw,
      label: { fa: 'مسترد شده', en: 'Refunded', ar: 'مسترد', zh: '已退款', ru: 'Возвращено' },
    },
  };

  const item = config[normalized] || {
    bg: 'bg-soft',
    text: 'text-sub',
    border: 'border-line',
    icon: Clock,
    label: { fa: normalized, en: normalized, ar: normalized, zh: normalized, ru: normalized },
  };

  const Icon = item.icon;
  const sizeClasses =
    size === 'md'
      ? 'px-3 py-1 text-xs gap-1.5'
      : 'px-2 py-0.5 text-[11px] gap-1';

  return (
    <span
      className={`inline-flex items-center font-black rounded-full border ${item.bg} ${item.text} ${item.border} ${sizeClasses} ${className}`}
    >
      <Icon size={size === 'md' ? 14 : 12} aria-hidden="true" />
      <span>{lt(locale, item.label)}</span>
    </span>
  );
}
