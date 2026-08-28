'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { HOTELS } from '@/lib/data';
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
          onSearchSubmit={() => {}}
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
              results.map((hotel: any) => {
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
