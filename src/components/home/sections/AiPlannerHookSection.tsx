'use client';

import { Link } from '@/i18n/routing';
import { Sparkles, ArrowLeft } from 'lucide-react';

export function AiPlannerHookSection() {

  const samplePrompts = [
    'برنامه‌ریزی ۴ روزه مشهد با هتل ۵ ستاره و گشت‌های تاریخی',
    'سفر اقتصادی ۳ روزه به اصفهان برای خانواده ۴ نفره',
    'تور لوکس شیراز با اقامت در بوتیک‌هتل سنتی و راهنمای انگلیسی‌زبان',
  ];

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10 bg-gradient-to-br from-mint/50 via-soft to-surface border-y border-line/60">
      <div className="max-w-[1280px] mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand text-surface text-xs font-bold shadow-sm mx-auto">
          <Sparkles size={14} />
          <span>هوش مصنوعی سفرساز فیروز</span>
        </div>

        <h2 className="text-2xl md:text-4xl font-black text-ink tracking-tight max-w-2xl mx-auto">
          برنامه سفر اختصاصی خود را در کمتر از ۱۰ ثانیه بسازید
        </h2>

        <p className="text-xs sm:text-sm text-sub max-w-xl mx-auto leading-relaxed">
          تنها با نوشتن هدف سفر و بودجه خود، برنامه روز به روز، هتل‌های پیشنهادی، پروازها و هزینه‌های دقیق را یکجا تحویل بگیرید.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto pt-2">
          {samplePrompts.map((prompt, idx) => (
            <Link
              key={idx}
              href={`/plan?q=${encodeURIComponent(prompt)}`}
              className="px-4 py-2 rounded-xl bg-surface border border-line hover:border-brand/40 text-xs font-bold text-ink hover:text-brand-dark transition-colors shadow-sm"
            >
              {prompt} ←
            </Link>
          ))}
        </div>

        <div className="pt-4">
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl bg-action hover:bg-action-hover text-[#14201f] text-sm font-black shadow-md hover:shadow-elev-2 transition-all"
          >
            <span>شروع برنامه‌ریزی هوشمند رایگان</span>
            <ArrowLeft size={16} className="ltr:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
