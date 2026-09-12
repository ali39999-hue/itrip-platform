'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { TOURS } from '@/lib/data';
import type { Tour } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName } from '@/lib/countries';
import { daysFromNow } from '@/lib/utils';
import { CountryExperiencesSection } from '@/components/shared/CountryExperiences';
import { MapPin, Star, ArrowLeft, ArrowRight, CalendarDays, SlidersHorizontal, Tent, Search, X, Check, Eye } from 'lucide-react';
import { lt } from '@/lib/lt';
import { TourImage } from '@/components/tours/TourImage';

const TOUR_IMGS: Record<string, string> = {
  t1: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=70&w=800',
  t2: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=70&w=800',
  t3: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=70&w=800',
  t4: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=70&w=800',
  t5: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=70&w=800',
};

type SortKey = 'rec' | 'cheap' | 'expensive';

function ToursContent() {
  const t = useTranslations('Tours');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const { country, setCountry } = useCountryStore();
  const c = COUNTRIES[country] || COUNTRIES.iran;
  const countryParam = searchParams.get('country');

  const [sort, setSort] = useState<SortKey>('rec');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTourPreview, setSelectedTourPreview] = useState<Tour | null>(null);
  const [allTours, setAllTours] = useState<Tour[]>(TOURS);

  useEffect(() => {
    fetch('/api/tours')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setAllTours(json.data);
        }
      })
      .catch(() => {});
  }, []);

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
    let list = category === 'all' ? allTours : allTours.filter((tour) => tour.category === category);
    
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

    // Filter or prioritize by active country if user selected a destination country and no specific search is active
    const activeCountryId = (countryParam || country) as keyof typeof COUNTRIES;
    if (activeCountryId && !activeSearch) {
      const activeCountryObj = COUNTRIES[activeCountryId];
      if (activeCountryObj) {
        const countryTours = list.filter((tour) => {
          const cFa = activeCountryObj.nameFa.toLowerCase();
          const cEn = activeCountryObj.nameEn.toLowerCase();
          const matchesCountry = tour.country?.toLowerCase().includes(cFa) || tour.countryEn?.toLowerCase().includes(cEn);
          const matchesCity = activeCountryObj.cities?.some(
            (ct) => tour.city.toLowerCase().includes(ct.fa.toLowerCase()) || (tour.cityEn && tour.cityEn.toLowerCase().includes(ct.en.toLowerCase()))
          );
          return matchesCountry || matchesCity;
        });
        if (countryTours.length > 0) {
          list = countryTours;
        }
      }
    }

    if (sort === 'cheap') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'expensive') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rec') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [allTours, category, cityParam, countryParam, country, searchQuery, sort]);

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
      <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[260px] sm:min-h-[340px] md:min-h-[420px] flex items-center justify-center bg-deep shadow-sm group">
        <TourImage
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=75&w=1800"
          alt={t('title')}
          sizes="100vw"
          priority
          className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/40 to-transparent" />
        <div className="relative z-10 text-center px-4 max-w-3xl py-6 sm:py-10">
          <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] sm:text-xs font-black mb-3 sm:mb-4 border border-white/20">
            <Tent size={13} className="text-mint-bright" /> {lt(locale, { fa: 'تجربه‌های دست‌چین و برنامه‌ریزی‌شده', en: 'Curated Travel Experiences', ar: 'تجارب سفر منتقاهاً بعناية', zh: '精选旅行体验', ru: 'Тщательно отобранные впечатления' })}
          </span>
          <h1 className="text-white hero-glow-text mb-2 sm:mb-3 text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            {t('title')} · {c?.flag} {countryName(country, locale)}
          </h1>
          <p className="text-white/90 hero-glow-sub text-xs sm:text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Search Bar + Categories Bar & Sort Controls */}
      <div className="flex flex-col gap-4 border-b border-line pb-4">
        {/* Country Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs snap-x touch-pan-x">
          <span className="text-[11px] font-black text-sub shrink-0 me-1">
            {lt(locale, { fa: 'مقصد:', en: 'Country:', ar: 'البلد:', zh: '国家：', ru: 'Страна:' })}
          </span>
          {COUNTRY_ORDER.map((id) => (
            <button
              key={`tour-country-${id}`}
              type="button"
              onClick={() => setCountry(id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-black transition cursor-pointer ${
                country === id
                  ? 'bg-brand text-surface shadow-xs'
                  : 'bg-soft text-sub hover:text-ink hover:bg-line/60'
              }`}
            >
              <span className="me-1">{COUNTRIES[id].flag}</span>
              <span>{countryName(id, locale)}</span>
            </button>
          ))}
        </div>

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
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 scrollbar-none snap-x touch-pan-x">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filtered.map((tour) => (
                <article
                  key={tour.id}
                  className="bg-surface rounded-2xl overflow-hidden border border-line shadow-xs hover:shadow-elev-2 transition-all hover:border-brand/40 group flex flex-col justify-between"
                >
                  <div>
                    {/* Consistent 16/10 aspect ratio across all cards */}
                    <Link href={`/tours/${tour.id}`} className="block relative aspect-[16/10] overflow-hidden bg-soft">
                      <TourImage
                        src={tour.heroImage || TOUR_IMGS[tour.id] || TOUR_IMGS.t1}
                        alt={locale === 'fa' ? tour.title : tour.titleEn}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 start-2.5 flex gap-2">
                        <span className="bg-deep/80 backdrop-blur-md text-surface text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Star size={12} className="text-gold fill-gold" /> {tour.rating}
                        </span>
                      </div>
                      <span
                        className="absolute bottom-2.5 end-2.5 px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-xs text-ink text-[11px] font-black shadow-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>{lt(locale, { fa: 'جزئیات کامل', en: 'Details', ar: 'التفاصيل', zh: '查看详情', ru: 'Подробнее' })}</span>
                      </span>
                    </Link>

                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-sub">
                        <MapPin size={12} className="text-brand-dark" />
                        <span>{tour.city}</span>
                        <span className="mx-1">•</span>
                        <CalendarDays size={12} className="text-brand-dark" />
                        <span>{tour.durationDays} {lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })}</span>
                      </div>

                      <Link href={`/tours/${tour.id}`}>
                        <h3 className="font-black text-[15px] text-ink line-clamp-2 leading-snug group-hover:text-brand-dark transition-colors">
                          {locale === 'fa' ? tour.title : tour.titleEn}
                        </h3>
                      </Link>

                      <div className="flex flex-wrap gap-1 mt-1">
                        {tour.includes?.slice(0, 2).map((inc, i) => (
                          <span key={i} className="text-[10.5px] font-bold text-sub bg-soft px-2 py-0.5 rounded-md">
                            {inc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex flex-wrap justify-between items-center border-t border-line/60 mt-3 gap-2">
                    <div className="pt-3 min-w-0">
                      <span className="text-[10.5px] font-bold text-sub block">{lt(locale, { fa: 'قیمت هر نفر', en: 'Per Person', ar: 'للفرد', zh: '每人价格', ru: 'За человека' })}</span>
                      <span className="text-[16px] font-black text-price font-mono num whitespace-nowrap">
                        {tour.price.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                        <span className="text-[10.5px] font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 shrink-0">
                      <Link
                        href={`/tours/${tour.id}`}
                        className="h-9 px-3 rounded-xl border border-line bg-surface hover:bg-soft text-ink font-extrabold text-xs transition flex items-center justify-center"
                      >
                        {lt(locale, { fa: 'جزئیات', en: 'Details', ar: 'التفاصيل', zh: '详情', ru: 'Инфо' })}
                      </Link>
                      <button
                        onClick={() => book(tour)}
                        aria-label={`رزرو ${locale === 'fa' ? tour.title : tour.titleEn}`}
                        className="h-9 bg-action hover:bg-action-hover text-ink px-3.5 rounded-xl font-black text-xs transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center gap-1 cursor-pointer"
                      >
                        <span>{t('bookTour')}</span>
                        <ArrowRight size={13} className="ltr:inline rtl:hidden" />
                        <ArrowLeft size={13} className="rtl:inline ltr:hidden" />
                      </button>
                    </div>
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
              <TourImage
                src={selectedTourPreview.heroImage || TOUR_IMGS[selectedTourPreview.id] || TOUR_IMGS.t1}
                alt="Tour preview"
                sizes="(max-width: 640px) 100vw, 500px"
                className="object-cover"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="p-3 rounded-xl bg-soft border border-line">
                <span className="text-sub block">{lt(locale, { fa: 'مقصد و شهر:', en: 'Destination & City:', ar: 'الوجهة والمدينة:', zh: '目的地与城市：', ru: 'Направление:' })}</span>
                <span className="text-ink font-black">{selectedTourPreview.city}</span>
              </div>
              <div className="p-3 rounded-xl bg-soft border border-line">
                <span className="text-sub block">{lt(locale, { fa: 'مدت اقامت و برنامه:', en: 'Duration & Plan:', ar: 'مدة الإقامة والخطة:', zh: '停留时间与规划：', ru: 'Длительность:' })}</span>
                <span className="text-ink font-black">{selectedTourPreview.durationDays} {lt(locale, { fa: 'روز و شب', en: 'Days & Nights', ar: 'أيام وليال', zh: '天数', ru: 'дней и ночей' })}</span>
              </div>
            </div>

            {selectedTourPreview.includes && (
              <div>
                <span className="text-xs font-black text-sub block mb-2">{lt(locale, { fa: 'خدمات و اقلام پکیج:', en: 'Included Services:', ar: 'الخدمات المشمولة:', zh: '套餐包含服务：', ru: 'Включенные услуги:' })}</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTourPreview.includes.map((inc, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-mint text-brand-dark">
                      <Check size={12} /> {inc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-sub block">{lt(locale, { fa: 'قیمت نهایی پکیج:', en: 'Total Package Price:', ar: 'السعر الإجمالي للباقة:', zh: '套餐总价：', ru: 'Итоговая цена:' })}</span>
                <span className="text-lg font-black text-price font-mono">
                  {selectedTourPreview.price.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/tours/${selectedTourPreview.id}`}
                  onClick={() => setSelectedTourPreview(null)}
                  className="h-11 px-4 rounded-xl border border-line bg-soft hover:bg-line/40 text-ink font-black text-xs transition flex items-center justify-center text-center"
                >
                  {lt(locale, { fa: 'مشاهده صفحه و روزشمار کامل', en: 'View Full Tour Page', ar: 'عرض صفحة الجولة والجدول الكامل', zh: '查看完整行程与细节', ru: 'Полное описание тура' })}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const tour = selectedTourPreview;
                    setSelectedTourPreview(null);
                    book(tour);
                  }}
                  className="h-11 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition active:scale-95 shadow-md"
                >
                  {lt(locale, { fa: 'رزرو و پرداخت', en: 'Book & Pay', ar: 'حجز ودفع', zh: '立即预订', ru: 'Забронировать' })}
                </button>
              </div>
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
