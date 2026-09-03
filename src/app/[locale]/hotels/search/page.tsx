'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { HOTELS } from '@/lib/data';
import type { Hotel } from '@/lib/types';
import {
  HotelSearchHeader,
  HotelSearchToolbar,
  HotelFilterSidebar,
  HotelFilterSheet,
  HotelFilterChips,
  HotelCard,
  HotelCompareBar,
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
    priceBuckets,
    chips,
    activeFiltersCount,
  } = useHotelFilters({ initialCity });

  const { favs, cmp, toggleFav, toggleCmp } = useHotelComparison();

  const [showMap, setShowMap] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  return (
    <div className="min-h-screen bg-soft/40 py-6 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <HotelSearchHeader
          query={query}
          onQueryChange={setQuery}
          onSearchSubmit={() => {
            const trimmed = query.trim();
            if (trimmed) {
              router.push(`/hotels/search?city=${encodeURIComponent(trimmed)}`);
            } else {
              router.push('/hotels/search');
            }
          }}
          resultsCount={results.length}
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
              results.map((hotel: Hotel) => {
                const numericId = Number(String(hotel.id).replace(/^h/, '')) || 0;
                return (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    fav={favs.has(numericId)}
                    onFav={() => toggleFav(numericId)}
                    cmpChecked={cmp.has(numericId)}
                    onCmp={() => toggleCmp(numericId)}
                  />
                );
              })
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
          hotels={HOTELS}
          onToggleCmp={toggleCmp}
        />
      </div>
    </div>
  );
}
