'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName, type CountryId } from '@/lib/countries';
import { MapPin, ArrowLeft, ArrowRight, Compass, BookOpenText, Check } from 'lucide-react';
import { lt } from '@/lib/lt';

const GRADIENTS = [
  'from-teal-500 to-emerald-700',
  'from-blue-500 to-indigo-700',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-fuchsia-700',
  'from-rose-500 to-red-700',
  'from-cyan-500 to-sky-700',
];

export default function DestinationsPage() {
  const t = useTranslations('Destinations');
  const router = useRouter();
  const locale = useLocale();
  const isEn = locale === 'en';
  const { country, setCountry } = useCountryStore();
  const c = COUNTRIES[country];

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 pb-16">
      {/* Hero + Country Switcher */}
      <div className="bg-deep rounded-2xl p-8 mb-10 text-surface relative overflow-hidden">
        <span className="absolute -start-16 -top-24 w-56 h-56 rounded-full border-[30px] border-surface/5 pointer-events-none" />
        <h1 className="text-3xl font-black mb-2 relative">{t('title')}</h1>
        <p className="text-surface/75 relative mb-5">{t('subtitle')}</p>
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

      {/* Cities of selected country */}
      <section className="mb-12">
        <h2 className="text-xl font-black text-ink mb-5 flex items-center gap-2">
          <MapPin size={22} className="text-brand-dark" />
          {lt(locale, { fa: 'شهرهای', en: 'Cities of', ar: 'مدن', zh: '的城市', ru: 'Города' })} {countryName(country, locale)} {c.flag}
        </h2>
        <div className="masonry-grid">
          {c.cities.map((city, i) => (
            <button
              key={city.en}
              onClick={() => router.push(city.href)}
              className={`masonry-item block w-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} ph-texture rounded-2xl h-44 p-5 text-surface text-end relative overflow-hidden hover:-translate-y-1 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm cursor-pointer`}
            >
              <span className="text-[12px] font-extrabold opacity-80 block">{city.en}</span>
              <strong className="text-2xl font-black block mt-1">{city.fa}</strong>
              <span className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface/20 backdrop-blur text-[11px] font-black">
                <Compass size={12} /> {t('exploreHotels')}
              </span>
              <span className="absolute bottom-4 start-4 w-9 h-9 rounded-full bg-surface/20 grid place-items-center group-hover:scale-110 transition">
                <ArrowLeft size={16} className="rtl:inline ltr:hidden" />
                <ArrowRight size={16} className="ltr:inline rtl:hidden" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Signature Travel Guides */}
      <section>
        <h2 className="text-xl font-black text-ink mb-2 flex items-center gap-2">
          <BookOpenText size={22} className="text-brand-dark" />
          {t('guideBook')}
        </h2>
        <p className="text-xs text-sub font-semibold mb-5">
          {t('guideBookSubtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {c.signatureExperiences.map((exp, i) => (
            <div key={i} className="p-5 border border-line rounded-2xl bg-surface">
              <span className="text-xs font-bold text-brand-dark">{exp.category}</span>
              <h3 className="font-black text-ink mt-1 text-base">{isEn ? exp.titleEn : exp.title}</h3>
              <p className="text-xs text-sub mt-2 leading-relaxed">{isEn ? exp.descEn : exp.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
