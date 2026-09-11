'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName, type CountryId } from '@/lib/countries';
import { CATEGORY_PHOTO_MAP, DESTINATION_IMAGE_MAP, shimmerDataUrl } from '@/lib/image-utils';
import { formatMoney } from '@/lib/money';
import { MapPin, ArrowLeft, ArrowRight, Compass, BookOpenText, Check, Plane, Building2, Calendar, Sparkles } from 'lucide-react';
import { lt } from '@/lib/lt';

interface ExperienceItem {
  category: string;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  where: string;
  whereEn: string;
  when: string;
  whenEn: string;
  fromPrice: number;
  image?: string;
}

export default function DestinationsPage() {
  const t = useTranslations('Destinations');
  const router = useRouter();
  const locale = useLocale();
  const isEn = locale === 'en';
  const { country, setCountry } = useCountryStore();
  const c = COUNTRIES[country] || COUNTRIES.iran;

  // Dynamic signature experiences from CMS / Database
  const [dbExperiences, setDbExperiences] = useState<ExperienceItem[]>([]);

  useEffect(() => {
    fetch(`/api/experiences?country=${encodeURIComponent(country)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setDbExperiences(
            json.data.map((exp: ExperienceItem) => ({
              category: exp.category,
              title: exp.title,
              titleEn: exp.titleEn,
              desc: exp.desc,
              descEn: exp.descEn,
              where: exp.where,
              whereEn: exp.whereEn,
              when: exp.when,
              whenEn: exp.whenEn,
              fromPrice: Number(exp.fromPrice),
              image: exp.image || undefined,
            }))
          );
        } else {
          setDbExperiences([]);
        }
      })
      .catch(() => {
        setDbExperiences([]);
      });
  }, [country]);

  const allExperiences = useMemo(() => {
    // Prepend dynamic DB experiences ahead of static seeds
    const merged: ExperienceItem[] = [...dbExperiences, ...c.signatureExperiences];
    const unique: ExperienceItem[] = [];
    for (const item of merged) {
      if (!unique.some((u) => u.title === item.title)) {
        unique.push(item);
      }
    }
    return unique;
  }, [dbExperiences, c.signatureExperiences]);

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8 py-6 md:py-8 pb-16 space-y-8">
      {/* Hero + Country Switcher */}
      <div className="bg-gradient-to-br from-deep via-[#074746] to-[#04292a] rounded-3xl p-8 sm:p-10 text-surface relative overflow-hidden shadow-elev-3 border border-surface/10">
        <span className="absolute -start-16 -top-24 w-56 h-56 rounded-full border-[30px] border-surface/5 pointer-events-none" />
        <span className="absolute -end-20 -bottom-20 w-64 h-64 rounded-full border-[24px] border-mint-bright/10 pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/15 backdrop-blur-md text-mint-bright text-xs font-black mb-3 border border-surface/20">
            <Compass size={14} />
            <span>{lt(locale, { fa: 'راهنمای مقاصد و سفرهای فیروزو', en: 'Firuzo Global Destinations Guide', ar: 'دليل الوجهات العالمية', zh: 'Firuzo 全球目的地指南', ru: 'Гид по направлениям Firuzo' })}</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">{t('title')}</h1>
          <p className="text-surface/85 text-sm sm:text-base leading-relaxed mb-6">{t('subtitle')}</p>
        </div>

        {/* Country Selector Pills */}
        <div className="relative z-10 flex flex-wrap gap-2 pt-2 border-t border-surface/15">
          {COUNTRY_ORDER.map((id: CountryId) => (
            <button
              key={id}
              onClick={() => setCountry(id)}
              className={`min-h-10 px-4 rounded-xl text-xs font-black inline-flex items-center gap-2 transition active:scale-95 ${
                country === id 
                  ? 'bg-action text-ink shadow-md shadow-action/25' 
                  : 'bg-surface/15 text-surface hover:bg-surface/25 border border-surface/10'
              }`}
            >
              <span className="text-sm">{COUNTRIES[id].flag}</span>
              <span>{countryName(id, locale)}</span>
              {country === id && <Check size={13} className="text-ink" />}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Ecosystem Services Strip */}
      <section className="bg-surface rounded-2xl p-4 sm:p-5 border border-line shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-dark" />
          <span className="text-xs sm:text-sm font-black text-ink">
            {lt(locale, { fa: 'دسترسی سریع به خدمات', en: 'Quick Services for', ar: 'خدمات سريعة لـ', zh: '快速服务：', ru: 'Быстрые услуги для' })} {countryName(country, locale)}:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/flights/search?to=${countryName(country, locale)}`)}
            className="px-3 py-1.5 rounded-xl bg-soft hover:bg-line/60 text-xs font-bold text-ink transition flex items-center gap-1.5"
          >
            <Plane size={13} className="text-brand-dark" />
            <span>{lt(locale, { fa: 'پروازها', en: 'Flights', ar: 'طيران', zh: '航班', ru: 'Рейсы' })}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/hotels/search?city=${countryName(country, locale)}`)}
            className="px-3 py-1.5 rounded-xl bg-soft hover:bg-line/60 text-xs font-bold text-ink transition flex items-center gap-1.5"
          >
            <Building2 size={13} className="text-brand-dark" />
            <span>{lt(locale, { fa: 'اقامتگاه‌ها', en: 'Hotels', ar: 'فنادق', zh: '酒店', ru: 'Отели' })}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/tours?category=signature`)}
            className="px-3 py-1.5 rounded-xl bg-soft hover:bg-line/60 text-xs font-bold text-ink transition flex items-center gap-1.5"
          >
            <Compass size={13} className="text-brand-dark" />
            <span>{lt(locale, { fa: 'تورها و تجارب', en: 'Tours', ar: 'جولات', zh: '旅游', ru: 'Туры' })}</span>
          </button>
        </div>
      </section>

      {/* Cities of selected country with Authentic Photography */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-ink flex items-center gap-2">
            <MapPin size={22} className="text-brand-dark" />
            <span>{lt(locale, { fa: 'شهرهای شاخص', en: 'Featured Cities of', ar: 'مدن بارزة في', zh: '特色城市：', ru: 'Популярные города' })} {countryName(country, locale)} {c.flag}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {c.cities.map((city) => {
            const photoUrl = DESTINATION_IMAGE_MAP[city.en] || DESTINATION_IMAGE_MAP[city.fa] || '/images/isfahan/sheikh-lotfollah.jpg';
            return (
              <button
                key={city.en}
                onClick={() => router.push(city.href)}
                className="relative rounded-2xl h-52 p-5 text-surface text-start overflow-hidden hover:shadow-elev-2 hover:-translate-y-1 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs flex flex-col justify-between cursor-pointer border border-line/60"
              >
                <Image
                  src={photoUrl}
                  alt={city.fa}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  placeholder="blur"
                  blurDataURL={shimmerDataUrl(400, 200)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep/95 via-deep/40 to-transparent" />
                
                <div className="relative z-10">
                  <span className="text-xs font-bold text-mint-bright block leading-tight">{city.en}</span>
                  <strong className="text-2xl font-black block mt-0.5">{city.fa}</strong>
                </div>

                <div className="relative z-10 flex items-center justify-between w-full pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/20 backdrop-blur-md text-xs font-black">
                    <Compass size={13} /> {t('exploreHotels')}
                  </span>
                  <span className="w-8 h-8 rounded-full bg-surface text-brand-dark grid place-items-center group-hover:scale-110 transition shadow-sm">
                    <ArrowLeft size={15} className="rtl:inline ltr:hidden" />
                    <ArrowRight size={15} className="ltr:inline rtl:hidden" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Signature Travel Experiences & Guides */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-ink mb-1 flex items-center gap-2">
            <BookOpenText size={22} className="text-brand-dark" />
            <span>{t('guideBook')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-sub font-bold">
            {t('guideBookSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {allExperiences.map((exp, i) => {
            const photo = exp.image || CATEGORY_PHOTO_MAP[exp.category] || CATEGORY_PHOTO_MAP.culture;
            return (
              <div key={i} className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs flex flex-col justify-between group hover:border-brand/40 transition">
                <div className="relative h-40 w-full overflow-hidden bg-soft">
                  <Image
                    src={photo}
                    alt={exp.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    placeholder="blur"
                    blurDataURL={shimmerDataUrl(400, 200)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/30 to-transparent" />
                  <span className="absolute top-2.5 start-2.5 px-2.5 py-0.5 rounded-full bg-surface/90 text-brand-dark text-[11px] font-black backdrop-blur-xs shadow-xs">
                    {exp.category}
                  </span>
                  <span className="absolute bottom-2.5 start-2.5 text-xs text-surface font-bold flex items-center gap-1">
                    <Calendar size={12} className="text-mint-bright" /> {isEn ? exp.whenEn : exp.when}
                  </span>
                </div>

                <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                  <div>
                    <h3 className="font-black text-ink text-base mb-1.5 leading-snug">{isEn ? exp.titleEn : exp.title}</h3>
                    <p className="text-xs text-sub leading-relaxed line-clamp-3">{isEn ? exp.descEn : exp.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-line/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-sub font-bold block">{lt(locale, { fa: 'شروع نرخ:', en: 'From:', ar: 'يبدأ من:', zh: '起步价：', ru: 'От:' })}</span>
                      <span className="text-sm font-black text-price font-mono">
                        {formatMoney(exp.fromPrice, c.currency, locale)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/tours?category=signature`)}
                      className="px-3.5 py-1.5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition active:scale-95 shadow-xs"
                    >
                      {lt(locale, { fa: 'کاوش و رزرو', en: 'Explore', ar: 'استكشف', zh: '浏览', ru: 'Смотреть' })}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
