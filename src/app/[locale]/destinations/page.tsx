'use client';

import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName, type CountryId } from '@/lib/countries';
import { MapPin, ArrowLeft, Compass, BookOpenText, Check } from 'lucide-react';

const GRADIENTS = [
  'from-teal-500 to-emerald-700',
  'from-blue-500 to-indigo-700',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-fuchsia-700',
  'from-rose-500 to-red-700',
  'from-cyan-500 to-sky-700',
];

export default function DestinationsPage() {
  const router = useRouter();
  const locale = useLocale();
  const isEn = locale === 'en';
  const { country, setCountry } = useCountryStore();
  const c = COUNTRIES[country];

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 pb-16">
      {/* Hero + کشور سوییچر */}
      <div className="bg-deep rounded-2xl p-8 mb-10 text-surface relative overflow-hidden">
        <span className="absolute -start-16 -top-24 w-56 h-56 rounded-full border-[30px] border-surface/5 pointer-events-none" />
        <h1 className="text-3xl font-black mb-2 relative">مقاصد محبوب</h1>
        <p className="text-surface/75 relative mb-5">از زیارت تا ساحل — مقصد بعدی خود را انتخاب کنید</p>
        <div className="relative flex flex-wrap gap-2">
          {COUNTRY_ORDER.map((id: CountryId) => (
            <button
              key={id}
              onClick={() => setCountry(id)}
              className={`min-h-9 px-4 rounded-full text-[12.5px] font-black inline-flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                country === id ? 'bg-surface text-brand-dark' : 'bg-surface/10 text-surface hover:bg-surface/20'
              }`}
            >
              <span>{COUNTRIES[id].flag}</span>
              {countryName(id, locale)}
              {country === id && <Check size={13} />}
            </button>
          ))}
        </div>
      </div>

      {/* شهرهای کشور انتخابی */}
      <section className="mb-12">
        <h2 className="text-xl font-black text-ink mb-5 flex items-center gap-2">
          <MapPin size={22} className="text-brand-dark" />
          {isEn ? `Cities of ${c.nameEn}` : `شهرهای ${c.nameFa}`} {c.flag}
        </h2>
        <div className="masonry-grid">
          {c.cities.map((city, i) => (
            <button
              key={city.en}
              onClick={() => router.push(city.href)}
              className={`masonry-item block w-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} ph-texture rounded-2xl h-44 p-5 text-surface text-end relative overflow-hidden hover:-translate-y-1 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm`}
            >
              <p className="font-black text-2xl relative">{isEn ? city.en : city.fa}</p>
              <p className="text-sm opacity-80 mt-1 relative" dir="ltr">{city.en}</p>
              <ArrowLeft size={20} className="absolute bottom-4 start-4 opacity-0 group-hover:opacity-100 transition-opacity ltr:rotate-180" />
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          onClick={() => router.push('/plan')}
          className="rtl:bg-gradient-to-l ltr:bg-gradient-to-r from-brand to-brand-dark rounded-2xl p-8 text-surface flex items-center justify-between hover:opacity-95 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm"
        >
          <div className="text-start">
            <p className="font-black text-xl mb-1">پیشنهادساز هوشمند</p>
            <p className="text-sm opacity-80">پکیج کامل بر اساس سلیقه شما</p>
          </div>
          <span className="w-12 h-12 grid place-items-center rounded-2xl bg-surface/20 group-hover:scale-110 transition-transform"><Compass size={26} /></span>
        </button>
        <button
          onClick={() => router.push('/tours')}
          className="bg-gradient-to-l from-brand-dark to-brand rounded-2xl p-8 text-surface flex items-center justify-between hover:opacity-95 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm"
        >
          <div className="text-start">
            <p className="font-black text-xl mb-1">تورهای آماده</p>
            <p className="text-sm opacity-80">با پرواز، هتل و گشت کامل</p>
          </div>
          <BookOpenText size={36} />
        </button>
        <button
          onClick={() => router.push('/guide')}
          className="bg-surface border border-line rounded-xl p-8 flex items-center justify-between hover:border-brand transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm"
        >
          <div className="text-start">
            <p className="font-black text-xl mb-1 text-ink">راهنمای سفر</p>
            <p className="text-sm text-sub">نکات مسافرتی و تجربه‌ها</p>
          </div>
          <span className="text-brand-dark"><ArrowLeft size={32} className="ltr:rotate-180" /></span>
        </button>
      </div>
    </div>
  );
}
