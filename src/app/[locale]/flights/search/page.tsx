'use client';

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { resolveCityQuery, localizedAirportLabel } from '@/lib/cities';
import type { Flight } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { daysFromNow } from '@/lib/utils';
import { dualDate } from '@/lib/jalali';
import { num } from '@/lib/format';
import {
  BentoFlightCard,
  FlightCompareBar,
  FlightCompareModal,
  FlightPriceCalendar,
  FlightRefundRulesModal,
  FlightPriceAlertModal,
  FlightSearchHeader,
  useFlightComparison,
} from '@/components/flights';
import { AirlineLogo } from '@/components/flights/AirlineLogo';
import { CrossSellBundle } from '@/components/shared/CrossSellBundle';
import { trackFunnel } from '@/lib/analytics';
import {
  PlaneTakeoff,
  PlaneLanding,
  CalendarDays,
  PenLine,
  SlidersHorizontal,
  X,
  Check,
  Loader2,
  Search,
  BellRing,
  SunMedium,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';

const STEP = 50_000; // 50k Toman step

function FlightSearchInner() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Flights');
  const params = useSearchParams();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const { currencyLabel } = useDisplayCurrency();
  const ariaT = useTranslations('Common.aria');

  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  // Honor requested departure date; fall back to +7 days
  const departParam = params.get('depart');
  const initialTravelDate = departParam && /^\d{4}-\d{2}-\d{2}$/.test(departParam) ? departParam : daysFromNow(7);
  const [travelDate, setTravelDate] = useState<string>(initialTravelDate);

  const fromCity = resolveCityQuery(from);
  const toCity = resolveCityQuery(to);
  const searchFiltered = Boolean(fromCity || toCity);

  const sorts = [
    { id: 'price', label: t('sortCheapest') },
    { id: 'fast', label: t('sortFastest') },
    { id: 'suggested', label: t('sortSuggested') },
    { id: 'time', label: t('sortEarliest') },
  ] as const;

  type SortId = (typeof sorts)[number]['id'];

  // Filters State — stored in Toman (IRR / 10)
  const [stops, setStops] = useState<number[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [ticketType, setTicketType] = useState<'all' | 'systemic' | 'charter'>('all');
  const [cabinClass, setCabinClass] = useState<'all' | 'economy' | 'business'>('all');
  const [timeOfDay, setTimeOfDay] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');
  const [airlineSearch, setAirlineSearch] = useState('');

  // Default bounds in Toman (2M to 15M Toman)
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number }>({
    min: 2_000_000,
    max: 15_000_000,
  });
  const [price, setPrice] = useState<[number, number]>([2_000_000, 15_000_000]);
  const [debouncedPrice, setDebouncedPrice] = useState<[number, number]>([2_000_000, 15_000_000]);

  const [sort, setSort] = useState<SortId>('price');
  const [sheet, setSheet] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editFrom, setEditFrom] = useState(from);
  const [editTo, setEditTo] = useState(to);
  const [editDate, setEditDate] = useState(initialTravelDate);

  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);

  useEffect(() => {
    setFromInput(from);
    setToInput(to);
  }, [from, to]);

  const handleTopSearch = (override?: { from?: string; to?: string; depart?: string }) => {
    const finalFrom = (override?.from ?? fromInput).trim();
    const finalTo = (override?.to ?? toInput).trim();
    const finalDepart = (override?.depart ?? travelDate).trim();
    const q = new URLSearchParams();
    if (finalFrom) q.set('from', finalFrom);
    if (finalTo) q.set('to', finalTo);
    if (finalDepart) q.set('depart', finalDepart);
    router.push(`/flights/search?${q.toString()}`);
  };

  // Quick filter pill state
  const [quickFilter, setQuickFilter] = useState<'all' | 'direct' | 'morning' | 'evening' | 'systemic' | 'business'>('all');

  // Collapsible Accordion Sections (Alibaba & FlyToday standard)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true,
    stops: true,
    time: true,
    airlines: true,
    ticketType: true,
    cabinClass: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Debounce price slider changes (250ms) to avoid spamming the API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPrice(price);
    }, 250);
    return () => clearTimeout(timer);
  }, [price]);

  // Flight Comparison & Value-Add Modals
  const { cmp, toggleCmp, clearCmp } = useFlightComparison();
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [priceAlertModalOpen, setPriceAlertModalOpen] = useState(false);
  const [refundModalFlight, setRefundModalFlight] = useState<Flight | null>(null);

  function handleDateChange(newDate: string) {
    setTravelDate(newDate);
    setEditDate(newDate);
    const q = new URLSearchParams(params.toString());
    q.set('depart', newDate);
    window.history.replaceState(null, '', `?${q.toString()}`);
  }

  // Live state
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlineOptions, setAirlineOptions] = useState<Array<{ name: string; minPrice: number }>>([]);
  const [stopCounts, setStopCounts] = useState<[number, number, number]>([0, 0, 0]);
  const [ticketTypeCounts, setTicketTypeCounts] = useState<{ systemic: number; charter: number }>({ systemic: 0, charter: 0 });
  const [cabinClassCounts, setCabinClassCounts] = useState<{ economy: number; business: number }>({ economy: 0, business: 0 });
  const [timeCounts, setTimeCounts] = useState<{ morning: number; afternoon: number; evening: number; night: number }>({
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  });
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const airlinesKey = airlines.join(',');
  const stopsKey = stops.join(',');
  const minPriceToman = debouncedPrice[0];
  const maxPriceToman = debouncedPrice[1];
  const minBoundToman = priceBounds.min;
  const maxBoundToman = priceBounds.max;

  // 12-bar price histogram derived from actual flights
  const flightPriceBuckets = useMemo(() => {
    const buckets = new Array(12).fill(0);
    if (!flights || flights.length === 0) return buckets;
    const span = Math.max(priceBounds.max - priceBounds.min, 1);
    flights.forEach((f) => {
      const pToman = f.price > 15_000_000 ? Math.round(f.price / 10) : f.price;
      const idx = Math.min(11, Math.max(0, Math.floor(((pToman - priceBounds.min) / span) * 12)));
      buckets[idx]++;
    });
    const maxB = Math.max(...buckets, 1);
    return buckets.map((b) => Math.max(16, Math.round((b / maxB) * 100)));
  }, [flights, priceBounds]);

  // Fetch live flights data
  const fetchFlights = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      if (travelDate) q.set('depart', travelDate);
      if (sort) q.set('sort', sort);
      if (airlines.length) q.set('airlines', airlines.join(','));
      if (stops.length) q.set('stops', stops.join(','));
      if (ticketType !== 'all') q.set('ticketType', ticketType);
      if (cabinClass !== 'all') q.set('cabinClass', cabinClass);
      if (timeOfDay !== 'all') q.set('timeOfDay', timeOfDay);

      // Convert Toman to Rials for backend API
      if (minPriceToman > minBoundToman) q.set('minPrice', String(minPriceToman * 10));
      if (maxPriceToman < maxBoundToman) q.set('maxPrice', String(maxPriceToman * 10));

      q.set('page', String(currentPage));
      q.set('limit', '10');

      const res = await fetch(`/api/flights/search?${q.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setFlights(json.data.flights || []);
        setTotalCount(json.data.total || 0);
        setTotalPages(json.data.totalPages || 1);

        if (json.data.airlineFacets) {
          setAirlineOptions(json.data.airlineFacets);
        }
        if (json.data.stopCounts) {
          setStopCounts(json.data.stopCounts);
        }
        if (json.data.ticketTypeCounts) {
          setTicketTypeCounts(json.data.ticketTypeCounts);
        }
        if (json.data.cabinClassCounts) {
          setCabinClassCounts(json.data.cabinClassCounts);
        }
        if (json.data.timeCounts) {
          setTimeCounts(json.data.timeCounts);
        }
        if (json.data.priceBounds) {
          // Convert returned Rial bounds to Toman
          const apiMinToman = Math.floor((json.data.priceBounds.min || 20_000_000) / 10);
          const apiMaxToman = Math.ceil((json.data.priceBounds.max || 150_000_000) / 10);

          setPriceBounds((prev) => {
            if (prev.min === apiMinToman && prev.max === apiMaxToman) return prev;
            return { min: apiMinToman, max: apiMaxToman };
          });
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to fetch live flights:', err);
        setError('خطا در دریافت لیست پروازهای لایو');
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    from,
    to,
    travelDate,
    sort,
    airlinesKey,
    stopsKey,
    ticketType,
    cabinClass,
    timeOfDay,
    minPriceToman,
    maxPriceToman,
    minBoundToman,
    maxBoundToman,
    currentPage,
  ]);

  useEffect(() => {
    fetchFlights();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchFlights]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sort, airlinesKey, stopsKey, ticketType, cabinClass, timeOfDay, minPriceToman, maxPriceToman]);

  const activeFilters =
    stops.length +
    airlines.length +
    (ticketType !== 'all' ? 1 : 0) +
    (cabinClass !== 'all' ? 1 : 0) +
    (timeOfDay !== 'all' ? 1 : 0) +
    (price[0] > priceBounds.min || price[1] < priceBounds.max ? 1 : 0);

  function clearAll() {
    setStops([]);
    setAirlines([]);
    setTicketType('all');
    setCabinClass('all');
    setTimeOfDay('all');
    setQuickFilter('all');
    setPrice([priceBounds.min, priceBounds.max]);
    setAirlineSearch('');
  }

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  function selectFlight(f: Flight) {
    trackFunnel('flight_selected', {
      route: '/flights/search',
      locale,
      stops: f.stops,
      refundable: f.refundable ?? undefined,
    });
    setBookingContext({
      type: 'flights',
      id: f.id,
      title: `${localizedAirportLabel(f.origin, locale)} ✈ ${localizedAirportLabel(f.destination, locale)} (${f.flightNo})`,
      subtitle: `${locale === 'fa' ? f.airline : (f.airlineEn || f.airline)} • ${f.departureTime}`,
      // Flight catalog prices are in IRR; booking context amounts are in Toman.
      amount: Math.round(f.price / 10),
      travelDate,
    });
    router.push('/checkout');
  }

  const rangeSpan = Math.max(priceBounds.max - priceBounds.min, 1);
  const minPct = Math.max(0, Math.min(100, ((price[0] - priceBounds.min) / rangeSpan) * 100));
  const maxPct = Math.max(0, Math.min(100, ((price[1] - priceBounds.min) / rangeSpan) * 100));

  const stopLabels = [t('directOnly'), t('oneStop'), t('twoOrMoreStops')];

  const timeSlots = [
    {
      id: 'morning' as const,
      title: lt(locale, { fa: 'صبح', en: 'Morning', ar: 'صباحاً', zh: '早班', ru: 'Утро' }),
      time: '۰۶:۰۰ - ۱۲:۰۰',
      icon: SunMedium,
    },
    {
      id: 'afternoon' as const,
      title: lt(locale, { fa: 'عصر', en: 'Afternoon', ar: 'ظهراً', zh: '午后', ru: 'День' }),
      time: '۱۲:۰۰ - ۱۸:۰۰',
      icon: Sun,
    },
    {
      id: 'evening' as const,
      title: lt(locale, { fa: 'شب', en: 'Evening', ar: 'مساءً', zh: '晚间', ru: 'Вечер' }),
      time: '۱۸:۰۰ - ۲۴:۰۰',
      icon: Moon,
    },
    {
      id: 'night' as const,
      title: lt(locale, { fa: 'بامداد', en: 'Night', ar: 'فجراً', zh: '凌晨', ru: 'Ночь' }),
      time: '۰۰:۰۰ - ۰۶:۰۰',
      icon: Sparkles,
    },
  ];

  const ticketTypes = [
    {
      id: 'systemic' as const,
      label: lt(locale, { fa: 'سیستمی (قابل استرداد)', en: 'Systemic (Refundable)', ar: 'منتظمة (قابلة للاسترداد)', zh: '正班机票（可退改）', ru: 'Регулярный' }),
    },
    {
      id: 'charter' as const,
      label: lt(locale, { fa: 'چارتری (نرخ ویژه)', en: 'Charter (Special rate)', ar: 'شارتر (سعر خاص)', zh: '特惠包机', ru: 'Чартер' }),
    },
  ];

  const cabinClasses = [
    {
      id: 'economy' as const,
      label: lt(locale, { fa: 'اکونومی (اقتصادی)', en: 'Economy', ar: 'اقتصادي', zh: '经济舱', ru: 'Эконом' }),
    },
    {
      id: 'business' as const,
      label: lt(locale, { fa: 'بیزنس (VIP تجاری)', en: 'Business Class', ar: 'درجة رجال الأعمال', zh: '商务舱', ru: 'Бизнес' }),
    },
  ];

  const pricePresets = [
    { label: lt(locale, { fa: 'همه', en: 'All', ar: 'الكل', zh: '全部', ru: 'Все' }), range: [priceBounds.min, priceBounds.max] },
    { label: lt(locale, { fa: 'زیر ۳ م', en: '< 3M', ar: '< 3م', zh: '< 300万', ru: '< 3M' }), range: [priceBounds.min, Math.min(priceBounds.max, 3_000_000)] },
    { label: lt(locale, { fa: '۳ تا ۶ م', en: '3M - 6M', ar: '3-6م', zh: '300-600万', ru: '3-6M' }), range: [Math.max(priceBounds.min, 3_000_000), Math.min(priceBounds.max, 6_000_000)] },
    { label: lt(locale, { fa: '۶ م به بالا', en: '> 6M', ar: '> 6م', zh: '> 600万', ru: '> 6M' }), range: [Math.max(priceBounds.min, 6_000_000), priceBounds.max] },
  ];

  const pageItems: Array<number | 'ellipsis' | 'ellipsis-end'> =
    totalPages <= 5
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : currentPage <= 3
      ? [1, 2, 3, 'ellipsis', totalPages]
      : currentPage >= totalPages - 2
      ? [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
      : [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages];

  // Reusable Sidebar Filters Body (Desktop & Mobile Drawer)
  const filtersBody = (
    <div className="space-y-3.5">
      {/* 1. Price Range Slider with Live Histogram (Alibaba Accordion) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <span className="text-[12px] font-black text-ink">{t('priceRange')}</span>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.price ? 'rotate-180' : ''}`} />
        </button>

        {openSections.price && (
          <div className="p-3 pt-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-sub font-bold">{lt(locale, { fa: 'نمودار میانگین قیمت', en: 'Price Histogram', ar: 'مخطط الأسعار', zh: '价格直方图', ru: 'Гистограмма цен' })}</span>
              {(price[0] > priceBounds.min || price[1] < priceBounds.max) && (
                <button
                  type="button"
                  onClick={() => setPrice([priceBounds.min, priceBounds.max])}
                  className="text-[11px] text-brand-dark font-bold hover:underline cursor-pointer"
                >
                  {lt(locale, { fa: 'ریست', en: 'Reset', ar: 'إعادة ضبط', zh: '重置', ru: 'Сброс' })}
                </button>
              )}
            </div>

            {/* 12-bar Price Histogram Bars */}
            <div className="flex items-end gap-1 h-7 mb-2 px-1" dir="ltr">
              {flightPriceBuckets.map((h: number, i: number) => {
                const span = Math.max(priceBounds.max - priceBounds.min, 1);
                const bucketVal = priceBounds.min + (i / 12) * span;
                const inRange = bucketVal >= price[0] && bucketVal <= price[1];
                return (
                  <i
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`flex-1 rounded-t-sm transition-all duration-200 ${
                      inRange ? 'bg-brand shadow-2xs' : 'bg-line/70 opacity-40'
                    }`}
                  />
                );
              })}
            </div>

            {/* Dual Range Track */}
            <div className="relative h-6 mb-2" dir="ltr">
              <span className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1.5 rounded-full bg-line" />
              <span
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-brand"
                style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={STEP}
                value={price[0]}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPrice([Math.min(val, price[1] - STEP), price[1]]);
                }}
                aria-label={t('minPrice')}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full cursor-pointer"
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={STEP}
                value={price[1]}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPrice([price[0], Math.max(val, price[0] + STEP)]);
                }}
                aria-label={t('maxPrice')}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full cursor-pointer"
              />
            </div>

            {/* Labels below slider */}
            <div className="flex justify-between items-center text-xs font-bold text-sub mb-2.5">
              <div>
                <span className="text-[10px] text-sub block leading-none mb-0.5">
                  {lt(locale, { fa: 'از:', en: 'From:', ar: 'من:', zh: '起：', ru: 'От:' })}
                </span>
                <span className="text-brand-dark font-black font-mono num">{num(price[0], locale)}</span>
                <span className="text-[9.5px] text-sub ms-1">{currencyLabel}</span>
              </div>
              <div className="text-end">
                <span className="text-[10px] text-sub block leading-none mb-0.5">
                  {lt(locale, { fa: 'تا:', en: 'To:', ar: 'إلى:', zh: '止：', ru: 'До:' })}
                </span>
                <span className="text-brand-dark font-black font-mono num">{num(price[1], locale)}</span>
                <span className="text-[9.5px] text-sub ms-1">{currencyLabel}</span>
              </div>
            </div>

            {/* Quick price presets */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {pricePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrice(preset.range as [number, number])}
                  className={`py-1 px-2 rounded-lg text-[11px] font-bold border transition truncate cursor-pointer ${
                    price[0] === preset.range[0] && price[1] === preset.range[1]
                      ? 'bg-mint text-brand-dark border-brand font-black'
                      : 'bg-surface border-line hover:border-brand/40 text-sub hover:text-ink'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Number of Stops (Alibaba Accordion) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('stops')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-black text-ink">{t('stopsCount')}</span>
            {stops.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-surface text-[9px] grid place-items-center font-bold">
                {num(stops.length, locale)}
              </span>
            )}
          </div>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.stops ? 'rotate-180' : ''}`} />
        </button>

        {openSections.stops && (
          <div className="p-3 pt-0 space-y-1.5">
            {stopLabels.map((label, i) => {
              const count = stopCounts[i] || 0;
              const checked = stops.includes(i);
              return (
                <label
                  key={label}
                  className={`flex items-center justify-between p-2 rounded-xl border transition ${
                    checked ? 'bg-mint/40 border-brand/40 text-brand-dark shadow-2xs' : 'border-line/60 bg-surface hover:bg-soft/70 text-ink'
                  } ${count === 0 ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-md grid place-items-center border transition ${
                        checked ? 'bg-brand border-brand text-surface' : 'border-line bg-surface'
                      }`}
                    >
                      {checked && <Check size={11} className="text-surface" strokeWidth={3} />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(stops, i, setStops)}
                    />
                    <span className="text-xs font-black truncate">{label}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-soft text-[10.5px] font-mono font-bold text-sub">
                    {num(count, locale)}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Time of Day (Departure Time Window - Alibaba style) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('time')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-black text-ink">
              {lt(locale, { fa: 'ساعت پرواز', en: 'Departure Time', ar: 'وقت الإقلاع', zh: '起飞时间', ru: 'Время вылета' })}
            </span>
            {timeOfDay !== 'all' && (
              <span className="w-4 h-4 rounded-full bg-brand text-surface text-[9px] grid place-items-center font-bold">
                ۱
              </span>
            )}
          </div>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.time ? 'rotate-180' : ''}`} />
        </button>

        {openSections.time && (
          <div className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.map((slot) => {
                const Icon = slot.icon;
                const count = timeCounts[slot.id] || 0;
                const checked = timeOfDay === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setTimeOfDay(checked ? 'all' : slot.id)}
                    className={`p-2 rounded-xl border text-start transition flex flex-col justify-between min-h-[60px] cursor-pointer ${
                      checked
                        ? 'bg-mint/40 border-brand text-brand-dark shadow-2xs'
                        : 'bg-surface border-line hover:border-brand/40 text-ink'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon size={15} className={checked ? 'text-brand' : 'text-sub'} />
                      {count > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-soft text-sub">
                          {num(count, locale)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <span className="text-[11.5px] font-black block leading-tight">{slot.title}</span>
                      <span className="text-[9.5px] text-sub font-mono">{slot.time}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Airlines List with Logo, Name & Starting Price */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('airlines')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-black text-ink">{t('airlines')}</span>
            {airlines.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-surface text-[9px] grid place-items-center font-bold">
                {num(airlines.length, locale)}
              </span>
            )}
          </div>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.airlines ? 'rotate-180' : ''}`} />
        </button>

        {openSections.airlines && (
          <div className="p-3 pt-0">
            {/* Airline Search Box */}
            <div className="relative mb-2">
              <Search size={13} className="absolute top-1/2 -translate-y-1/2 start-2.5 text-sub pointer-events-none" />
              <input
                type="text"
                value={airlineSearch}
                onChange={(e) => setAirlineSearch(e.target.value)}
                placeholder={lt(locale, {
                  fa: 'جستجوی نام ایرلاین...',
                  en: 'Search airline...',
                  ar: 'ابحث عن طيران...',
                  zh: '搜索航司...',
                  ru: 'Поиск авиакомпании...',
                })}
                className="w-full h-8 ps-8 pe-3 rounded-lg bg-surface text-xs font-bold border border-line placeholder:text-sub focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto overscroll-contain pe-1">
              {airlineOptions
                .filter((a) => !airlineSearch || a.name.toLowerCase().includes(airlineSearch.toLowerCase()))
                .map(({ name, minPrice }) => {
                  const checked = airlines.includes(name);
                  const minToman = Math.round(minPrice / 10);
                  return (
                    <label
                      key={name}
                      className={`flex items-center justify-between p-2 rounded-xl border transition group ${
                        checked
                          ? 'bg-mint/40 border-brand/40 text-brand-dark'
                          : 'border-transparent bg-surface hover:bg-soft text-ink'
                      } cursor-pointer`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-4 h-4 rounded-md grid place-items-center border transition shrink-0 ${
                            checked ? 'bg-brand border-brand text-surface' : 'border-line group-hover:border-brand'
                          }`}
                        >
                          {checked && <Check size={11} className="text-surface" strokeWidth={3} />}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggle(airlines, name, setAirlines)}
                        />
                        <AirlineLogo airline={name} size={22} className="shrink-0" />
                        <span className="text-[12px] font-bold text-ink truncate">{name}</span>
                      </div>
                      <span className="text-[10.5px] text-sub font-mono font-bold whitespace-nowrap ms-2">
                        {num(minToman, locale)}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 5. Ticket Type (Systemic vs Charter) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('ticketType')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <span className="text-[12px] font-black text-ink">
            {lt(locale, { fa: 'نوع بلیت', en: 'Ticket Type', ar: 'نوع التذكرة', zh: '机票类型', ru: 'Тиپ билета' })}
          </span>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.ticketType ? 'rotate-180' : ''}`} />
        </button>

        {openSections.ticketType && (
          <div className="p-3 pt-0 space-y-1.5">
            {ticketTypes.map((type) => {
              const count = ticketTypeCounts[type.id] || 0;
              const checked = ticketType === type.id;
              return (
                <label
                  key={type.id}
                  className={`flex items-center justify-between p-2 rounded-xl border transition ${
                    checked ? 'bg-mint/40 border-brand/40 text-brand-dark' : 'border-line/60 bg-surface hover:bg-soft text-ink'
                  } cursor-pointer`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-full grid place-items-center border transition ${
                        checked ? 'border-brand bg-brand text-surface' : 'border-line'
                      }`}
                    >
                      {checked && <span className="w-1.5 h-1.5 rounded-full bg-surface" />}
                    </span>
                    <input
                      type="radio"
                      name="ticketType"
                      className="sr-only"
                      checked={checked}
                      onChange={() => setTicketType(checked ? 'all' : type.id)}
                    />
                    <span className="text-xs font-bold truncate">{type.label}</span>
                  </div>
                  {count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-soft text-[10.5px] font-mono font-bold text-sub">
                      {num(count, locale)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Cabin Class (Economy vs Business) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('cabinClass')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <span className="text-[12px] font-black text-ink">
            {lt(locale, { fa: 'کلاس پروازی', en: 'Cabin Class', ar: 'درجة السفر', zh: '舱位等级', ru: 'Класс' })}
          </span>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.cabinClass ? 'rotate-180' : ''}`} />
        </button>

        {openSections.cabinClass && (
          <div className="p-3 pt-0 space-y-1.5">
            {cabinClasses.map((cls) => {
              const count = cabinClassCounts[cls.id] || 0;
              const checked = cabinClass === cls.id;
              return (
                <label
                  key={cls.id}
                  className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                    checked ? 'bg-mint/40 border-brand/40 text-brand-dark' : 'border-line/60 bg-surface hover:bg-soft text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-full grid place-items-center border transition ${
                        checked ? 'border-brand bg-brand text-surface' : 'border-line'
                      }`}
                    >
                      {checked && <span className="w-1.5 h-1.5 rounded-full bg-surface" />}
                    </span>
                    <input
                      type="radio"
                      name="cabinClass"
                      className="sr-only"
                      checked={checked}
                      onChange={() => setCabinClass(checked ? 'all' : cls.id)}
                    />
                    <span className="text-xs font-bold truncate">{cls.label}</span>
                  </div>
                  {count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-soft text-[10.5px] font-mono font-bold text-sub">
                      {num(count, locale)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper pb-32 sm:pb-24 lg:pb-20">
      {/* ================= DESKTOP FLIGHT SEARCH HEADER ================= */}
      <FlightSearchHeader
        from={fromInput}
        onFromChange={setFromInput}
        to={toInput}
        onToChange={setToInput}
        travelDate={travelDate}
        onTravelDateChange={(d) => {
          setTravelDate(d);
          handleDateChange(d);
        }}
        onSearchSubmit={handleTopSearch}
        resultsCount={totalCount}
      />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* ================= DESKTOP SIDEBAR ================= */}
        <aside className="w-72 max-h-[calc(100vh-6rem)] shrink-0 hidden lg:block overflow-y-auto overscroll-contain bg-surface rounded-2xl border border-line p-5 shadow-sm sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-brand-dark" />
              <h2 className="font-black text-sm text-ink">{t('filters')}</h2>
              {activeFilters > 0 && (
                <span className="w-5 h-5 grid place-items-center rounded-full bg-brand text-surface text-[10.5px] font-bold num">
                  {num(activeFilters, locale)}
                </span>
              )}
            </div>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11.5px] font-black text-brand-dark hover:underline flex items-center gap-1 focus-visible:outline-none"
              >
                <RotateCcw size={11} />
                <span>{t('clearFilters')}</span>
              </button>
            )}
          </div>
          {filtersBody}
        </aside>

        {/* ================= MAIN CONTENT ================= */}
        <div className="flex-grow flex flex-col gap-4 min-w-0 w-full">
          {/* Search summary - Mobile only */}
          <div className="md:hidden sticky top-16 z-30 bg-surface/95 backdrop-blur-xl rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs border border-line/80">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm sm:text-lg font-black text-ink truncate">{from || t('allOrigins')}</span>
                <span className="text-sub font-black">➔</span>
                <span className="text-sm sm:text-lg font-black text-ink truncate">{to || t('allDestinations')}</span>
              </div>
              <span className="px-2.5 py-1 bg-soft rounded-lg flex items-center gap-1 text-[11px] font-bold text-sub">
                <CalendarDays size={13} />
                {dualDate(travelDate).j}
              </span>
            </div>
            <button
              onClick={() => {
                setEditFrom(from);
                setEditTo(to);
                setEditDate(travelDate);
                setEditSheetOpen(true);
              }}
              className="h-9 px-3 rounded-xl bg-soft hover:bg-line/60 text-brand-dark text-xs font-black flex items-center gap-1.5 transition-colors border border-line shrink-0 active:scale-95"
            >
              <PenLine size={13} />
              <span>{t('changeSearch')}</span>
            </button>
          </div>

          {/* Low Fare 7-Day Price Window Calendar (Alibaba & FlyToday Benchmark) */}
          <FlightPriceCalendar
            selectedDate={travelDate}
            onSelectDate={handleDateChange}
            basePrice={flights[0]?.price ? Math.round(flights[0].price / 10) : 2_500_000}
            locale={locale}
          />

          {/* Quick Filter Chips & Price Drop Alert Trigger */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-surface border border-line shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-black">
              <button
                type="button"
                onClick={() => {
                  setStops([]);
                  setTimeOfDay('all');
                  setTicketType('all');
                  setQuickFilter('all');
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition ${
                  quickFilter === 'all' && stops.length === 0 && timeOfDay === 'all' && ticketType === 'all'
                    ? 'bg-brand text-surface shadow-xs'
                    : 'bg-soft text-sub hover:text-ink'
                }`}
              >
                {lt(locale, { fa: 'همه پروازها', en: 'All Flights', ar: 'كل الرحلات', zh: '全部航班', ru: 'Все рейсы' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (stops.includes(0) && stops.length === 1) {
                    setStops([]);
                    setQuickFilter('all');
                  } else {
                    setStops([0]);
                    setQuickFilter('direct');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
                  stops.includes(0) && stops.length === 1
                    ? 'bg-brand text-surface shadow-xs'
                    : 'bg-soft text-sub hover:text-ink'
                }`}
              >
                {stops.includes(0) && stops.length === 1 && <Check size={12} strokeWidth={3} />}
                <span>{lt(locale, { fa: 'فقط بدون توقف', en: 'Non-stop Only', ar: 'بدون توقف', zh: '仅直飞', ru: 'Только прямые' })}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (timeOfDay === 'morning') {
                    setTimeOfDay('all');
                    setQuickFilter('all');
                  } else {
                    setTimeOfDay('morning');
                    setQuickFilter('morning');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
                  timeOfDay === 'morning'
                    ? 'bg-brand text-surface shadow-xs'
                    : 'bg-soft text-sub hover:text-ink'
                }`}
              >
                {timeOfDay === 'morning' && <Check size={12} strokeWidth={3} />}
                <span>{lt(locale, { fa: 'پروازهای صبح (۶-۱۲)', en: 'Morning (6-12)', ar: 'صباحاً (6-12)', zh: '早班机（6-12点）', ru: 'Утренние (6-12)' })}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (timeOfDay === 'evening') {
                    setTimeOfDay('all');
                    setQuickFilter('all');
                  } else {
                    setTimeOfDay('evening');
                    setQuickFilter('evening');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
                  timeOfDay === 'evening'
                    ? 'bg-brand text-surface shadow-xs'
                    : 'bg-soft text-sub hover:text-ink'
                }`}
              >
                {timeOfDay === 'evening' && <Check size={12} strokeWidth={3} />}
                <span>{lt(locale, { fa: 'پروازهای شب (۱۸-۲۴)', en: 'Evening (18-24)', ar: 'مساءً (18-24)', zh: '晚班机（18-24点）', ru: 'Вечерние (18-24)' })}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ticketType === 'systemic') {
                    setTicketType('all');
                    setQuickFilter('all');
                  } else {
                    setTicketType('systemic');
                    setQuickFilter('systemic');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
                  ticketType === 'systemic'
                    ? 'bg-brand text-surface shadow-xs'
                    : 'bg-soft text-sub hover:text-ink'
                }`}
              >
                {ticketType === 'systemic' && <Check size={12} strokeWidth={3} />}
                <span>{lt(locale, { fa: 'فقط سیستمی', en: 'Systemic Only', ar: 'منتظمة فقط', zh: '仅正班', ru: 'Только регулярные' })}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cabinClass === 'business') {
                    setCabinClass('all');
                    setQuickFilter('all');
                  } else {
                    setCabinClass('business');
                    setQuickFilter('business');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
                  cabinClass === 'business'
                    ? 'bg-brand text-surface shadow-xs'
                    : 'bg-soft text-sub hover:text-ink'
                }`}
              >
                {cabinClass === 'business' && <Check size={12} strokeWidth={3} />}
                <span>{lt(locale, { fa: 'بیزنس کلاس', en: 'Business Class', ar: 'درجة رجال الأعمال', zh: '商务舱', ru: 'Бизнес' })}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPriceAlertModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-action/15 hover:bg-action/25 text-price text-xs font-black transition border border-action/30 shrink-0 cursor-pointer"
            >
              <BellRing size={14} className="text-price" aria-hidden="true" />
              <span>{lt(locale, { fa: 'اطلاع از کاهش قیمت', en: 'Price Alert', ar: 'تنبيه الأسعار', zh: '降价提醒', ru: 'Следить за ценой' })}</span>
            </button>
          </div>

          {/* Sorting & mobile trigger */}
          <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-none items-center">
            {sorts.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`whitespace-nowrap shrink-0 min-h-10 px-4 rounded-xl text-[13px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm ${
                  sort === s.id
                    ? 'bg-brand text-surface shadow-sm'
                    : 'bg-surface text-sub border border-line hover:bg-soft'
                }`}
              >
                {s.label}
              </button>
            ))}
            {/* Mobile filter trigger */}
            <button
              onClick={() => setSheet(true)}
              className="lg:hidden whitespace-nowrap shrink-0 min-h-10 px-4 rounded-xl bg-surface text-ink border border-line hover:bg-soft text-[13px] font-black flex items-center gap-2 me-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm"
            >
              <SlidersHorizontal size={15} />
              {t('filters')}
              {activeFilters > 0 && (
                <span className="w-5 h-5 grid place-items-center rounded-full bg-brand text-surface text-[10px] num">
                  {num(activeFilters, locale)}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[12px] text-sub font-bold">
              {loading && flights.length === 0
                ? lt(locale, {
                    fa: 'در حال جستجو و استعلام پروازها...',
                    en: 'Searching available flights...',
                    ar: 'جاري البحث عن الرحلات المتاحة...',
                    zh: '正在查询可用航班...',
                    ru: 'Поиск доступных рейсов...',
                  })
                : `${num(totalCount, locale)} ${t('flights')}`}
            </p>
            {error && <span className="text-xs text-destructive font-bold">{error}</span>}
            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-brand font-bold">
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                {lt(locale, {
                  fa: 'در حال به‌روزرسانی نتایج پرواز...',
                  en: 'Updating flight results...',
                  ar: 'جاري تحديث نتائج الرحلات...',
                  zh: '正在更新航班结果...',
                  ru: 'Обновление результатов рейсов...',
                })}
              </span>
            )}
          </div>

          {/* Results list */}
          {loading && flights.length === 0 ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-surface rounded-2xl border border-line animate-pulse p-6" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-surface rounded-2xl border border-rose-200 p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center mx-auto mb-3">
                <SlidersHorizontal size={24} />
              </div>
              <h3 className="text-base font-black text-ink mb-1">
                {lt(locale, { fa: 'اختلال موقت در ارتباط با تأمین‌کننده پرواز', en: 'Flight supplier connection issue', ar: 'مشكلة مؤقتة في الاتصال بمورد الطيران', zh: '航班供应商连接问题', ru: 'Временная ошибка поставщика рейсов' })}
              </h3>
              <p className="text-sub font-bold text-xs max-w-md mx-auto mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 rounded-xl bg-brand text-surface font-black text-xs hover:bg-brand-dark transition"
              >
                {lt(locale, { fa: 'تلاش مجدد استعلام', en: 'Retry query', ar: 'إعادة المحاولة', zh: '重试查询', ru: 'Повторить запрос' })}
              </button>
            </div>
          ) : flights.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-line p-14 text-center">
              <PlaneTakeoff size={32} className="mx-auto text-line mb-3" />
              <p className="text-sub font-bold text-sm">{t('noFlightsFound')}</p>
              <div className="mt-4 flex items-center justify-center gap-4">
                <button onClick={clearAll} className="text-brand-dark text-[13px] font-black hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
                  {t('clearFilters')}
                </button>
                {searchFiltered && (
                  <button
                    onClick={() => router.push('/flights/search')}
                    className="text-brand-dark text-[13px] font-black hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
                  >
                    {lt(locale, { fa: 'جستجوی همه مسیرها', en: 'Search all routes', ar: 'البحث في كل المسارات', zh: '搜索全部航线', ru: 'Искать все направления' })}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {flights.map((f, idx) => (
                <BentoFlightCard
                  key={f.id}
                  flight={f}
                  onSelect={() => selectFlight(f)}
                  isCheapest={idx === 0}
                  isCompared={cmp.has(f.id)}
                  onToggleCompare={() => toggleCmp(f.id)}
                  onShowRefundRules={(flight) => setRefundModalFlight(flight)}
                />
              ))}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-2 mt-2" aria-label={t('pagination')}>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="min-h-10 px-3 rounded-xl border border-line bg-surface text-sub text-[13px] font-black transition-colors hover:bg-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {t('previousPage')}
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
                    aria-label={t('goToPage', { page: pageItem })}
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
                {t('nextPage')}
              </button>
              <span className="basis-full text-center text-[11px] font-bold text-sub">
                {t('pageOf', { current: num(currentPage, locale), total: num(totalPages, locale) })}
              </span>
            </nav>
          )}

          <div className="mt-4">
            <CrossSellBundle currentService="flights" destination={to} />
          </div>

          {/* Promo insert */}
          <div className="rounded-2xl overflow-hidden shadow-elev-1 relative mt-4 rtl:bg-gradient-to-l ltr:bg-gradient-to-r from-brand to-brand-dark">
            <div className="absolute -end-16 -top-20 w-56 h-56 rounded-full border-[28px] border-surface/10 pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 md:p-8">
              <div>
                <h3 className="text-surface text-xl md:text-2xl font-black mb-1.5">{t('promoTitle')}</h3>
                <p className="text-mint-bright/90 text-[13px] max-w-md">{t('promoSubtitle')}</p>
              </div>
              <Link
                href="/book"
                className="shrink-0 px-6 min-h-10 inline-flex items-center bg-surface text-brand-dark font-black text-[13px] rounded-xl hover:bg-mint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {t('learnMore')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STICKY MOBILE FILTER & SORT PILL (FLYTODAY STYLE) ================= */}
      <div className="lg:hidden fixed bottom-[70px] inset-x-0 z-40 flex justify-center pointer-events-none px-4">
        <div className="pointer-events-auto bg-ink/90 dark:bg-surface/95 backdrop-blur-md text-surface dark:text-ink px-4 py-2 rounded-full shadow-elev-3 flex items-center gap-3 border border-surface/20 dark:border-line">
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="flex items-center gap-1.5 text-xs font-black py-1 px-2 rounded-full hover:bg-surface/20 transition active:scale-95 cursor-pointer"
          >
            <SlidersHorizontal size={14} />
            <span>{t('filters')}</span>
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-surface text-[10px] grid place-items-center font-bold">
                {num(activeFilters, locale)}
              </span>
            )}
          </button>
          <span className="w-px h-4 bg-surface/30 dark:bg-line" />
          <button
            type="button"
            onClick={() => {
              const nextIdx = (sorts.findIndex((s) => s.id === sort) + 1) % sorts.length;
              setSort(sorts[nextIdx].id);
            }}
            className="flex items-center gap-1.5 text-xs font-black py-1 px-2 rounded-full hover:bg-surface/20 transition active:scale-95 cursor-pointer"
          >
            <span className="text-[11px] opacity-75">{t('sortBy')}:</span>
            <span className="text-mint-bright dark:text-brand font-bold">
              {sorts.find((s) => s.id === sort)?.label}
            </span>
          </button>
        </div>
      </div>

      {/* Filters — mobile bottom sheet */}
      {sheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('filters')}
          className="lg:hidden"
        >
          <div className="fixed inset-0 z-[90] bg-ink/45 fade-soft" onClick={() => setSheet(false)} aria-hidden="true" />
          <div className="fixed bottom-0 inset-x-0 z-[100] bg-surface rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-line">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-brand-dark" />
                <h2 className="font-black text-sm text-ink">{t('filters')}</h2>
                {activeFilters > 0 && (
                  <span className="w-5 h-5 grid place-items-center rounded-full bg-brand text-surface text-[10px] num">
                    {num(activeFilters, locale)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSheet(false)}
                aria-label={ariaT('close')}
                className="w-8 h-8 rounded-full bg-soft text-sub flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X size={17} />
              </button>
            </div>
            <div className="overflow-y-auto p-5">{filtersBody}</div>
            <div className="p-4 border-t border-line bg-surface flex items-center gap-3">
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-11 px-4 rounded-xl border border-line text-sub font-black text-xs hover:bg-soft transition"
                >
                  {t('clearFilters')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSheet(false)}
                className="flex-1 min-h-11 rounded-xl bg-brand hover:bg-brand-dark text-surface text-sm font-black transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {t('apply')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Place Flight Search Edit Sheet */}
      {editSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lt(locale, { fa: 'تغییر پارامترهای جستجوی پرواز', en: 'Edit flight search parameters', ar: 'تعديل معايير البحث عن الرحلات', zh: '修改航班搜索参数', ru: 'Изменить параметры поиска рейсов' })}
          className="fixed inset-0 z-[160] flex items-end justify-center bg-deep/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg bg-surface rounded-t-3xl p-5 border-t border-line shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200 space-y-4">
            <div className="w-10 h-1 rounded-full bg-line mx-auto mb-1" />

            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-black text-ink">
                {lt(locale, {
                  fa: 'تغییر پارامترهای جستجوی پرواز',
                  en: 'Edit Flight Search',
                  ar: 'تعديل بحث الرحلات',
                  zh: '修改航班搜索',
                  ru: 'Изменить поиск рейсов',
                })}
              </h3>
              <button
                type="button"
                onClick={() => setEditSheetOpen(false)}
                aria-label={ariaT('close')}
                className="text-xs font-bold text-sub px-2.5 py-1 rounded-lg bg-soft hover:bg-line/60 transition active:scale-95"
              >
                {ariaT('close')}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="edit-flight-origin" className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'مبدأ پرواز', en: 'Departure City', ar: 'مدينة المغادرة', zh: '出发城市', ru: 'Город вылета' })}
                </label>
                <div className="flex items-center gap-2 p-3 bg-soft rounded-xl border border-line">
                  <PlaneTakeoff size={16} className="text-brand-dark shrink-0" aria-hidden="true" />
                  <input
                    id="edit-flight-origin"
                    type="text"
                    value={editFrom}
                    onChange={(e) => setEditFrom(e.target.value)}
                    placeholder={lt(locale, { fa: 'مثال: تهران، مشهد...', en: 'e.g. Tehran, Istanbul...', ar: 'مثال: طهران، دبي...', zh: '例如：德黑兰、伊斯坦布尔...', ru: 'Например: Тегеран, Стамбул...' })}
                    className="w-full bg-transparent border-0 outline-none text-xs font-bold text-ink"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-flight-dest" className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'مقصد پرواز', en: 'Destination City', ar: 'مدينة الوجهة', zh: '到达城市', ru: 'Город назначения' })}
                </label>
                <div className="flex items-center gap-2 p-3 bg-soft rounded-xl border border-line">
                  <PlaneLanding size={16} className="text-brand-dark shrink-0" aria-hidden="true" />
                  <input
                    id="edit-flight-dest"
                    type="text"
                    value={editTo}
                    onChange={(e) => setEditTo(e.target.value)}
                    placeholder={lt(locale, { fa: 'مثال: استانبول، دبی، کیش...', en: 'e.g. Istanbul, Dubai...', ar: 'مثال: إسطنبول، دبي...', zh: '例如：伊斯坦布尔、迪拜...', ru: 'Например: Стамбул, Дубай...' })}
                    className="w-full bg-transparent border-0 outline-none text-xs font-bold text-ink"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-flight-date" className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'تاریخ پرواز', en: 'Flight Date', ar: 'تاريخ الرحلة', zh: '航班日期', ru: 'Дата рейса' })}
                </label>
                <input
                  id="edit-flight-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-soft text-xs font-bold font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditSheetOpen(false);
                  const q = new URLSearchParams();
                  if (editFrom) q.set('from', editFrom);
                  if (editTo) q.set('to', editTo);
                  if (editDate) q.set('depart', editDate);
                  router.push(`/flights/search?${q.toString()}`);
                }}
                className="w-full h-12 rounded-2xl bg-action hover:bg-action-hover text-ink font-black text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
              >
                <Search size={16} aria-hidden="true" />
                <span>
                  {lt(locale, {
                    fa: 'جستجوی پروازهای جدید',
                    en: 'Search Flights',
                    ar: 'بحث عن رحلات جديدة',
                    zh: '搜索新航班',
                    ru: 'Поиск новых рейсов',
                  })}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flight Comparison Floating Bar */}
      <FlightCompareBar
        cmp={cmp}
        flights={flights}
        onToggleCmp={toggleCmp}
        onClearCmp={clearCmp}
        onCompareAction={() => setCompareModalOpen(true)}
      />

      {/* Flight Comparison Modal */}
      <FlightCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        comparedFlights={flights.filter((f) => cmp.has(f.id))}
        onRemove={(id) => toggleCmp(id)}
        onSelectFlight={selectFlight}
      />

      {/* Refund Rules Modal */}
      <FlightRefundRulesModal
        isOpen={Boolean(refundModalFlight)}
        onClose={() => setRefundModalFlight(null)}
        flight={refundModalFlight}
        locale={locale}
      />

      {/* Price Alert Modal */}
      <FlightPriceAlertModal
        isOpen={priceAlertModalOpen}
        onClose={() => setPriceAlertModalOpen(false)}
        originCity={from || lt(locale, { fa: 'مبدأ دلخواه', en: 'Any Origin', ar: 'أي مدينة', zh: '任意城市', ru: 'Любой' })}
        destCity={to || lt(locale, { fa: 'مقصد دلخواه', en: 'Any Destination', ar: 'أي وجهة', zh: '任意目的地', ru: 'Любой' })}
        currentLowestPrice={flights[0]?.price ? Math.round(flights[0].price / 10) : 2_500_000}
        locale={locale}
      />
    </div>
  );
}

export default function FlightSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center">
          <Loader2 className="animate-spin text-brand" size={36} />
        </div>
      }
    >
      <FlightSearchInner />
    </Suspense>
  );
}
