'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { resolveCityQuery, localizedAirportLabel } from '@/lib/cities';
import type { Flight } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
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
  useFlightComparison,
} from '@/components/flights';
import { CrossSellBundle } from '@/components/shared/CrossSellBundle';
import {
  PlaneTakeoff, PlaneLanding, CalendarDays, PenLine, SlidersHorizontal, X, Check, Loader2, Search, BellRing,
} from 'lucide-react';

const STEP = 1_000_000;

function FlightSearchInner() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Flights');
  const params = useSearchParams();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const ariaT = useTranslations('Common.aria');

  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  // Honor the requested departure date; fall back to +7 days.
  const departParam = params.get('depart');
  const travelDate = departParam && /^\d{4}-\d{2}-\d{2}$/.test(departParam) ? departParam : daysFromNow(7);

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

  const [stops, setStops] = useState<number[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number }>({ min: 20_000_000, max: 150_000_000 });
  const [price, setPrice] = useState<[number, number]>([20_000_000, 150_000_000]);
  const [sort, setSort] = useState<SortId>('price');
  const [sheet, setSheet] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editFrom, setEditFrom] = useState(from);
  const [editTo, setEditTo] = useState(to);
  const [editDate, setEditDate] = useState(travelDate);

  // Flight Comparison & Value-Add Modals
  const { cmp, toggleCmp, clearCmp } = useFlightComparison();
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [priceAlertModalOpen, setPriceAlertModalOpen] = useState(false);
  const [refundModalFlight, setRefundModalFlight] = useState<Flight | null>(null);
  const [quickFilter, setQuickFilter] = useState<'all' | 'direct' | 'morning' | 'systemic'>('all');

  function handleDateChange(newDate: string) {
    const q = new URLSearchParams(params.toString());
    q.set('depart', newDate);
    router.push(`/flights/search?${q.toString()}`);
  }

  // Live state
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlineOptions, setAirlineOptions] = useState<Array<{ name: string; minPrice: number }>>([]);
  const [stopCounts, setStopCounts] = useState<[number, number, number]>([0, 0, 0]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const airlinesKey = airlines.join(',');
  const stopsKey = stops.join(',');
  const minPriceVal = price[0];
  const maxPriceVal = price[1];
  const minBound = priceBounds.min;
  const maxBound = priceBounds.max;

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
      if (minPriceVal > minBound) q.set('minPrice', String(minPriceVal));
      if (maxPriceVal < maxBound) q.set('maxPrice', String(maxPriceVal));
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
        if (json.data.priceBounds) {
          const newBounds = json.data.priceBounds;
          setPriceBounds((prev) => {
            if (prev.min === newBounds.min && prev.max === newBounds.max) {
              return prev;
            }
            return newBounds;
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
  }, [from, to, travelDate, sort, airlinesKey, stopsKey, minPriceVal, maxPriceVal, minBound, maxBound, currentPage]);

  useEffect(() => {
    fetchFlights();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchFlights]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sort, airlinesKey, stopsKey, minPriceVal, maxPriceVal]);

  const activeFilters = stops.length + airlines.length + (price[0] > priceBounds.min || price[1] < priceBounds.max ? 1 : 0);

  function clearAll() {
    setStops([]);
    setAirlines([]);
    setPrice([priceBounds.min, priceBounds.max]);
  }

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  function selectFlight(f: Flight) {
    setBookingContext({
      type: 'flights',
      // The server prices the draft from the live flight catalog by id.
      id: f.id,
      title: `${localizedAirportLabel(f.origin, locale)} ✈ ${localizedAirportLabel(f.destination, locale)} (${f.flightNo})`,
      subtitle: `${locale === 'fa' ? f.airline : (f.airlineEn || f.airline)} • ${f.departureTime}`,
      amount: f.price,
      travelDate,
    });
    router.push('/checkout');
  }

  const rangeSpan = Math.max(priceBounds.max - priceBounds.min, 1);
  const minPct = ((price[0] - priceBounds.min) / rangeSpan) * 100;
  const maxPct = ((price[1] - priceBounds.min) / rangeSpan) * 100;
  

  const stopLabels = [t('directOnly'), t('oneStop'), t('twoOrMoreStops')];

  const pageItems: Array<number | 'ellipsis' | 'ellipsis-end'> = totalPages <= 5
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : currentPage <= 3
      ? [1, 2, 3, 'ellipsis', totalPages]
      : currentPage >= totalPages - 2
        ? [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
        : [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages];

  const filtersBody = (
    <>
      {/* Price range */}
      <div className="mb-7">
        <h3 className="font-black text-[13px] text-ink mb-4">{t('priceRange')}</h3>
        <div className="relative h-6 mb-5" dir="ltr">
          <span className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-2 rounded-full bg-line" />
          <span
            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-brand"
            style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          />
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            step={STEP}
            value={price[0]}
            onChange={(e) => setPrice([Math.min(Number(e.target.value), price[1] - STEP), price[1]])}
            aria-label={t('priceRange')}
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full"
          />
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            step={STEP}
            value={price[1]}
            onChange={(e) => setPrice([price[0], Math.max(Number(e.target.value), price[0] + STEP)])}
            aria-label={t('priceRange')}
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full"
          />
        </div>
        <div className="flex justify-between text-[11.5px] text-sub font-bold num">
          <span>{num(price[0], locale)}</span>
          <span>{num(price[1], locale)}</span>
        </div>
      </div>

      <hr className="border-line mb-6" />

      {/* Stops */}
      <div className="mb-7">
        <h3 className="font-black text-[13px] text-ink mb-4">{t('stopsCount')}</h3>
        <div className="flex flex-col gap-3">
          {stopLabels.map((label, i) => {
            const count = stopCounts[i] || 0;
            const checked = stops.includes(i);
            return (
              <label key={label} className={`flex items-center gap-3 group ${count === 0 ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
                <span className={`w-5 h-5 rounded-md grid place-items-center border transition-colors group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-brand ${checked ? 'bg-brand border-brand' : 'border-line group-hover:border-brand'}`}>
                  {checked && <Check size={13} className="text-surface" strokeWidth={3} />}
                </span>
                <input type="checkbox" className="sr-only focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" checked={checked} onChange={() => toggle(stops, i, setStops)} />
                <span className="text-[13px] font-bold text-ink">{label}</span>
                <span className="me-auto text-[11px] text-sub num">{num(count, locale)}</span>
              </label>
            );
          })}
        </div>
      </div>

      <hr className="border-line mb-6" />

      {/* Airlines */}
      <div>
        <h3 className="font-black text-[13px] text-ink mb-4">{t('airlines')}</h3>
        <div className="flex flex-col gap-3">
          {airlineOptions.map(({ name, minPrice }) => {
            const checked = airlines.includes(name);
            return (
              <label key={name} className="flex items-center gap-3 cursor-pointer group">
                <span className={`w-5 h-5 rounded-md grid place-items-center border transition-colors group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-brand ${checked ? 'bg-brand border-brand' : 'border-line group-hover:border-brand'}`}>
                  {checked && <Check size={13} className="text-surface" strokeWidth={3} />}
                </span>
                <input type="checkbox" className="sr-only focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" checked={checked} onChange={() => toggle(airlines, name, setAirlines)} />
                <span className="text-[13px] font-bold text-ink truncate">{name}</span>
                <span className="me-auto text-[11px] text-sub num">{num(minPrice, locale)}</span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-paper pb-32 sm:pb-24 lg:pb-20">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar desktop */}
        <aside className="w-72 max-h-[calc(100vh-6rem)] shrink-0 hidden lg:block overflow-y-auto overscroll-contain bg-surface rounded-2xl border border-line p-5 shadow-sm sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-black text-sm text-ink">{t('filters')}</h2>
            {activeFilters > 0 && (
              <button onClick={clearAll} className="text-[11.5px] font-black text-brand-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
                {t('clearFilters')}
              </button>
            )}
          </div>
          {filtersBody}
        </aside>

        {/* Content */}
        <div className="flex-grow flex flex-col gap-4 min-w-0 w-full">
          {/* Search summary - Sticky on mobile under header */}
          <div className="sticky top-16 z-30 md:static bg-surface/95 backdrop-blur-xl rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-xs border border-line/80">
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
            basePrice={flights[0]?.price || 28500000}
            locale={locale}
          />

          {/* Quick Filter Chips & Price Drop Alert Trigger */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-surface border border-line shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-black">
              <button
                type="button"
                onClick={() => setQuickFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition ${quickFilter === 'all' ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
              >
                {lt(locale, { fa: 'همه پروازها', en: 'All Flights', ar: 'كل الرحلات', zh: '全部航班', ru: 'Все рейсы' })}
              </button>
              <button
                type="button"
                onClick={() => setQuickFilter('direct')}
                className={`px-3 py-1.5 rounded-xl transition ${quickFilter === 'direct' ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
              >
                {lt(locale, { fa: 'فقط بدون توقف', en: 'Non-stop Only', ar: 'بدون توقف', zh: '仅直飞', ru: 'Только прямые' })}
              </button>
              <button
                type="button"
                onClick={() => setQuickFilter('morning')}
                className={`px-3 py-1.5 rounded-xl transition ${quickFilter === 'morning' ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
              >
                {lt(locale, { fa: 'پروازهای صبح (۶-۱۲)', en: 'Morning (6-12)', ar: 'صباحاً (6-12)', zh: '早班机（6-12点）', ru: 'Утренние (6-12)' })}
              </button>
              <button
                type="button"
                onClick={() => setQuickFilter('systemic')}
                className={`px-3 py-1.5 rounded-xl transition ${quickFilter === 'systemic' ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-sub hover:text-ink'}`}
              >
                {lt(locale, { fa: 'فقط سیستمی', en: 'Systemic Only', ar: 'منتظمة فقط', zh: '仅正班', ru: 'Только регулярные' })}
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
                className={`whitespace-nowrap min-h-10 px-4 rounded-xl text-[13px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm ${
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
              className="lg:hidden whitespace-nowrap min-h-10 px-4 rounded-xl bg-surface text-ink border border-line hover:bg-soft text-[13px] font-black flex items-center gap-2 me-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm"
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
              {num(totalCount, locale)} {t('flights')}
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
              {flights
                .filter((f) => {
                  if (quickFilter === 'direct' && f.stops > 0) return false;
                  if (quickFilter === 'morning') {
                    const depHour = parseInt(f.departureTime.slice(0, 2), 10);
                    if (depHour < 6 || depHour >= 12) return false;
                  }
                  if (quickFilter === 'systemic' && f.ticketType === 'charter') return false;
                  return true;
                })
                .map((f, idx) => (
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
            className="flex items-center gap-1.5 text-xs font-black py-1 px-2 rounded-full hover:bg-surface/20 transition active:scale-95"
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
              // Cycle sort on tap in mobile pill
              const nextIdx = (sorts.findIndex((s) => s.id === sort) + 1) % sorts.length;
              setSort(sorts[nextIdx].id);
            }}
            className="flex items-center gap-1.5 text-xs font-black py-1 px-2 rounded-full hover:bg-surface/20 transition active:scale-95"
          >
            <span className="text-[11px] opacity-75">{t('sortBy')}:</span>
            <span className="text-brand-bright text-mint-bright dark:text-brand font-bold">
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
              <h2 className="font-black text-sm text-ink">{t('filters')}</h2>
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
            <div className="p-4 border-t border-line bg-surface">
              <button
                type="button"
                onClick={() => setSheet(false)}
                className="w-full min-h-11 rounded-xl bg-brand hover:bg-brand-dark text-surface text-sm font-black transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
                className="w-full h-12 rounded-2xl bg-action hover:bg-action-hover text-ink font-black text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95"
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

      {/* Floating Flight Compare Bar */}
      <FlightCompareBar
        cmp={cmp}
        flights={flights}
        onToggleCmp={toggleCmp}
        onClearCmp={clearCmp}
        onCompareAction={() => setCompareModalOpen(true)}
      />

      {/* Side-by-Side Flight Comparison Modal */}
      <FlightCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        comparedFlights={flights.filter((f) => cmp.has(f.id))}
        onRemove={toggleCmp}
        onSelectFlight={(flight) => selectFlight(flight)}
      />

      {/* Flight Refund Policy Rules Modal (Alibaba / FlyToday Benchmark) */}
      <FlightRefundRulesModal
        isOpen={Boolean(refundModalFlight)}
        onClose={() => setRefundModalFlight(null)}
        flight={refundModalFlight}
        locale={locale}
      />

      {/* Flight Price Drop Alert Modal (Trip.com / FlyToday Benchmark) */}
      <FlightPriceAlertModal
        isOpen={priceAlertModalOpen}
        onClose={() => setPriceAlertModalOpen(false)}
        originCity={from || 'تهران'}
        destCity={to || 'مشهد'}
        currentLowestPrice={flights[0]?.price || 28500000}
        locale={locale}
      />
    </div>
  );
}

export default function FlightSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper p-10 text-center"><Loader2 className="animate-spin mx-auto text-brand" size={32} /></div>}>
      <FlightSearchInner />
    </Suspense>
  );
}
