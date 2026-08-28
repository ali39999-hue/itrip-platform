'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { HOTELS } from '@/lib/data';
import type { Hotel } from '@/lib/types';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES } from '@/lib/countries';
import { CrossSellBundle } from '@/components/shared/CrossSellBundle';
import {
  Star, MapPin, Heart, Users, Wifi, Coffee, Waves, CircleCheck, Flame, X, SearchX,
  ArrowDownUp, Map as MapIcon, Search, SlidersHorizontal, Check,
} from 'lucide-react';

const NIGHTS = 4;

/* placeholder images — باید با عکس واقعی/لایسنس‌دار جایگزین شوند (work/stitch-mockup-notes.md) */
const HOTEL_IMGS: Record<string, string> = {
  h1: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=800',
  h2: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=70&w=800',
  h3: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=70&w=800',
  h4: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=70&w=800',
};

const AM_FA: Record<string, string> = {
  wifi: 'وای‌فای رایگان', pool: 'استخر', spa: 'اسپا', restaurant: 'رستوران', parking: 'پارکینگ',
  shuttle: 'ترانسفر فرودگاهی', garden: 'باغ', museum: 'موزه', teahouse: 'چایخانه سنتی',
  gym: 'باشگاه', beach_access: 'ساحل خصوصی', breakfast: 'صبحانه رایگان', terrace: 'تراس', bar: 'کافی‌شاپ',
};

const AM_ICON: Record<string, typeof Wifi> = {
  breakfast: Coffee, wifi: Wifi, pool: Waves,
};

type SortKey = 'rec' | 'cheap' | 'score' | 'stars';

const MapPane = dynamic(() => import('@/components/hotels/MapPane'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-[linear-gradient(135deg,#e4f6f5_25%,#f4f8f8_45%,#e4f6f5_65%)] bg-[length:220%_100%]" />
  ),
});
export default function HotelSearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const cityParam = params.get('city') || '';
  const { country } = useCountryStore();
  const c = COUNTRIES[country];

  const [query, setQuery] = useState(cityParam);
  const [sort, setSort] = useState<SortKey>('rec');
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(6);
  const [favs, setFavs] = useState<Set<number>>(new Set());
  const [cmp, setCmp] = useState<Set<number>>(new Set());

  const [maxPrice, setMaxPrice] = useState(160);
  const [showMap, setShowMap] = useState(false);
  const [stars, setStars] = useState<Set<number>>(new Set());
  const [minScore, setMinScore] = useState(0);
  const [freeCancel, setFreeCancel] = useState(false);
  const [sheet, setSheet] = useState(false);

  function rerun(fn: () => void) {
    fn();
    setShown(6);
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }

  const results = useMemo(() => {
    let list = HOTELS.filter((h) => {
      if (cityParam && !(h.city.includes(cityParam) || h.cityEn.toLowerCase().includes(cityParam.toLowerCase()))) return false;
      if (h.pricePerNight / 1000000 > maxPrice + 0.001 && maxPrice < 160) return false;
      if (stars.size && !stars.has(h.stars)) return false;
      if (minScore && h.rating < minScore) return false;
      if (freeCancel && !h.freeCancellation) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      sort === 'cheap' ? a.pricePerNight - b.pricePerNight
      : sort === 'score' ? b.rating - a.rating
      : sort === 'stars' ? b.stars - a.stars || b.rating - a.rating
      : b.rating * 100 - a.rating * 100
    );
    return list;
  }, [cityParam, maxPrice, stars, minScore, freeCancel, sort]);

  const priceBuckets = useMemo(() => {
    const buckets = new Array(14).fill(0);
    HOTELS.forEach((h) => {
      const i = Math.min(13, Math.floor((h.pricePerNight / 1000000 / 170) * 14));
      buckets[i]++;
    });
    const mx = Math.max(...buckets, 1);
    return buckets.map((b) => Math.max(12, (b / mx) * 100));
  }, []);

  const chips = useMemo(() => {
    const out: { key: string; label: string; clear: () => void }[] = [];
    if (maxPrice < 160) out.push({ key: 'price', label: `تا ${maxPrice.toLocaleString('fa-IR')} میلیون`, clear: () => setMaxPrice(160) });
    stars.forEach((s) => out.push({ key: `star-${s}`, label: `${s.toLocaleString('fa-IR')} ستاره`, clear: () => { const n = new Set(stars); n.delete(s); setStars(n); } }));
    if (minScore) out.push({ key: 'score', label: `امتیاز ${minScore.toLocaleString('fa-IR')}+`, clear: () => setMinScore(0) });
    if (freeCancel) out.push({ key: 'cancel', label: 'کنسلی رایگان', clear: () => setFreeCancel(false) });
    return out;
  }, [maxPrice, stars, minScore, freeCancel]);

  const activeFilters = chips.length;

  function resetAll() {
    setMaxPrice(160); setStars(new Set()); setMinScore(0); setFreeCancel(false); setShown(6);
  }

  function toggleCmp(id: number) {
    setCmp((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else if (n.size < 3) n.add(id);
      return n;
    });
  }

  const filtersBody = (
    <>
      {/* Price per night */}
      <div className="py-3.5 border-b border-line">
        <h3 className="m-0 mb-2.5 text-[12.5px] font-black flex items-center justify-between">
          محدوده قیمت (هر شب) <span className="text-[10.5px] font-bold text-sub">تومان</span>
        </h3>
        <div className="flex items-end gap-0.5 h-[34px] mb-1" dir="ltr">
          {priceBuckets.map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-t-sm transition-colors ${i / 14 <= maxPrice / 160 ? 'bg-mint-bright' : 'bg-line'}`} />
          ))}
        </div>
        <input
          type="range"
          min={20}
          max={160}
          step={10}
          value={maxPrice}
          onChange={(e) => { setMaxPrice(+e.target.value); setShown(6); }}
          className="w-full accent-brand"
          dir="ltr"
        />
        <div className="flex justify-between text-[11.5px] font-extrabold text-sub" dir="ltr">
          <span>۲۰م</span>
          <span className="text-brand-dark">{maxPrice >= 160 ? 'بدون سقف' : `تا ${maxPrice.toLocaleString('fa-IR')}م`}</span>
        </div>
      </div>

      {/* Stars */}
      <div className="py-3.5 border-b border-line">
        <h3 className="mb-2.5 text-[12.5px] font-black">ستاره اقامتگاه</h3>
        {[5, 4].map((s) => (
          <label key={s} className="flex items-center gap-2.5 py-1 text-[12.5px] font-bold cursor-pointer group">
            <span className={`w-5 h-5 rounded-md grid place-items-center border transition-colors ${stars.has(s) ? 'bg-brand border-brand' : 'border-line group-hover:border-brand'}`}>
              {stars.has(s) && <Check size={12} className="text-surface" strokeWidth={3} />}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={stars.has(s)}
              onChange={() => rerun(() => { const n = new Set(stars); if (n.has(s)) n.delete(s); else n.add(s); setStars(n); })}
            />
            <span className="inline-flex gap-px">
              {Array.from({ length: s }).map((_, i) => <Star key={i} size={12} className="fill-gold text-gold" />)}
            </span>
            <span className="me-auto text-[11px] font-bold text-sub">
              {HOTELS.filter((h) => h.stars === s).length.toLocaleString('fa-IR')}
            </span>
          </label>
        ))}
      </div>

      {/* Guest score */}
      <div className="py-3.5 border-b border-line">
        <h3 className="mb-2.5 text-[12.5px] font-black">امتیاز مهمانان</h3>
        {[9, 8, 0].map((v) => (
          <label key={v} className="flex items-center gap-2.5 py-1 text-[12.5px] font-bold cursor-pointer">
            <input type="radio" name="score" checked={minScore === v} onChange={() => rerun(() => setMinScore(v))} className="accent-brand w-[17px] h-[17px]" />
            {v === 9 ? 'فوق‌العاده — ۹ به بالا' : v === 8 ? 'خیلی خوب — ۸ به بالا' : 'همه امتیازها'}
          </label>
        ))}
      </div>

      {/* Free cancellation */}
      <div className="pt-3.5">
        <label className="flex items-center gap-2.5 py-1 text-[12.5px] font-bold cursor-pointer">
          <input type="checkbox" checked={freeCancel} onChange={() => rerun(() => setFreeCancel(!freeCancel))} className="accent-brand w-[17px] h-[17px]" />
          کنسلی رایگان
          <span className="me-auto text-[11px] font-bold text-sub">
            {HOTELS.filter((h) => h.freeCancellation).length.toLocaleString('fa-IR')}
          </span>
        </label>
      </div>
    </>
  );
  return (
    <div className="bg-paper min-h-screen pb-24">
      {/* Search bar */}
      <div className="border-b border-line glass-bar shadow-[0_8px_22px_rgba(5,63,62,.05)]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-2 py-3 flex-wrap">
          <form
            className="flex items-center gap-2.5 flex-[1_1_100%] md:flex-[2_1_0%] min-w-0 min-h-[52px] px-3 border border-line rounded-xl bg-surface focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/10"
            onSubmit={(e) => { e.preventDefault(); router.push(`/hotels/search?city=${encodeURIComponent(query)}`); }}
          >
            <MapPin size={19} className="text-brand-dark shrink-0" />
            <div className="min-w-0 w-full">
              <label className="block text-[10px] font-extrabold text-sub">مقصد</label>
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full border-0 outline-0 text-[13px] font-extrabold text-ink p-0" />
            </div>
          </form>
          <div className="flex items-center gap-2.5 flex-1 min-h-[52px] px-3 border border-line rounded-xl bg-surface">
            <Star size={18} className="text-brand-dark shrink-0" />
            <div className="w-full">
              <label className="block text-[10px] font-extrabold text-sub">ورود</label>
              <input type="date" defaultValue="2026-09-22" dir="ltr" className="w-full border-0 outline-0 text-[13px] font-extrabold p-0 bg-transparent" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-1 min-h-[52px] px-3 border border-line rounded-xl bg-surface">
            <Users size={18} className="text-brand-dark shrink-0" />
            <div className="w-full">
              <label className="block text-[10px] font-extrabold text-sub">۲ اتاق · ۳ مسافر</label>
              <span className="text-[13px] font-extrabold">ویرایش</span>
            </div>
          </div>
          <button
            onClick={() => rerun(() => {})}
            className="flex-1 md:flex-none min-h-[52px] px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-[13px] transition"
          >
            <Search size={18} /> جستجوی دوباره
          </button>
        </div>
      </div>

      {/* Country context strip */}
      <div className="border-b border-line bg-gradient-to-b from-deep to-[#04302f] text-[#cfe8e5]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-2.5 flex-wrap py-2.5 text-[11.5px] font-bold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface/15 bg-surface/5">
            کشور مقصد: <b className="text-mint-bright">{c.flag} {c.nameFa}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface/15 bg-surface/5">
            ارز تسویه: <b className="text-mint-bright" dir="ltr">{c.currency}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface/15 bg-surface/5">
            درگاه پرداخت: <b className="text-mint-bright">{c.gateway}</b>
          </span>
          <span className="me-auto hidden md:inline-flex items-center gap-1 text-mint-bright font-extrabold cursor-pointer">
            شرایط پرداخت و لغو این کشور ←
          </span>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        {/* Result header (mockup itrip_page_3) */}
        <div className="pt-6 flex justify-between items-end gap-4 mb-5">
          <h1 className="m-0 text-[26px] md:text-[32px] leading-tight font-black text-brand-dark tracking-tight">
            هتل‌های {query || 'همه مقاصد'}
          </h1>
          <span className="text-[13px] font-bold text-sub whitespace-nowrap pb-1">
            {results.length.toLocaleString('fa-IR')} اقامتگاه یافت شد
          </span>
        </div>
        {/* Toolbar */}
        <div className="sticky top-[128px] z-40 flex items-center gap-2 my-3.5 p-2 border border-line rounded-[14px] bg-surface/95 backdrop-blur overflow-x-auto scrollbar-none">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-1 text-[11.5px] font-extrabold text-sub shrink-0">
            <ArrowDownUp size={14} /> مرتب‌سازی
          </span>
          {([
            ['rec', 'پیشنهاد iTrip'],
            ['cheap', 'ارزان‌ترین'],
            ['score', 'بالاترین امتیاز'],
            ['stars', 'ستاره بیشتر'],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => rerun(() => setSort(k))}
              className={`shrink-0 min-h-[34px] px-3 rounded-full border text-[12px] font-extrabold whitespace-nowrap transition ${
                sort === k ? 'border-brand text-surface bg-brand' : 'border-line text-sub bg-surface hover:border-mint-bright'
              }`}
            >
              {l}
            </button>
          ))}
          <button
            onClick={() => setShowMap((v) => !v)}
            aria-pressed={showMap}
            className={`me-auto shrink-0 min-h-[34px] px-3.5 inline-flex items-center gap-1.5 rounded-full border text-[12px] font-extrabold whitespace-nowrap transition ${
              showMap ? 'border-brand text-surface bg-brand' : 'border-line text-sub bg-surface hover:border-mint-bright'
            }`}
          >
            <MapIcon size={14} /> {showMap ? 'پنهان کردن نقشه' : 'نمایش نقشه'}
          </button>
          <button
            onClick={() => setSheet(true)}
            className="lg:hidden shrink-0 min-h-[34px] px-3.5 inline-flex items-center gap-1.5 rounded-full border border-line text-sub bg-surface text-[12px] font-extrabold"
          >
            <SlidersHorizontal size={14} /> فیلترها
            {activeFilters > 0 && (
              <span className="w-5 h-5 grid place-items-center rounded-full bg-brand text-surface text-[10px]">
                {activeFilters.toLocaleString('fa-IR')}
              </span>
            )}
          </button>
        </div>
        <div className={`grid grid-cols-1 gap-5 items-start pb-16 ${showMap ? 'xl:grid-cols-[288px_minmax(0,1fr)_minmax(320px,392px)]' : 'lg:grid-cols-[288px_1fr]'}`}>
          {/* Filters — desktop */}
          <aside className="sticky top-[180px] hidden lg:block max-h-[calc(100vh-200px)] overflow-y-auto p-4 border border-line rounded-2xl bg-surface shadow-elev-1">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="text-sm font-black">فیلترها</h2>
              <button onClick={resetAll} className="text-[11.5px] font-extrabold text-brand-dark bg-transparent border-0 hover:underline">پاک کردن همه</button>
            </div>
            {filtersBody}
          </aside>
          {/* Results */}
          <section className="min-w-0">
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3.5">
                {chips.map((ch) => (
                  <span key={ch.key} className="inline-flex items-center gap-1.5 min-h-[31px] ps-2.5 pe-1.5 border border-mint-bright rounded-full text-brand-dark bg-mint text-[11.5px] font-extrabold">
                    {ch.label}
                    <button onClick={ch.clear} className="grid place-items-center w-[19px] h-[19px] rounded-full bg-brand/10 hover:bg-brand/20"><X size={12} /></button>
                  </span>
                ))}
                <button onClick={resetAll} className="inline-flex items-center min-h-[31px] px-2.5 border border-mint-bright rounded-full text-brand-dark bg-mint text-[11.5px] font-extrabold cursor-pointer">
                  پاک کردن همه
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3.5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] border border-line rounded-2xl bg-surface overflow-hidden animate-pulse">
                    <div className="sm:min-h-[190px] h-32 bg-gradient-to-r from-soft via-mint to-soft bg-[length:220%_100%]" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 w-1/2 rounded bg-soft animate-pulse" />
                      <div className="h-3 w-1/3 rounded bg-soft animate-pulse" />
                      <div className="h-3 w-2/3 rounded bg-soft animate-pulse" />
                    </div>
                  </div>
                ))
              ) : results.length === 0 ? (
                <div className="p-11 border border-dashed border-mint-bright rounded-2xl bg-mint/30 text-center">
                  <SearchX size={44} className="mx-auto mb-3 text-mint-bright" />
                  <h3 className="mb-1.5 text-[17px] font-black">با این فیلترها اقامتگاهی نمانده است</h3>
                  <p className="mb-4 text-[13px] text-sub">محدوده قیمت یا شرایط رزرو را کمی بازتر کنید.</p>
                  <button onClick={resetAll} className="min-h-[42px] px-5 rounded-xl bg-brand text-surface font-extrabold text-[13px]">پاک کردن فیلترها</button>
                </div>
              ) : (
                <>
                  {results.slice(0, shown).map((hotel) => (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      fav={favs.has(Number(hotel.id.replace(/\D/g, '') || 0))}
                      onFav={() => setFavs((p) => { const n = new Set(p); const k = Number(hotel.id.replace(/\D/g, '')); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                      cmpChecked={cmp.has(Number(hotel.id.replace(/\D/g, '')))}
                      onCmp={() => toggleCmp(Number(hotel.id.replace(/\D/g, '')))}
                    />
                  ))}
                  {results.length > shown && (
                    <button onClick={() => setShown(shown + 6)} className="mt-1.5 min-h-[46px] border border-brand/40 rounded-full bg-surface text-brand-dark font-black text-[13px] hover:bg-mint transition">
                      نمایش {(Math.min(6, results.length - shown)).toLocaleString('fa-IR')} اقامتگاه بیشتر
                    </button>
                  )}
                  <div className="flex items-start gap-2 mt-4 p-3 border border-mint-bright rounded-xl text-brand-dark bg-mint/40 text-[11.5px] font-semibold leading-7">
                    <CircleCheck size={16} className="text-success mt-0.5 shrink-0" />
                    <span>قیمت‌ها برای <b>۴ شب و ۲ اتاق</b> و شامل مالیات محلی است.</span>
                  </div>
                  
                  <div className="mt-4">
                    <CrossSellBundle currentService="stays" destination={cityParam} />
                  </div>
                </>
              )}
            </div>
          </section>
          {/* Map pane */}
          {showMap && (
            <aside className="relative isolate flex flex-col xl:sticky xl:top-[180px] h-[440px] xl:h-auto xl:max-h-[calc(100vh-200px)] border border-line rounded-2xl bg-surface shadow-elev-1 overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-line" dir="rtl">
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-black">
                  <MapIcon size={14} className="text-brand-dark" /> نقشه اقامتگاه‌ها
                </span>
                <span className="text-[11px] font-extrabold text-sub">{results.length.toLocaleString('fa-IR')} پین</span>
              </div>
              {results.length === 0 ? (
                <div className="flex-1 grid place-items-center p-6 text-center text-sub text-[13px] font-bold" dir="rtl">
                  با این فیلترها پینی برای نمایش روی نقشه نیست
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <MapPane hotels={results} />
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* Compare bar */}
      {cmp.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-90 border-t border-line bg-surface/95 backdrop-blur shadow-[0_-10px_30px_rgba(5,63,62,.1)]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-2.5 py-3">
            <span className="text-[12.5px] font-extrabold shrink-0">مقایسه</span>
            <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
              {[...cmp].map((id) => {
                const h = HOTELS.find((x) => Number(x.id.replace(/\D/g, '')) === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 ps-2.5 pe-1 border border-line rounded-full bg-surface text-[11.5px] font-bold max-w-[210px] truncate">
                    {h?.name.slice(0, 18)}
                    <button onClick={() => toggleCmp(id)} className="grid place-items-center w-[18px] h-[18px] rounded-full bg-soft text-sub"><X size={11} /></button>
                  </span>
                );
              })}
            </div>
            <button
              disabled={cmp.size < 2}
              onClick={() => alert('صفحه بعد: مقایسه اقامتگاه‌های انتخاب‌شده')}
              className="min-h-[40px] px-4 rounded-xl bg-brand disabled:opacity-45 text-surface font-black text-[13px]"
            >
              {cmp.size < 2 ? 'حداقل ۲ مورد' : `مقایسه ${cmp.size.toLocaleString('fa-IR')} اقامتگاه`}
            </button>
          </div>
        </div>
      )}

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
            <div className="flex items-center justify-between mb-2">
              <b className="text-[15px] font-black">فیلترها</b>
              <div className="flex items-center gap-2">
                <button onClick={resetAll} className="text-[12px] text-brand-dark font-bold">پاک کردن همه</button>
                <button onClick={() => setSheet(false)} aria-label="بستن" className="grid place-items-center w-8 h-8 rounded-full bg-soft text-sub">
                  <X size={15} />
                </button>
              </div>
            </div>
            {filtersBody}
            <button onClick={() => setSheet(false)} className="w-full mt-4 min-h-12 rounded-full bg-brand hover:bg-brand-2 text-surface font-black text-sm">
              نمایش {results.length.toLocaleString('fa-IR')} اقامتگاه
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HotelCard({
  hotel, fav, onFav, cmpChecked, onCmp,
}: {
  hotel: Hotel;
  fav: boolean;
  onFav: () => void;
  cmpChecked: boolean;
  onCmp: () => void;
}) {
  const total = hotel.pricePerNight * NIGHTS;
  const img = HOTEL_IMGS[hotel.id];

  return (
    <article className="group grid grid-cols-1 sm:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr] border border-line rounded-2xl bg-surface overflow-hidden shadow-elev-1 hover:shadow-elev-2 hover:border-mint-bright transition-all">
      {/* Image (mockup: 1/3) */}
      <div className="relative min-h-[180px] sm:min-h-[220px] bg-brand-dark ph-texture">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={hotel.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <button
          onClick={onFav}
          aria-label="افزودن به علاقه‌مندی"
          className="absolute top-2.5 w-[33px] h-[33px] grid place-items-center rounded-full bg-surface/90 shadow-md"
          style={{ insetInlineEnd: 10 }}
        >
          <Heart size={16} className={fav ? 'fill-rose-warm text-rose-warm' : 'text-sub'} />
        </button>
        {hotel.freeCancellation && (
          <span className="absolute bottom-2.5 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-surface text-[10.5px] font-extrabold" style={{ insetInlineStart: 10 }}>
            کنسلی رایگان
          </span>
        )}
      </div>

      {/* Info (mockup: 2/3) */}
      <div className="p-4 md:p-5 flex flex-col min-w-0">
        <div className="flex justify-between items-start gap-3 mb-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="m-0 text-[17px] md:text-lg font-black tracking-tight group-hover:text-brand-dark transition-colors">{hotel.name}</h3>
              <span className="inline-flex gap-px">
                {Array.from({ length: hotel.stars }).map((_, i) => <Star key={i} size={12} className="fill-gold text-gold" />)}
              </span>
            </div>
            <p className="m-0 mt-1 flex items-center gap-1 text-[12.5px] text-sub font-semibold">
              <MapPin size={13} className="text-brand-dark shrink-0" />
              {hotel.city} — {hotel.distanceFromCenter}
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand text-surface text-[12.5px] font-black">
            {hotel.rating.toLocaleString('fa-IR')}
            <Star size={12} className="fill-current" />
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {hotel.amenities.slice(0, 4).map((a) => {
            const Icon = AM_ICON[a];
            return (
              <span key={a} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-soft text-[11px] font-bold text-sub">
                {Icon ? <Icon size={12} className="text-brand-dark" /> : null}
                {AM_FA[a] || a}
              </span>
            );
          })}
        </div>

        {hotel.roomTypes.some((r) => r.available <= 3) && (
          <div className="flex items-center gap-1.5 mt-2.5 text-rose-warm text-[11.5px] font-extrabold">
            <Flame size={13} />
            اتاق‌های محدود برای این تاریخ باقی مانده است
          </div>
        )}

        {/* Price + CTA row */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line mt-4 pt-3.5 mt-auto">
          <div className="flex flex-col">
            <span className="text-[11.5px] text-sub">قیمت برای هر شب از</span>
            <span className="text-xl md:text-[22px] font-black text-price num leading-snug">
              {(hotel.pricePerNight / 1000000).toLocaleString('fa-IR')} میلیون
              <span className="text-[11.5px] font-normal text-sub"> تومان</span>
            </span>
            <span className="text-[11px] font-bold text-sub">
              جمع {NIGHTS.toLocaleString('fa-IR')} شب ≈ {(total / 1000000).toLocaleString('fa-IR')} میلیون ت
            </span>
            <span className="text-[10px] font-semibold text-brand-dark opacity-80 mt-1 max-w-[240px]">
              مبلغ تومانی تقریبی است؛ مبلغ نهایی در پرداخت با نرخ لحظه‌ای قطعی می‌شود.
            </span>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href={`/hotels/${hotel.id}`}
              className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg bg-action hover:bg-action-hover active:bg-action-active text-[#14201f] text-[13px] font-black transition px-5"
            >
              مشاهده و رزرو
            </Link>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-sub cursor-pointer select-none">
              <input type="checkbox" checked={cmpChecked} onChange={onCmp} className="accent-brand w-[15px] h-[15px]" />
              مقایسه
            </label>
          </div>
        </div>
      </div>
    </article>
  );
}
