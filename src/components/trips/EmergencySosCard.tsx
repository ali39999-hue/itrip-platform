'use client';

import React, { useState } from 'react';
import {
  LifeBuoy,
  PhoneCall,
  ShieldAlert,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { lt } from '@/lib/lt';

interface EmergencySosCardProps {
  countryName?: string;
  reference?: string;
  locale: string;
  className?: string;
}

export function EmergencySosCard({
  countryName = 'کشور مقصد',
  reference = 'ITR-0000',
  locale,
  className = '',
}: EmergencySosCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const sosSmsText = `پیام اضطراری فیروزو: اینجانب مسافر با کد رزرو ${reference} در ${countryName} هستم و نیاز فوری به کمک و راهنمایی دارم.`;

  const copySosMessage = () => {
    navigator.clipboard.writeText(sosSmsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 p-5 overflow-hidden transition ${className}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white grid place-items-center shrink-0 shadow-xs">
            <LifeBuoy size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-rose-950 dark:text-rose-200 m-0">
              {lt(locale, {
                fa: 'پشتیبانی اضطراری و SOS در طول سفر',
                en: 'In-Trip Emergency SOS & Consular Support',
                ar: 'الدعم الطارئ وخدمة SOS أثناء السفر',
                zh: '行程紧急救助与领事服务',
                ru: 'Экстренная помощь и SOS в поездке',
              })}
            </h3>
            <span className="text-[11px] text-rose-800/80 dark:text-rose-300 font-bold">
              شماره‌های امداد، پلیس توریستی و راهنمای مفقودی مدارک
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="h-8 px-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-black transition flex items-center gap-1 hover:bg-rose-50"
        >
          <span>{expanded ? 'بستن راهنما' : 'مشاهده شماره‌های امدادی'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-5 pt-4 border-t border-rose-200/60 dark:border-rose-900/60 space-y-4 text-xs animate-in fade-in duration-200">
          {/* Direct Dial Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <a
              href="tel:112"
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 text-ink flex items-center gap-2.5 hover:border-rose-400 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 grid place-items-center shrink-0">
                <PhoneCall size={15} />
              </div>
              <div>
                <span className="text-[10px] text-sub block font-bold">اورژانس و امداد بین‌المللی</span>
                <span className="font-mono text-sm font-black text-rose-600">112</span>
              </div>
            </a>

            <a
              href="tel:155"
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 text-ink flex items-center gap-2.5 hover:border-rose-400 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 grid place-items-center shrink-0">
                <ShieldAlert size={15} />
              </div>
              <div>
                <span className="text-[10px] text-sub block font-bold">پلیس گردشگری مقصد</span>
                <span className="font-mono text-sm font-black text-amber-700">155 / 999</span>
              </div>
            </a>

            <a
              href="tel:+982188880000"
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 text-ink flex items-center gap-2.5 hover:border-rose-400 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
                <LifeBuoy size={15} />
              </div>
              <div>
                <span className="text-[10px] text-sub block font-bold">پشتیبانی شبانه‌روزی فیروزو</span>
                <span className="font-mono text-xs font-black text-brand-dark">021-88880000</span>
              </div>
            </a>
          </div>

          {/* Lost Document Quick Guide */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 text-ink space-y-1.5 font-bold">
            <div className="flex items-center gap-1.5 text-rose-700 font-black text-xs">
              <FileQuestion size={15} />
              <span>در صورت مفقودی گذرنامه چه باید کرد؟</span>
            </div>
            <p className="text-[11px] text-sub leading-relaxed m-0">
              ۱. بلافاصله به نزدیک‌ترین کلانتری پلیس محل مراجعه و برگه گزارش مفقودی (Police Report) دریافت کنید.<br />
              ۲. همراه با عکس پرسنلی، مدارک شناسایی ملی و کپی واچر به کنسولگری یا سفارت مراجعه کنید تا برگه عبور فوری صادر گردد.<br />
              ۳. تیم پشتیبانی فیروزو در هر لحظه کپی مدارک رمزگذاری‌شده شما را برای تسریع فرآیند در اختیارتان می‌گذارد.
            </p>
          </div>

          {/* SOS Message Generator */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900 border border-rose-200">
            <span className="text-[11px] text-sub font-mono truncate">{sosSmsText}</span>
            <button
              type="button"
              onClick={copySosMessage}
              className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition flex items-center gap-1 shrink-0"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'کپی شد' : 'کپی متن پیامک SOS'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
