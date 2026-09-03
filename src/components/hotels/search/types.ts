import type { Hotel } from '@/lib/types';

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
  stars: Set<number>;
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
  priceBuckets: number[];
  stars: Set<number>;
  onToggleStar: (star: number) => void;
  minScore: number;
  onMinScoreChange: (score: number) => void;
  freeCancel: boolean;
  onToggleFreeCancel: () => void;
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
  cmp: Set<number>;
  hotels: Hotel[];
  onToggleCmp: (id: number) => void;
  onCompareAction?: () => void;
}

export interface HotelEmptyStateProps {
  onResetFilters: () => void;
}

export interface HotelSkeletonListProps {
  count?: number;
}
