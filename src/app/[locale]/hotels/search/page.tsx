'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import type { Hotel } from '@/lib/types';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  HotelSearchHeader,
  HotelSearchToolbar,
  HotelFilterSidebar,
  HotelFilterSheet,
  HotelFilterChips,
  HotelCard,
  HotelCompareBar,
  HotelCompareModal,
  HotelEmptyState,
  HotelSkeletonList,
  useHotelFilters,
  useHotelComparison,
} from '@/components/hotels/search';

const MapPane = dynamic(() => import('@/components/hotels/MapPane'), { ssr: false });

export default function HotelsSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-soft/40 py-6 px-4 md:px-8" aria-busy="true" aria-live="polite">
          <div className="max-w-[1400px] mx-auto space-y-6">
            <div className="h-14 rounded-2xl bg-soft animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 rounded-3xl bg-soft animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <HotelsSearchInner />
    </Suspense>
  );
}

function HotelsSearchInner() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  // Accept both `city` (new) and `destination` (legacy SearchWidget) params.
  const initialCity =
    searchParams.get('city') || searchParams.get('destination') || searchParams.get('q') || '';
  // Backward compat: legacy landing links used `?type=5star|boutique|resort|budget`.
  const legacyType = (searchParams.get('type') || '').toLowerCase();
  const parseNumList = (v: string | null) =>
    (v || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
  const parseStrList = (v: string | null) =>
    (v || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  const initialStars = (() => {
    const fromParam = parseNumList(searchParams.get('stars'));
    if (fromParam.length > 0) return fromParam;
    if (legacyType === '5star') return [5];
    return [];
  })();
  const initialPropertyTypes = (() => {
    const fromParam = parseStrList(searchParams.get('propertyTypes'));
    if (fromParam.length > 0) return fromParam as Array<'hotel' | 'apartment' | 'boutique' | 'villa'>;
    if (legacyType === 'boutique') return ['boutique' as const];
    if (legacyType === 'resort') return ['villa' as const];
    return [];
  })();
  const initialAmenities = (() => {
    const fromParam = parseStrList(searchParams.get('amenities'));
    if (fromParam.length > 0) return fromParam;
    if (legacyType === 'resort') return ['pool'];
    return [];
  })();
  const initialMaxPrice = (() => {
    const v = searchParams.get('maxPrice');
    if (v && !isNaN(Number(v))) return Number(v);
    if (legacyType === 'budget') return 4;
    return 20;
  })();
  const initialMinScore = (() => {
    const v = searchParams.get('minScore');
    return v && !isNaN(Number(v)) ? Number(v) : 0;
  })();
  const initialFreeCancel = searchParams.get('freeCancel') === 'true';
  const initialHotelName = searchParams.get('hotelName') || '';
  const initialSort = (searchParams.get('sort') as 'cheap' | 'score' | 'stars' | 'rec') || 'rec';
  const [checkin, setCheckin] = useState(searchParams.get('checkin') || '2026-09-22');
  const [checkout, setCheckout] = useState(searchParams.get('checkout') || '2026-09-26');
  const [adults, setAdults] = useState(searchParams.get('adults') ? Number(searchParams.get('adults')) : 2);
  const [childrenCount, setChildrenCount] = useState(searchParams.get('children') ? Number(searchParams.get('children')) : 0);
  const [rooms, setRooms] = useState(searchParams.get('rooms') ? Number(searchParams.get('rooms')) : 1);

  const {
    query,
    setQuery,
    hotelName,
    setHotelName,
    sort,
    setSort,
    loading,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    stars,
    toggleStar,
    propertyTypes,
    togglePropertyType,
    amenities,
    toggleAmenity,
    minScore,
    setMinScore,
    freeCancel,
    toggleFreeCancel,
    resetAll,
    results,
    totalCount,
    currentPage,
    setCurrentPage,
    totalPages,
    priceBuckets,
    facets,
    chips,
    activeFiltersCount,
    error,
    retry,
  } = useHotelFilters({
    initialCity,
    initialSort,
    initialMaxPrice,
    initialStars,
    initialPropertyTypes,
    initialAmenities,
    initialMinScore,
    initialFreeCancel,
    initialHotelName,
  });

  const { favs, cmp, toggleFav, toggleCmp } = useHotelComparison();

  const [showMap, setShowMap] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const nights = Math.max(
    1,
    Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / (1000 * 60 * 60 * 24)) || 1
  );

  const comparedHotels = results.filter((h) => cmp.has(h.id));

  const pageItems: Array<number | 'ellipsis' | 'ellipsis-end'> = totalPages <= 5
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : currentPage <= 3
      ? [1, 2, 3, 'ellipsis', totalPages]
      : currentPage >= totalPages - 2
        ? [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
        : [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages];

  return (
    <div className="min-h-dvh bg-soft/40 py-6 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <HotelSearchHeader
          query={query}
          onQueryChange={setQuery}
          onSearchSubmit={(cityOverride?: string) => {
            const targetCity = (typeof cityOverride === 'string' ? cityOverride : query).trim();
            if (typeof cityOverride === 'string') {
              setQuery(cityOverride);
            }
            const params = new URLSearchParams();
            if (targetCity) params.set('city', targetCity);
            if (checkin) params.set('checkin', checkin);
            if (checkout) params.set('checkout', checkout);
            if (adults) params.set('adults', String(adults));
            if (childrenCount) params.set('children', String(childrenCount));
            if (rooms) params.set('rooms', String(rooms));
            router.push(`/hotels/search?${params.toString()}`);
          }}
          resultsCount={totalCount}
          checkin={checkin}
          onCheckinChange={setCheckin}
          checkout={checkout}
          onCheckoutChange={setCheckout}
          adults={adults}
          onAdultsChange={setAdults}
          childrenCount={childrenCount}
          onChildrenCountChange={setChildrenCount}
          rooms={rooms}
          onRoomsChange={setRooms}
        />

        <HotelSearchToolbar
          sort={sort}
          onSortChange={setSort}
          showMap={showMap}
          onToggleMap={() => setShowMap((prev) => !prev)}
          onOpenMobileFilters={() => setMobileFilterOpen(true)}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Quick Hotel Filter Pills (Trip.com / Alibaba Benchmark) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-black my-2 snap-x touch-pan-x">
          <button
            type="button"
            onClick={resetAll}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer ${chips.length === 0 ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: 'همه اقامتگاه‌ها', en: 'All Stays', ar: 'كل الإقامات', zh: '全部住宿', ru: 'Все отели' })}
          </button>
          <button
            type="button"
            onClick={() => toggleStar(5)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer ${stars.has(5) ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: '۵ ستاره', en: '5-Star', ar: '5 نجوم', zh: '5星级', ru: '5 звезд' })}
          </button>
          <button
            type="button"
            onClick={() => {
              if (stars.has(4)) {
                toggleStar(4);
              } else {
                toggleStar(4);
                if (!stars.has(5)) toggleStar(5);
              }
            }}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer ${stars.has(4) ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: '۴ و ۵ ستاره', en: '4+ Stars', ar: '4+ نجوم', zh: '4星及以上', ru: '4+ звезды' })}
          </button>
          <button
            type="button"
            onClick={toggleFreeCancel}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer ${freeCancel ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: 'کنسلی رایگان', en: 'Free Cancellation', ar: 'إلغاء مجاني', zh: '免费取消', ru: 'Бесплатная отмена' })}
          </button>
          <button
            type="button"
            onClick={() => toggleAmenity('breakfast')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer ${amenities.has('breakfast') ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: 'صبحانه رایگان', en: 'Free Breakfast', ar: 'إفطار مجاني', zh: '免费早餐', ru: 'Бесплатный завтрак' })}
          </button>
          <button
            type="button"
            onClick={() => toggleAmenity('pool')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer ${amenities.has('pool') ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: 'دارای استخر', en: 'Swimming Pool', ar: 'مسبح', zh: '有泳池', ru: 'С бассейном' })}
          </button>
          <button
            type="button"
            onClick={() => togglePropertyType('apartment')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer ${propertyTypes.has('apartment') ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: 'هتل‌آپارتمان', en: 'Apartment Hotel', ar: 'شقق فندقية', zh: '公寓酒店', ru: 'Апарт-отель' })}
          </button>
          <button
            type="button"
            onClick={() => togglePropertyType('boutique')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer ${propertyTypes.has('boutique') ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: 'سنتی و بوم‌گردی', en: 'Boutique & Traditional', ar: 'بوتيك وتقليدي', zh: '精品传统住宿', ru: 'Бутик' })}
          </button>
          <button
            type="button"
            onClick={() => setMinScore(minScore === 9 ? 0 : 9)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer ${minScore === 9 ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: 'امتیاز ۹+ (فوق‌العاده)', en: 'Score 9+ (Superb)', ar: 'تقييم 9+ (استثنائي)', zh: '9分以上（极佳）', ru: 'Оценка 9+ (Супер)' })}
          </button>
        </div>

        <HotelFilterChips chips={chips} onResetAll={resetAll} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <HotelFilterSidebar
              maxPrice={maxPrice}
              onMaxPriceChange={setMaxPrice}
              minPrice={minPrice}
              onMinPriceChange={setMinPrice}
              priceBuckets={priceBuckets}
              stars={stars}
              onToggleStar={toggleStar}
              propertyTypes={propertyTypes}
              onTogglePropertyType={togglePropertyType}
              amenities={amenities}
              onToggleAmenity={toggleAmenity}
              hotelName={hotelName}
              onHotelNameChange={setHotelName}
              minScore={minScore}
              onMinScoreChange={setMinScore}
              freeCancel={freeCancel}
              onToggleFreeCancel={toggleFreeCancel}
              facets={facets}
              onResetAll={resetAll}
            />
          </div>

          {/* Results Grid / List */}
          <div className={`space-y-4 ${showMap ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {loading ? (
              <HotelSkeletonList count={3} />
            ) : error ? (
              <div className="bg-surface rounded-2xl border border-rose-200 p-10 text-center shadow-sm" role="alert">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center mx-auto mb-3">
                  <SlidersHorizontal size={24} aria-hidden="true" />
                </div>
                <h3 className="text-base font-black text-ink mb-1">
                  {lt(locale, { fa: 'اختلال موقت در ارتباط با تأمین‌کننده هتل', en: 'Hotel supplier connection issue', ar: 'مشكلة مؤقتة في الاتصال بمورد الفنادق', zh: '酒店供应商连接问题', ru: 'Временная ошибка поставщика отелей' })}
                </h3>
                <p className="text-sub font-bold text-xs max-w-md mx-auto mb-4">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-brand text-surface font-black text-xs hover:bg-brand-dark transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {lt(locale, { fa: 'تلاش مجدد استعلام', en: 'Retry query', ar: 'إعادة المحاولة', zh: '重试查询', ru: 'Повторить запрос' })}
                </button>
              </div>
            ) : results.length === 0 ? (
              <HotelEmptyState onResetFilters={resetAll} />
            ) : (
              <>
                {results.map((hotel: Hotel) => {
                  return (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      fav={favs.has(hotel.id)}
                      onFav={() => toggleFav(hotel.id)}
                      cmpChecked={cmp.has(hotel.id)}
                      onCmp={() => toggleCmp(hotel.id)}
                      nights={nights}
                      checkin={checkin}
                      checkout={checkout}
                      adults={adults}
                      childrenCount={childrenCount}
                    />
                  );
                })}

                {totalPages > 1 && (
                  <nav
                    className="flex flex-wrap items-center justify-center gap-2 pt-4"
                    aria-label={lt(locale, {
                      fa: 'صفحه‌های نتایج اقامتگاه‌ها',
                      en: 'Hotel result pages',
                      ar: 'صفحات نتائج الفنادق',
                      zh: '酒店结果页',
                      ru: 'Страницы результатов отелей',
                    })}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="min-h-10 px-3 rounded-xl border border-line bg-surface text-sub text-[13px] font-black transition-colors hover:bg-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {lt(locale, { fa: 'قبلی', en: 'Previous', ar: 'السابق', zh: '上一页', ru: 'Назад' })}
                    </button>
                    {pageItems.map((pageItem, index) => {
                      if (typeof pageItem !== 'number') {
                        return <span key={`${pageItem}-${index}`} className="px-1 text-sub font-black" aria-hidden="true">...</span>;
                      }

                      return (
                        <button
                          key={pageItem}
                          type="button"
                          onClick={() => {
                            setCurrentPage(pageItem);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          aria-label={lt(locale, {
                            fa: `رفتن به صفحه ${pageItem}`,
                            en: `Go to page ${pageItem}`,
                            ar: `الانتقال إلى الصفحة ${pageItem}`,
                            zh: `前往第 ${pageItem} 页`,
                            ru: `Перейти на страницу ${pageItem}`,
                          })}
                          aria-current={currentPage === pageItem ? 'page' : undefined}
                          className={`min-h-11 min-w-11 px-3 rounded-xl text-[13px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                            currentPage === pageItem
                              ? 'bg-brand text-surface'
                              : 'border border-line bg-surface text-sub hover:bg-soft'
                          }`}
                        >
                          {num(pageItem, locale)}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="min-h-10 px-3 rounded-xl border border-line bg-surface text-sub text-[13px] font-black transition-colors hover:bg-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {lt(locale, { fa: 'بعدی', en: 'Next', ar: 'التالي', zh: '下一页', ru: 'Далее' })}
                    </button>
                    <span className="basis-full text-center text-[11px] font-bold text-sub">
                      {lt(locale, {
                        fa: `صفحه ${num(currentPage, locale)} از ${num(totalPages, locale)}`,
                        en: `Page ${num(currentPage, locale)} of ${num(totalPages, locale)}`,
                        ar: `الصفحة ${num(currentPage, locale)} من ${num(totalPages, locale)}`,
                        zh: `第 ${num(currentPage, locale)} 页，共 ${num(totalPages, locale)} 页`,
                        ru: `Страница ${num(currentPage, locale)} из ${num(totalPages, locale)}`,
                      })}
                    </span>
                  </nav>
                )}
              </>
            )}
          </div>

          {/* Map View Pane (Desktop Side-by-Side + Mobile Modal) */}
          {showMap && (
            <>
              <div className="hidden lg:block lg:col-span-1 sticky top-24 h-[calc(100vh-120px)] rounded-2xl overflow-hidden border border-line shadow-elev-1">
                <MapPane hotels={results} />
              </div>
              <div
                role="dialog"
                aria-modal="true"
                aria-label={lt(locale, { fa: 'نقشه اقامتگاه‌ها', en: 'Hotels Map', ar: 'خريطة الفنادق', zh: '酒店地图', ru: 'Карта отелей' })}
                className="lg:hidden fixed inset-0 z-[120] bg-surface flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-line bg-surface/95 backdrop-blur-md">
                  <span className="font-black text-sm text-ink">
                    {lt(locale, { fa: 'نمایش اقامتگاه‌ها روی نقشه', en: 'Hotels on Map', ar: 'الفنادق على الخريطة', zh: '地图上的酒店', ru: 'Отели на карте' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMap(false)}
                    className="px-3 py-1.5 rounded-xl bg-soft text-sub text-xs font-bold hover:text-ink cursor-pointer"
                  >
                    {lt(locale, { fa: 'بستن نقشه', en: 'Close Map', ar: 'إغلاق الخريطة', zh: '关闭地图', ru: 'Закрыть карту' })}
                  </button>
                </div>
                <div className="flex-1 w-full h-full relative">
                  <MapPane hotels={results} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ================= STICKY MOBILE FILTER, SORT & MAP PILL (FLYTODAY STYLE) ================= */}
        {/* Gracefully auto-hides when hotel comparison bar is active to avoid sticky collisions */}
        <div
          className={`lg:hidden fixed bottom-[calc(70px+env(safe-area-inset-bottom,0px))] inset-x-0 z-40 flex justify-center pointer-events-none px-4 transition-all duration-200 ${
            cmp.size > 0 ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'
          }`}
        >
          <div className="pointer-events-auto bg-ink/90 dark:bg-surface/95 backdrop-blur-md text-surface dark:text-ink px-3 py-1 rounded-full shadow-elev-3 flex items-center gap-2.5 border border-surface/20 dark:border-line">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="flex items-center gap-1.5 text-xs font-black min-h-[44px] px-2 rounded-full hover:bg-surface/20 transition active:scale-95 cursor-pointer"
            >
              <SlidersHorizontal size={14} />
              <span>{lt(locale, { fa: 'فیلترها', en: 'Filters', ar: 'الفلاتر', zh: '筛选', ru: 'Фильтры' })}</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-brand text-surface text-[10px] grid place-items-center font-bold">
                  {num(activeFiltersCount, locale)}
                </span>
              )}
            </button>
            <span className="w-px h-4 bg-surface/30 dark:bg-line" />
            <button
              type="button"
              onClick={() => {
                const sortOrder: Array<'rec' | 'cheap' | 'score' | 'stars'> = ['rec', 'cheap', 'score', 'stars'];
                const nextIdx = (sortOrder.indexOf(sort) + 1) % sortOrder.length;
                setSort(sortOrder[nextIdx]);
              }}
              className="flex items-center gap-1.5 text-xs font-black min-h-[44px] px-2 rounded-full hover:bg-surface/20 transition active:scale-95 cursor-pointer"
            >
              <span className="text-[11px] opacity-75">{lt(locale, { fa: 'مرتب‌سازی:', en: 'Sort:', ar: 'الترتيب:', zh: '排序：', ru: 'Сортировка:' })}</span>
              <span className="text-mint-bright dark:text-brand font-bold">
                {sort === 'rec'
                  ? lt(locale, { fa: 'پیشنهادی', en: 'Recommended', ar: 'الموصى به', zh: '推荐', ru: 'Рекомендуемые' })
                  : sort === 'cheap'
                    ? lt(locale, { fa: 'ارزان‌ترین', en: 'Cheapest', ar: 'الأرخص', zh: '最低价', ru: 'Дешевые' })
                    : sort === 'score'
                      ? lt(locale, { fa: 'بیشترین امتیاز', en: 'Top Rated', ar: 'الأعلى تقييماً', zh: '评分最高', ru: 'Высокий рейтинг' })
                      : lt(locale, { fa: 'ستاره هتل', en: 'Stars', ar: 'النجوم', zh: '星级', ru: 'Звёзды' })}
              </span>
            </button>
            <span className="w-px h-4 bg-surface/30 dark:bg-line" />
            <button
              type="button"
              onClick={() => setShowMap((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-black min-h-[44px] px-2 rounded-full hover:bg-surface/20 transition active:scale-95 text-mint-bright cursor-pointer"
            >
              <span>
                {showMap
                  ? lt(locale, { fa: 'لیست', en: 'List', ar: 'قائمة', zh: '列表', ru: 'Список' })
                  : lt(locale, { fa: 'نقشه', en: 'Map', ar: 'خريطة', zh: '地图', ru: 'Карта' })}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Filter Sheet Modal */}
        <HotelFilterSheet
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          minPrice={minPrice}
          onMinPriceChange={setMinPrice}
          priceBuckets={priceBuckets}
          stars={stars}
          onToggleStar={toggleStar}
          propertyTypes={propertyTypes}
          onTogglePropertyType={togglePropertyType}
          amenities={amenities}
          onToggleAmenity={toggleAmenity}
          hotelName={hotelName}
          onHotelNameChange={setHotelName}
          minScore={minScore}
          onMinScoreChange={setMinScore}
          freeCancel={freeCancel}
          onToggleFreeCancel={toggleFreeCancel}
          facets={facets}
          onResetAll={resetAll}
          resultsCount={totalCount}
        />

        {/* Compare Bottom Bar */}
        <HotelCompareBar
          cmp={cmp}
          hotels={results}
          onToggleCmp={toggleCmp}
          onCompareAction={() => setCompareModalOpen(true)}
        />

        {/* Side-by-Side Comparison Modal */}
        <HotelCompareModal
          isOpen={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
          comparedHotels={comparedHotels}
          onRemove={toggleCmp}
          checkin={checkin}
          checkout={checkout}
          adults={adults}
          childrenCount={childrenCount}
        />
      </div>
    </div>
  );
}
