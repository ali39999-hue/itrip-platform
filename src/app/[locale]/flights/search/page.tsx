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
import { BentoFlightCard } from '@/components/flights/BentoFlightCard';
import { CrossSellBundle } from '@/components/shared/CrossSellBundle';
import {
  PlaneTakeoff, PlaneLanding, CalendarDays, PenLine, SlidersHorizontal, X, Check, ArrowLeft, Loader2,
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
    <div className="min-h-screen bg-paper pb-20">
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
          {/* Search summary */}
          <div className="bg-surface/95 backdrop-blur-xl rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-3 shadow-sm border border-line/80">
            <div className="flex items-center gap-3 md:gap-4 flex-wrap justify-center">
              <div className="flex items-center gap-2">
                <span className="text-lg md:text-xl font-black text-ink">{from || t('allOrigins')}</span>
                <PlaneTakeoff size={17} className="text-sub" />
              </div>
              <ArrowLeft size={18} className="text-sub max-md:hidden ltr:rotate-180" />
              <div className="flex items-center gap-2">
                <span className="text-lg md:text-xl font-black text-ink">{to || t('allDestinations')}</span>
                <PlaneLanding size={17} className="text-sub" />
              </div>
              <span className="px-3 py-1.5 bg-line/60 rounded-full flex items-center gap-1.5 text-[11.5px] font-bold text-sub">
                <CalendarDays size={14} />
                {dualDate(travelDate).j}
              </span>
            </div>
            <button
              onClick={() => {
                const q = new URLSearchParams();
                if (from) q.set('from', from);
                if (to) q.set('to', to);
                if (departParam) q.set('depart', departParam);
                router.push(`/flights${q.size ? `?${q.toString()}` : ''}`);
              }}
              className="min-h-10 px-4 rounded-xl bg-soft hover:bg-line/60 text-ink text-[13px] font-black flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm border border-line"
            >
              <PenLine size={15} />
              {t('changeSearch')}
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
            <p className="text-[12px] text-sub font-bold">{num(totalCount, locale)} {t('flights')} (لایو)</p>
            {error && <span className="text-xs text-destructive font-bold">{error}</span>}
            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-brand font-bold">
                <Loader2 size={14} className="animate-spin" />
                در حال به‌روزرسانی نتایج لایو...
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
              {flights.map((f) => (
                <BentoFlightCard key={f.id} flight={f} onSelect={() => selectFlight(f)} />
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

      {/* Filters — mobile bottom sheet */}
      {sheet && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-90 bg-ink/45 fade-soft" onClick={() => setSheet(false)} />
          <div className="fixed bottom-0 inset-x-0 z-100 bg-surface rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-line">
              <h2 className="font-black text-sm text-ink">{t('filters')}</h2>
              <button
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
                onClick={() => setSheet(false)}
                className="w-full min-h-11 rounded-xl bg-brand hover:bg-brand-dark text-surface text-sm font-black transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {t('apply')}
              </button>
            </div>
          </div>
        </div>
      )}
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
