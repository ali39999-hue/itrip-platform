'use client';

import { useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { useBookingStore } from '@/stores/booking-store';
import { COUNTRIES, EXPERIENCE_CATEGORY_META, countryName } from '@/lib/countries';
import { daysFromNow } from '@/lib/utils';
import { num } from '@/lib/format';
import { CATEGORY_ICONS } from '@/components/shared/CountryExperiences';
import Image from 'next/image';
import { CATEGORY_PHOTO_MAP, shimmerDataUrl } from '@/lib/image-utils';
import {
  ArrowLeft, Sparkles, ChevronRight, ChevronLeft,
} from 'lucide-react';

export function SpecialOffersSection() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Home');
  const t2 = useTranslations('Plan');
  const { country } = useCountryStore();
  const c = COUNTRIES[country];

  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (offset: number) => scrollRef.current?.scrollBy({ left: offset, behavior: 'smooth' });

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

  function book(title: string, where: string, amount: number) {
    useBookingStore.getState().setBookingContext({
      type: 'tours',
      title,
      subtitle: `${where} • ${countryName(country, locale)}`,
      amount,
      travelDate: daysFromNow(21),
    });
    router.push('/checkout');
  }

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10 bg-soft/30">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-brand-dark font-black tracking-wide text-xs">{c.flag} {t('offersKicker')}</p>
            <h2 className="text-2xl md:text-[32px] font-black text-ink m-0 tracking-tight">
              {t('offersTitle', { country: countryName(country, locale) })}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => scroll(locale === 'en' ? -300 : 300)} className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-line text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label={t('Common.aria.scrollRight')}>
              <ChevronRight size={18} className="ltr:-scale-x-100" />
            </button>
            <button onClick={() => scroll(locale === 'en' ? 300 : -300)} className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-line text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label={t('Common.aria.scrollLeft')}>
              <ChevronLeft size={18} className="ltr:-scale-x-100" />
            </button>
            <button
              onClick={() => router.push('/plan')}
              className="hidden md:inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full bg-brand text-surface text-[13px] font-black whitespace-nowrap hover:bg-brand-2 transition shadow-sm shadow-brand/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Sparkles size={14} /> {t2('plannerCta')}
            </button>
            <button
              onClick={() => router.push('/tours?category=signature')}
              className="hidden md:inline-flex items-center gap-1.5 text-brand-dark text-[13px] font-bold whitespace-nowrap hover:gap-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {t('offersAll')} <ArrowLeft size={15} className="ltr:-scale-x-100" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 gap-6 hide-scrollbar">
          {offers.map((offer) => {
            const Icon = CATEGORY_ICONS[offer.category];
            const catLabel = locale === 'en'
              ? EXPERIENCE_CATEGORY_META[offer.category].en
              : EXPERIENCE_CATEGORY_META[offer.category].fa;
            const title = locale === 'en' ? offer.titleEn : offer.title;
            const desc = locale === 'en' ? offer.descEn : offer.desc;
            const when = locale === 'en' ? offer.whenEn : offer.when;
            const photoUrl = CATEGORY_PHOTO_MAP[offer.category] || CATEGORY_PHOTO_MAP.culture;
            return (
              <button
                key={offer.titleEn}
                onClick={() => book(locale === 'en' ? offer.titleEn : offer.title, locale === 'en' ? offer.whereEn : offer.where, offer.fromPrice)}
                className="shrink-0 w-[280px] md:w-auto snap-start bg-surface rounded-2xl shadow-sm overflow-hidden hover:shadow-elev-2 hover:-translate-y-1 transition-all group cursor-pointer border border-line/50 text-start focus-visible:ring-2 focus-visible:ring-brand flex flex-col"
              >
                <div className="h-[160px] relative w-full overflow-hidden bg-brand-dark/20">
                  <Image
                    src={photoUrl}
                    alt={title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    placeholder="blur"
                    blurDataURL={shimmerDataUrl(400, 200)}
                    sizes="(max-width: 768px) 280px, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <div className="absolute top-3 start-3 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/90 backdrop-blur-md text-[11px] font-black text-brand-dark shadow-sm">
                      {Icon && <Icon size={12} />}
                      {catLabel}
                    </span>
                  </div>
                  <div className="absolute bottom-3 start-3 end-3 text-surface z-10">
                    <p className="text-[11px] text-surface/80 font-bold m-0">{when}</p>
                    <p className="text-[15px] font-black leading-tight m-0 truncate">{title}</p>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1 justify-between">
                  <p className="text-xs text-sub leading-relaxed m-0 line-clamp-2">{desc}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-line/60">
                    <span className="text-[11px] text-sub font-bold">{t('offersStarts')}</span>
                    <span className="text-[15px] font-black text-brand-dark font-mono num">
                      {num(offer.fromPrice, locale)} {t('offersToman')}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
