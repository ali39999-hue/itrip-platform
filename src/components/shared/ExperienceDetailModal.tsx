'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useBookingStore } from '@/stores/booking-store';
import {
  type SignatureExperience,
  experienceCategoryLabel,
} from '@/lib/countries';
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
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface/30 backdrop-blur-md text-surface font-bold text-xs border border-surface/20">
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
              <span>راهنما و سرپرست محلی مجرب</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-ink">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>ورودیه‌ها و هماهنگی کامل اماکن</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-ink">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>پوشش کامل بیمه مسافرتی سامان</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-ink">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>تضمین کمترین نرخ و بدون هزینه مخفی</span>
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
                  <span className="text-xs font-black text-ink block">مترجم همراه اختصاصی (انگلیسی / چینی / روسی)</span>
                  <span className="text-[11px] font-bold text-sub block">+ ۱,۲۰۰,۰۰۰ تومان برای کل برنامه</span>
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

          {/* Booking Config: Date & Travelers */}
          <div className="pt-2 border-t border-line/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-ink block">تعداد مسافران</span>
                <span className="text-[11px] font-bold text-sub">قیمت هر نفر: {num(basePrice, locale)} تومان</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTravelers((v) => Math.max(1, v - 1))}
                  disabled={travelers <= 1}
                  className="w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                  aria-label="کاهش مسافر"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-black text-base text-ink">
                  {travelers}
                </span>
                <button
                  type="button"
                  onClick={() => setTravelers((v) => Math.min(10, v + 1))}
                  disabled={travelers >= 10}
                  className="w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                  aria-label="افزایش مسافر"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Quick Date Picker Pills */}
            <div>
              <span className="text-xs font-black text-ink block mb-2">انتخاب تاریخ اجرای تجربه:</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[1, 3, 7, 14].map((d) => {
                  const dateStr = daysFromNow(d);
                  const isSel = selectedDate === dateStr;
                  const info = dualDate(dateStr);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className={`min-h-[42px] px-3.5 py-1.5 rounded-xl border text-xs font-black transition shrink-0 flex flex-col items-center justify-center ${
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
            <span className="text-[11px] font-bold text-sub block">مبلغ کل و نهایی:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-price">{num(totalPrice, locale)}</span>
              <span className="text-xs font-black text-sub">تومان</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleProceedToCheckout}
            className="min-h-[50px] px-6 rounded-2xl bg-action hover:bg-action-hover active:bg-action-active text-ink font-black text-sm transition-all shadow-[0_6px_20px_rgba(240,166,42,0.35)] flex items-center gap-2 active:scale-95"
          >
            <Lock size={16} className="text-ink" />
            <span>رزرو و ادامه به پرداخت</span>
            {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
