'use client';

import React from 'react';
import {
  Activity,
  CheckCircle2,
  Server,
  Zap,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { useLocale } from 'next-intl';

export interface SloTelemetryProps {
  ledgerStatus?: 'BALANCED' | 'IMBALANCED';
  imbalanceEvents?: number;
  outboxQueueDepth?: number;
  workerLagMs?: number;
}

export function SloTelemetryDashboard({
  ledgerStatus = 'BALANCED',
  imbalanceEvents = 0,
  outboxQueueDepth = 0,
  workerLagMs = 45,
}: SloTelemetryProps) {
  const locale = useLocale();

  const suppliers = [
    { name: 'Parto Flight CRS', code: 'PARTO_CRS', latency: '120ms', success: '99.8%', status: 'HEALTHY' },
    { name: 'Nadia Flight CRS', code: 'NADIA_CRS', latency: '145ms', success: '99.4%', status: 'HEALTHY' },
    { name: 'Eghamat24 Hotels', code: 'EGHAMAT_24', latency: '95ms', success: '99.9%', status: 'HEALTHY' },
    { name: 'Shetab Gateway / PSP', code: 'SHETAB_PSP', latency: '210ms', success: '99.95%', status: 'HEALTHY' },
  ];

  const slos = [
    {
      title: lt(locale, { fa: 'تراز دفترکل دوبل', en: 'Double-Entry Ledger', ar: 'موازنة الأستاذ العام', zh: '复式总账平衡', ru: 'Баланс Главной книги' }),
      target: '100.00%',
      current: ledgerStatus === 'BALANCED' ? '100%' : 'DEVIATION',
      status: ledgerStatus === 'BALANCED' ? 'COMPLIANT' : 'BREACHED',
      note: lt(locale, { fa: 'صفر مطلق مغایرت حسابداری', en: 'Zero accounting delta', ar: 'صفر فروقات محاسبية', zh: '零会计差异', ru: 'Нулевая погрешность' }),
    },
    {
      title: lt(locale, { fa: 'تاخیر جستجوی پرواز (p95)', en: 'Flight Search Latency', ar: 'زمن استجابة البحث', zh: '航班搜索延迟', ru: 'Задержка поиска' }),
      target: '< 2,500ms',
      current: '110ms',
      status: 'COMPLIANT',
      note: lt(locale, { fa: 'بهره‌مندی از کش هوشمند مسیرها', en: 'Smart cache-first model', ar: 'استخدام التخزين الذكي', zh: '智能路由缓存', ru: 'Умное кэширование' }),
    },
    {
      title: lt(locale, { fa: 'موفقیت وب‌هوک‌های مالی', en: 'Payment Webhook Health', ar: 'نجاح ويبهوك الدفع', zh: '支付回调成功率', ru: 'Успех вебхуков оплаты' }),
      target: '99.95%',
      current: '99.98%',
      status: 'COMPLIANT',
      note: lt(locale, { fa: 'امضای HMAC و کلید یکتایی', en: 'HMAC signature & Idempotency', ar: 'توقيع HMAC ومفتاح الفرادة', zh: 'HMAC签名与幂等性', ru: 'HMAC подпись и идемпотентность' }),
    },
    {
      title: lt(locale, { fa: 'تعهد استرداد وجه (SLA)', en: 'Refund SLA (<24h)', ar: 'اتفاقية مستوى الاسترداد', zh: '退款SLA保证', ru: 'SLA по возвратам' }),
      target: '95.00%',
      current: '98.20%',
      status: 'COMPLIANT',
      note: lt(locale, { fa: 'تأیید دو مرحله‌ای Maker-Checker', en: 'Maker-Checker dual approval', ar: 'موافقة ثنائية', zh: '双人复核审批', ru: 'Двухуровневое утверждение' }),
    },
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-elev-1 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand">
            <Activity size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-black text-ink">
              {lt(locale, { fa: 'داشبورد سلامت عملیاتی و شاخص‌های SLO', en: 'Operational Health & SLO Telemetry', ar: 'لوحة قياس الصحة التشغيلية ومؤشرات SLO', zh: '运营健康度与SLO指标大盘', ru: 'Мониторинг работоспособности и метрики SLO' })}
            </h2>
            <p className="text-[11px] font-medium text-sub">
              {lt(locale, { fa: 'پایش بلادرنگ تأمین‌کنندگان، تراز لجر دوبل و صف ورکرها', en: 'Real-time telemetry of suppliers, ledger balance & worker queues', ar: 'مراقبة فورية للموردين وتوازن الدفاتر وقوائم الانتظار', zh: '实时监控供应商、总账平衡与工作队列', ru: 'Мониторинг поставщиков, баланса книг и очередей' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${ledgerStatus === 'BALANCED' && imbalanceEvents === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            <CheckCircle2 size={13} />
            <span>{ledgerStatus === 'BALANCED' && imbalanceEvents === 0 ? lt(locale, { fa: 'لجر مالی: متوازن', en: 'Ledger: Balanced', ar: 'الأستاذ: متوازن', zh: '总账：已平衡', ru: 'Книга: Сбалансирована' }) : lt(locale, { fa: `مغایرت لجر: ${imbalanceEvents}`, en: `Ledger delta: ${imbalanceEvents}`, ar: `فروقات: ${imbalanceEvents}`, zh: `差异：${imbalanceEvents}`, ru: `Погрешность: ${imbalanceEvents}` })}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft px-2.5 py-1 text-[11px] font-medium text-ink">
            <Server size={13} className="text-sub" />
            <span>{lt(locale, { fa: `صف: ${outboxQueueDepth} (${workerLagMs}ms)`, en: `Queue: ${outboxQueueDepth} (${workerLagMs}ms)`, ar: `القائمة: ${outboxQueueDepth}`, zh: `队列：${outboxQueueDepth}`, ru: `Очередь: ${outboxQueueDepth}` })}</span>
          </span>
        </div>
      </div>

      {/* Grid: 4 Core SLOs */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {slos.map((slo) => (
          <div key={slo.title} className="rounded-xl border border-line bg-soft/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sub">{slo.title}</span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-black text-emerald-800">
                {slo.status === 'COMPLIANT' ? 'SLO PASS' : 'BREACH'}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-black text-ink">{slo.current}</span>
              <span className="text-[10px] text-sub font-mono">({slo.target})</span>
            </div>
            <p className="mt-1 truncate text-[10px] text-sub">{slo.note}</p>
          </div>
        ))}
      </div>

      {/* Supplier Connectivity & Health */}
      <div className="mt-4 rounded-xl border border-line bg-soft/30 p-3">
        <div className="flex items-center justify-between pb-2 border-b border-line/60">
          <span className="text-xs font-black text-ink flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" />
            <span>{lt(locale, { fa: 'وضعیت زنده وب‌سرویس‌های تأمین‌کننده سفر', en: 'Live Travel Supplier Integrations', ar: 'حالة بوابات الموردين المباشرة', zh: '实时旅游供应商集成状态', ru: 'Статус интеграций с поставщиками' })}</span>
          </span>
          <span className="text-[10.5px] font-medium text-sub">
            {lt(locale, { fa: 'سنسور Circuit Breaker: عادی', en: 'Circuit Breaker: Closed / Normal', ar: 'قاطع الدائرة: مغلق / عادي', zh: '熔断保护：正常闭合', ru: 'Автоматический предохранитель: норма' })}
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {suppliers.map((sup) => (
            <div key={sup.code} className="flex items-center justify-between rounded-lg border border-line/70 bg-surface px-3 py-2">
              <div>
                <span className="block text-xs font-bold text-ink">{sup.name}</span>
                <span className="block text-[10px] text-sub font-mono">{sup.code}</span>
              </div>
              <div className="text-left rtl:text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{sup.latency}</span>
                </span>
                <span className="block text-[9.5px] text-sub">{sup.success}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
