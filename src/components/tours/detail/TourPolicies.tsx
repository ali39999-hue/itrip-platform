'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { Tour } from '@/lib/types';
import { lt } from '@/lib/lt';
import {
  ShieldAlert,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

interface TourPoliciesProps {
  tour: Tour;
}

export function TourPolicies({ tour }: TourPoliciesProps) {
  const locale = useLocale();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const policy = tour.cancellationPolicy || {
    freeUntilDays: 7,
    description: 'کنسلی تا ۷ روز پیش از تاریخ حرکت بدون جریمه و با بازگشت ۱۰۰٪ مبلغ است.',
    descriptionEn: 'Free cancellation up to 7 days before departure with 100% refund.',
  };

  const policyDesc = locale === 'fa' ? policy.description : (policy.descriptionEn || policy.description);

  const cancellationSteps = [
    {
      period: lt(locale, { fa: 'بیش از ۷ روز مانده به حرکت', en: 'More than 7 days prior', ar: 'أكثر من ٧ أيام قبل الموعد', zh: '距出行7天以上', ru: 'Более 7 дней до выезда' }),
      penalty: lt(locale, { fa: 'بدون جریمه (بازگشت ۱۰۰٪ وجه)', en: '0% Penalty (Full 100% Refund)', ar: 'بدون غرامة (استرداد ١٠٠٪)', zh: '无手续费（100% 全额退款）', ru: 'Без штрафа (возврат 100%)' }),
      status: 'free',
    },
    {
      period: lt(locale, { fa: 'بین ۷ تا ۳ روز مانده به حرکت', en: 'Between 7 and 3 days prior', ar: 'بين ٧ و ٣ أيام قبل الموعد', zh: '距出行3至7天', ru: 'От 7 до 3 дней' }),
      penalty: lt(locale, { fa: 'کسر ۳۰٪ از کل مبلغ تور', en: '30% Cancellation Fee', ar: 'خصم ٣٠٪ من قيمة الجولة', zh: '扣除套餐总额的30%', ru: 'Удержание 30%' }),
      status: 'partial',
    },
    {
      period: lt(locale, { fa: 'کمتر از ۷۲ ساعت مانده به پرواز', en: 'Less than 72 hours prior', ar: 'أقل من ٧٢ ساعة', zh: '距出行不足72小时', ru: 'Менее 72 часов' }),
      penalty: lt(locale, { fa: 'غیرقابل استرداد (سوخت کامل)', en: 'Non-refundable (100% fee)', ar: 'غير قابل للاسترداد', zh: '不可退改（全额扣除）', ru: 'Без возврата' }),
      status: 'none',
    },
  ];

  const faqs = [
    {
      q: lt(locale, { fa: 'آیا قیمت اعلام‌شده شامل تمامی خدمات است یا هزینه پنهانی وجود دارد؟', en: 'Does the price include everything or are there hidden fees?', ar: 'هل يشمل السعر المعلن جميع الخدمات؟', zh: '公布价格是否包含所有费用？有无隐藏消费？', ru: 'Включены ли все сборы или есть скрытые доплаты?' }),
      a: lt(locale, { fa: 'قیمت اعلام‌شده نهایی و قطعی است؛ شامل پرواز، اقامت هتل، گشت‌های مندرج در برنامه، ورودیه اماکن و بیمه مسافرتی می‌باشد و هیچ‌گونه هزینه مازاد یا اجباری در محل دریافت نمی‌شود.', en: 'The listed rate is final and all-inclusive of listed flights, accommodation, tour admissions, and insurance. No hidden or mandatory fees are collected on-site.', ar: 'السعر المعلن نهائي وشامل لجميع الخدمات المذكورة بدون أي رسوم خفية.', zh: '所展示价格为一口价全包价，含列明航班、酒店、门票及保险，现场绝无强制消费。', ru: 'Окончательная цена включает все заявленные услуги без скрытых доплат.' }),
    },
    {
      q: lt(locale, { fa: 'نحوه تحویل مدارک سفر و بلیط‌ها چگونه است؟', en: 'How are travel documents and flight vouchers delivered?', ar: 'كيف يتم تسليم وثائق السفر والتذاكر؟', zh: '如何接收行程单与机票酒店确认件？', ru: 'Как выдаются ваучеры и билеты?' }),
      a: lt(locale, { fa: 'بلافاصله پس از تکمیل رزرو، قرارداد رسمی و واچر هتل صادر شده و در پنل کاربری شما و پیام‌رسان مربوطه قابل دانلود خواهد بود. همچنین کارشناس اختصاصی تور ۲۴ ساعت قبل با شما تماس می‌گیرد.', en: 'Vouchers and official contracts are generated immediately upon booking and available in your account. Your dedicated concierge will also reach out 24h before departure.', ar: 'يتم إصدار العقد والقسيمة مباشرة بعد الحجز في حسابك الشخصي.', zh: '预订完成后官方凭证与电子行程单立即可查，客服亦将在出行前24小时主动联络。', ru: 'Ваучеры формируются мгновенно в личном кабинете.' }),
    },
    {
      q: lt(locale, { fa: 'آیا امکان تغییر تاریخ یا کنسلی تور وجود دارد؟', en: 'Can I reschedule departure dates or cancel my tour?', ar: 'هل يمكن تغيير التاريخ أو إلغاء الرحلة؟', zh: '是否可以改期或取消行程？', ru: 'Можно ли изменить дату или отменить тур?' }),
      a: lt(locale, { fa: 'بله، تغییر تاریخ تا ۷ روز قبل از حرکت در صورت وجود ظرفیت خالی با هماهنگی پشتیبانی بدون کارمزد انجام می‌شود. کنسلی نیز بر اساس جدول رسمی درج‌شده در همین صفحه صورت می‌گیرد.', en: 'Yes, date changes are free up to 7 days prior subject to availability. Cancellations follow the published policy table.', ar: 'نعم، يمكن تغيير التاريخ قبل ٧ أيام دون رسوم حسب توفر المقاعد.', zh: '距发团7天以上如遇空位可免费协调改期，退订则严格依据本页面公示规则执行。', ru: 'Да, изменение даты возможно за 7 дней до поездки при наличии мест.' }),
    },
  ];

  return (
    <section id="policies" className="scroll-mt-32 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-xs flex flex-col gap-4 sm:gap-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-1.5 text-brand-dark font-black text-xs sm:text-sm mb-1">
          <ShieldAlert size={16} />
          <span>{lt(locale, { fa: 'شرایط کنسلی و قوانین مهم', en: 'Cancellation Policy & Travel Terms', ar: 'شروط الإلغاء والتعليمات', zh: '退改政策与出行须知', ru: 'Правила отмены и условия' })}</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-ink">
          {lt(locale, { fa: 'جدول رسمی استرداد وجه و سوالات پرتکرار', en: 'Refund Schedule & Frequently Asked Questions', ar: 'جدول الاسترداد والأسئلة الشائعة', zh: '阶梯退订明细与高频答疑', ru: 'Таблица возврата и частые вопросы' })}
        </h2>
      </div>

      {/* Cancellation Steps Table */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-soft border border-line">
        <h3 className="text-xs sm:text-sm font-black text-ink mb-2.5 flex items-center gap-1.5">
          <Clock size={15} className="text-brand-dark" />
          <span>{lt(locale, { fa: 'جدول زمان‌بندی جریمه کنسلی تور', en: 'Cancellation Fee Schedule', ar: 'جدول رسوم الإلغاء', zh: '退改手续费阶梯说明', ru: 'Шкала штрафов при отмене' })}</span>
        </h3>

        <div className="space-y-2">
          {cancellationSteps.map((step, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 sm:p-3 rounded-xl bg-surface border border-line/60 text-xs font-bold"
            >
              <span className="text-ink">{step.period}</span>
              <span
                className={`px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black inline-block text-center self-start sm:self-auto ${
                  step.status === 'free'
                    ? 'bg-mint text-brand-dark'
                    : step.status === 'partial'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {step.penalty}
              </span>
            </div>
          ))}
        </div>

        <p className="text-[11px] sm:text-[11.5px] font-medium text-sub mt-2.5 leading-relaxed">
          {policyDesc}
        </p>
      </div>

      {/* FAQs Accordion */}
      <div className="pt-2 border-t border-line">
        <h3 className="text-sm sm:text-base font-black text-ink mb-3 flex items-center gap-1.5">
          <HelpCircle size={16} className="text-brand-dark" />
          <span>{lt(locale, { fa: 'پرسش‌های متداول مسافران', en: 'Frequently Asked Questions', ar: 'الأسئلة الشائعة', zh: '常见问题解答', ru: 'Часто задаваемые вопросы' })}</span>
        </h3>

        <div className="space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;

            return (
              <div
                key={i}
                className="rounded-xl sm:rounded-2xl border border-line/80 overflow-hidden bg-surface transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-2.5 p-3.5 sm:p-4 text-start cursor-pointer select-none"
                >
                  <span className="text-xs sm:text-sm font-black text-ink">{faq.q}</span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-soft text-sub grid place-items-center shrink-0">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-1 text-xs sm:text-[13px] font-medium text-sub leading-relaxed border-t border-line/60 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
