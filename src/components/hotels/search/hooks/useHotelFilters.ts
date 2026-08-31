'use client';

import { useState, useMemo, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { HOTELS } from '@/lib/data';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
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
        label: lt(locale, {
          fa: `تا ${num(maxPrice, locale)} میلیون`,
          en: `Up to ${num(maxPrice, locale)}M`,
          ar: `حتى ${num(maxPrice, locale)} مليون`,
          zh: `最高 ${num(maxPrice, locale)}M`,
          ru: `До ${num(maxPrice, locale)}M`,
        }),
        clear: () => setMaxPrice(160),
      });
    }
    stars.forEach((s) => {
      out.push({
        key: `star-${s}`,
        label: lt(locale, {
          fa: `${num(s, locale)} ستاره`,
          en: `${num(s, locale)} stars`,
          ar: `${num(s, locale)} نجوم`,
          zh: `${num(s, locale)}星`,
          ru: `${num(s, locale)} звёзд`,
        }),
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
        label: lt(locale, {
          fa: `امتیاز ${num(minScore, locale)}+`,
          en: `Rating ${num(minScore, locale)}+`,
          ar: `تقييم ${num(minScore, locale)}+`,
          zh: `${num(minScore, locale)}分以上`,
          ru: `Рейтинг ${num(minScore, locale)}+`,
        }),
        clear: () => setMinScore(0),
      });
    }
    if (freeCancel) {
      out.push({
        key: 'cancel',
        label: lt(locale, {
          fa: 'کنسلی رایگان',
          en: 'Free cancellation',
          ar: 'إلغاء مجاني',
          zh: '免费取消',
          ru: 'Бесплатная отмена',
        }),
        clear: () => setFreeCancelState(false),
      });
    }
    return out;
  }, [maxPrice, stars, minScore, freeCancel, locale, setMaxPrice, setMinScore]);

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
