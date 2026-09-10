import type { Hotel, HotelPropertyType } from '@/lib/types';
import type { HotelFacets } from '@/services/hotels-service';

export type SortKey = 'rec' | 'cheap' | 'score' | 'stars';

export interface FilterChip {
  key: string;
  label: string;
  clear: () => void;
}

export interface HotelFilterState {
  query: string;
  sort: SortKey;
  maxPrice: number;
  minPrice?: number;
  stars: Set<number>;
  propertyTypes: Set<HotelPropertyType>;
  amenities: Set<string>;
  hotelName: string;
  minScore: number;
  freeCancel: boolean;
  shown: number;
  loading: boolean;
}

export interface HotelSearchHeaderProps {
  query: string;
  onQueryChange: (val: string) => void;
  onSearchSubmit: () => void;
  resultsCount: number;
  checkin?: string;
  onCheckinChange?: (val: string) => void;
  checkout?: string;
  onCheckoutChange?: (val: string) => void;
  adults?: number;
  onAdultsChange?: (val: number) => void;
  childrenCount?: number;
  onChildrenCountChange?: (val: number) => void;
  rooms?: number;
  onRoomsChange?: (val: number) => void;
}

export interface HotelSearchToolbarProps {
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  showMap: boolean;
  onToggleMap: () => void;
  onOpenMobileFilters: () => void;
  activeFiltersCount: number;
}

export interface HotelFilterControlsProps {
  maxPrice: number;
  onMaxPriceChange: (val: number) => void;
  minPrice?: number;
  onMinPriceChange?: (val: number) => void;
  priceBuckets: number[];
  stars: Set<number>;
  onToggleStar: (star: number) => void;
  propertyTypes?: Set<HotelPropertyType>;
  onTogglePropertyType?: (pt: HotelPropertyType) => void;
  amenities?: Set<string>;
  onToggleAmenity?: (am: string) => void;
  hotelName?: string;
  onHotelNameChange?: (name: string) => void;
  minScore: number;
  onMinScoreChange: (score: number) => void;
  freeCancel: boolean;
  onToggleFreeCancel: () => void;
  facets?: HotelFacets;
  onResetAll?: () => void;
}

export interface HotelFilterSidebarProps extends HotelFilterControlsProps {
  onResetAll: () => void;
}

export interface HotelFilterSheetProps extends HotelFilterControlsProps {
  isOpen: boolean;
  onClose: () => void;
  resultsCount: number;
  onResetAll: () => void;
}

export interface HotelFilterChipsProps {
  chips: FilterChip[];
  onResetAll: () => void;
}

export interface HotelPriceHistogramProps {
  maxPrice: number;
  onMaxPriceChange: (val: number) => void;
  minPrice?: number;
  onMinPriceChange?: (val: number) => void;
  priceBuckets: number[];
}

export interface HotelCardProps {
  hotel: Hotel;
  fav: boolean;
  onFav: () => void;
  cmpChecked: boolean;
  onCmp: () => void;
  nights?: number;
  priority?: boolean;
  checkin?: string;
  checkout?: string;
  adults?: number;
  childrenCount?: number;
}

export interface HotelCompareBarProps {
  cmp: Set<string>;
  hotels: Hotel[];
  onToggleCmp: (id: string) => void;
  onCompareAction?: () => void;
}

export interface HotelEmptyStateProps {
  onResetFilters: () => void;
  error?: string | null;
  onRetry?: () => void;
}

export interface HotelSkeletonListProps {
  count?: number;
}
