'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import type { Hotel, HotelPropertyType } from '@/lib/types';
import type { HotelFacets } from '@/services/hotels-service';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { useCountryStore } from '@/stores/country-store';
import type { SortKey, FilterChip } from '../types';

interface UseHotelFiltersProps {
  initialCity?: string;
  initialSort?: SortKey;
  initialMaxPrice?: number;
  initialMinPrice?: number;
  initialStars?: number[];
  initialPropertyTypes?: HotelPropertyType[];
  initialAmenities?: string[];
  initialMinScore?: number;
  initialFreeCancel?: boolean;
  initialHotelName?: string;
}

export function useHotelFilters({
  initialCity = '',
  initialSort = 'rec',
  initialMaxPrice = 20,
  initialMinPrice = 0,
  initialStars = [],
  initialPropertyTypes = [],
  initialAmenities = [],
  initialMinScore = 0,
  initialFreeCancel = false,
  initialHotelName = '',
}: UseHotelFiltersProps = {}) {
  const locale = useLocale();
  const { country } = useCountryStore();

  const [query, setQuery] = useState(initialCity);
  const [hotelName, setHotelName] = useState(initialHotelName);
  const [sort, setSortState] = useState<SortKey>(initialSort);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [minPrice, setMinPriceState] = useState(initialMinPrice);
  const [maxPrice, setMaxPriceState] = useState(initialMaxPrice);
  const [stars, setStars] = useState<Set<number>>(new Set(initialStars));
  const [propertyTypes, setPropertyTypes] = useState<Set<HotelPropertyType>>(new Set(initialPropertyTypes));
  const [amenities, setAmenities] = useState<Set<string>>(new Set(initialAmenities));
  const [minScore, setMinScoreState] = useState(initialMinScore);
  const [freeCancel, setFreeCancelState] = useState(initialFreeCancel);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState(1);
  const [priceBuckets, setPriceBuckets] = useState<number[]>(new Array(14).fill(20));
  const [facets, setFacets] = useState<HotelFacets | undefined>(undefined);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const starsKey = Array.from(stars).sort().join(',');
  const propertyTypesKey = Array.from(propertyTypes).sort().join(',');
  const amenitiesKey = Array.from(amenities).sort().join(',');

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

      if (hotelName.trim()) {
        q.set('hotelName', hotelName.trim());
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
      if (propertyTypes.size > 0) {
        q.set('propertyTypes', Array.from(propertyTypes).join(','));
      }
      if (amenities.size > 0) {
        q.set('amenities', Array.from(amenities).join(','));
      }
      if (minScore > 0) {
        q.set('minScore', String(minScore));
      }
      if (freeCancel) {
        q.set('freeCancel', 'true');
      }
      if (minPrice > 0) {
        q.set('minPrice', String(minPrice));
      }
      if (maxPrice < 20) {
        q.set('maxPrice', String(maxPrice));
      }
      if (sort) {
        q.set('sort', sort);
      }
      q.set('page', String(currentPage));
      q.set('limit', '10');

      const res = await fetch(`/api/hotels/search?${q.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (json.success && json.data) {
        setHotels(json.data.hotels || []);
        setTotalCount(json.data.total || 0);
        setTotalPages(json.data.totalPages || 1);
        if (json.data.priceBuckets) {
          setPriceBuckets(json.data.priceBuckets);
        }
        if (json.data.facets) {
          setFacets(json.data.facets);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to fetch live hotels:', err);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query,
    initialCity,
    hotelName,
    country,
    starsKey,
    propertyTypesKey,
    amenitiesKey,
    minScore,
    freeCancel,
    minPrice,
    maxPrice,
    sort,
    currentPage,
  ]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // 250ms debounce for text/slider input
    debounceTimerRef.current = setTimeout(() => {
      fetchLiveHotels();
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, [fetchLiveHotels]);

  const setQueryValue = useCallback((value: string) => {
    setQuery(value);
    setCurrentPage(1);
  }, []);

  const setHotelNameValue = useCallback((value: string) => {
    setHotelName(value);
    setCurrentPage(1);
  }, []);

  const setSort = useCallback((newSort: SortKey) => {
    setSortState(newSort);
    setCurrentPage(1);
  }, []);

  const setMinPrice = useCallback((price: number) => {
    setMinPriceState(price);
    setCurrentPage(1);
  }, []);

  const setMaxPrice = useCallback((price: number) => {
    setMaxPriceState(price);
    setCurrentPage(1);
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
    setCurrentPage(1);
  }, []);

  const togglePropertyType = useCallback((pt: HotelPropertyType) => {
    setPropertyTypes((prev) => {
      const next = new Set(prev);
      if (next.has(pt)) {
        next.delete(pt);
      } else {
        next.add(pt);
      }
      return next;
    });
    setCurrentPage(1);
  }, []);

  const toggleAmenity = useCallback((am: string) => {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(am)) {
        next.delete(am);
      } else {
        next.add(am);
      }
      return next;
    });
    setCurrentPage(1);
  }, []);

  const setMinScore = useCallback((score: number) => {
    setMinScoreState(score);
    setCurrentPage(1);
  }, []);

  const toggleFreeCancel = useCallback(() => {
    setFreeCancelState((prev) => !prev);
    setCurrentPage(1);
  }, []);

  const resetAll = useCallback(() => {
    setHotelName('');
    setMinPriceState(0);
    setMaxPriceState(20);
    setStars(new Set());
    setPropertyTypes(new Set());
    setAmenities(new Set());
    setMinScoreState(0);
    setFreeCancelState(false);
    setCurrentPage(1);
  }, []);

  const results = hotels;

  const chips = useMemo<FilterChip[]>(() => {
    const out: FilterChip[] = [];

    if (hotelName.trim()) {
      out.push({
        key: 'hotel-name',
        label: lt(locale, {
          fa: `هتل: ${hotelName}`,
          en: `Hotel: ${hotelName}`,
          ar: `فندق: ${hotelName}`,
          zh: `酒店: ${hotelName}`,
          ru: `Отель: ${hotelName}`,
        }),
        clear: () => setHotelName(''),
      });
    }

    if (maxPrice < 20) {
      out.push({
        key: 'price',
        label: lt(locale, {
          fa: `تا ${num(maxPrice, locale)} م تومان`,
          en: `Up to ${num(maxPrice, locale)}M Toman`,
          ar: `حتى ${num(maxPrice, locale)} م تومان`,
          zh: `最高 ${num(maxPrice, locale)}M 图曼`,
          ru: `До ${num(maxPrice, locale)}M томан`,
        }),
        clear: () => setMaxPriceState(20),
      });
    }

    stars.forEach((s) => {
      out.push({
        key: `star-${s}`,
        label: `${num(s, locale)} ${lt(locale, { fa: 'ستاره', en: 'stars', ar: 'نجوم', zh: '星级', ru: 'звезд' })}`,
        clear: () => toggleStar(s),
      });
    });

    propertyTypes.forEach((pt) => {
      const labelMap: Record<HotelPropertyType, { fa: string; en: string; ar: string; zh: string; ru: string }> = {
        hotel: { fa: 'هتل', en: 'Hotel', ar: 'فندق', zh: '酒店', ru: 'Отель' },
        apartment: { fa: 'هتل‌آپارتمان', en: 'Apartment Hotel', ar: 'شقق فندقية', zh: '公寓酒店', ru: 'Апарт-отель' },
        boutique: { fa: 'بوم‌گردی و سنتی', en: 'Boutique & Traditional', ar: 'بوتيك وتقليدي', zh: '精品与传统住宿', ru: 'Бутик и традиционный' },
        villa: { fa: 'ویلا و سوئیت', en: 'Villa & Suite', ar: 'فيلا وجناح', zh: '别墅与套房', ru: 'Вилла и люкс' },
      };
      out.push({
        key: `pt-${pt}`,
        label: lt(locale, labelMap[pt]),
        clear: () => togglePropertyType(pt),
      });
    });

    amenities.forEach((am) => {
      const amLabelMap: Record<string, { fa: string; en: string; ar: string; zh: string; ru: string }> = {
        pool: { fa: 'استخر', en: 'Pool', ar: 'مسبح', zh: '泳池', ru: 'Бассейн' },
        breakfast: { fa: 'صبحانه رایگان', en: 'Free Breakfast', ar: 'إفطار مجاني', zh: '免费早餐', ru: 'Бесплатный завтрак' },
        wifi: { fa: 'وای‌فای رایگان', en: 'Free Wi-Fi', ar: 'واي فاي مجاني', zh: '免费Wi-Fi', ru: 'Бесплатный Wi-Fi' },
        parking: { fa: 'پارکینگ', en: 'Parking', ar: 'موقف سيارات', zh: '停车场', ru: 'Парковка' },
        spa: { fa: 'اسپا و سونا', en: 'Spa & Sauna', ar: 'سبا وساونا', zh: '水疗与桑拿', ru: 'Спа и сауна' },
        restaurant: { fa: 'رستوران', en: 'Restaurant', ar: 'مطعم', zh: '餐厅', ru: 'Ресторан' },
        gym: { fa: 'باشگاه ورزشی', en: 'Fitness Gym', ar: 'صالة رياضية', zh: '健身房', ru: 'Фитнес-зал' },
        shuttle: { fa: 'ترانسفر فرودگاهی', en: 'Airport Shuttle', ar: 'نقل المطار', zh: '机场接送', ru: 'Трансфер' },
      };
      out.push({
        key: `am-${am}`,
        label: amLabelMap[am] ? lt(locale, amLabelMap[am]) : am,
        clear: () => toggleAmenity(am),
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
  }, [
    hotelName,
    maxPrice,
    stars,
    propertyTypes,
    amenities,
    minScore,
    freeCancel,
    locale,
    toggleStar,
    togglePropertyType,
    toggleAmenity,
  ]);

  return {
    query,
    setQuery: setQueryValue,
    hotelName,
    setHotelName: setHotelNameValue,
    sort,
    setSort,
    loading,
    currentPage,
    setCurrentPage,
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
    totalPages,
    priceBuckets,
    facets,
    chips,
    activeFiltersCount: chips.length,
  };
}
