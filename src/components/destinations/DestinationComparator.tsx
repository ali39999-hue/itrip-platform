'use client';

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Clock,
  Coins,
  ShieldCheck,
  Sun,
  Sparkles,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { useRouter } from '@/i18n/routing';

export interface DestinationComparisonProfile {
  id: string;
  nameFa: string;
  nameEn: string;
  countryFa: string;
  countryEn: string;
  dailyBudgetToman: number;
  flightDurationHours: number;
  visaPolicy: { fa: string; en: string; isEasy: boolean };
  bestSeason: { fa: string; en: string };
  avgHotelPerNightToman: number;
  tags: string[];
}

export const DESTINATION_PROFILES: Record<string, DestinationComparisonProfile> = {
  istanbul: {
    id: 'istanbul',
    nameFa: 'استانبول',
    nameEn: 'Istanbul',
    countryFa: 'ترکیه',
    countryEn: 'Turkey',
    dailyBudgetToman: 2500000,
    flightDurationHours: 3.2,
    visaPolicy: { fa: 'بدون نیاز به ویزا (۹۰ روز اقامت رایگان)', en: 'Visa-Free (90 Days)', isEasy: true },
    bestSeason: { fa: 'بهار و پاییز (مطبوع و معتدل)', en: 'Spring & Autumn' },
    avgHotelPerNightToman: 3800000,
    tags: ['خرید و بازار', 'اماکن تاریخی', 'کافه‌گردی', 'تنگه بسفر'],
  },
  dubai: {
    id: 'dubai',
    nameFa: 'دبی',
    nameEn: 'Dubai',
    countryFa: 'امارات متحده عربی',
    countryEn: 'UAE',
    dailyBudgetToman: 4800000,
    flightDurationHours: 2.1,
    visaPolicy: { fa: 'ویزای توریستی الکترونیکی (صدور ۲ روزه)', en: 'E-Visa (2 Days)', isEasy: true },
    bestSeason: { fa: 'آبان تا فروردین (هوای معتدل و ساحلی)', en: 'November to April' },
    avgHotelPerNightToman: 6500000,
    tags: ['برج خلیفه', 'مراکز خرید لوکس', 'تفریحات ساحلی', 'پارک‌های آبی'],
  },
  tbilisi: {
    id: 'tbilisi',
    nameFa: 'تفلیس',
    nameEn: 'Tbilisi',
    countryFa: 'گرجستان',
    countryEn: 'Georgia',
    dailyBudgetToman: 1900000,
    flightDurationHours: 1.8,
    visaPolicy: { fa: 'بدون نیاز به ویزا (۴۵ روز اقامت)', en: 'Visa-Free (45 Days)', isEasy: true },
    bestSeason: { fa: 'اردیبهشت تا مهرماه', en: 'May to October' },
    avgHotelPerNightToman: 2600000,
    tags: ['طبیعت سرسبز', 'بافت تاریخی', 'غذاهای گرجی', 'کوهستان قفقاز'],
  },
  muscat: {
    id: 'muscat',
    nameFa: 'مسقط',
    nameEn: 'Muscat',
    countryFa: 'عمان',
    countryEn: 'Oman',
    dailyBudgetToman: 3500000,
    flightDurationHours: 2.0,
    visaPolicy: { fa: 'بدون نیاز به ویزا (۱۴ روز)', en: 'Visa-Free (14 Days)', isEasy: true },
    bestSeason: { fa: 'پاییز و زمستان', en: 'Autumn & Winter' },
    avgHotelPerNightToman: 4500000,
    tags: ['آرامش و سکوت', 'سواحل بکر', 'معماری اصیل عربی', 'مردمان مهمان‌نواز'],
  },
};

interface DestinationComparatorProps {
  locale: string;
  defaultDest1?: string;
  defaultDest2?: string;
  className?: string;
}

export function DestinationComparator({
  locale,
  defaultDest1 = 'istanbul',
  defaultDest2 = 'dubai',
  className = '',
}: DestinationComparatorProps) {
  const router = useRouter();
  const [dest1Id, setDest1Id] = useState(defaultDest1);
  const [dest2Id, setDest2Id] = useState(defaultDest2);

  const dest1 = DESTINATION_PROFILES[dest1Id] || DESTINATION_PROFILES.istanbul;
  const dest2 = DESTINATION_PROFILES[dest2Id] || DESTINATION_PROFILES.dubai;

  return (
    <div
      className={`rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-ink m-0">
              {lt(locale, {
                fa: 'موتور هوشمند مقایسه دو مقصد گردشگری',
                en: 'Smart Destination Comparison Matrix',
                ar: 'مقارنة الوجهات السياحية الذكية',
                zh: '智能旅游目的地对比矩阵',
                ru: 'Сравнение направлений путешествий',
              })}
            </h3>
            <span className="text-xs text-sub font-bold">
              مقایسه رو در روی هزینه روزانه، شرایط ویزا، مدت پرواز و اقامت
            </span>
          </div>
        </div>

        {/* Destination Selectors */}
        <div className="flex items-center gap-2">
          <select
            value={dest1Id}
            onChange={(e) => setDest1Id(e.target.value)}
            className="h-9 px-3 rounded-xl bg-soft border border-line text-xs font-bold text-ink"
          >
            {Object.values(DESTINATION_PROFILES).map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameFa} ({d.countryFa})
              </option>
            ))}
          </select>

          <span className="text-xs font-black text-sub">VS</span>

          <select
            value={dest2Id}
            onChange={(e) => setDest2Id(e.target.value)}
            className="h-9 px-3 rounded-xl bg-soft border border-line text-xs font-bold text-ink"
          >
            {Object.values(DESTINATION_PROFILES).map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameFa} ({d.countryFa})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Side by Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[dest1, dest2].map((dest, idx) => (
          <div
            key={`dest-slot-${idx}-${dest.id}`}
            className="p-5 rounded-2xl border border-line/80 bg-soft/30 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-sub">
                  مقصد پیشنهادی شماره {idx + 1}
                </span>
                <span className="text-xs font-black text-brand-dark bg-mint px-2 py-0.5 rounded-md">
                  {dest.countryFa}
                </span>
              </div>
              <h4 className="text-xl font-black text-ink m-0">{dest.nameFa}</h4>

              {/* Comparison Metrics */}
              <div className="mt-4 space-y-3 text-xs font-bold text-ink">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-line">
                  <span className="text-sub flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-500" />
                    <span>برآورد هزینه روزانه:</span>
                  </span>
                  <span className="font-mono font-black">
                    {dest.dailyBudgetToman.toLocaleString('fa-IR')} تومان
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-line">
                  <span className="text-sub flex items-center gap-1.5">
                    <Clock size={14} className="text-sky-600" />
                    <span>مدت پرواز از تهران:</span>
                  </span>
                  <span className="font-mono font-black">{dest.flightDurationHours} ساعت مستقیم</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-line">
                  <span className="text-sub flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>شرایط روادید (ویزا):</span>
                  </span>
                  <span className="text-emerald-700 font-black">{dest.visaPolicy.fa}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-line">
                  <span className="text-sub flex items-center gap-1.5">
                    <Sun size={14} className="text-amber-500" />
                    <span>بهترین فصل سفر:</span>
                  </span>
                  <span>{dest.bestSeason.fa}</span>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {dest.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2 py-0.5 rounded-md bg-soft text-[10.5px] font-bold text-sub border border-line/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push(`/plan?dest=${dest.id}`)}
                className="w-full h-10 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles size={14} />
                <span>برنامه‌ریزی هوشمند سفر به {dest.nameFa}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
