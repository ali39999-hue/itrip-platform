'use client';

import { useTranslations } from 'next-intl';
import { num } from '@/lib/format';
import { EXPERIENCE_CATEGORY_META } from '@/lib/countries';
import { CATEGORY_ICONS } from '@/components/shared/CountryExperiences';
import { Plane, BedDouble, Sparkles, CalendarDays, MapPin, Sun, Sunset, MoonStar, type LucideIcon } from 'lucide-react';
import type { PickedExperience, PlanPackage } from '@/hooks/usePlanner';

interface PlannerTimelineProps {
  plan: PlanPackage;
  days: number;
  locale: string;
  isEn: boolean;
  onRegenerate?: () => void;
  onEditAnswers?: () => void;
}

const slotIcon = (slot: number): LucideIcon => (slot === 1 ? Sun : slot === 2 ? Sunset : MoonStar);

export function PlannerTimeline({ plan, days, locale, isEn, onRegenerate, onEditAnswers }: PlannerTimelineProps) {
  const t = useTranslations('Plan');

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <article className="rounded-xl bg-surface border border-line shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-9 h-9 rounded-full bg-brand text-surface grid place-items-center shrink-0"><Plane size={16} /></span>
          <h3 className="text-[15px] font-black m-0">{t('arrivalDay')} — {t('flight')}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] font-bold text-sub">
          <span className="text-ink font-black">{plan.flight.airline} · {plan.flight.flightNo}</span>
          <span dir="ltr">{plan.flight.departureTime} → {plan.flight.arrivalTime}</span>
          <span>{plan.flight.origin} → {plan.flight.destination}</span>
          <span className="text-price font-black num">{num(plan.flightTotal, locale)} <span className="text-[10px]">تومان</span></span>
        </div>
      </article>

      <article className="rounded-xl bg-surface border border-line shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-9 h-9 rounded-full bg-hotel text-surface grid place-items-center shrink-0"><BedDouble size={16} /></span>
          <h3 className="text-[15px] font-black m-0">{t('hotel')}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] font-bold text-sub">
          <span className="text-ink font-black">{isEn ? plan.hotel.nameEn : plan.hotel.name}</span>
          <span className="inline-flex items-center gap-1"><MapPin size={13} /> {isEn ? plan.hotel.cityEn : plan.hotel.city}</span>
          <span>{t('hotelNights', { nights: num(plan.nights, locale), rooms: num(plan.rooms, locale) })}</span>
          <span className="text-price font-black num">{num(plan.hotelTotal, locale)} <span className="text-[10px]">تومان</span></span>
        </div>
      </article>

      {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
        const dayItems = plan.picked.filter((p: PickedExperience) => p.day === day);
        if (!dayItems.length) return null;
        return (
          <article key={day} className="rounded-xl bg-surface border border-line shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-9 h-9 rounded-full bg-brand-dark text-surface grid place-items-center text-[12px] font-black shrink-0 num">{num(day, locale)}</span>
              <h3 className="text-[15px] font-black m-0">{t('day')} {num(day, locale)}</h3>
            </div>
            <div className="flex flex-col gap-3">
              {dayItems.map(({ e, slot, why }: PickedExperience) => {
                const Icon = CATEGORY_ICONS[e.category];
                const SIcon = slotIcon(slot);
                return (
                  <div key={e.titleEn} className="flex items-start gap-3 p-3.5 rounded-xl bg-soft/60 border border-line/60">
                    <span className="w-9 h-9 rounded-xl bg-mint text-brand-dark grid place-items-center shrink-0"><Icon size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <b className="block text-[13.5px] font-black leading-snug">{isEn ? e.titleEn : e.title}</b>
                      <span className="block text-[11px] font-bold text-brand-dark bg-mint/70 rounded-lg px-2 py-0.5 mt-1 inline-block">{why}</span>
                      <span className="inline-flex items-center gap-2 mt-1.5 text-[10.5px] font-black flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-line text-brand-dark"><SIcon size={11} /> {isEn ? EXPERIENCE_CATEGORY_META[e.category].en : EXPERIENCE_CATEGORY_META[e.category].fa}</span>
                        <span className="inline-flex items-center gap-1 text-sub"><CalendarDays size={11} /> {isEn ? e.whenEn : e.when}</span>
                      </span>
                    </div>
                    <b className="text-price text-[13px] font-black num shrink-0">{num(e.fromPrice, locale)}</b>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}

      {!plan.picked.length && (
        <div className="text-center py-14 bg-surface rounded-xl border border-dashed border-line">
          <Sparkles size={40} className="mx-auto text-line mb-3" />
          <p className="text-sub font-bold text-[13px] m-0">{t('emptyCats')}</p>
        </div>
      )}

            {/* Edit Options / Smart Proposal Refinement */}
      <div className="mt-4 p-5 rounded-2xl border-2 border-brand/30 bg-surface">
        <h4 className="text-[14px] font-black mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-brand" />
          {isEn ? 'Refine Itinerary with AI' : 'تغییر در برنامه سفر با هوش مصنوعی'}
        </h4>
        <textarea
          className="w-full bg-soft/50 border border-line rounded-xl p-3 text-[13px] font-bold text-ink resize-none focus:border-brand focus:ring-[3px] focus:ring-brand/10 mb-3"
          rows={3}
          placeholder={isEn ? 'E.g., Add more cultural tours, choose a cheaper hotel, or keep day 2 free for rest...' : 'مثلاً: برنامه‌های تفریحی را بیشتر کن، هتل ارزان‌تری می‌خوام، یا روز دوم را برای استراحت خالی بذار...'}
        />
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-brand text-surface text-[13px] font-black shadow-sm transition hover:opacity-90 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-brand"
            onClick={onRegenerate}
          >
            <Sparkles size={14} /> {isEn ? 'Improve Itinerary' : 'بهتر کردن برنامه'}
          </button>
          <button 
            className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-line bg-surface text-ink text-[13px] font-black transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand" 
            onClick={onRegenerate}
          >
            {isEn ? 'Regenerate' : 'عوض کردن'}
          </button>
          <button 
            className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-line bg-surface text-ink text-[13px] font-black transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand"
            onClick={onEditAnswers}
          >
            {isEn ? 'Edit Answers' : 'ویرایش'}
          </button>
        </div>
      </div>
    </div>
  );
}
