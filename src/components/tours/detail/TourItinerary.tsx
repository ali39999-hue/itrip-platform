'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { Tour } from '@/lib/types';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { TourImage } from '../TourImage';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Utensils,
  Building2,
} from 'lucide-react';

interface TourItineraryProps {
  tour: Tour;
}

export function TourItinerary({ tour }: TourItineraryProps) {
  const locale = useLocale();
  const itinerary = tour.itinerary || [];
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 1: true, 2: true });

  function toggleDay(day: number) {
    setOpenDays((prev) => ({ ...prev, [day]: !prev[day] }));
  }

  function expandAll() {
    const all: Record<number, boolean> = {};
    itinerary.forEach((d) => { all[d.day] = true; });
    setOpenDays(all);
  }

  function collapseAll() {
    setOpenDays({});
  }

  if (itinerary.length === 0) {
    return null;
  }

  return (
    <section id="itinerary" className="scroll-mt-32 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-xs flex flex-col gap-4 sm:gap-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-1.5 text-brand-dark font-black text-xs sm:text-sm mb-1">
            <CalendarDays size={16} />
            <span>{lt(locale, { fa: 'برنامه روزشمار و زمان‌بندی سفر', en: 'Daily Itinerary', ar: 'الجدول اليومي المفصل', zh: '每日详细行程规划', ru: 'Подробный маршрут' })}</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-ink">
            {lt(locale, { fa: 'سفرنامه گام‌به‌گام با جزئیات کامل روزانه', en: 'Full Daily Schedule & Activities', ar: 'تفاصيل الرحلة والأنشطة اليومية', zh: '分日活动与景点安排', ru: 'График и мероприятия' })}
          </h2>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-soft hover:bg-line/60 text-ink text-[11px] sm:text-xs font-bold transition cursor-pointer"
          >
            {lt(locale, { fa: 'باز کردن همه', en: 'Expand All', ar: 'توسيع الكل', zh: '全部展开', ru: 'Развернуть' })}
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-soft hover:bg-line/60 text-ink text-[11px] sm:text-xs font-bold transition cursor-pointer"
          >
            {lt(locale, { fa: 'بستن همه', en: 'Collapse All', ar: 'طي الكل', zh: '全部折叠', ru: 'Свернуть' })}
          </button>
        </div>
      </div>

      {/* Timeline list */}
      <div className="relative space-y-3 sm:space-y-4">
        {itinerary.map((dayItem) => {
          const isOpen = !!openDays[dayItem.day];
          const dayTitle = locale === 'fa' ? dayItem.title : (dayItem.titleEn || dayItem.title);
          const dayDesc = locale === 'fa' ? dayItem.description : (dayItem.descriptionEn || dayItem.description);
          const activities = locale === 'fa' ? dayItem.activities : (dayItem.activitiesEn || dayItem.activities);
          const accommodation = locale === 'fa' ? dayItem.accommodation : (dayItem.accommodationEn || dayItem.accommodation);

          return (
            <div
              key={dayItem.day}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isOpen ? 'bg-surface border-brand/40 shadow-xs' : 'bg-soft/40 border-line hover:border-line/80'
              }`}
            >
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => toggleDay(dayItem.day)}
                className="w-full flex items-start sm:items-center justify-between gap-3 p-3.5 sm:p-5 text-start cursor-pointer select-none"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-brand/10 text-brand-dark flex flex-col items-center justify-center shrink-0 border border-brand/20 mt-0.5 sm:mt-0">
                    <span className="text-[9px] sm:text-[10px] font-extrabold leading-none">
                      {lt(locale, { fa: 'روز', en: 'Day', ar: 'اليوم', zh: '第', ru: 'День' })}
                    </span>
                    <span className="text-sm sm:text-base font-black leading-none font-mono mt-0.5">
                      {num(dayItem.day, locale)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-base font-black text-ink leading-snug line-clamp-2">
                      {dayTitle}
                    </h3>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[11px] sm:text-[11.5px] font-bold text-sub flex-wrap">
                      <span className="flex items-center gap-1">
                        <Utensils size={11} className="text-brand-dark" />
                        <span>
                          {dayItem.meals.breakfast ? `${lt(locale, { fa: 'صبحانه', en: 'B', ar: 'إفطار', zh: '早', ru: 'З' })} ✓ ` : ''}
                          {dayItem.meals.lunch ? `${lt(locale, { fa: 'ناهار', en: 'L', ar: 'غداء', zh: '午', ru: 'О' })} ✓ ` : ''}
                          {dayItem.meals.dinner ? `${lt(locale, { fa: 'شام', en: 'D', ar: 'عشاء', zh: '晚', ru: 'У' })} ✓` : ''}
                          {!dayItem.meals.breakfast && !dayItem.meals.lunch && !dayItem.meals.dinner && lt(locale, { fa: 'بدون غذا', en: 'No meals', ar: 'بدون وجبات', zh: '自理', ru: 'Без питания' })}
                        </span>
                      </span>
                      {accommodation && (
                        <span className="hidden sm:inline-flex items-center gap-1 truncate max-w-xs">
                          • <Building2 size={11} className="text-brand-dark shrink-0" />
                          <span className="truncate">{accommodation}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-soft text-sub grid place-items-center shrink-0 mt-0.5 sm:mt-0">
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </button>

              {/* Accordion Body */}
              {isOpen && (
                <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 pt-1 border-t border-line/60 flex flex-col gap-3 sm:gap-4 animate-in fade-in duration-200">
                  <p className="text-xs sm:text-[13.5px] font-medium text-sub leading-relaxed pt-2">
                    {dayDesc}
                  </p>

                  {/* Day Activities */}
                  {activities && activities.length > 0 && (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-soft border border-line/60">
                      <span className="text-[11px] sm:text-xs font-black text-ink block mb-1.5">
                        {lt(locale, { fa: 'برنامه‌ها و گشت‌های این روز:', en: 'Planned activities for this day:', ar: 'الأنشطة المخططة لهذا اليوم:', zh: '本日常规体验项目：', ru: 'Программа на этот день:' })}
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-ink">
                        {activities.map((act, actIdx) => (
                          <li key={actIdx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Photo & Stay bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 text-xs font-bold text-sub">
                    {accommodation && (
                      <div className="flex items-center gap-1.5 text-brand-dark bg-mint/50 px-2.5 py-1.5 rounded-xl text-[11.5px]">
                        <Building2 size={13} className="shrink-0" />
                        <span className="shrink-0">{lt(locale, { fa: 'اقامت:', en: 'Stay:', ar: 'الإقامة:', zh: '住宿：', ru: 'Ночлег:' })}</span>
                        <span className="text-ink font-black truncate">{accommodation}</span>
                      </div>
                    )}

                    {dayItem.image && (
                      <div className="relative w-full sm:w-36 aspect-[16/10] sm:aspect-auto sm:h-20 rounded-xl overflow-hidden shrink-0 border border-line">
                        <TourImage
                          src={dayItem.image}
                          alt={dayTitle}
                          sizes="(max-width: 640px) 100vw, 150px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
