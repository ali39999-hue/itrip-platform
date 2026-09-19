'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Clock,
  Coins,
  ShieldCheck,
  Sun,
  Sparkles,
  Hotel,
  Plus,
  Trash2,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName, type CountryId } from '@/lib/countries';

export interface DestinationComparisonProfile {
  id: string;
  nameFa: string;
  nameEn: string;
  countryId: CountryId;
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
  // Iran
  isfahan: {
    id: 'isfahan',
    nameFa: 'اصفهان',
    nameEn: 'Isfahan',
    countryId: 'iran',
    countryFa: 'ایران',
    countryEn: 'Iran',
    dailyBudgetToman: 1200000,
    flightDurationHours: 1.0,
    visaPolicy: { fa: 'سفر داخلی بدون روادید', en: 'Domestic (No Visa)', isEasy: true },
    bestSeason: { fa: 'بهار و پاییز (هوای دلپذیر)', en: 'Spring & Autumn' },
    avgHotelPerNightToman: 2200000,
    tags: ['نصف جهان', 'میدان نقش جهان', 'پل خواجو', 'معماری صفوی', 'هتل عباسی'],
  },
  shiraz: {
    id: 'shiraz',
    nameFa: 'شیراز',
    nameEn: 'Shiraz',
    countryId: 'iran',
    countryFa: 'ایران',
    countryEn: 'Iran',
    dailyBudgetToman: 1100000,
    flightDurationHours: 1.3,
    visaPolicy: { fa: 'سفر داخلی بدون روادید', en: 'Domestic (No Visa)', isEasy: true },
    bestSeason: { fa: 'اردیبهشت‌ماه و پاییز', en: 'May & Autumn' },
    avgHotelPerNightToman: 1950000,
    tags: ['تخت جمشید', 'حافظیه و سعدیه', 'باغ ارم', 'عطر بهارنارنج'],
  },
  kish: {
    id: 'kish',
    nameFa: 'کیش',
    nameEn: 'Kish Island',
    countryId: 'iran',
    countryFa: 'ایران',
    countryEn: 'Iran',
    dailyBudgetToman: 1800000,
    flightDurationHours: 1.8,
    visaPolicy: { fa: 'منطقه آزاد بدون روادید', en: 'Free Zone (No Visa)', isEasy: true },
    bestSeason: { fa: 'آبان تا فروردین', en: 'November to April' },
    avgHotelPerNightToman: 3100000,
    tags: ['تفریحات ساحلی', 'غواصی و جت‌اسکی', 'مراکز خرید', 'هتل‌های لوکس دریایی'],
  },
  mashhad: {
    id: 'mashhad',
    nameFa: 'مشهد',
    nameEn: 'Mashhad',
    countryId: 'iran',
    countryFa: 'ایران',
    countryEn: 'Iran',
    dailyBudgetToman: 950000,
    flightDurationHours: 1.5,
    visaPolicy: { fa: 'سفر داخلی بدون روادید', en: 'Domestic (No Visa)', isEasy: true },
    bestSeason: { fa: 'بهار و اواخر تابستان', en: 'Spring & Late Summer' },
    avgHotelPerNightToman: 1800000,
    tags: ['حرم مطهر', 'پایتخت معنوی', 'شاندیز و طرقبه', 'هتل درویشی'],
  },
  yazd: {
    id: 'yazd',
    nameFa: 'یزد',
    nameEn: 'Yazd',
    countryId: 'iran',
    countryFa: 'ایران',
    countryEn: 'Iran',
    dailyBudgetToman: 1000000,
    flightDurationHours: 1.1,
    visaPolicy: { fa: 'سفر داخلی بدون روادید', en: 'Domestic (No Visa)', isEasy: true },
    bestSeason: { fa: 'پاییز و زمستان', en: 'Autumn & Winter' },
    avgHotelPerNightToman: 1750000,
    tags: ['شهر بادگیرها', 'بافت خشتی جهانی', 'آتشکده زرتشتیان', 'امیرچخماق'],
  },

  // Turkey
  istanbul: {
    id: 'istanbul',
    nameFa: 'استانبول',
    nameEn: 'Istanbul',
    countryId: 'turkey',
    countryFa: 'ترکیه',
    countryEn: 'Turkey',
    dailyBudgetToman: 2500000,
    flightDurationHours: 3.2,
    visaPolicy: { fa: 'بدون نیاز به ویزا (۹۰ روز اقامت رایگان)', en: 'Visa-Free (90 Days)', isEasy: true },
    bestSeason: { fa: 'بهار و پاییز (مطبوع و معتدل)', en: 'Spring & Autumn' },
    avgHotelPerNightToman: 3800000,
    tags: ['خرید و بازار', 'اماکن تاریخی', 'کافه‌گردی', 'تنگه بسفر', 'شاخ طلایی'],
  },
  antalya: {
    id: 'antalya',
    nameFa: 'آنتالیا',
    nameEn: 'Antalya',
    countryId: 'turkey',
    countryFa: 'ترکیه',
    countryEn: 'Turkey',
    dailyBudgetToman: 3200000,
    flightDurationHours: 3.5,
    visaPolicy: { fa: 'بدون نیاز به ویزا (۹۰ روز)', en: 'Visa-Free (90 Days)', isEasy: true },
    bestSeason: { fa: 'خرداد تا مهر (فصل ساحلی)', en: 'June to October' },
    avgHotelPerNightToman: 5200000,
    tags: ['ریزورت‌های All-Inclusive', 'سواحل مدیترانه', 'پارک‌های آبی', 'کالجی'],
  },

  // UAE
  dubai: {
    id: 'dubai',
    nameFa: 'دبی',
    nameEn: 'Dubai',
    countryId: 'uae',
    countryFa: 'امارات متحده عربی',
    countryEn: 'UAE',
    dailyBudgetToman: 4800000,
    flightDurationHours: 2.1,
    visaPolicy: { fa: 'ویزای توریستی الکترونیکی (صدور ۲ روزه)', en: 'E-Visa (2 Days)', isEasy: true },
    bestSeason: { fa: 'آبان تا فروردین (هوای معتدل و ساحلی)', en: 'November to April' },
    avgHotelPerNightToman: 6500000,
    tags: ['برج خلیفه', 'مراکز خرید لوکس', 'تفریحات ساحلی', 'پارک‌های آبی', 'دبی مال'],
  },
  abu_dhabi: {
    id: 'abu_dhabi',
    nameFa: 'ابوظبی',
    nameEn: 'Abu Dhabi',
    countryId: 'uae',
    countryFa: 'امارات متحده عربی',
    countryEn: 'UAE',
    dailyBudgetToman: 4200000,
    flightDurationHours: 2.2,
    visaPolicy: { fa: 'ویزای الکترونیکی امارات', en: 'UAE E-Visa', isEasy: true },
    bestSeason: { fa: 'آبان تا فروردین', en: 'November to April' },
    avgHotelPerNightToman: 5800000,
    tags: ['مسجد شیخ زاید', 'موزه لوور ابوظبی', 'پیست فرمول ۱', 'جزیره یاس'],
  },

  // Georgia
  tbilisi: {
    id: 'tbilisi',
    nameFa: 'تفلیس',
    nameEn: 'Tbilisi',
    countryId: 'georgia',
    countryFa: 'گرجستان',
    countryEn: 'Georgia',
    dailyBudgetToman: 1900000,
    flightDurationHours: 1.8,
    visaPolicy: { fa: 'بدون نیاز به ویزا (۴۵ روز اقامت)', en: 'Visa-Free (45 Days)', isEasy: true },
    bestSeason: { fa: 'اردیبهشت تا مهرماه', en: 'May to October' },
    avgHotelPerNightToman: 2600000,
    tags: ['طبیعت سرسبز', 'بافت تاریخی', 'غذاهای گرجی', 'کوهستان قفقاز', 'حمام گوگردی'],
  },
  batumi: {
    id: 'batumi',
    nameFa: 'باتومی',
    nameEn: 'Batumi',
    countryId: 'georgia',
    countryFa: 'گرجستان',
    countryEn: 'Georgia',
    dailyBudgetToman: 2100000,
    flightDurationHours: 2.0,
    visaPolicy: { fa: 'بدون نیاز به ویزا (۴۵ روز)', en: 'Visa-Free (45 Days)', isEasy: true },
    bestSeason: { fa: 'تیر تا شهریور (ساحلی)', en: 'July to September' },
    avgHotelPerNightToman: 3100000,
    tags: ['سواحل دریای سیاه', 'بلوار ساحلی باتومی', 'برج الفبا', 'باغ گیاه‌شناسی'],
  },

  // Oman
  muscat: {
    id: 'muscat',
    nameFa: 'مسقط',
    nameEn: 'Muscat',
    countryId: 'oman',
    countryFa: 'عمان',
    countryEn: 'Oman',
    dailyBudgetToman: 3500000,
    flightDurationHours: 2.0,
    visaPolicy: { fa: 'بدون نیاز به ویزا (۱۴ روز)', en: 'Visa-Free (14 Days)', isEasy: true },
    bestSeason: { fa: 'پاییز و زمستان', en: 'Autumn & Winter' },
    avgHotelPerNightToman: 4500000,
    tags: ['آرامش و سکوت', 'سواحل بکر', 'معماری اصیل عربی', 'مسجد جامع سلطان قابوس'],
  },
  salalah: {
    id: 'salalah',
    nameFa: 'صلاله',
    nameEn: 'Salalah',
    countryId: 'oman',
    countryFa: 'عمان',
    countryEn: 'Oman',
    dailyBudgetToman: 3800000,
    flightDurationHours: 3.2,
    visaPolicy: { fa: 'بدون نیاز به ویزا (۱۴ روز)', en: 'Visa-Free (14 Days)', isEasy: true },
    bestSeason: { fa: 'تابستان (جشنواره خریف و باران‌های موسمی)', en: 'Khareef Monsoon (Summer)' },
    avgHotelPerNightToman: 4900000,
    tags: ['طبیعت استوایی خریف', 'آبشارهای فصلی', 'مزارع نارگیل و موز', 'سواحل اقیانوسی'],
  },

  // Russia
  moscow: {
    id: 'moscow',
    nameFa: 'مسکو',
    nameEn: 'Moscow',
    countryId: 'russia',
    countryFa: 'روسیه',
    countryEn: 'Russia',
    dailyBudgetToman: 3900000,
    flightDurationHours: 3.8,
    visaPolicy: { fa: 'ویزای الکترونیکی توریستی (صدور ۴ روزه)', en: 'E-Visa (4 Days)', isEasy: true },
    bestSeason: { fa: 'خرداد تا شهریور (تابستان دلپذیر)', en: 'Summer (June-August)' },
    avgHotelPerNightToman: 4600000,
    tags: ['میدان سرخ', 'کاخ کرملین', 'متروی تاریخی مسکو', 'تئاتر بولشوی'],
  },
  saint_petersburg: {
    id: 'saint_petersburg',
    nameFa: 'سن‌پترزبورگ',
    nameEn: 'Saint Petersburg',
    countryId: 'russia',
    countryFa: 'روسیه',
    countryEn: 'Russia',
    dailyBudgetToman: 3600000,
    flightDurationHours: 4.2,
    visaPolicy: { fa: 'ویزای الکترونیکی توریستی', en: 'E-Visa', isEasy: true },
    bestSeason: { fa: 'خرداد و تیر (شب‌های روشن)', en: 'White Nights (June-July)' },
    avgHotelPerNightToman: 4300000,
    tags: ['موزه ارمیتاژ', 'کاخ پترهوف', 'شب‌های روشن', 'کانال‌های آبی'],
  },

  // China
  beijing: {
    id: 'beijing',
    nameFa: 'پکن',
    nameEn: 'Beijing',
    countryId: 'china',
    countryFa: 'چین',
    countryEn: 'China',
    dailyBudgetToman: 4100000,
    flightDurationHours: 7.2,
    visaPolicy: { fa: 'ویزای توریستی L با کارگزاری', en: 'L Tourist Visa', isEasy: false },
    bestSeason: { fa: 'شهریور و مهر (پاییز طلایی)', en: 'Golden Autumn' },
    avgHotelPerNightToman: 4800000,
    tags: ['دیوار بزرگ چین', 'شهر ممنوعه', 'کاخ تابستانی', 'میدان تیان‌آن‌من'],
  },
  shanghai: {
    id: 'shanghai',
    nameFa: 'شانگهای',
    nameEn: 'Shanghai',
    countryId: 'china',
    countryFa: 'چین',
    countryEn: 'China',
    dailyBudgetToman: 4600000,
    flightDurationHours: 7.5,
    visaPolicy: { fa: 'ویزای توریستی چین', en: 'China Visa', isEasy: false },
    bestSeason: { fa: 'بهار و پاییز', en: 'Spring & Autumn' },
    avgHotelPerNightToman: 5400000,
    tags: ['برج شانگهای', 'اسکله بوند', 'خیابان نانجینگ', 'قطار مگلو'],
  },
};

export const COUNTRY_DEFAULT_PAIRS: Record<CountryId, [string, string]> = {
  iran: ['isfahan', 'shiraz'],
  turkey: ['istanbul', 'antalya'],
  uae: ['dubai', 'abu_dhabi'],
  georgia: ['tbilisi', 'batumi'],
  oman: ['muscat', 'salalah'],
  russia: ['moscow', 'saint_petersburg'],
  china: ['beijing', 'shanghai'],
};

interface DestinationComparatorProps {
  locale: string;
  defaultDest1?: string;
  defaultDest2?: string;
  className?: string;
}

export function DestinationComparator({
  locale,
  defaultDest1,
  defaultDest2,
  className = '',
}: DestinationComparatorProps) {
  const router = useRouter();
  const { country } = useCountryStore();

  const activePair = COUNTRY_DEFAULT_PAIRS[country] || ['isfahan', 'shiraz'];
  
  // Support 2 to 4 destinations simultaneously
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const d1 = defaultDest1 || activePair[0];
    const d2 = defaultDest2 || activePair[1];
    return [d1, d2];
  });

  // Synchronize destination comparison automatically when country changes
  useEffect(() => {
    if (country && COUNTRY_DEFAULT_PAIRS[country]) {
      const pair = COUNTRY_DEFAULT_PAIRS[country];
      setSelectedIds((prev) => {
        const next = [...prev];
        next[0] = pair[0];
        next[1] = pair[1];
        return next;
      });
    }
  }, [country]);

  const handleSelectDest = (index: number, newId: string) => {
    setSelectedIds((prev) => {
      const copy = [...prev];
      copy[index] = newId;
      return copy;
    });
  };

  const handleAddDestination = () => {
    if (selectedIds.length >= 4) return;
    // Pick an unused destination
    const allIds = Object.keys(DESTINATION_PROFILES);
    const candidate = allIds.find((id) => !selectedIds.includes(id)) || allIds[0];
    setSelectedIds((prev) => [...prev, candidate]);
  };

  const handleRemoveDestination = (index: number) => {
    if (selectedIds.length <= 2) return;
    setSelectedIds((prev) => prev.filter((_, idx) => idx !== index));
  };

  const destinations = selectedIds.map((id) => DESTINATION_PROFILES[id] || DESTINATION_PROFILES.isfahan);

  return (
    <div className={`rounded-3xl border border-line bg-surface p-4 sm:p-6 shadow-sm space-y-6 ${className}`}>
      {/* Header with Title and Add Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-ink m-0">
                {lt(locale, {
                  fa: 'موتور هوشمند مقایسه دو مقصد گردشگری و مقاصد برگزیده',
                  en: 'Smart Multi-Destination Comparison Engine',
                  ar: 'محرك مقارنة الوجهات السياحية الذكي',
                  zh: '智能多目的地对比引擎（至多4个城市）',
                  ru: 'Интеллектуальное сравнение направлений (до 4 городов)',
                })}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-mint text-brand-dark">
                <span>{COUNTRIES[country]?.flag}</span>
                <span>{countryName(country, locale)}</span>
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-soft text-sub border border-line">
                {lt(locale, {
                  fa: `${num(selectedIds.length, locale)} مقصد از ۴`,
                  en: `${selectedIds.length} of 4 destinations`,
                  ar: `${selectedIds.length} من 4 وجهات`,
                  zh: `${selectedIds.length}/4 个目的地`,
                  ru: `${selectedIds.length} из 4 направлений`,
                })}
              </span>
            </div>
            <p className="text-xs text-sub font-bold mt-1 mb-0">
              {lt(locale, {
                fa: 'مقایسه رو در روی هزینه روزانه، شرایط ویزا، مدت پرواز و قیمت هتل (امکان انتخاب تا ۴ مقصد همزمان)',
                en: 'Head-to-head comparison of daily budget, visa policies, flights and stays (up to 4 destinations)',
                ar: 'مقارنة مباشرة لتكاليف المعيشة اليومية، التأشيرات، الطيران والفنادق (حتى 4 وجهات)',
                zh: '同屏对比每日花销、免签政策、航程耗时与酒店均价（支持自由添加至4座城市）',
                ru: 'Сравнение дневного бюджета, визовых условий, времени перелета и цен на отели (до 4 городов)',
              })}
            </p>
          </div>
        </div>

        {/* Add button if less than 4 destinations */}
        {selectedIds.length < 4 && (
          <button
            type="button"
            onClick={handleAddDestination}
            className="self-start md:self-auto min-h-[44px] px-4 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand-dark font-black text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>
              {lt(locale, {
                fa: 'افزودن مقصد برای مقایسه (+)',
                en: 'Add Destination (+)',
                ar: 'إضافة وجهة (+)',
                zh: '添加对比目的地 (+)',
                ru: 'Добавить направление (+)',
              })}
            </span>
          </button>
        )}
      </div>

      {/* Selectors Bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-soft border border-line">
        <span className="text-xs font-bold text-sub shrink-0">
          {lt(locale, { fa: 'مقاصد انتخابی:', en: 'Selected:', ar: 'الوجهات:', zh: '已选城市：', ru: 'Выбранные:' })}
        </span>
        {selectedIds.map((curId, idx) => (
          <div key={`sel-badge-${idx}`} className="flex items-center gap-1">
            <select
              id={`dest-select-${idx}`}
              aria-label={`انتخاب مقصد شماره ${idx + 1} برای مقایسه`}
              value={curId}
              onChange={(e) => handleSelectDest(idx, e.target.value)}
              className="h-11 px-2.5 rounded-xl bg-surface border border-line text-xs font-bold text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs max-w-[150px] sm:max-w-[200px] truncate"
            >
              {COUNTRY_ORDER.map((cId) => {
                const cObj = COUNTRIES[cId];
                const cDestinations = Object.values(DESTINATION_PROFILES).filter((p) => p.countryId === cId);
                if (cDestinations.length === 0) return null;
                return (
                  <optgroup key={`opt-grp-${idx}-${cId}`} label={`${cObj.flag} ${countryName(cId, locale)}`}>
                    {cDestinations.map((d) => (
                      <option key={`dest-${idx}-${d.id}`} value={d.id}>
                        {locale === 'fa' ? d.nameFa : d.nameEn} ({locale === 'fa' ? d.countryFa : d.countryEn})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>

            {selectedIds.length > 2 && (
              <button
                type="button"
                onClick={() => handleRemoveDestination(idx)}
                aria-label={`حذف مقصد شماره ${idx + 1}`}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-surface hover:bg-rose-100 hover:text-rose-600 text-sub border border-line flex items-center justify-center transition cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            )}

            {idx < selectedIds.length - 1 && (
              <span className="text-[11px] font-black text-sub px-1">VS</span>
            )}
          </div>
        ))}
      </div>

      {/* Side by Side Comparison Grid (Adaptive 1 / 2 / 3 / 4 columns) */}
      <div
        className={`grid gap-4 sm:gap-6 ${
          destinations.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : destinations.length === 3
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {destinations.map((dest, idx) => (
          <div
            key={`dest-slot-${idx}-${dest.id}`}
            className="p-4 sm:p-5 rounded-2xl border border-line bg-surface flex flex-col justify-between space-y-4 shadow-elev-1 hover:border-brand/50 transition-all relative group"
          >
            <div>
              {/* Header pill & Country */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-sub">
                  {lt(locale, {
                    fa: `مقصد ${idx + 1}`,
                    en: `Option #${idx + 1}`,
                    ar: `وجهة ${idx + 1}`,
                    zh: `城市 #${idx + 1}`,
                    ru: `Город #${idx + 1}`,
                  })}
                </span>
                <span className="text-xs font-black text-brand-dark bg-mint px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>{COUNTRIES[dest.countryId]?.flag}</span>
                  <span className="truncate max-w-[90px]">{locale === 'fa' ? dest.countryFa : dest.countryEn}</span>
                </span>
              </div>

              {/* Destination Name */}
              <h4 className="text-lg sm:text-xl font-black text-ink m-0 tracking-tight">
                {locale === 'fa' ? dest.nameFa : dest.nameEn}
              </h4>

              {/* Comparison Metrics — Refined text layout & alignment */}
              <div className="mt-4 space-y-2 text-xs font-bold text-ink">
                {/* Daily budget */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-soft/70 border border-line">
                  <span className="text-sub flex items-center gap-1.5 text-[11.5px]">
                    <Coins size={14} className="text-amber-500 shrink-0" />
                    <span>{lt(locale, { fa: 'برآورد هزینه روزانه:', en: 'Daily Budget:', ar: 'الميزانية اليومية:', zh: '预计每日预算：', ru: 'Дневной бюджет:' })}</span>
                  </span>
                  <span className="font-mono font-black text-price text-end">
                    {formatMoney(dest.dailyBudgetToman, COUNTRIES[country]?.currency || COUNTRIES[dest.countryId]?.currency || 'IRR', locale)}
                  </span>
                </div>

                {/* Hotel per night */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-soft/70 border border-line">
                  <span className="text-sub flex items-center gap-1.5 text-[11.5px]">
                    <Hotel size={14} className="text-indigo-500 shrink-0" />
                    <span>{lt(locale, { fa: 'میانگین هر شب هتل:', en: 'Avg. Hotel Night:', ar: 'متوسط الفندق:', zh: '每晚酒店均价：', ru: 'Отель за сутки:' })}</span>
                  </span>
                  <span className="font-mono font-black text-end">
                    {formatMoney(dest.avgHotelPerNightToman, COUNTRIES[country]?.currency || COUNTRIES[dest.countryId]?.currency || 'IRR', locale)}
                  </span>
                </div>

                {/* Flight Duration */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-soft/70 border border-line">
                  <span className="text-sub flex items-center gap-1.5 text-[11.5px]">
                    <Clock size={14} className="text-sky-600 shrink-0" />
                    <span>{lt(locale, { fa: 'مدت پرواز از تهران:', en: 'Flight Duration:', ar: 'مدة الطيران:', zh: '飞行耗时：', ru: 'Время в пути:' })}</span>
                  </span>
                  <span className="font-mono font-black text-end">
                    {num(dest.flightDurationHours, locale)} {lt(locale, { fa: 'ساعت', en: 'hrs', ar: 'ساعات', zh: '小时', ru: 'ч.' })}
                  </span>
                </div>

                {/* Visa Requirement */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-soft/70 border border-line">
                  <span className="text-sub flex items-center gap-1.5 text-[11.5px]">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                    <span>{lt(locale, { fa: 'شرایط روادید (ویزا):', en: 'Visa Requirement:', ar: 'التأشيرة:', zh: '签证政策：', ru: 'Виза:' })}</span>
                  </span>
                  <span className={`font-black text-[11px] text-end min-w-0 max-w-[60%] leading-snug ${dest.visaPolicy.isEasy ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    {locale === 'fa' ? dest.visaPolicy.fa : dest.visaPolicy.en}
                  </span>
                </div>

                {/* Best Season */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-soft/70 border border-line">
                  <span className="text-sub flex items-center gap-1.5 text-[11.5px]">
                    <Sun size={14} className="text-amber-500 shrink-0" />
                    <span>{lt(locale, { fa: 'بهترین فصل سفر:', en: 'Best Season:', ar: 'أفضل موسم:', zh: '最佳季节：', ru: 'Сезон:' })}</span>
                  </span>
                  <span className="text-end text-[11px] font-bold text-ink min-w-0 max-w-[60%] leading-snug">
                    {locale === 'fa' ? dest.bestSeason.fa : dest.bestSeason.en}
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-3.5 flex flex-wrap gap-1">
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

            {/* CTA to Smart Trip Builder */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push(`/plan?dest=${dest.id}`)}
                className="w-full h-11 rounded-xl bg-brand hover:bg-brand-dark text-brand-foreground font-black text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <Sparkles size={14} />
                <span>
                  {lt(locale, {
                    fa: `سفرساز هوشمند به ${dest.nameFa}`,
                    en: `Smart Trip Builder for ${dest.nameEn}`,
                    ar: `مساعد السفر الذكي إلى ${dest.nameFa}`,
                    zh: `定制 ${dest.nameEn} 智能行程`,
                    ru: `Спланировать поездку в ${dest.nameEn}`,
                  })}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
