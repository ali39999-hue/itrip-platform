'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import type { Hotel } from '@/lib/types';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { useCountryStore } from '@/stores/country-store';
import type { SortKey, FilterChip } from '../types';

interface UseHotelFiltersProps {
  initialCity?: string;
  initialSort?: SortKey;
  initialMaxPrice?: number;
}

export function useHotelFilters({
  initialCity = '',
  initialSort = 'rec',
  initialMaxPrice = 160,
}: UseHotelFiltersProps = {}) {
  const locale = useLocale();
  const { country } = useCountryStore();

  const [query, setQuery] = useState(initialCity);
  const [sort, setSortState] = useState<SortKey>(initialSort);
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(12);

  const [maxPrice, setMaxPriceState] = useState(initialMaxPrice);
  const [stars, setStars] = useState<Set<number>>(new Set());
  const [minScore, setMinScoreState] = useState(0);
  const [freeCancel, setFreeCancelState] = useState(false);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [priceBuckets, setPriceBuckets] = useState<number[]>(new Array(14).fill(20));

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLiveHotels = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);

    try {
      const q = new URLSearchParams();
      if (query.trim()) {
        q.set('q', query.trim());
      } else if (initialCity.trim()) {
        q.set('city', initialCity.trim());
      }

      // Respect current country selection unless searching for another country's city
      if (country === 'china' || query.includes('پکن') || query.includes('beijing')) {
        q.set('country', 'china');
      } else if (country === 'iran') {
        q.set('country', 'iran');
      }

      if (stars.size > 0) {
        q.set('stars', Array.from(stars).join(','));
      }
      if (minScore > 0) {
        q.set('minScore', String(minScore));
      }
      if (freeCancel) {
        q.set('freeCancel', 'true');
      }
      if (maxPrice < 160) {
        q.set('maxPrice', String(maxPrice));
      }
      if (sort) {
        q.set('sort', sort);
      }
      q.set('limit', '50');

      const res = await fetch(`/api/hotels/search?${q.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (json.success && json.data) {
        setHotels(json.data.hotels || []);
        setTotalCount(json.data.total || 0);
        if (json.data.priceBuckets) {
          setPriceBuckets(json.data.priceBuckets);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to fetch live hotels:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [query, initialCity, country, stars, minScore, freeCancel, maxPrice, sort]);

  useEffect(() => {
    fetchLiveHotels();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchLiveHotels]);

  const setSort = useCallback((newSort: SortKey) => {
    setSortState(newSort);
    setShown(12);
  }, []);

  const setMaxPrice = useCallback((price: number) => {
    setMaxPriceState(price);
    setShown(12);
  }, []);

  const toggleStar = useCallback((s: number) => {
    setStars((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
    setShown(12);
  }, []);

  const setMinScore = useCallback((score: number) => {
    setMinScoreState(score);
    setShown(12);
  }, []);

  const toggleFreeCancel = useCallback(() => {
    setFreeCancelState((prev) => !prev);
    setShown(12);
  }, []);

  const resetAll = useCallback(() => {
    setMaxPriceState(160);
    setStars(new Set());
    setMinScoreState(0);
    setFreeCancelState(false);
    setShown(12);
  }, []);

  const loadMore = useCallback(() => {
    setShown((prev) => prev + 12);
  }, []);

  const results = useMemo(() => {
    return hotels;
  }, [hotels]);

  const chips = useMemo<FilterChip[]>(() => {
    const out: FilterChip[] = [];
    if (maxPrice < 160) {
      out.push({
        key: 'price',
        label: lt(locale, {
          fa: `تا ${num(maxPrice, locale)} میلیون`,
          en: `Up to ${num(maxPrice, locale)}M`,
          ar: `حتى ${num(maxPrice, locale)} مليون`,
          zh: `最高 ${num(maxPrice, locale)}M`,
          ru: `До ${num(maxPrice, locale)}M`,
        }),
        clear: () => setMaxPriceState(160),
      });
    }
    stars.forEach((s) => {
      out.push({
        key: `star-${s}`,
        label: `${num(s, locale)} ${lt(locale, { fa: 'ستاره', en: 'stars', ar: 'نجوم', zh: '星级', ru: 'звезд' })}`,
        clear: () => toggleStar(s),
      });
    });
    if (minScore > 0) {
      out.push({
        key: 'score',
        label: `${lt(locale, { fa: 'امتیاز +', en: 'Score +', ar: 'التقييم +', zh: '评分 +', ru: 'Рейтинг +' })}${num(minScore, locale)}`,
        clear: () => setMinScoreState(0),
      });
    }
    if (freeCancel) {
      out.push({
        key: 'cancel',
        label: lt(locale, { fa: 'کنسلی رایگان', en: 'Free cancellation', ar: 'إلغاء مجاني', zh: '免费取消', ru: 'Бесплатная отмена' }),
        clear: () => setFreeCancelState(false),
      });
    }
    return out;
  }, [maxPrice, stars, minScore, freeCancel, locale, toggleStar]);

  return {
    query,
    setQuery,
    sort,
    setSort,
    loading,
    shown,
    setShown,
    loadMore,
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
    priceBuckets,
    chips,
    activeFiltersCount: chips.length,
  };
}
