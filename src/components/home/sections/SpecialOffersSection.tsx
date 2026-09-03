'use client';

import { useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { useBookingStore } from '@/stores/booking-store';
import { COUNTRIES, EXPERIENCE_CATEGORY_META, countryName } from '@/lib/countries';
import { daysFromNow } from '@/lib/utils';
import { formatMoney, toLocalCurrency } from '@/lib/money';
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
  const ct = useTranslations('Common');
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
      amount: toLocalCurrency(amount, c.currency),
      currency: c.currency as 'IRR' | 'USDT' | 'AED',
      travelDate: daysFromNow(21),
    });
    router.push('/checkout');
  }

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10 bg-soft/30">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-brand-dark font-black text-xs">{c.flag} {t('offersKicker')}</p>
            <h2 className="text-2xl md:text-[32px] font-black text-ink m-0">
              {t('offersTitle', { country: countryName(country, locale) })}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => scroll(locale === 'en' ? -300 : 300)} className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-line text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label={ct('aria.scrollRight')}>
              <ChevronRight size={18} className="ltr:-scale-x-100" />
            </button>
            <button onClick={() => scroll(locale === 'en' ? 300 : -300)} className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-line text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label={ct('aria.scrollLeft')}>
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

        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory pb-5 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 hide-scrollbar">
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
                      {Icon && <Icon size={12} />}
                      {catLabel}
                    </span>
                    <span className="w-8 h-8 shrink-0 rounded-full bg-surface/90 text-brand-dark grid place-items-center shadow-sm transition-transform duration-300 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5">
                      <ArrowLeft size={15} className="ltr:-scale-x-100" />
                    </span>
                  </div>
                  <div className="absolute bottom-3 start-3 end-3 text-surface z-10">
                    <p className="text-[11px] text-mint-bright font-bold m-0 mb-1">{when}</p>
                    <p className="text-[16px] font-black leading-snug m-0 line-clamp-2">{title}</p>
                  </div>
                </div>
                <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1 justify-between">
                  <p className="text-xs text-sub leading-6 m-0 line-clamp-2 min-h-12">{desc}</p>
                  <div className="flex items-end justify-between gap-3 pt-3 border-t border-line/70">
                    <span className="text-[11px] text-sub font-bold pb-1">{t('offersStarts')}</span>
                    <span className="text-[17px] font-black text-brand-dark font-mono num text-end leading-tight">
                      {formatMoney(offer.fromPrice, c.currency, locale)}
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
