'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { ArrowLeft, Clock } from 'lucide-react';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { shimmerDataUrl } from '@/lib/image-utils';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, countryName, type CountryId } from '@/lib/countries';
import type { PopularRouteOverride } from '@/domains/content/SiteContentService';

export const DEFAULT_POPULAR_ROUTES: PopularRouteOverride[] = [
  {
    fromFa: 'تهران',
    fromEn: 'Tehran',
    toFa: 'مشهد',
    toEn: 'Mashhad',
    airlineFa: 'ایران ایر',
    airlineEn: 'Iran Air',
    duration: '۱.۵ ساعت',
    durationEn: '1h 30m',
    price: 24800000,
    img: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=75&w=600',
  },
  {
    fromFa: 'تهران',
    fromEn: 'Tehran',
    toFa: 'استانبول',
    toEn: 'Istanbul',
    airlineFa: 'ترکیش ایرلاینز',
    airlineEn: 'Turkish Airlines',
    duration: '۳.۵ ساعت',
    durationEn: '3h 50m',
    price: 96000000,
    img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=75&w=600',
  },
  {
    fromFa: 'تهران',
    fromEn: 'Tehran',
    toFa: 'دبی',
    toEn: 'Dubai',
    airlineFa: 'امارات',
    airlineEn: 'Emirates',
    duration: '۲.۵ ساعت',
    durationEn: '2h 25m',
    price: 128000000,
    img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=75&w=600',
  },
  {
    fromFa: 'تهران',
    fromEn: 'Tehran',
    toFa: 'کیش',
    toEn: 'Kish',
    airlineFa: 'کیش ایر',
    airlineEn: 'Kish Air',
    duration: '۱.۸ ساعت',
    durationEn: '1h 45m',
    price: 28500000,
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=75&w=600',
  },
  {
    fromFa: 'شیراز',
    fromEn: 'Shiraz',
    toFa: 'تهران',
    toEn: 'Tehran',
    airlineFa: 'ماهان',
    airlineEn: 'Mahan Air',
    duration: '۱.۳ ساعت',
    durationEn: '1h 20m',
    price: 26000000,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Nasir-al_molk_-1.jpg/960px-Nasir-al_molk_-1.jpg',
  },
  {
    fromFa: 'تهران',
    fromEn: 'Tehran',
    toFa: 'تفلیس',
    toEn: 'Tbilisi',
    airlineFa: 'ماهان',
    airlineEn: 'Mahan Air',
    duration: '۲.۶ ساعت',
    durationEn: '2h 40m',
    price: 84500000,
    img: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&q=75&w=600',
  },
];

export const POPULAR_ROUTES_BY_COUNTRY: Record<CountryId, PopularRouteOverride[]> = {
  iran: [
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'مشهد',
      toEn: 'Mashhad',
      airlineFa: 'ایران ایر',
      airlineEn: 'Iran Air',
      duration: '۱.۵ ساعت',
      durationEn: '1h 30m',
      price: 24800000,
      img: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'کیش',
      toEn: 'Kish',
      airlineFa: 'کیش ایر',
      airlineEn: 'Kish Air',
      duration: '۱.۸ ساعت',
      durationEn: '1h 45m',
      price: 28500000,
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'اصفهان',
      toEn: 'Isfahan',
      airlineFa: 'ماهان ایر',
      airlineEn: 'Mahan Air',
      duration: '۱.۰ ساعت',
      durationEn: '1h 00m',
      price: 21500000,
      img: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'شیراز',
      fromEn: 'Shiraz',
      toFa: 'تهران',
      toEn: 'Tehran',
      airlineFa: 'ماهان',
      airlineEn: 'Mahan Air',
      duration: '۱.۳ ساعت',
      durationEn: '1h 20m',
      price: 26000000,
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Nasir-al_molk_-1.jpg/960px-Nasir-al_molk_-1.jpg',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'تبریز',
      toEn: 'Tabriz',
      airlineFa: 'آتا ایرلاینز',
      airlineEn: 'Ata Airlines',
      duration: '۱.۲ ساعت',
      durationEn: '1h 10m',
      price: 22000000,
      img: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'مشهد',
      fromEn: 'Mashhad',
      toFa: 'کیش',
      toEn: 'Kish',
      airlineFa: 'وارش',
      airlineEn: 'Varesh',
      duration: '۲.۰ ساعت',
      durationEn: '2h 00m',
      price: 32000000,
      img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=75&w=600',
    },
  ],

  turkey: [
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'استانبول',
      toEn: 'Istanbul',
      airlineFa: 'ترکیش ایرلاینز',
      airlineEn: 'Turkish Airlines',
      duration: '۳.۵ ساعت',
      durationEn: '3h 50m',
      price: 96000000,
      img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'آنتالیا',
      toEn: 'Antalya',
      airlineFa: 'ترکیش ایرلاینز',
      airlineEn: 'Turkish Airlines',
      duration: '۳.۸ ساعت',
      durationEn: '3h 45m',
      price: 92000000,
      img: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'ازمیر',
      toEn: 'Izmir',
      airlineFa: 'پگاسوس',
      airlineEn: 'Pegasus Airlines',
      duration: '۳.۶ ساعت',
      durationEn: '3h 35m',
      price: 88000000,
      img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تبریز',
      fromEn: 'Tabriz',
      toFa: 'استانبول',
      toEn: 'Istanbul',
      airlineFa: 'ایران ایرتور',
      airlineEn: 'Iran Airtour',
      duration: '۲.۴ ساعت',
      durationEn: '2h 25m',
      price: 78000000,
      img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'مشهد',
      fromEn: 'Mashhad',
      toFa: 'استانبول',
      toEn: 'Istanbul',
      airlineFa: 'ترکیش ایرلاینز',
      airlineEn: 'Turkish Airlines',
      duration: '۴.۲ ساعت',
      durationEn: '4h 15m',
      price: 115000000,
      img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'استانبول',
      fromEn: 'Istanbul',
      toFa: 'آنتالیا',
      toEn: 'Antalya',
      airlineFa: 'ترکیش ایرلاینز',
      airlineEn: 'Turkish Airlines',
      duration: '۱.۲ ساعت',
      durationEn: '1h 15m',
      price: 38000000,
      img: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=75&w=600',
    },
  ],

  uae: [
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'دبی',
      toEn: 'Dubai',
      airlineFa: 'امارات',
      airlineEn: 'Emirates',
      duration: '۲.۲ ساعت',
      durationEn: '2h 15m',
      price: 128000000,
      img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'شارجه',
      toEn: 'Sharjah',
      airlineFa: 'ایر عربیا',
      airlineEn: 'Air Arabia',
      duration: '۲.۰ ساعت',
      durationEn: '2h 05m',
      price: 94000000,
      img: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'ابوظبی',
      toEn: 'Abu Dhabi',
      airlineFa: 'الاتحاد',
      airlineEn: 'Etihad Airways',
      duration: '۲.۳ ساعت',
      durationEn: '2h 20m',
      price: 135000000,
      img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'شیراز',
      fromEn: 'Shiraz',
      toFa: 'دبی',
      toEn: 'Dubai',
      airlineFa: 'فلای دبی',
      airlineEn: 'Flydubai',
      duration: '۱.۳ ساعت',
      durationEn: '1h 20m',
      price: 89000000,
      img: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'مشهد',
      fromEn: 'Mashhad',
      toFa: 'دبی',
      toEn: 'Dubai',
      airlineFa: 'فلای دبی',
      airlineEn: 'Flydubai',
      duration: '۲.۵ ساعت',
      durationEn: '2h 30m',
      price: 118000000,
      img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'اصفهان',
      fromEn: 'Isfahan',
      toFa: 'دبی',
      toEn: 'Dubai',
      airlineFa: 'فلای دبی',
      airlineEn: 'Flydubai',
      duration: '۱.۸ ساعت',
      durationEn: '1h 45m',
      price: 98000000,
      img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=75&w=600',
    },
  ],

  georgia: [
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'تفلیس',
      toEn: 'Tbilisi',
      airlineFa: 'ماهان',
      airlineEn: 'Mahan Air',
      duration: '۲.۶ ساعت',
      durationEn: '2h 40m',
      price: 84500000,
      img: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'باتومی',
      toEn: 'Batumi',
      airlineFa: 'وارش',
      airlineEn: 'Varesh Airlines',
      duration: '۲.۸ ساعت',
      durationEn: '2h 45m',
      price: 78000000,
      img: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تبریز',
      fromEn: 'Tabriz',
      toFa: 'تفلیس',
      toEn: 'Tbilisi',
      airlineFa: 'آتا ایرلاینز',
      airlineEn: 'Ata Airlines',
      duration: '۱.۴ ساعت',
      durationEn: '1h 25m',
      price: 68000000,
      img: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تفلیس',
      fromEn: 'Tbilisi',
      toFa: 'باتومی',
      toEn: 'Batumi',
      airlineFa: 'گرجین ایرویز',
      airlineEn: 'Georgian Airways',
      duration: '۰.۹ ساعت',
      durationEn: '50m',
      price: 32000000,
      img: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=75&w=600',
    },
  ],

  oman: [
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'مسقط',
      toEn: 'Muscat',
      airlineFa: 'عمان ایر',
      airlineEn: 'Oman Air',
      duration: '۲.۵ ساعت',
      durationEn: '2h 30m',
      price: 96000000,
      img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'صلاله',
      toEn: 'Salalah',
      airlineFa: 'سلام ایر',
      airlineEn: 'SalamAir',
      duration: '۳.۸ ساعت',
      durationEn: '3h 45m',
      price: 112000000,
      img: 'https://images.unsplash.com/photo-1570733577524-3a047079e80d?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'شیراز',
      fromEn: 'Shiraz',
      toFa: 'مسقط',
      toEn: 'Muscat',
      airlineFa: 'سلام ایر',
      airlineEn: 'SalamAir',
      duration: '۱.۵ ساعت',
      durationEn: '1h 30m',
      price: 84000000,
      img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'قشم',
      fromEn: 'Qeshm',
      toFa: 'مسقط',
      toEn: 'Muscat',
      airlineFa: 'قشم ایر',
      airlineEn: 'Qeshm Air',
      duration: '۱.۱ ساعت',
      durationEn: '1h 05m',
      price: 68000000,
      img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=75&w=600',
    },
  ],

  russia: [
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'مسکو',
      toEn: 'Moscow',
      airlineFa: 'آئروفلوت',
      airlineEn: 'Aeroflot',
      duration: '۳.۸ ساعت',
      durationEn: '3h 45m',
      price: 112000000,
      img: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'سن‌پترزبورگ',
      toEn: 'Saint Petersburg',
      airlineFa: 'نوردویند',
      airlineEn: 'Nordwind Airlines',
      duration: '۴.۲ ساعت',
      durationEn: '4h 10m',
      price: 125000000,
      img: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'مسکو',
      fromEn: 'Moscow',
      toFa: 'سن‌پترزبورگ',
      toEn: 'Saint Petersburg',
      airlineFa: 'آئروفلوت',
      airlineEn: 'Aeroflot',
      duration: '۱.۴ ساعت',
      durationEn: '1h 25m',
      price: 34000000,
      img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'مشهد',
      fromEn: 'Mashhad',
      toFa: 'مسکو',
      toEn: 'Moscow',
      airlineFa: 'ماهان',
      airlineEn: 'Mahan Air',
      duration: '۴.۵ ساعت',
      durationEn: '4h 30m',
      price: 128000000,
      img: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&q=75&w=600',
    },
  ],

  china: [
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'پکن',
      toEn: 'Beijing',
      airlineFa: 'ماهان ایر',
      airlineEn: 'Mahan Air',
      duration: '۷.۲ ساعت',
      durationEn: '7h 15m',
      price: 148000000,
      img: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'شانگهای',
      toEn: 'Shanghai',
      airlineFa: 'ماهان ایر',
      airlineEn: 'Mahan Air',
      duration: '۷.۶ ساعت',
      durationEn: '7h 35m',
      price: 154000000,
      img: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'گوانگجو',
      toEn: 'Guangzhou',
      airlineFa: 'چاینا ساترن',
      airlineEn: 'China Southern',
      duration: '۷.۸ ساعت',
      durationEn: '7h 50m',
      price: 162000000,
      img: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'پکن',
      fromEn: 'Beijing',
      toFa: 'شانگهای',
      toEn: 'Shanghai',
      airlineFa: 'ایر چاینا',
      airlineEn: 'Air China',
      duration: '۲.۲ ساعت',
      durationEn: '2h 15m',
      price: 49000000,
      img: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=75&w=600',
    },
  ],
};

export function PopularFlightsSection({ override }: { override?: PopularRouteOverride[] }) {
  const locale = useLocale();
  const { country } = useCountryStore();

  const countryRoutes = POPULAR_ROUTES_BY_COUNTRY[country] || DEFAULT_POPULAR_ROUTES;
  const routes = override ?? countryRoutes;

  return (
    <section aria-label="Popular Flight Routes" className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-black text-brand-dark tracking-wider uppercase">
              {lt(locale, { fa: 'مسیرهای پرتردد سفر', en: 'Trending Flight Routes', ar: 'المسارات الشائعة', zh: '热门航线', ru: 'Популярные маршруты' })}
            </span>
            <span className="text-xs font-black text-brand-dark bg-mint px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>{COUNTRIES[country]?.flag}</span>
              <span>{countryName(country, locale)}</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-ink m-0">
            {lt(locale, {
              fa: `پرفروش‌ترین پروازهای ${countryName(country, locale)} و مقاصد برگزیده`,
              en: `Best-Selling Flights for ${countryName(country, locale)}`,
              ar: `أكثر الرحلات مبيعاً لـ ${countryName(country, locale)}`,
              zh: `${countryName(country, locale)} 热门畅销航线`,
              ru: `Популярные рейсы: ${countryName(country, locale)}`,
            })}
          </h2>
        </div>

        <Link
          href={`/flights/search?country=${country}`}
          className="text-xs font-black text-brand-dark hover:text-brand flex items-center gap-1.5 transition-colors shrink-0"
        >
          <span>{lt(locale, { fa: 'مشاهده همه پروازها', en: 'View All Flights', ar: 'عرض جميع الرحلات', zh: '查看全部航班', ru: 'Все рейсы' })}</span>
          <ArrowLeft size={14} className="ltr:rotate-180" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {routes.map((r, idx) => (
          <Link
            key={idx}
            href={`/flights/search?from=${encodeURIComponent(locale === 'fa' ? r.fromFa : r.fromEn)}&to=${encodeURIComponent(locale === 'fa' ? r.toFa : r.toEn)}&country=${country}`}
            className="group relative rounded-2xl p-4 bg-surface border border-line hover:border-brand/50 hover:shadow-elev-2 transition-all flex flex-wrap items-center justify-between gap-3 overflow-hidden shadow-2xs cursor-pointer active:scale-[0.99]"
          >
            {/* City photo thumbnail */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-soft">
              <Image
                src={r.img}
                alt={`${r.fromFa} to ${r.toFa}`}
                fill
                sizes="80px"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(80, 80)}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Flight info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1 leading-tight">
                <span className="text-sm sm:text-base font-black text-ink group-hover:text-brand-dark transition-colors">
                  {locale === 'fa' ? r.fromFa : r.fromEn}
                </span>
                <span className="text-brand-dark font-black inline-block rtl:rotate-180">➔</span>
                <span className="text-sm sm:text-base font-black text-ink group-hover:text-brand-dark transition-colors">
                  {locale === 'fa' ? r.toFa : r.toEn}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-sub flex-wrap">
                <span className="text-brand-dark font-extrabold">{locale === 'fa' ? r.airlineFa : r.airlineEn}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-sub" />
                  <span>{locale === 'fa' ? r.duration : (r.durationEn || r.duration)}</span>
                </span>
              </div>
            </div>

            {/* Price badge */}
            <div className="text-end shrink-0 ps-2">
              <span className="text-[10px] text-sub font-bold block mb-0.5">
                {lt(locale, { fa: 'شروع از', en: 'from', ar: 'من', zh: '起', ru: 'от' })}
              </span>
              <span className="text-sm sm:text-base font-black text-price font-price num whitespace-nowrap">
                {num(r.price, locale)}
                <span className="text-[10px] font-bold text-sub ms-1">
                  {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
