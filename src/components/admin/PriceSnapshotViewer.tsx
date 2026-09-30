'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Receipt,
  Copy,
  Check,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { toPersianDigits } from '@/lib/iranian-commerce';

export interface PriceSnapshotViewData {
  id: string;
  bookingId: string;
  baseAmount: string | number;
  markupAmount: string | number;
  serviceFee: string | number;
  taxAmount: string | number;
  discountAmount: string | number;
  sellPrice: string | number;
  currency: string;
  fxRate?: string | number;
  baseCurrency?: string;
  snapshotHash?: string;
  isIntegrityValid?: boolean;
  createdAt?: string | Date;
  ruleVersions?: {
    pricingEngineVersion?: string;
    taxRuleVersion?: string;
  };
}

interface PriceSnapshotViewerProps {
  snapshot: PriceSnapshotViewData;
  className?: string;
}

export function PriceSnapshotViewer({
  snapshot,
  className = '',
}: PriceSnapshotViewerProps) {
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    if (!snapshot.snapshotHash) return;
    navigator.clipboard.writeText(snapshot.snapshotHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmt = (val: string | number) => {
    const n = Number(val);
    if (isNaN(n)) return String(val);
    return locale === 'fa' ? toPersianDigits(n.toLocaleString('en-US')) : n.toLocaleString('en-US');
  };

  const isValid = snapshot.isIntegrityValid ?? Boolean(snapshot.snapshotHash);

  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-5 shadow-elev-1 space-y-5 ${className}`}
    >
      {/* Header & Cryptographic Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-dark">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              {lt(locale, {
                fa: 'سند اسنپ‌شات قیمت رسمی (Price Snapshot)',
                en: 'Official Price Snapshot Record',
                ar: 'سجل لقطة السعر المعتمد',
                zh: '官方价格快照凭证',
                ru: 'Официальный ценовой снимок',
              })}
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sub border border-line">
                {snapshot.currency}
              </span>
            </h3>
            <p className="text-[11px] text-sub">
              {lt(locale, {
                fa: 'رکورد تغییرناپذیر محاسبه ۱۲ مرحله‌ای قیمت طبق الگوی Odoo و aroux30/site',
                en: 'Immutable 12-stage pricing record aligned with Odoo & aroux30/site doctrine',
                ar: 'سجل غير قابل للتعديل لتسعير الـ 12 مرحلة',
                zh: '不可篡改的12阶段定价格式快照',
                ru: 'Неизменяемый 12-этапный снимок ценообразования',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isValid ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              {lt(locale, {
                fa: 'هش معتبر و تاییدشده',
                en: 'Hash Verified',
                ar: 'التجزئة معتمدة',
                zh: '哈希校验通过',
                ru: 'Хэш подтвержден',
              })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold">
              <ShieldAlert className="w-4 h-4" />
              {lt(locale, {
                fa: 'هش نامعتبر یا تحریف‌شده',
                en: 'Hash Invalid / Tampered',
                ar: 'تجزئة غير صالحة',
                zh: '哈希失效/被篡改',
                ru: 'Хэш недействителен',
              })}
            </span>
          )}
        </div>
      </div>

      {/* Itemized Financial Stages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-line/70 space-y-1">
          <span className="text-[11px] text-sub block">
            {lt(locale, { fa: 'هزینه پایه تامین‌کننده:', en: 'Supplier Base Cost:', ar: 'التكلفة الأساسية:', zh: '基础采购成本：', ru: 'Базовая цена поставщика:' })}
          </span>
          <span className="text-sm font-black font-mono text-ink">
            {fmt(snapshot.baseAmount)} {snapshot.currency}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-line/70 space-y-1">
          <span className="text-[11px] text-sub block">
            {lt(locale, { fa: 'مارک‌آپ و سود سیستم:', en: 'Platform Markup:', ar: 'هامش المنصة:', zh: '平台加价：', ru: 'Наценка платформы:' })}
          </span>
          <span className="text-sm font-black font-mono text-ink">
            +{fmt(snapshot.markupAmount)} {snapshot.currency}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-line/70 space-y-1">
          <span className="text-[11px] text-sub block">
            {lt(locale, { fa: 'کارمزد و خدمات:', en: 'Service Fee:', ar: 'رسوم الخدمة:', zh: '服务费用：', ru: 'Сервисный сбор:' })}
          </span>
          <span className="text-sm font-black font-mono text-ink">
            +{fmt(snapshot.serviceFee)} {snapshot.currency}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-line/70 space-y-1">
          <span className="text-[11px] text-sub block">
            {lt(locale, { fa: 'مالیات بر ارزش افزوده (VAT):', en: 'VAT Tax Amount:', ar: 'ضريبة القيمة المضافة:', zh: '增值税额：', ru: 'НДС:' })}
          </span>
          <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-400">
            +{fmt(snapshot.taxAmount)} {snapshot.currency}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-line/70 space-y-1">
          <span className="text-[11px] text-sub block">
            {lt(locale, { fa: 'تخفیف و کوپن:', en: 'Discounts Applied:', ar: 'الخصومات:', zh: '折扣优惠：', ru: 'Скидки:' })}
          </span>
          <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400">
            -{fmt(snapshot.discountAmount)} {snapshot.currency}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-brand/10 border border-brand/30 space-y-1">
          <span className="text-[11px] text-brand-dark font-bold block">
            {lt(locale, { fa: 'قیمت فروش نهایی (قطعی):', en: 'Final Sell Price:', ar: 'سعر البيع النهائي:', zh: '最终售价（锁定）：', ru: 'Итоговая стоимость:' })}
          </span>
          <span className="text-base font-black font-mono text-brand-dark">
            {fmt(snapshot.sellPrice)} {snapshot.currency}
          </span>
        </div>
      </div>

      {/* Cryptographic SHA-256 Hash Display */}
      {snapshot.snapshotHash && (
        <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/80 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-sub block uppercase tracking-wider">
              {lt(locale, {
                fa: 'شناسه رمزنگاری امنیتی (SHA-256 Hash):',
                en: 'Cryptographic SHA-256 Integrity Hash:',
                ar: 'تجزئة الأمان التشفيرية:',
                zh: '加密哈希校验码 (SHA-256):',
                ru: 'Криптографический хэш SHA-256:',
              })}
            </span>
            <code className="text-[11px] font-mono text-ink/90 break-all select-all">
              {snapshot.snapshotHash}
            </code>
          </div>

          <button
            type="button"
            onClick={copyHash}
            className="shrink-0 self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-slate-200/50 dark:hover:bg-slate-800 text-xs font-medium text-ink transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">{lt(locale, { fa: 'کپی شد', en: 'Copied', ar: 'تم النسخ', zh: '已复制', ru: 'Скопировано' })}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-sub" />
                <span>{lt(locale, { fa: 'کپی هش', en: 'Copy Hash', ar: 'نسخ التجزئة', zh: '复制哈希', ru: 'Копировать' })}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
