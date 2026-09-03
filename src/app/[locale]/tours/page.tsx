'use client';

import { Suspense, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { TOURS } from '@/lib/data';
import type { Tour } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { shimmerDataUrl } from '@/lib/image-utils';
import { CountryExperiencesSection } from '@/components/shared/CountryExperiences';
import { MapPin, Star, ArrowLeft, ArrowRight, CalendarDays, SlidersHorizontal, Tent } from 'lucide-react';
import { lt } from '@/lib/lt';

const TOUR_IMGS: Record<string, string> = {
  t1: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=70&w=800',
  t2: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=70&w=800',
  t3: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=70&w=800',
  t4: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=70&w=800',
};

const ASPECTS = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/3]', 'aspect-[3/4]'];

type SortKey = 'rec' | 'cheap' | 'expensive';

function ToursContent() {
  const t = useTranslations('Tours');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const [sort, setSort] = useState<SortKey>('rec');

  const CATEGORIES = [
    { id: 'all', label: t('allTours') },
    { id: 'cultural', label: t('cultural') },
    { id: 'nature', label: t('nature') },
    { id: 'medical', label: t('medical') },
    { id: 'adventure', label: t('adventure') },
    { id: 'signature', label: lt(locale, { fa: 'تجربه اصیل', en: 'Signature', ar: 'تجربة مميزة', zh: '特色体验', ru: 'Фирменные впечатления' }) },
  ] as const;

  const qParam = searchParams.get('category');
  const typeParam = searchParams.get('type');
  const cityParam = searchParams.get('city');

  // Map search widget's "type" param to a category id if category is absent.
  const mappedType = typeParam === 'medical'
    ? 'medical'
    : typeParam === 'commercial'
      ? 'signature'
      : typeParam === 'recreational'
        ? 'cultural'
        : undefined;

  const effectiveCategory = qParam || mappedType;
  const category = CATEGORIES.some((c) => c.id === effectiveCategory) ? effectiveCategory! : 'all';
  function setCategory(id: string) {
    router.replace(id === 'all' ? '/tours' : `/tours?category=${id}`, { scroll: false });
  }

  const isSignature = category === 'signature';

  const filtered = useMemo(() => {
    let list = category === 'all' ? TOURS : TOURS.filter((tour) => tour.category === category);
    if (cityParam) {
      const q = cityParam.trim().toLowerCase();
      const byCity = list.filter(
        (tour) => tour.city.includes(cityParam) || (tour.titleEn && tour.titleEn.toLowerCase().includes(q))
      );
      if (byCity.length) list = byCity;
    }
    if (sort === 'cheap') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'expensive') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rec') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [category, cityParam, sort]);

  function book(tour: Tour) {
    setBookingContext({
      type: 'tours',
      title: locale === 'fa' ? tour.title : tour.titleEn,
      subtitle: `${tour.durationDays} ${lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })} • ${tour.city}`,
      amount: tour.price,
      travelDate: daysFromNow(14),
    });
    router.push('/checkout');
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-6 md:pt-8 pb-20 flex flex-col gap-10">
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden min-h-[380px] md:min-h-[460px] flex items-center justify-center bg-deep shadow-sm group">
        <Image
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=75&w=1800"
          alt={t('title')}
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={shimmerDataUrl(1800, 460)}
          className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/40 to-transparent" />
        <div className="relative z-10 text-center px-4 max-w-3xl py-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface/10 backdrop-blur-md text-surface text-xs font-black mb-4 border border-surface/20">
            <Tent size={14} className="text-brand" /> {lt(locale, { fa: 'تجربه‌های دست‌چین و برنامه‌ریزی‌شده', en: 'Curated Travel Experiences', ar: 'تجارب سفر منتقاهاً بعناية', zh: '精选旅行体验', ru: 'Тщательно отобранные впечатления' })}
          </span>
          <h1 className="text-surface mb-4 text-[32px] md:text-[44px] leading-tight font-black tracking-tight">
            {t('title')}
          </h1>
          <p className="text-surface/90 text-[16px] md:text-[18px] leading-relaxed max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Categories Bar & Sort Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-black whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                category === c.id
                  ? 'bg-brand text-surface shadow-sm'
                  : 'bg-paper text-sub hover:text-brand-dark hover:bg-soft'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <SlidersHorizontal size={16} className="text-sub" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label={lt(locale, { fa: 'مرتب‌سازی تورها', en: 'Sort tours', ar: 'ترتيب الجولات', zh: '旅游产品排序', ru: 'Сортировка туров' })}
            className="bg-paper border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
          >
            <option value="rec">{t('featured')}</option>
            <option value="cheap">{t('lowestPrice')}</option>
            <option value="expensive">{t('highestPrice')}</option>
          </select>
        </div>
      </div>

      {/* Dynamic Tours Section or Signature Experiences */}
      {isSignature ? (
        <CountryExperiencesSection />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((tour, idx) => (
            <article
              key={tour.id}
              className="bg-paper rounded-2xl overflow-hidden border border-line shadow-sm hover:shadow-md transition-all hover:border-brand/40 group flex flex-col justify-between"
            >
              <div>
                <div className={`relative ${ASPECTS[idx % ASPECTS.length]} overflow-hidden bg-soft`}>
                  <Image
                    src={TOUR_IMGS[tour.id] || TOUR_IMGS.t1}
                    alt={locale === 'fa' ? tour.title : tour.titleEn}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    placeholder="blur"
                    blurDataURL={shimmerDataUrl(400, 300)}
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 start-3 flex gap-2">
                    <span className="bg-deep/80 backdrop-blur-md text-surface text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Star size={12} className="text-gold fill-gold" /> {tour.rating}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-sub">
                    <MapPin size={12} className="text-brand-dark" />
                    <span>{tour.city}</span>
                    <span className="mx-1">•</span>
                    <CalendarDays size={12} className="text-brand-dark" />
                    <span>{tour.durationDays} {lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })}</span>
                  </div>

                  <h3 className="font-black text-[15px] text-ink line-clamp-2 leading-snug group-hover:text-brand-dark transition-colors">
                    {locale === 'fa' ? tour.title : tour.titleEn}
                  </h3>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {tour.includes?.slice(0, 2).map((inc, i) => (
                      <span key={i} className="text-[10.5px] font-bold text-sub bg-soft px-2 py-0.5 rounded-md">
                        {inc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 flex justify-between items-center border-t border-line/60 mt-3">
                <div className="pt-3">
                  <span className="text-[10.5px] font-bold text-sub block">{lt(locale, { fa: 'قیمت هر نفر', en: 'Per Person', ar: 'للفرد', zh: '每人价格', ru: 'За человека' })}</span>
                  <span className="text-[16px] font-black text-price font-mono num">
                    {tour.price.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                    <span className="text-[10.5px] font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                  </span>
                </div>

                <button
                  onClick={() => book(tour)}
                  aria-label={`رزرو ${locale === 'fa' ? tour.title : tour.titleEn}`}
                  className="mt-3 bg-action hover:bg-action-hover text-[#14201f] px-4 py-2 rounded-xl font-black text-xs transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('bookTour')}</span>
                  <ArrowLeft size={14} className="rtl:hidden" />
                  <ArrowRight size={14} className="ltr:hidden" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ToursPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-soft animate-pulse" />}>
      <ToursContent />
    </Suspense>
  );
}
