'use client';

import { useLocale } from 'next-intl';
import type { Tour, TourDepartureDate } from '@/lib/types';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  CalendarDays,
  CalendarCheck,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface TourDepartureDatesProps {
  tour: Tour;
  selectedDateId: string;
  onSelectDate: (d: TourDepartureDate) => void;
}

export function TourDepartureDates({
  tour,
  selectedDateId,
  onSelectDate,
}: TourDepartureDatesProps) {
  const locale = useLocale();
  const dates = tour.departureDates || [];

  if (dates.length === 0) {
    return null;
  }

  return (
    <section id="dates" className="scroll-mt-32 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-xs flex flex-col gap-4 sm:gap-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-1.5 text-brand-dark font-black text-xs sm:text-sm mb-1">
          <CalendarDays size={16} />
          <span>{lt(locale, { fa: 'تقویم حرکت و ظرفیت‌ها', en: 'Departure Schedule & Availability', ar: 'مواعيد الرحلات والشاغر', zh: '发团班期与余位', ru: 'Расписание выездов' })}</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-ink">
          {lt(locale, { fa: 'تاریخ‌های حرکت پیش‌رو با تضمین اجرا و قیمت قطعی', en: 'Upcoming Departures with Guaranteed Execution', ar: 'مواعيد المغادرة القادمة مع تأكيد التنفيذ', zh: '近期发团计划与余位即时查询', ru: 'Ближайшие гарантированные даты' })}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dates.map((d) => {
          const isSelected = d.id === selectedDateId;

          return (
            <div
              key={d.id}
              onClick={() => onSelectDate(d)}
              className={`p-3.5 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'bg-mint/20 border-brand shadow-sm ring-2 ring-brand/20'
                  : 'bg-soft/50 border-line hover:border-brand/40 hover:bg-soft'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-ink">
                  <CalendarCheck size={14} className="text-brand-dark shrink-0" />
                  <span className="font-mono">{d.startDate}</span>
                  <span className="text-sub font-normal">تا</span>
                  <span className="font-mono">{d.endDate}</span>
                </span>

                {d.guaranteed && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11px] font-black text-brand-dark bg-mint border border-brand/20 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={11} /> {lt(locale, { fa: 'حرکت قطعی', en: 'Guaranteed', ar: 'مؤكد', zh: '铁定成团', ru: 'Гарантирован' })}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/60">
                <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-sub">
                  <Users size={13} className="text-brand-dark shrink-0" />
                  <span>{lt(locale, { fa: 'ظرفیت:', en: 'Seats:', ar: 'الشاغر:', zh: '余位：', ru: 'Мест:' })}</span>
                  <b className="text-ink font-mono">{num(d.availableSeats, locale)} {lt(locale, { fa: 'صندلی', en: 'seats', ar: 'مقاعد', zh: '位', ru: 'мест' })}</b>
                </div>

                <div className="text-end">
                  <div className="text-xs sm:text-base font-black text-price font-mono">
                    {num(d.price, locale)}
                    <span className="text-[10px] sm:text-[11px] font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                  </div>
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-sub block">{lt(locale, { fa: 'هر نفر بزرگسال', en: 'per adult', ar: 'لكل شخص', zh: '每位成人', ru: 'за взрослого' })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
