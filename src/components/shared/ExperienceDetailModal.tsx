'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useBookingStore } from '@/stores/booking-store';
import {
  type SignatureExperience,
  experienceCategoryLabel,
  COUNTRIES,
} from '@/lib/countries';
import { useCountryStore } from '@/stores/country-store';
import { formatMoney } from '@/lib/money';
import { CATEGORY_ICONS } from './CountryExperiences';
import { CATEGORY_PHOTO_MAP, shimmerDataUrl } from '@/lib/image-utils';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { daysFromNow } from '@/lib/utils';
import { dualDate } from '@/lib/jalali';
import {
  X,
  MapPin,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
  Languages,
} from 'lucide-react';
import { AdventureReviewsSection } from './AdventureReviewsSection';

export interface ExperienceDetailModalProps {
  experience: SignatureExperience | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExperienceDetailModal({
  experience,
  isOpen,
  onClose,
}: ExperienceDetailModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const isRtl = ['fa', 'ar'].includes(locale);
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  const { country } = useCountryStore();
  const c = COUNTRIES[country] || COUNTRIES.iran;
  const currency = c.currency;

  const [travelers, setTravelers] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() => daysFromNow(3));
  const [withInterpreter, setWithInterpreter] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !experience) return null;

  const title = locale === 'fa' ? experience.title : (experience.titleEn || experience.title);
  const desc = locale === 'fa' ? experience.desc : (experience.descEn || experience.desc);
  const where = locale === 'fa' ? experience.where : (experience.whereEn || experience.where);
  const when = locale === 'fa' ? experience.when : (experience.whenEn || experience.when);
  const catLabel = experienceCategoryLabel(experience.category, locale);
  const Icon = CATEGORY_ICONS[experience.category] || Sparkles;

  const photo =
    experience.image ||
    CATEGORY_PHOTO_MAP[experience.category] ||
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=75&w=1200';

  const basePrice = experience.fromPrice;
  const interpreterFee = withInterpreter ? 1_200_000 : 0;
  const totalPrice = basePrice * travelers + interpreterFee;

  const dateInfo = dualDate(selectedDate);

  const handleProceedToCheckout = () => {
    setBookingContext({
      type: 'tours',
      id: `exp_${encodeURIComponent(experience.titleEn || experience.title)}`,
      title: `${title} (${catLabel})`,
      subtitle: `${where} • ${num(travelers, locale)} ${lt(locale, { fa: 'مسافر', en: 'traveler(s)', ar: 'مسافر', zh: '人', ru: 'пасс.' })} • ${dateInfo.j || selectedDate}`,
      amount: totalPrice,
      travelDate: selectedDate,
      adults: travelers,
      children: 0,
      meta: {
        adults: String(travelers),
        children: '0',
        category: experience.category,
        where,
        when,
        withInterpreter: String(withInterpreter),
      },
    });

    onClose();
    router.push('/checkout');
  };

  const hasInterpreterSupport =
    experience.category === 'culture' ||
    experience.category === 'theater' ||
    experience.category === 'exhibition' ||
    experience.category === 'festival';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="experience-title"
      className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-0 sm:p-5 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-2xl bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-line overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom sm:slide-in-from-none sm:zoom-in-95 duration-200 my-0 sm:my-auto">
        <div className="sm:hidden absolute top-2 inset-x-0 mx-auto z-20 w-12 h-1.5 rounded-full bg-white/70 shadow-xs" />
        {/* Top Media Header with Close Button */}
        <div className="relative w-full h-52 sm:h-64 shrink-0 bg-soft">
          <Image
            src={photo}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            placeholder="blur"
            blurDataURL={shimmerDataUrl(600, 300)}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/40 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="absolute top-4 end-4 min-w-[44px] min-h-[44px] rounded-full bg-surface/80 hover:bg-surface text-ink backdrop-blur-md grid place-items-center active:scale-95 transition shadow-sm"
          >
            <div className="w-8 h-8 rounded-full bg-surface/90 grid place-items-center">
              <X size={18} />
            </div>
          </button>

          {/* Badges on Hero */}
          <div className="absolute bottom-4 inset-x-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-brand-dark font-black text-xs shadow-sm">
              <Icon size={14} />
              <span>{catLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-xs border border-white/20">
              <Calendar size={13} />
              <span>{when}</span>
            </span>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div>
            <h2 id="experience-title" className="text-xl sm:text-2xl font-black text-ink mb-1.5 leading-snug">
              {title}
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sub">
              <MapPin size={14} className="text-brand-dark shrink-0" />
              <span>{where}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-sub font-bold leading-relaxed">
            {desc}
          </p>

          {/* Highlights & Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-soft/60 border border-line/60 text-xs">
            <div className="flex items-center gap-2 font-bold text-ink">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{lt(locale, { fa: 'راهنما و سرپرست محلی مجرب', en: 'Experienced local tour guide', ar: 'مرشد محلي خبير', zh: '经验丰富的本地导游', ru: 'Опытный местный гид' })}</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-ink">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{lt(locale, { fa: 'ورودیه‌ها و هماهنگی کامل اماکن', en: 'All entry tickets & permits included', ar: 'جميع تذاكر الدخول مشمولة', zh: '包含全部门票与出入协调', ru: 'Входные билеты включены' })}</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-ink">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{lt(locale, { fa: 'پوشش کامل بیمه مسافرتی سامان', en: 'Comprehensive travel insurance', ar: 'تأمين سفر شامل', zh: '全程旅行综合保险保障', ru: 'Полная туристическая страховка' })}</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-ink">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{lt(locale, { fa: 'تضمین کمترین نرخ و بدون هزینه مخفی', en: 'Best rate guarantee, no hidden fees', ar: 'ضمان أفضل سعر دون رسوم خفية', zh: '最优价格保证无隐形消费', ru: 'Гарантия лучшей цены' })}</span>
            </div>
          </div>

          {/* Interpreter Add-on (if applicable) */}
          {hasInterpreterSupport && (
            <label className="p-3 rounded-2xl border border-line flex items-center justify-between cursor-pointer hover:bg-soft/50 transition">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-gold-soft text-price grid place-items-center">
                  <Languages size={16} />
                </span>
                <div>
                  <span className="text-xs font-black text-ink block">
                    {lt(locale, { fa: 'مترجم همراه اختصاصی (انگلیسی / چینی / روسی)', en: 'Private Interpreter (EN / ZH / RU)', ar: 'مترجم مرافق خاص (إنجليزي / صيني / روسي)', zh: '专属同程翻译陪同（英/中/俄）', ru: 'Персональный гид-переводчик' })}
                  </span>
                  <span className="text-[11px] font-bold text-sub block">
                    + {formatMoney(1200000, currency, locale)} {lt(locale, { fa: 'برای کل برنامه', en: 'for entire trip', ar: 'لكامل الرحلة', zh: '全行程费用', ru: 'за всю программу' })}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={withInterpreter}
                onChange={(e) => setWithInterpreter(e.target.checked)}
                className="w-5 h-5 rounded border-line text-brand focus:ring-brand accent-brand"
              />
            </label>
          )}

          {/* Adventure Reviews & Community Feedback */}
          <div className="pt-2 border-t border-line/80">
            <AdventureReviewsSection
              experienceTitle={title}
              locale={locale}
            />
          </div>

          {/* Booking Config: Date & Travelers */}
          <div className="pt-2 border-t border-line/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-ink block">{lt(locale, { fa: 'تعداد مسافران', en: 'Number of Travelers', ar: 'عدد المسافرين', zh: '出行人数', ru: 'Количество пассажиров' })}</span>
                <span className="text-[11px] font-bold text-sub">
                  {lt(locale, { fa: 'قیمت هر نفر: ', en: 'Price per person: ', ar: 'السعر للشخص: ', zh: '每人价格：', ru: 'Цена за человека: ' })}
                  {formatMoney(basePrice, currency, locale)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTravelers((v) => Math.max(1, v - 1))}
                  disabled={travelers <= 1}
                  className="min-w-[44px] min-h-[44px] rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  aria-label={lt(locale, { fa: 'کاهش مسافر', en: 'Decrease traveler', ar: 'تقليل المسافرين', zh: '减少人数', ru: 'Уменьшить' })}
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-black text-base text-ink font-price num">
                  {num(travelers, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => setTravelers((v) => Math.min(10, v + 1))}
                  disabled={travelers >= 10}
                  className="min-w-[44px] min-h-[44px] rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  aria-label={lt(locale, { fa: 'افزایش مسافر', en: 'Increase traveler', ar: 'زيادة المسافرين', zh: '增加人数', ru: 'Увеличить' })}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Quick Date Picker Pills */}
            <div>
              <span className="text-xs font-black text-ink block mb-2">
                {lt(locale, { fa: 'انتخاب تاریخ اجرای ماجراجویی:', en: 'Select experience date:', ar: 'اختر موعد الرحلة:', zh: '选择出行日期：', ru: 'Выберите дату поездки:' })}
              </span>
              <div className="flex items-center gap-2 overflow-x-auto snap-x touch-pan-x pb-1 scrollbar-none">
                {[1, 3, 7, 14].map((d) => {
                  const dateStr = daysFromNow(d);
                  const isSel = selectedDate === dateStr;
                  const info = dualDate(dateStr);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className={`min-h-[44px] px-3.5 py-1.5 rounded-xl border text-xs font-black transition shrink-0 flex flex-col items-center justify-center cursor-pointer ${
                        isSel
                          ? 'bg-brand text-white border-brand shadow-xs'
                          : 'bg-soft border-line text-sub hover:text-ink hover:bg-line/50'
                      }`}
                    >
                      <span>{info.weekday}</span>
                      <span className="text-[10px] opacity-80">{info.j}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer -> DIRECT TO CHECKOUT */}
        <div className="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line bg-surface flex items-center justify-between gap-4 shadow-elev-1">
          <div>
            <span className="text-[11px] font-bold text-sub block">
              {lt(locale, { fa: 'مبلغ کل و نهایی:', en: 'Total payable:', ar: 'المبلغ الإجمالي:', zh: '应付总额：', ru: 'Итого к оплате:' })}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-price font-price num">
                {formatMoney(totalPrice, currency, locale)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleProceedToCheckout}
            className="min-h-[50px] px-6 rounded-2xl bg-action hover:bg-action-hover active:bg-action-active text-ink font-black text-sm transition-all shadow-[0_6px_20px_rgba(240,166,42,0.35)] flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Lock size={16} className="text-ink" />
            <span>{lt(locale, { fa: 'رزرو و ادامه به پرداخت', en: 'Reserve & Checkout', ar: 'الحجز والمتابعة للدفع', zh: '立即预订并结算', ru: 'Забронировать и оплатить' })}</span>
            {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
