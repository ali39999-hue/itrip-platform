'use client';

import React from 'react';
import { lt } from '@/lib/lt';

export type CapabilityStatus = 'LIVE' | 'BETA' | 'SIMULATED' | 'MOCK' | 'COMING_SOON' | 'DISABLED';

interface CapabilityBadgeProps {
  status: CapabilityStatus;
  locale?: string;
  className?: string;
  showTooltip?: boolean;
}

const statusConfig: Record<
  CapabilityStatus,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    labels: { fa: string; en: string; ar: string; zh: string; ru: string };
    tooltips: { fa: string; en: string; ar: string; zh: string; ru: string };
  }
> = {
  LIVE: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    labels: { fa: 'فعال', en: 'LIVE', ar: 'مباشر', zh: '已上线', ru: 'LIVE' },
    tooltips: {
      fa: 'متصل به زیرساخت واقعی و تامین‌کننده عملیاتی',
      en: 'Connected to live operational provider',
      ar: 'متصل بمزود الخدمة الفعلي',
      zh: '已接入生产环境供应商',
      ru: 'Подключено к рабочей системе',
    },
  },
  BETA: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500/30',
    dot: 'bg-sky-500',
    labels: { fa: 'آزمایشی', en: 'BETA', ar: 'تجريبي', zh: '测试版', ru: 'BETA' },
    tooltips: {
      fa: 'در حال اجرای اولیه و کنترل‌شده',
      en: 'In controlled operational beta',
      ar: 'في المرحلة التجريبية المراقبة',
      zh: '受控公测运行中',
      ru: 'В режиме контролируемого бета-тестирования',
    },
  },
  SIMULATED: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    labels: { fa: 'شبیه‌سازی', en: 'SIMULATED', ar: 'محاكاة', zh: '模拟运行', ru: 'SIMULATED' },
    tooltips: {
      fa: 'محیط تست سندباکس و شبیه‌سازی قوانین',
      en: 'Sandbox simulation environment',
      ar: 'بيئة محاكاة واختبار',
      zh: '沙盒模拟验证环境',
      ru: 'Среда симуляции песочницы',
    },
  },
  MOCK: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/30',
    dot: 'bg-indigo-500',
    labels: { fa: 'کاتالوگ نمونه', en: 'MOCK', ar: 'بيانات تجريبية', zh: '样例数据', ru: 'MOCK' },
    tooltips: {
      fa: 'نمایش داده‌های کاتالوگ و نمونه',
      en: 'Seeded catalog demonstration data',
      ar: 'بيانات كتالوج تجريبية',
      zh: '展示样例目录数据',
      ru: 'Демонстрационные данные каталога',
    },
  },
  COMING_SOON: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
    labels: { fa: 'به‌زودی', en: 'COMING SOON', ar: 'قريباً', zh: '即将上线', ru: 'СКОРО' },
    tooltips: {
      fa: 'در حال توسعه و یکپارچه‌سازی نهایی',
      en: 'Under development and rollout',
      ar: 'قيد التطوير والإطلاق',
      zh: '开发集成中',
      ru: 'В разработке',
    },
  },
  DISABLED: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-600 dark:text-zinc-400',
    border: 'border-zinc-500/30',
    dot: 'bg-zinc-400',
    labels: { fa: 'غیرفعال', en: 'DISABLED', ar: 'معطل', zh: '未启用', ru: 'ОТКЛЮЧЕНО' },
    tooltips: {
      fa: 'موقت غیرفعال یا خارج از دسترس',
      en: 'Temporarily disabled or offline',
      ar: 'معطل مؤقتاً',
      zh: '暂停使用',
      ru: 'Временно недоступно',
    },
  },
};

export function CapabilityBadge({
  status,
  locale = 'fa',
  className = '',
  showTooltip = true,
}: CapabilityBadgeProps) {
  const config = statusConfig[status] || statusConfig.DISABLED;
  const label = lt(locale, config.labels);
  const tooltip = lt(locale, config.tooltips);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${config.bg} ${config.text} ${config.border} ${className}`}
      title={showTooltip ? tooltip : undefined}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      <span>{label}</span>
    </span>
  );
}
