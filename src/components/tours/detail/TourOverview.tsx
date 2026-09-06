'use client';

import { useLocale } from 'next-intl';
import type { Tour } from '@/lib/types';
import { lt } from '@/lib/lt';
import {
  Sparkles,
  CheckCircle2,
  Award,
  ShieldCheck,
  Headphones,
} from 'lucide-react';

interface TourOverviewProps {
  tour: Tour;
}

export function TourOverview({ tour }: TourOverviewProps) {
  const locale = useLocale();

  const description = locale === 'fa' ? tour.description : (tour.descriptionEn || tour.description);
  const highlights = locale === 'fa' ? tour.highlights : (tour.highlightsEn || tour.highlights);

  const perks = [
    {
      icon: Award,
      title: lt(locale, { fa: 'مجوز رسمی میراث فرهنگی', en: 'Official Heritage Certified', ar: 'مرخص رسمياً', zh: '官方文旅认证', ru: 'Официальная лицензия' }),
      desc: lt(locale, { fa: 'برگزاری مستقیم بدون واسطه با تضمین بالاترین استاندارد کیفی', en: 'Direct execution with guaranteed quality control standards', ar: 'تنفيذ مباشر بأعلى معايير الجودة', zh: '直营运营，严格品质保障', ru: 'Прямая организация по высоким стандартам' }),
    },
    {
      icon: ShieldCheck,
      title: lt(locale, { fa: 'ضمانت بازگشت وجه شفاف', en: 'Transparent Refund Guarantee', ar: 'ضمان استرداد شفاف', zh: '透明退款保障', ru: 'Гарантия возврата средств' }),
      desc: lt(locale, { fa: 'کنسلی آسان و بدون پیچیدگی اداری طبق جدول مصوب', en: 'Hassle-free cancellation policy according to clear schedule', ar: 'إلغاء سهل وفق جدول زمني واضح', zh: '依据透明规则便捷退改', ru: 'Простая отмена по чётким правилам' }),
    },
    {
      icon: Headphones,
      title: lt(locale, { fa: 'پشتیبانی ۲۴ ساعته سفر', en: '24/7 Concierge Support', ar: 'دعم على مدار الساعة', zh: '24小时全程管家', ru: 'Круглосуточная поддержка' }),
      desc: lt(locale, { fa: 'همراهی تیم پشتیبانی فیروزه از لحظه رزرو تا بازگشت به خانه', en: 'Dedicated assistance from booking until safe return home', ar: 'مرافقة فريق الدعم طوال الرحلة', zh: '从预订至返程全程管家护航', ru: 'Сопровождение с момента бронирования до дома' }),
    },
  ];

  return (
    <section id="overview" className="scroll-mt-32 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-xs flex flex-col gap-4 sm:gap-6">
      {/* Title & Description */}
      <div>
        <div className="flex items-center gap-1.5 text-brand-dark font-black text-xs sm:text-sm mb-1">
          <Sparkles size={16} />
          <span>{lt(locale, { fa: 'درباره و تجربه این سفر', en: 'About This Experience', ar: 'حول التجربة', zh: '关于本次旅行', ru: 'Об этом путешествии' })}</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-ink mb-3 sm:mb-4">
          {lt(locale, { fa: 'نگاهی کلی به سفر و جاذبه‌های برگزیده', en: 'Highlights & Journey Overview', ar: 'أبرز المعالم ولمحة عن الرحلة', zh: '行程亮点与旅行综述', ru: 'Главные впечатления и обзор' })}
        </h2>
        <div className="text-xs sm:text-[14px] font-medium text-sub leading-relaxed space-y-2.5 sm:space-y-3 whitespace-pre-line">
          {description}
        </div>
      </div>

      {/* Highlights List */}
      {highlights && highlights.length > 0 && (
        <div className="pt-4 sm:pt-5 border-t border-line">
          <h3 className="text-sm sm:text-base font-black text-ink mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-brand-dark" />
            <span>{lt(locale, { fa: 'مهم‌ترین جاذبه‌ها و تجارب ویژه این تور', en: 'Tour Highlights & Exclusive Activities', ar: 'أهم التجارب والأنشطة المميزة', zh: '行程不可错过的核心体验', ru: 'Ключевые достопримечательности' })}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {highlights.map((h, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-soft/60 border border-line/60 text-xs sm:text-[13px] font-bold text-ink"
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-mint text-brand-dark grid place-items-center shrink-0 mt-0.5 text-[10px] font-black">
                  ✓
                </div>
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust & Value Perks */}
      <div className="pt-4 sm:pt-5 border-t border-line">
        <h3 className="text-sm sm:text-base font-black text-ink mb-3">
          {lt(locale, { fa: 'چرا تورهای اختصاصی فیروزه؟', en: 'Why Choose Firuzo Tours?', ar: 'لماذا جولات فيروزو المتميزة؟', zh: '为什么选择 Firuzo 定制游？', ru: 'Почему выбирают туры Firuzo?' })}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {perks.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-soft border border-line flex flex-col gap-1.5 sm:gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand-dark grid place-items-center">
                  <Icon size={16} />
                </div>
                <h4 className="text-xs sm:text-sm font-black text-ink">{p.title}</h4>
                <p className="text-[11px] sm:text-[11.5px] font-medium text-sub leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
