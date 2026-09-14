'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { Search, MapPin, Hotel as HotelIcon, Star, Loader2, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { CITIES, type CityOption } from '@/lib/data';
import { COUNTRIES, countryName, type CountryId } from '@/lib/countries';
import { lt } from '@/lib/lt';

/** سه شهر پرطرفدار پیش‌فرض (مشهد، استانبول، دبی) */
const POPULAR_CITY_IDS = ['mhd', 'ist', 'dxb'];

interface HotelSummary {
  id: string;
  name: string;
  nameEn?: string;
  city?: string;
  cityEn?: string;
  stars: number;
  pricePerNight: number;
}

interface CityHotels {
  city: CityOption;
  hotels: HotelSummary[];
  total: number;
}

/** یکسان‌سازی ورودی کاربر برای تطبیق فارسی/انگلیسی (ی/ك عربی، فاصله و نیم‌فاصله) */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\s\u200c]/g, '');
}

export function CityHotelSearch() {
  const locale = useLocale();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CityOption | null>(null);
  const [result, setResult] = useState<CityHotels | null>(null);
  const [loading, setLoading] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const popularCities = useMemo(
    () => POPULAR_CITY_IDS.map((id) => CITIES.find((c) => c.id === id)).filter((c): c is CityOption => Boolean(c)),
    []
  );

  const citiesByCountry = useMemo(() => {
    const groups = Object.keys(COUNTRIES).map((countryId) => ({
      country: COUNTRIES[countryId as CountryId],
      cities: CITIES.filter((c) => c.countryId === countryId),
    }));
    return groups.filter((g) => g.cities.length > 0);
  }, []);

  const matches = useMemo(() => {
    const q = norm(query);
    if (q.length < 1) return [];
    return CITIES.filter(
      (c) => norm(c.fa).includes(q) || norm(c.en).includes(q) || norm(c.nameEn).includes(q) || norm(c.airportCode).includes(q)
    );
  }, [query]);

  // Debounce: با تایپ نام شهر، هتل‌های نزدیک‌ترین تطبیق به‌صورت خودکار بارگذاری می‌شود
  useEffect(() => {
    if (!open || selected) return;
    if (matches.length === 0) {
      setResult(null);
      return;
    }
    const top = matches[0];
    const timer = setTimeout(() => {
      void fetchHotels(top);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, matches, selected, open]);

  async function fetchHotels(city: CityOption) {
    setLoading(true);
    try {
      const res = await fetch(`/api/hotels/search?city=${encodeURIComponent(city.en)}&limit=6`);
      const json = await res.json();
      if (json?.success && Array.isArray(json?.data?.hotels)) {
        setResult({ city, hotels: json.data.hotels as HotelSummary[], total: Number(json.data.total) || json.data.hotels.length });
      } else {
        setResult({ city, hotels: [], total: 0 });
      }
    } catch {
      setResult({ city, hotels: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }

  function selectCity(city: CityOption) {
    setSelected(city);
    setQuery(locale === 'fa' ? city.fa : city.en);
    void fetchHotels(city);
  }

  // بستن با کلیک بیرون، Escape و تغییر مسیر
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function cityLabel(c: CityOption) {
    return locale === 'fa' ? c.fa : c.en;
  }

  function countryLabel(countryId: CountryId) {
    return countryName(countryId, locale);
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(price);
  }

  const BackIcon = locale === 'fa' || locale === 'ar' ? ArrowRight : ArrowLeft;

  const hotelsSection = (city: CityOption, data: CityHotels | null) => (
    <div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-[11px] font-black text-brand-dark flex items-center gap-1.5">
          <HotelIcon size={13} aria-hidden="true" />
          {lt(locale, { fa: `هتل‌های ${cityLabel(city)}`, en: `Hotels in ${city.en}`, ar: `فنادق ${city.fa}`, zh: `${city.en} 的酒店`, ru: `Отели: ${city.en}` })}
        </span>
        {data && (
          <Link
            href={`/hotels/search?city=${encodeURIComponent(city.en)}`}
            onClick={() => setOpen(false)}
            className="text-[11px] font-black text-brand-dark hover:underline whitespace-nowrap"
          >
            {lt(locale, { fa: 'مشاهده همه', en: 'View all', ar: 'عرض الكل', zh: '查看全部', ru: 'Смотреть все' })}
          </Link>
        )}
      </div>
      {loading && !data ? (
        <div className="px-3 py-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-soft animate-pulse" />
          ))}
        </div>
      ) : data && data.hotels.length > 0 ? (
        <ul className="px-2 pb-2 space-y-1">
          {data.hotels.map((h) => (
            <li key={h.id}>
              <Link
                href={`/hotels/search?city=${encodeURIComponent(city.en)}&hotelName=${encodeURIComponent(h.name)}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl hover:bg-soft transition group"
              >
                <div className="min-w-0">
                  <span className="block text-[13px] font-black text-ink truncate group-hover:text-brand-dark transition-colors">
                    {locale === 'fa' ? h.name : h.nameEn || h.name}
                  </span>
                  <span className="flex items-center gap-1 text-[10.5px] font-bold text-sub">
                    {Array.from({ length: h.stars }).map((_, i) => (
                      <Star key={i} size={9} className="text-amber-400 fill-amber-400 shrink-0" aria-hidden="true" />
                    ))}
                    <span className="truncate">{cityLabel(city)}</span>
                  </span>
                </div>
                <span className="text-[11px] font-black text-brand-dark whitespace-nowrap shrink-0">
                  {formatPrice(h.pricePerNight)}
                  <span className="text-sub font-bold"> {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: 'Toman', ru: 'Toman' })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : data ? (
        <p className="px-3 pb-3 text-[11.5px] font-bold text-sub">
          {lt(locale, { fa: 'هتلی برای این شهر یافت نشد', en: 'No hotels found for this city', ar: 'لم يتم العثور على فنادق', zh: '未找到该城市的酒店', ru: 'Отели не найдены' })}
        </p>
      ) : null}
    </div>
  );

  const cityListContent = (
    <>
      {/* سه شهر پرطرفدار */}
      <div className="px-3 pt-3 pb-2">
        <span className="text-[11px] font-black text-brand-dark block mb-2">
          {lt(locale, { fa: 'شهرهای پرطرفدار', en: 'Popular cities', ar: 'مدن پرطرفدار', zh: '热门城市', ru: 'Популярные города' })}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {popularCities.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCity(c)}
              className="h-8 px-3 rounded-full bg-soft hover:bg-mint/40 border border-line text-[12px] font-black text-ink inline-flex items-center gap-1.5 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
            >
              <span aria-hidden="true">{c.flag}</span>
              <span>{cityLabel(c)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* همه کشورها و شهرهای آن‌ها */}
      {matches.length === 0 && (
        <div className="px-3 pt-1 pb-2">
          <span className="text-[11px] font-black text-brand-dark block mb-1">
            {lt(locale, { fa: 'همه کشورها', en: 'All countries', ar: 'جميع الدول', zh: '所有国家', ru: 'Все страны' })}
          </span>
        </div>
      )}
      <div className="overflow-y-auto max-h-[52vh] sm:max-h-[420px] px-2 pb-2">
        {citiesByCountry.map(({ country, cities }) => {
          const visibleCities = matches.length > 0 ? cities.filter((c) => matches.some((m) => m.id === c.id)) : cities;
          if (visibleCities.length === 0) return null;
          return (
            <div key={country.id} className="mb-1.5">
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-black text-sub">
                <span aria-hidden="true">{country.flag}</span>
                <span>{countryLabel(country.id)}</span>
              </div>
              <ul>
                {visibleCities.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => selectCity(c)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-soft transition text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <MapPin size={14} className="text-brand-dark shrink-0" aria-hidden="true" />
                      <span className="text-[13px] font-black text-ink">{cityLabel(c)}</span>
                      <span className="text-[10.5px] font-bold text-sub truncate">{countryLabel(c.countryId)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {matches.length > 0 && (
          <p className="px-2 py-2 text-[11.5px] font-bold text-sub">
            {lt(locale, { fa: 'شهری با این نام یافت نشد', en: 'No city with this name', ar: 'لا توجد مدينة بهذا الاسم', zh: '未找到该城市', ru: 'Город не найден' })}
          </p>
        )}
      </div>
    </>
  );

  const panelContent = selected ? (
    <>
      <button
        type="button"
        onClick={() => {
          setSelected(null);
          setQuery('');
          setResult(null);
          inputRef.current?.focus();
        }}
        className="mx-2 mt-2 h-8 px-2.5 self-start rounded-lg bg-soft hover:bg-mint/40 text-[11.5px] font-black text-ink inline-flex items-center gap-1.5 active:scale-95 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <BackIcon size={13} aria-hidden="true" />
        {lt(locale, { fa: 'همه شهرها', en: 'All cities', ar: 'جميع المدن', zh: '所有城市', ru: 'Все города' })}
      </button>
      {hotelsSection(selected, result)}
    </>
  ) : (
    cityListContent
  );

  const showHotelsInline = !selected && result && matches.length > 0 && query.trim().length >= 2;

  return (
    <div ref={wrapRef} className="relative">
      {/* Desktop trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="hidden md:inline-flex items-center gap-2 h-8 lg:h-9 px-3 lg:px-4 rounded-full bg-white/65 dark:bg-white/[0.07] backdrop-blur-md hover:bg-white/85 dark:hover:bg-white/[0.12] border border-white/50 dark:border-white/10 text-sub hover:text-ink text-xs font-bold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-[0_1px_2px_rgba(5,63,62,0.06)] cursor-pointer"
      >
        <Search size={13} aria-hidden="true" />
        <span className="max-w-[120px] lg:max-w-[160px] truncate">
          {lt(locale, { fa: 'جستجوی شهر و هتل', en: 'Search city & hotels', ar: 'ابحث عن مدينة وفندق', zh: '搜索城市和酒店', ru: 'Поиск города и отеля' })}
        </span>
      </button>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={lt(locale, { fa: 'جستجوی شهر و هتل', en: 'Search city & hotels', ar: 'ابحث عن مدينة وفندق', zh: '搜索城市和酒店', ru: 'Поиск города и отеля' })}
        className="md:hidden w-11 h-11 grid place-items-center rounded-2xl text-ink hover:bg-soft active:scale-95 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer"
      >
        <Search size={19} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={lt(locale, { fa: 'جستجوی شهر و هتل', en: 'Search city & hotels', ar: 'ابحث عن مدينة وفندق', zh: '搜索城市和酒店', ru: 'Поиск города и отеля' })}
          className="absolute end-0 top-11 z-[90] w-[min(92vw,400px)] rounded-2xl bg-surface border border-line shadow-elev-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Input */}
          <div className="flex items-center gap-2 px-3 h-12 border-b border-line bg-soft/40">
            <Search size={15} className="text-sub shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              autoFocus
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected) setSelected(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !selected && matches.length > 0) {
                  selectCity(matches[0]);
                }
              }}
              placeholder={lt(locale, { fa: 'نام شهر را بنویسید…', en: 'Type a city name…', ar: 'اكتب اسم المدينة…', zh: '输入城市名称…', ru: 'Введите название города…' })}
              className="flex-1 min-w-0 bg-transparent text-[13px] font-bold text-ink placeholder:text-sub/70 placeholder:font-bold focus:outline-none"
            />
            {loading && <Loader2 size={14} className="text-brand-dark animate-spin shrink-0" aria-hidden="true" />}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelected(null);
                  setResult(null);
                  inputRef.current?.focus();
                }}
                aria-label={lt(locale, { fa: 'پاک کردن', en: 'Clear', ar: 'مسح', zh: '清除', ru: 'Очистить' })}
                className="min-h-[44px] min-w-[44px] grid place-items-center rounded-lg text-sub hover:text-ink hover:bg-soft transition cursor-pointer shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {panelContent}

          {/* هتل‌های نزدیک‌ترین تطبیق، هنگام تایپ */}
          {showHotelsInline && result && result.city.id === matches[0]?.id && (
            <div className="border-t border-line bg-soft/30">
              {hotelsSection(result.city, result)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
