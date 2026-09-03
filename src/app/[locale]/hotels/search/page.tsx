'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import type { Hotel } from '@/lib/types';
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
    loadMore,
    priceBuckets,
    chips,
    activeFiltersCount,
  } = useHotelFilters({ initialCity });

  const { favs, cmp, toggleFav, toggleCmp } = useHotelComparison();

  const [showMap, setShowMap] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const comparedHotels = results.filter((h) => cmp.has(h.id));

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

                {/* Load More Button */}
                {results.length < totalCount && (
                  <div className="pt-4 text-center">
                    <button
                      onClick={loadMore}
                      className="px-6 py-2.5 rounded-xl border border-line bg-surface hover:bg-soft text-ink text-xs sm:text-sm font-bold shadow-2xs transition"
                    >
                      بارگذاری اقامتگاه‌های بیشتر ({results.length} از {totalCount})
                    </button>
                  </div>
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
