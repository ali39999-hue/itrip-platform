'use client';

import { useLocale } from 'next-intl';
import type { Tour } from '@/lib/types';
import { lt } from '@/lib/lt';
import {
  CheckCircle2,
  XCircle,
  PackageCheck,
  FileCheck2,
} from 'lucide-react';

interface TourServicesProps {
  tour: Tour;
}

export function TourServices({ tour }: TourServicesProps) {
  const locale = useLocale();

  const includes = tour.includes || [];
  const excludes = tour.excludes || [
    locale === 'fa' ? 'وعده‌های غذایی خارج از پکیج هتل' : 'Meals not specified in the package',
    locale === 'fa' ? 'عوارض خروج از کشور و خریدهای شخصی' : 'Departure taxes and personal shopping',
    locale === 'fa' ? 'انعام راهنما و راننده' : 'Tips for guide and driver',
  ];

  const requiredDocuments = [
    {
      title: lt(locale, { fa: 'کارت ملی و شناسنامه (تورهای داخلی)', en: 'National ID & Passport', ar: 'الهوية الوطنية وجواز السفر', zh: '有效身份证件与护照', ru: 'Паспорт или удостоверение' }),
      desc: lt(locale, { fa: 'جهت احراز هویت و صدور بلیط پرواز و پذیرش هتل', en: 'Required for flight ticketing and hotel check-in', ar: 'مطلوب لإصدار التذاكر وحجز الفندق', zh: '用于机票出票和酒店实名登记', ru: 'Требуется для билетов и регистрации в отеле' }),
    },
    {
      title: lt(locale, { fa: 'گذرنامه با حداقل ۶ ماه اعتبار (تورهای خارجی)', en: 'Passport with 6+ months validity', ar: 'جواز سفر صالح لمدة ٦ أشهر على الأقل', zh: '有效期6个月以上的护照', ru: 'Загранпаспорт со сроком от 6 месяцев' }),
      desc: lt(locale, { fa: 'برای تورهای خارجی نظیر استانبول و گرجستان', en: 'For international destinations like Istanbul and Georgia', ar: 'للرحلات الدولية مثل إسطنبول وجورجيا', zh: '适用于国际路线如伊斯坦布尔和格鲁吉亚', ru: 'Для зарубежных направлений' }),
    },
    {
      title: lt(locale, { fa: 'بیمه‌نامه و مدارک سفر', en: 'Insurance & Vouchers', ar: 'وثيقة التأمين وقسائم السفر', zh: '保险单与电子凭证', ru: 'Страховка и ваучеры' }),
      desc: lt(locale, { fa: 'بیمه مسافرتی به صورت خودکار توسط فیروزه صادر می‌شود', en: 'Travel insurance is issued automatically by Firuzo', ar: 'يتم إصدار وثيقة التأمين تلقائياً من فيروزو', zh: 'Firuzo 将自动为您出具正规旅行险', ru: 'Страховой полис оформляется автоматически' }),
    },
  ];

  return (
    <section id="services" className="scroll-mt-32 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-xs flex flex-col gap-4 sm:gap-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-1.5 text-brand-dark font-black text-xs sm:text-sm mb-1">
          <PackageCheck size={16} />
          <span>{lt(locale, { fa: 'شفافیت کامل در تعهدات و هزینه‌ها', en: 'Inclusions & Exclusions', ar: 'الخدمات المشمولة وغير المشمولة', zh: '费用包含与自理说明', ru: 'Что включено и не включено' })}</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-ink">
          {lt(locale, { fa: 'خدمات شامل پکیج و موارد خارج از تعهد تور', en: 'What is Included & Excluded in This Tour', ar: 'الخدمات المتضمنة والمستثناة من الجولة', zh: '套餐包含项目与自费自理说明', ru: 'Включенные и дополнительные услуги' })}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Included */}
        <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-mint/30 border border-mint flex flex-col gap-3">
          <div className="flex items-center gap-2 text-brand-dark font-black text-xs sm:text-sm">
            <CheckCircle2 size={16} className="text-brand-dark" />
            <span>{lt(locale, { fa: 'خدمات شامل این تور (رایگان با پکیج)', en: 'Included in the Package (Free)', ar: 'مشمول في الباقة', zh: '费用包含项目', ru: 'Включено в стоимость' })}</span>
          </div>
          <ul className="space-y-2 sm:space-y-2.5">
            {includes.map((inc, i) => (
              <li key={i} className="flex items-start gap-2 text-xs sm:text-[13px] font-bold text-ink">
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-brand-dark text-surface grid place-items-center shrink-0 mt-0.5 text-[9px] sm:text-[10px]">
                  ✓
                </span>
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Excluded */}
        <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-rose-50/50 border border-rose-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-rose-700 font-black text-xs sm:text-sm">
            <XCircle size={16} className="text-rose-600" />
            <span>{lt(locale, { fa: 'موارد خارج از تعهد تور (به عهده مسافر)', en: 'Excluded from the Tour', ar: 'غير مشمول في الباقة', zh: '费用不含项目（自理）', ru: 'Не входит в стоимость' })}</span>
          </div>
          <ul className="space-y-2 sm:space-y-2.5">
            {excludes.map((exc, i) => (
              <li key={i} className="flex items-start gap-2 text-xs sm:text-[13px] font-medium text-sub">
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-100 text-rose-600 grid place-items-center shrink-0 mt-0.5 text-[9px] sm:text-[10px] font-black">
                  ✕
                </span>
                <span>{exc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Required Documents Checklist */}
      <div className="pt-3 sm:pt-4 border-t border-line">
        <h3 className="text-sm sm:text-base font-black text-ink mb-3 flex items-center gap-2">
          <FileCheck2 size={16} className="text-brand" />
          <span>{lt(locale, { fa: 'مدارک و الزامات سفر', en: 'Required Travel Documents', ar: 'الوثائق المطلوبة للسفر', zh: '行前证件与要求', ru: 'Необходимые документы' })}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {requiredDocuments.map((doc, i) => (
            <div key={i} className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-soft border border-line/70 flex flex-col gap-1">
              <h4 className="text-xs sm:text-[13px] font-black text-ink">{doc.title}</h4>
              <p className="text-[10.5px] sm:text-[11px] font-medium text-sub leading-relaxed">{doc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
