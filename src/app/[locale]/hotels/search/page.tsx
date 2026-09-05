'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
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
        <div className="min-h-screen bg-soft/40 py-6 px-4 md:px-8" aria-busy="true" aria-live="polite">
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
  const initialCity = searchParams.get('city') || '';
  const [checkin, setCheckin] = useState(searchParams.get('checkin') || '2026-09-22');
  const [checkout, setCheckout] = useState(searchParams.get('checkout') || '2026-09-26');
  const [adults, setAdults] = useState(searchParams.get('adults') ? Number(searchParams.get('adults')) : 2);
  const [childrenCount, setChildrenCount] = useState(searchParams.get('children') ? Number(searchParams.get('children')) : 0);

  const {
    query,
    setQuery,
    sort,
    setSort,
    loading,
    maxPrice,
    setMaxPrice,
    stars,
    toggleStar,
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
    chips,
    activeFiltersCount,
  } = useHotelFilters({ initialCity });

  const { favs, cmp, toggleFav, toggleCmp } = useHotelComparison();

  const [showMap, setShowMap] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const comparedHotels = results.filter((h) => cmp.has(h.id));

  const pageItems: Array<number | 'ellipsis' | 'ellipsis-end'> = totalPages <= 5
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : currentPage <= 3
      ? [1, 2, 3, 'ellipsis', totalPages]
      : currentPage >= totalPages - 2
        ? [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
        : [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages];

  return (
    <div className="min-h-screen bg-soft/40 py-6 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <HotelSearchHeader
          query={query}
          onQueryChange={setQuery}
          onSearchSubmit={() => {
            const params = new URLSearchParams();
            if (query.trim()) params.set('city', query.trim());
            if (checkin) params.set('checkin', checkin);
            if (checkout) params.set('checkout', checkout);
            if (adults) params.set('adults', String(adults));
            if (childrenCount) params.set('children', String(childrenCount));
            router.push(`/hotels/search?${params.toString()}`);
          }}
          resultsCount={results.length}
          checkin={checkin}
          onCheckinChange={setCheckin}
          checkout={checkout}
          onCheckoutChange={setCheckout}
          adults={adults}
          onAdultsChange={setAdults}
          childrenCount={childrenCount}
          onChildrenCountChange={setChildrenCount}
        />

        <HotelSearchToolbar
          sort={sort}
          onSortChange={setSort}
          showMap={showMap}
          onToggleMap={() => setShowMap((prev) => !prev)}
          onOpenMobileFilters={() => setMobileFilterOpen(true)}
          activeFiltersCount={activeFiltersCount}
        />

        <HotelFilterChips chips={chips} onResetAll={resetAll} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <HotelFilterSidebar
              maxPrice={maxPrice}
              onMaxPriceChange={setMaxPrice}
              priceBuckets={priceBuckets}
              stars={stars}
              onToggleStar={toggleStar}
              minScore={minScore}
              onMinScoreChange={setMinScore}
              freeCancel={freeCancel}
              onToggleFreeCancel={toggleFreeCancel}
              onResetAll={resetAll}
            />
          </div>

          {/* Results Grid / List */}
          <div className={`space-y-4 ${showMap ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {loading ? (
              <HotelSkeletonList count={3} />
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
                          className={`min-h-10 min-w-10 px-3 rounded-xl text-[13px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
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

          {/* Map View Pane */}
          {showMap && (
            <div className="hidden lg:block lg:col-span-1 sticky top-24 h-[calc(100vh-120px)] rounded-2xl overflow-hidden border border-line shadow-elev-1">
              <MapPane hotels={results} />
            </div>
          )}
        </div>

        {/* Mobile Filter Sheet Modal */}
        <HotelFilterSheet
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          priceBuckets={priceBuckets}
          stars={stars}
          onToggleStar={toggleStar}
          minScore={minScore}
          onMinScoreChange={setMinScore}
          freeCancel={freeCancel}
          onToggleFreeCancel={toggleFreeCancel}
          onResetAll={resetAll}
          resultsCount={results.length}
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
