'use client';

import { useState, useMemo, useCallback } from 'react';
import { HOTELS } from '@/lib/data';
import type { Hotel } from '@/lib/types';
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
  const [query, setQuery] = useState(initialCity);
  const [sort, setSortState] = useState<SortKey>(initialSort);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(6);

  const [maxPrice, setMaxPriceState] = useState(initialMaxPrice);
  const [stars, setStars] = useState<Set<number>>(new Set());
  const [minScore, setMinScoreState] = useState(0);
  const [freeCancel, setFreeCancelState] = useState(false);

  const rerun = useCallback((fn: () => void) => {
    fn();
    setShown(6);
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const setSort = useCallback((newSort: SortKey) => {
    rerun(() => setSortState(newSort));
  }, [rerun]);

  const setMaxPrice = useCallback((price: number) => {
    setMaxPriceState(price);
    setShown(6);
  }, []);

  const toggleStar = useCallback((s: number) => {
    rerun(() => {
      setStars((prev) => {
        const next = new Set(prev);
        if (next.has(s)) {
          next.delete(s);
        } else {
          next.add(s);
        }
        return next;
      });
    });
  }, [rerun]);

  const setMinScore = useCallback((score: number) => {
    rerun(() => setMinScoreState(score));
  }, [rerun]);

  const toggleFreeCancel = useCallback(() => {
    rerun(() => setFreeCancelState((prev) => !prev));
  }, [rerun]);

  const resetAll = useCallback(() => {
    setMaxPriceState(160);
    setStars(new Set());
    setMinScoreState(0);
    setFreeCancelState(false);
    setShown(6);
  }, []);

  const results = useMemo(() => {
    const list = HOTELS.filter((h) => {
      if (initialCity && !(h.city.includes(initialCity) || h.cityEn.toLowerCase().includes(initialCity.toLowerCase()))) {
        return false;
      }
      if (h.pricePerNight / 1000000 > maxPrice + 0.001 && maxPrice < 160) {
        return false;
      }
      if (stars.size && !stars.has(h.stars)) {
        return false;
      }
      if (minScore && h.rating < minScore) {
        return false;
      }
      if (freeCancel && !h.freeCancellation) {
        return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sort === 'cheap') return a.pricePerNight - b.pricePerNight;
      if (sort === 'score') return b.rating - a.rating;
      if (sort === 'stars') return b.stars - a.stars || b.rating - a.rating;
      return b.rating * 100 - a.rating * 100;
    });
  }, [initialCity, maxPrice, stars, minScore, freeCancel, sort]);

  const priceBuckets = useMemo(() => {
    const buckets = new Array(14).fill(0);
    HOTELS.forEach((h) => {
      const i = Math.min(13, Math.floor((h.pricePerNight / 1000000 / 170) * 14));
      buckets[i]++;
    });
    const mx = Math.max(...buckets, 1);
    return buckets.map((b) => Math.max(12, (b / mx) * 100));
  }, []);

  const chips = useMemo<FilterChip[]>(() => {
    const out: FilterChip[] = [];
    if (maxPrice < 160) {
      out.push({
        key: 'price',
        label: `تا ${maxPrice.toLocaleString('fa-IR')} میلیون`,
        clear: () => setMaxPrice(160),
      });
    }
    stars.forEach((s) => {
      out.push({
        key: `star-${s}`,
        label: `${s.toLocaleString('fa-IR')} ستاره`,
        clear: () => {
          setStars((prev) => {
            const next = new Set(prev);
            next.delete(s);
            return next;
          });
        },
      });
    });
    if (minScore) {
      out.push({
        key: 'score',
        label: `امتیاز ${minScore.toLocaleString('fa-IR')}+`,
        clear: () => setMinScore(0),
      });
    }
    if (freeCancel) {
      out.push({
        key: 'cancel',
        label: 'کنسلی رایگان',
        clear: () => setFreeCancelState(false),
      });
    }
    return out;
  }, [maxPrice, stars, minScore, freeCancel, setMaxPrice, setMinScore]);

  const loadMore = useCallback(() => {
    setShown((prev) => prev + 6);
  }, []);

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
    rerun,
    results,
    priceBuckets,
    chips,
    activeFiltersCount: chips.length,
  };
}
