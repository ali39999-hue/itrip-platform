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
import { MapPin, Star, ArrowLeft, ArrowRight, CalendarDays, SlidersHorizontal, Tent, Search, X, Check, Eye } from 'lucide-react';
import { lt } from '@/lib/lt';

const TOUR_IMGS: Record<string, string> = {
  t1: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=70&w=800',
  t2: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=70&w=800',
  t3: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=70&w=800',
  t4: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=70&w=800',
};

type SortKey = 'rec' | 'cheap' | 'expensive';

function ToursContent() {
  const t = useTranslations('Tours');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const [sort, setSort] = useState<SortKey>('rec');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTourPreview, setSelectedTourPreview] = useState<Tour | null>(null);

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
    
    // In-page search input + city query
    const activeSearch = searchQuery.trim().toLowerCase() || (cityParam ? cityParam.trim().toLowerCase() : '');
    if (activeSearch) {
      list = list.filter(
        (tour) =>
          tour.city.toLowerCase().includes(activeSearch) ||
          tour.title.toLowerCase().includes(activeSearch) ||
          (tour.titleEn && tour.titleEn.toLowerCase().includes(activeSearch))
      );
    }

    if (sort === 'cheap') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'expensive') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rec') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [category, cityParam, searchQuery, sort]);

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
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-6 md:pt-8 pb-20 flex flex-col gap-8">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden min-h-[340px] md:min-h-[420px] flex items-center justify-center bg-deep shadow-sm group">
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
        <div className="relative z-10 text-center px-4 max-w-3xl py-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface/15 backdrop-blur-md text-surface text-xs font-black mb-4 border border-surface/20">
            <Tent size={14} className="text-mint-bright" /> {lt(locale, { fa: 'تجربه‌های دست‌چین و برنامه‌ریزی‌شده', en: 'Curated Travel Experiences', ar: 'تجارب سفر منتقاهاً بعناية', zh: '精选旅行体验', ru: 'Тщательно отобранные впечатления' })}
          </span>
          <h1 className="text-surface mb-3 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            {t('title')}
          </h1>
          <p className="text-surface/90 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Search Bar + Categories Bar & Sort Controls */}
      <div className="flex flex-col gap-4 border-b border-line pb-4">
        {/* Search and Sort Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-sub pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lt(locale, { fa: 'جستجوی نام تور، مقصد یا فعالیت...', en: 'Search tour name, city or activity...', ar: 'ابحث عن الجولة أو المدينة...', zh: '搜索旅游名称或目的地...', ru: 'Поиск туров или городов...' })}
              className="w-full h-11 ps-10 pe-4 rounded-xl bg-surface border border-line text-xs font-bold text-ink placeholder:text-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-sub hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <SlidersHorizontal size={15} className="text-sub" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={lt(locale, { fa: 'مرتب‌سازی تورها', en: 'Sort tours', ar: 'ترتيب الجولات', zh: '旅游产品排序', ru: 'Сортировка туров' })}
              className="bg-surface border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer shadow-xs"
            >
              <option value="rec">{t('featured')}</option>
              <option value="cheap">{t('lowestPrice')}</option>
              <option value="expensive">{t('highestPrice')}</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-black whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                category === c.id
                  ? 'bg-brand text-surface shadow-sm'
                  : 'bg-surface border border-line/80 text-sub hover:text-brand-dark hover:bg-soft'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Tours Section or Signature Experiences */}
      {isSignature ? (
        <CountryExperiencesSection />
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sub bg-surface rounded-3xl border border-line p-8">
              <Tent size={36} className="mx-auto text-line mb-3" />
              <h3 className="font-black text-base text-ink mb-1">
                {lt(locale, { fa: 'توری با این مشخصات یافت نشد', en: 'No tours found matching your search', ar: 'لم يتم العثور على جولات مطابقة', zh: '未找到匹配的旅游产品', ru: 'Туры не найдены' })}
              </h3>
              <p className="text-xs font-bold text-sub">
                {lt(locale, { fa: 'کلمات دیگری جستجو کنید یا فیلتر دسته‌بندی را تغییر دهید.', en: 'Try different search keywords or select another category.', ar: 'جرب كلمات بحث أخرى أو اختر فئة مختلفة.', zh: '请尝试其他关键词或更换分类。', ru: 'Попробуйте другие слова или смените категорию.' })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map((tour) => (
                <article
                  key={tour.id}
                  className="bg-surface rounded-2xl overflow-hidden border border-line shadow-xs hover:shadow-elev-2 transition-all hover:border-brand/40 group flex flex-col justify-between"
                >
                  <div>
                    {/* Consistent 16/10 aspect ratio across all cards */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-soft">
                      <Image
                        src={TOUR_IMGS[tour.id] || TOUR_IMGS.t1}
                        alt={locale === 'fa' ? tour.title : tour.titleEn}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        placeholder="blur"
                        blurDataURL={shimmerDataUrl(400, 250)}
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 start-2.5 flex gap-2">
                        <span className="bg-deep/80 backdrop-blur-md text-surface text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Star size={12} className="text-gold fill-gold" /> {tour.rating}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTourPreview(tour)}
                        className="absolute bottom-2.5 end-2.5 w-8 h-8 rounded-full bg-surface/90 backdrop-blur-xs text-ink grid place-items-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="مشاهده جزییات"
                      >
                        <Eye size={14} />
                      </button>
                    </div>

                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-sub">
                        <MapPin size={12} className="text-brand-dark" />
                        <span>{tour.city}</span>
                        <span className="mx-1">•</span>
                        <CalendarDays size={12} className="text-brand-dark" />
                        <span>{tour.durationDays} {lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дن.' })}</span>
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
                      className="mt-3 bg-action hover:bg-action-hover text-ink px-4 py-2 rounded-xl font-black text-xs transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center gap-1 cursor-pointer"
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
        </>
      )}

      {/* Tour Detail Preview Modal */}
      {selectedTourPreview && (
        <div className="fixed inset-0 z-[200] bg-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface rounded-3xl p-6 border border-line shadow-elev-3 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Tent size={20} className="text-brand-dark" />
                <h3 className="font-black text-base text-ink">
                  {locale === 'fa' ? selectedTourPreview.title : selectedTourPreview.titleEn}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTourPreview(null)}
                className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden">
              <Image
                src={TOUR_IMGS[selectedTourPreview.id] || TOUR_IMGS.t1}
                alt="Tour preview"
                fill
                className="object-cover"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="p-3 rounded-xl bg-soft border border-line">
                <span className="text-sub block">مقصد و شهر:</span>
                <span className="text-ink font-black">{selectedTourPreview.city}</span>
              </div>
              <div className="p-3 rounded-xl bg-soft border border-line">
                <span className="text-sub block">مدت اقامت و برنامه:</span>
                <span className="text-ink font-black">{selectedTourPreview.durationDays} روز و شب</span>
              </div>
            </div>

            {selectedTourPreview.includes && (
              <div>
                <span className="text-xs font-black text-sub block mb-2">خدمات و اقلام پکیج:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTourPreview.includes.map((inc, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-mint text-brand-dark">
                      <Check size={12} /> {inc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-line flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-sub block">قیمت نهایی پکیج:</span>
                <span className="text-lg font-black text-price font-mono">
                  {selectedTourPreview.price.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} تومان
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const tour = selectedTourPreview;
                  setSelectedTourPreview(null);
                  book(tour);
                }}
                className="h-11 px-6 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition active:scale-95 shadow-md"
              >
                تکمیل رزرو و پرداخت
              </button>
            </div>
          </div>
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
