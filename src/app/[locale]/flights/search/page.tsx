'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FLIGHTS } from '@/lib/data';
import type { Flight } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { dualDate } from '@/lib/jalali';
import { BentoFlightCard, durationMinutes } from '@/components/flights/BentoFlightCard';
import { CrossSellBundle } from '@/components/shared/CrossSellBundle';
import {
  PlaneTakeoff, PlaneLanding, CalendarDays, PenLine, SlidersHorizontal, X, Check, ArrowLeft,
} from 'lucide-react';

const SORTS = [
  { id: 'price', label: 'ارزان‌ترین' },
  { id: 'fast', label: 'سریع‌ترین' },
  { id: 'suggested', label: 'پیشنهاد ما' },
  { id: 'time', label: 'زودترین حرکت' },
] as const;

type SortId = (typeof SORTS)[number]['id'];

const STEP = 1_000_000;

function FlightSearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const bounds = useMemo(() => {
    const prices = FLIGHTS.map((f) => f.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, []);

  const [stops, setStops] = useState<number[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [price, setPrice] = useState<[number, number]>([bounds.min, bounds.max]);
  const [sort, setSort] = useState<SortId>('price');
  const [sheet, setSheet] = useState(false);

  const airlineOptions = useMemo(() => {
    const map = new Map<string, number>();
    FLIGHTS.forEach((f) => {
      map.set(f.airline, Math.min(map.get(f.airline) ?? Infinity, f.price));
    });
    return [...map.entries()].map(([name, minPrice]) => ({ name, minPrice }));
  }, []);

  const stopCounts = useMemo(() => {
    const c = [0, 0, 0];
    FLIGHTS.forEach((f) => c[Math.min(f.stops, 2)] += 1);
    return c;
  }, []);

  const results = useMemo(() => {
    let list = FLIGHTS.filter((f) => {
      if (stops.length && !stops.includes(Math.min(f.stops, 2))) return false;
      if (airlines.length && !airlines.includes(f.airline)) return false;
      if (f.price < price[0] || f.price > price[1]) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'price') return a.price - b.price;
      if (sort === 'fast') return durationMinutes(a.duration) - durationMinutes(b.duration);
      if (sort === 'time') return a.departureTime.localeCompare(b.departureTime);
      return a.price / durationMinutes(a.duration) - b.price / durationMinutes(b.duration);
    });
    return list;
  }, [stops, airlines, price, sort]);

  const activeFilters = stops.length + airlines.length + (price[0] > bounds.min || price[1] < bounds.max ? 1 : 0);

  function clearAll() {
    setStops([]);
    setAirlines([]);
    setPrice([bounds.min, bounds.max]);
  }

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  function selectFlight(f: Flight) {
    setBookingContext({
      type: 'flights',
      title: `${f.originCity} ✈ ${f.destinationCity} (${f.flightNo})`,
      subtitle: `${f.airline} • ${f.departureTime}`,
      amount: f.price,
      travelDate: daysFromNow(7),
    });
    router.push('/checkout');
  }

  const minPct = ((price[0] - bounds.min) / (bounds.max - bounds.min)) * 100;
  const maxPct = ((price[1] - bounds.min) / (bounds.max - bounds.min)) * 100;

  const filtersBody = (
    <>
      {/* Price range */}
      <div className="mb-7">
        <h3 className="font-black text-[13px] text-ink mb-4">محدوده قیمت</h3>
        <div className="relative h-6 mb-5" dir="ltr">
          <span className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-2 rounded-full bg-line" />
          <span
            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-brand"
            style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          />
          <input
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={STEP}
            value={price[0]}
            onChange={(e) => setPrice([Math.min(Number(e.target.value), price[1] - STEP), price[1]])}
            aria-label="حداقل قیمت"
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full"
          />
          <input
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={STEP}
            value={price[1]}
            onChange={(e) => setPrice([price[0], Math.max(Number(e.target.value), price[0] + STEP)])}
            aria-label="حداکثر قیمت"
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full"
          />
        </div>
        <div className="flex justify-between text-[11.5px] text-sub font-bold">
          <span>از {price[0].toLocaleString('fa-IR')} تومان</span>
          <span>تا {price[1].toLocaleString('fa-IR')} تومان</span>
        </div>
      </div>

      <hr className="border-line mb-6" />

      {/* Stops */}
      <div className="mb-7">
        <h3 className="font-black text-[13px] text-ink mb-4">تعداد توقف</h3>
        <div className="flex flex-col gap-3">
          {(['بدون توقف', 'یک توقف', 'دو توقف یا بیشتر'] as const).map((label, i) => {
            const count = stopCounts[i];
            const checked = stops.includes(i);
            return (
              <label key={label} className={`flex items-center gap-3 group ${count === 0 ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
                <span className={`w-5 h-5 rounded-md grid place-items-center border transition-colors group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-brand ${checked ? 'bg-brand border-brand' : 'border-line group-hover:border-brand'}`}>
                  {checked && <Check size={13} className="text-surface" strokeWidth={3} />}
                </span>
                <input type="checkbox" className="sr-only focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" checked={checked} onChange={() => toggle(stops, i, setStops)} />
                <span className="text-[13px] font-bold text-ink">{label}</span>
                <span className="me-auto text-[11px] text-sub">{count.toLocaleString('fa-IR')} پرواز</span>
              </label>
            );
          })}
        </div>
      </div>

      <hr className="border-line mb-6" />

      {/* Airlines */}
      <div>
        <h3 className="font-black text-[13px] text-ink mb-4">ایرلاین‌ها</h3>
        <div className="flex flex-col gap-3">
          {airlineOptions.map((a) => {
            const checked = airlines.includes(a.name);
            return (
              <label key={a.name} className="flex items-center gap-3 group cursor-pointer">
                <span className={`w-5 h-5 rounded-md grid place-items-center border transition-colors group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-brand ${checked ? 'bg-brand border-brand' : 'border-line group-hover:border-brand'}`}>
                  {checked && <Check size={13} className="text-surface" strokeWidth={3} />}
                </span>
                <input type="checkbox" className="sr-only focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" checked={checked} onChange={() => toggle(airlines, a.name, setAirlines)} />
                <span className="text-[13px] font-bold text-ink">{a.name}</span>
                <span className="me-auto text-[11px] text-sub whitespace-nowrap">از {a.minPrice.toLocaleString('fa-IR')} ت</span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-6 md:py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters — desktop */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="bg-surface rounded-xl shadow-elev-1 p-6 sticky top-24 border border-line">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-ink">فیلترها</h2>
              <button onClick={clearAll} className="text-[12px] text-brand-dark hover:underline font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
                پاک کردن همه
              </button>
            </div>
            {filtersBody}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-grow flex flex-col gap-4 min-w-0">
          {/* Search summary */}
          <div className="bg-soft rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-3 shadow-sm border border-line">
            <div className="flex items-center gap-3 md:gap-4 flex-wrap justify-center">
              <div className="flex items-center gap-2">
                <span className="text-lg md:text-xl font-black text-ink">{from || 'همه مبدأها'}</span>
                <PlaneTakeoff size={17} className="text-sub" />
              </div>
              <ArrowLeft size={18} className="text-sub max-md:hidden ltr:rotate-180" />
              <div className="flex items-center gap-2">
                <span className="text-lg md:text-xl font-black text-ink">{to || 'همه مقصدها'}</span>
                <PlaneLanding size={17} className="text-sub" />
              </div>
              <span className="px-3 py-1.5 bg-line/60 rounded-full flex items-center gap-1.5 text-[11.5px] font-bold text-sub">
                <CalendarDays size={14} />
                {dualDate(daysFromNow(7)).j}
              </span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="min-h-10 px-4 rounded-lg bg-line/60 hover:bg-line text-ink text-[13px] font-black flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm"
            >
              <PenLine size={15} />
              تغییر جستجو
            </button>
          </div>

          {/* Sorting */}
          <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-none">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`whitespace-nowrap min-h-10 px-4 rounded-lg text-[13px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm ${
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
              className="lg:hidden whitespace-nowrap min-h-10 px-4 rounded-lg bg-surface text-ink border border-line hover:bg-soft text-[13px] font-black flex items-center gap-2 me-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm"
            >
              <SlidersHorizontal size={15} />
              فیلترها
              {activeFilters > 0 && (
                <span className="w-5 h-5 grid place-items-center rounded-full bg-brand text-surface text-[10px]">
                  {activeFilters.toLocaleString('fa-IR')}
                </span>
              )}
            </button>
          </div>

          <p className="text-[12px] text-sub font-bold">{results.length.toLocaleString('fa-IR')} پرواز یافت شد</p>

          {/* Results list */}
          {results.length === 0 ? (
            <div className="bg-surface rounded-xl border border-line p-14 text-center">
              <PlaneTakeoff size={32} className="mx-auto text-line mb-3" />
              <p className="text-sub font-bold text-sm">پروازی با این فیلترها یافت نشد</p>
              <button onClick={clearAll} className="mt-4 text-brand-dark text-[13px] font-black hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
                پاک کردن فیلترها
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {results.map((f) => (
                <BentoFlightCard key={f.id} flight={f} onSelect={() => selectFlight(f)} />
              ))}
            </div>
          )}

          <div className="mt-4">
            <CrossSellBundle currentService="flights" destination={to} />
          </div>

          {/* Promo insert */}
          <div className="rounded-xl overflow-hidden shadow-elev-1 relative mt-4 rtl:bg-gradient-to-l ltr:bg-gradient-to-r from-brand to-brand-dark">
            <div className="absolute -end-16 -top-20 w-56 h-56 rounded-full border-[28px] border-surface/10 pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 md:p-8">
              <div>
                <h3 className="text-surface text-xl md:text-2xl font-black mb-1.5">تجربه سفری نوین با فیروز</h3>
                <p className="text-mint-bright/90 text-[13px] max-w-md">بهترین پروازها را با رزرو سریع و پرداخت چندارزی کشف کنید.</p>
              </div>
              <Link
                href="/book"
                className="shrink-0 px-6 min-h-10 inline-flex items-center bg-surface text-brand-dark font-black text-[13px] rounded-lg hover:bg-mint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                بیشتر بدانید
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters — mobile bottom sheet */}
      {sheet && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-90 bg-ink/45 fade-soft" onClick={() => setSheet(false)} />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-95 sheet-up rounded-t-[22px] bg-surface px-5 pt-3 pb-[calc(18px+env(safe-area-inset-bottom))] shadow-elev-3 max-h-[82vh] overflow-y-auto"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div className="flex items-center justify-between mb-4">
              <b className="text-[15px] font-black">فیلترها</b>
              <div className="flex items-center gap-2">
                <button onClick={clearAll} className="text-[12px] text-brand-dark font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">پاک کردن همه</button>
                <button onClick={() => setSheet(false)} aria-label="بستن" className="grid place-items-center w-8 h-8 rounded-full bg-soft text-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  <X size={15} />
                </button>
              </div>
            </div>
            {filtersBody}
            <button
              onClick={() => setSheet(false)}
              className="w-full mt-5 min-h-12 rounded-full bg-brand text-surface font-black text-sm sticky bottom-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              نمایش {results.length.toLocaleString('fa-IR')} پرواز
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlightSearchPage() {
  return (
    <Suspense>
      <FlightSearchInner />
    </Suspense>
  );
}
