'use client';

import { useRef } from 'react';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, experienceCategoryLabel } from '@/lib/countries';
import { countryNameL } from './countryNames';
import { formatMoney } from '@/lib/money';
import { CATEGORY_ICONS } from '@/components/shared/CountryExperiences';
import Image from 'next/image';
import { CATEGORY_PHOTO_MAP, shimmerDataUrl } from '@/lib/image-utils';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { lt } from '@/lib/lt';

export function SpecialOffersSection() {
  const locale = useLocale();
  const t = useTranslations('Home');
  const t2 = useTranslations('Plan');
  const { country } = useCountryStore();
  const c = COUNTRIES[country];

  const scrollRef = useRef<HTMLDivElement>(null);

  const offers = (() => {
    const ex = c.signatureExperiences;
    const picked: typeof ex = [];
    const push = (cat?: string) => {
      const found = ex.find((e) => (!cat || e.category === cat) && !picked.includes(e));
      if (found) picked.push(found);
    };
    push('yacht');
    push('festival');
    push();
    return picked.slice(0, 3);
  })();

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10 bg-soft/30">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-brand-dark font-black text-xs">{c.flag} {t('offersKicker')}</p>
            <h2 className="text-2xl md:text-[32px] font-black text-ink m-0">
              {t('offersTitle', { country: countryNameL(country, locale) })}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/plan"
              className="hidden sm:inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full bg-brand-dark text-surface text-[13px] font-black whitespace-nowrap hover:bg-deep transition shadow-sm shadow-brand-dark/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Sparkles size={14} aria-hidden="true" /> {t2('plannerCta')}
            </Link>
            <Link
              href="/tours?category=signature"
              className="inline-flex items-center gap-1.5 text-brand-dark text-[13px] font-bold whitespace-nowrap hover:gap-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {t('offersAll')} <ArrowLeft size={15} className="ltr:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory pb-5 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 hide-scrollbar">
          {offers.map((offer) => {
            const Icon = CATEGORY_ICONS[offer.category];
            const catLabel = experienceCategoryLabel(offer.category, locale);
            const title = locale === 'fa' ? offer.title : offer.titleEn;
            const desc = locale === 'fa' ? offer.desc : offer.descEn;
            const when = locale === 'fa' ? offer.when : offer.whenEn;
            const photoUrl = CATEGORY_PHOTO_MAP[offer.category] || CATEGORY_PHOTO_MAP.culture;
            return (
              <Link
                key={offer.titleEn}
                href={`/tours?category=signature&city=${encodeURIComponent(locale === 'fa' ? offer.title : offer.titleEn)}`}
                className="shrink-0 w-[min(84vw,340px)] sm:w-[320px] md:w-auto snap-start bg-surface rounded-[22px] shadow-elev-1 overflow-hidden hover:shadow-elev-2 hover:-translate-y-1 transition-all duration-300 group cursor-pointer border border-line/70 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex flex-col"
              >
                <div className="aspect-[16/10] min-h-[170px] relative w-full overflow-hidden bg-brand-dark/20">
                  <Image
                    src={photoUrl}
                    alt={title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    placeholder="blur"
                    blurDataURL={shimmerDataUrl(400, 200)}
                    sizes="(max-width: 640px) 84vw, (max-width: 768px) 320px, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep/95 via-deep/35 to-transparent" />
                  <div className="absolute top-3 start-3 end-3 z-10 flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/95 backdrop-blur-md text-[11px] font-black text-brand-dark shadow-sm">
                      {Icon && <Icon size={12} aria-hidden="true" />}
                      {catLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-action/90 text-ink text-[10px] font-black shadow-xs">
                      {lt(locale, { fa: 'تجربه برگزیده', en: 'Curated Choice', ar: 'خيار مميز', zh: '精选体验', ru: 'Выбор экспертов' })}
                    </span>
                  </div>
                  <div className="absolute bottom-3 start-3 end-3 text-surface z-10">
                    <p className="text-[11px] text-mint-bright font-bold m-0 mb-1">{when}</p>
                    <h3 className="text-[16px] font-black leading-snug m-0 line-clamp-2">{title}</h3>
                  </div>
                </div>
                <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1 justify-between">
                  <p className="text-xs text-sub leading-6 m-0 line-clamp-2 min-h-12">{desc}</p>
                  <div className="flex items-end justify-between gap-3 pt-3 border-t border-line/70">
                    <div>
                      <span className="text-[11px] text-sub font-bold block">{t('offersStarts')}</span>
                      <span className="text-[11px] text-emerald-600 font-bold block">{lt(locale, { fa: 'مشاهده برنامه و رزرو', en: 'View Itinerary', ar: 'عرض البرنامج والحجز', zh: '查看行程与预订', ru: 'Программа и бронь' })}</span>
                    </div>
                    <span className="text-[17px] font-black text-brand-dark font-mono num text-end leading-tight">
                      {formatMoney(offer.fromPrice, c.currency, locale)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
