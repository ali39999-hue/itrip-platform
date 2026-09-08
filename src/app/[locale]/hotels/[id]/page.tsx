'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { useParams, notFound } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { HOTELS } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { num } from '@/lib/format';
import { useHotelBooking, keyOf, toman } from '@/hooks/useHotelBooking';
import type { DetailedHotelWithMeta } from '@/services/hotels-service';

// Components
import { HotelHero } from '@/components/hotels/detail/HotelHero';
import { HotelOverview, HotelLocation, HotelAmenities, HotelReviews, HotelPolicies } from '@/components/hotels/detail/HotelInfo';
import { HotelRooms } from '@/components/hotels/detail/HotelRooms';
import { BookingPanel } from '@/components/hotels/detail/BookingPanel';
import { Loader2 } from 'lucide-react';
import { lt } from '@/lib/lt';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

export default function HotelDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('HotelDetail');
  const { formatAmount } = useDisplayCurrency();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  const [hotel, setHotel] = useState<DetailedHotelWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  const booking = useHotelBooking();
  const { setSel, bestCombo, capacity, totals } = booking;

  const [toast, setToast] = useState('');
  const [activeSec, setActiveSec] = useState('overview');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }

  // Fetch live hotel details from API.
  // Transient failures (network blip, server restart mid-request) are retried
  // before falling back to 404 — a momentary error must not read as "this
  // hotel does not exist".
  useEffect(() => {
    async function loadDetail() {
      if (!params.id) return;
      setLoading(true);
      try {
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const res = await fetch(`/api/hotels/${params.id}`);
            if (res.status === 404) {
              // Definitive answer: this hotel does not exist.
              const staticMatch = HOTELS.find((h) => h.id === params.id);
              if (staticMatch) {
                setHotel({
                  ...staticMatch,
                  countryId: 'iran',
                  galleryImages: staticMatch.galleryImages || [staticMatch.heroImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'],
                  detailedRooms: staticMatch.roomTypes,
                });
                return;
              }
              setNotFoundState(true);
              return;
            }
            if (!res.ok) {
              // 5xx / gateway hiccups: retry before giving up.
              if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, 800 * attempt));
                continue;
              }
              setNotFoundState(true);
              return;
            }
            const json = await res.json();
            if (json.success && json.data) {
              setHotel(json.data);
              return;
            }
            setNotFoundState(true);
            return;
          } catch (e) {
            // Network-level failure: retry, then surface not-found as before.
            console.error(`Failed to load hotel detail (attempt ${attempt}/${maxAttempts}):`, e);
            if (attempt < maxAttempts) {
              await new Promise((r) => setTimeout(r, 800 * attempt));
              continue;
            }
            setNotFoundState(true);
            return;
          }
        }
      } finally {
        // Any exit path (success, 404, or retries exhausted) clears the loader.
        setLoading(false);
      }
    }

    loadDetail();
  }, [params.id]);

  useEffect(() => {
    const ids = ['overview', 'location', 'rooms', 'amenities', 'reviews', 'policies'];
    const io = new IntersectionObserver(
      (es) => es.forEach((en) => en.isIntersecting && setActiveSec(en.target.id)),
      { rootMargin: '-140px 0px -70% 0px' }
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  if (notFoundState) {
    notFound();
  }

  if (loading || !hotel) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-paper p-10" role="status" aria-live="polite">
        <Loader2 size={36} className="animate-spin text-brand" aria-hidden="true" />
        <span className="text-sm font-bold text-sub">
          {lt(locale, {
            fa: 'در حال بارگذاری اطلاعات لایو هتل و اتاق‌ها...',
            en: 'Loading live hotel and room details...',
            ar: 'جاري تحميل تفاصيل الفندق والغرف...',
            zh: '正在加载酒店和房型详情...',
            ru: 'Загрузка информации об отеле и номерах...',
          })}
        </span>
      </div>
    );
  }

  function handleBook() {
    const hotelTitle = locale === 'fa' ? hotel!.name : (hotel!.nameEn || hotel!.name);
    setBookingContext({
      type: 'hotels',
      id: hotel!.id,
      title: hotelTitle,
      subtitle: `${num(capacity.n, locale)} ${t('navRooms')} • ${num(booking.nights.length, locale)} ${t('duration')} • ${t('passengersSummary', { adults: booking.adults, children: booking.children })}`,
      amount: toman(totals.total),
      travelDate: booking.checkin,
    });
    router.push('/checkout');
  }

  function handleApplyCombo() {
    if (!bestCombo) return;
    const next: Record<string, number> = {};
    bestCombo.pick.forEach((o) => { next[keyOf(o.r.id, o.p)] = (next[keyOf(o.r.id, o.p)] || 0) + 1; });
    setSel(next);
    showToast(t('comboAppliedToast'));
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
  }

  const subnavItems = [
    ['overview', t('navOverview')],
    ['location', t('navLocation')],
    ['rooms', t('navRooms')],
    ['amenities', t('navAmenities')],
    ['reviews', t('navReviews')],
    ['policies', t('navPolicies')],
  ] as const;

  return (
    <div className="bg-paper pb-36 sm:pb-32 lg:pb-24">
      <HotelHero hotel={hotel} />

      {/* subnav */}
      <nav
        aria-label="Hotel sections navigation"
        className="sticky top-16 z-[60] mt-4 border-y border-line/80 bg-paper/95 backdrop-blur-xl"
      >
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {subnavItems.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
              className={`shrink-0 min-h-12 px-3.5 border-b-[3px] border-transparent bg-transparent text-[13px] font-extrabold whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${activeSec === id ? 'text-brand-dark border-brand' : 'text-sub hover:text-brand-dark'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-[1280px] mx-auto px-4 md:px-10 mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <HotelOverview hotel={hotel} />
          <HotelLocation hotel={hotel} />
          <HotelRooms booking={booking} onApplyCombo={handleApplyCombo} />
          <HotelAmenities />
          <HotelReviews hotel={hotel} />
          <HotelPolicies checkinDate={booking.checkin} />
        </div>

        {/* sticky booking summary */}
        <div className="lg:sticky lg:top-36">
          <BookingPanel booking={booking} onBook={handleBook} />
        </div>
      </div>

      {/* ================= MOBILE STICKY RESERVATION BAR (FLYTODAY / BOOKING.COM STYLE) ================= */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-[86] bg-surface/98 backdrop-blur-xl border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-4">
        <div>
          <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
            {capacity.n > 0
              ? `${num(capacity.n, locale)} ${t('navRooms')} • ${num(booking.nights.length, locale)} ${t('duration')}`
              : lt(locale, { fa: 'شروع نرخ هر شب', en: 'Starting per night', ar: 'السعر للّيلة', zh: '每晚起', ru: 'За ночь от' })}
          </span>
          <div className="text-base font-black text-brand-dark font-mono flex items-baseline gap-1">
            {/* totals.total is in foreign units (needs toman conversion);
                hotel.pricePerNight from the API is already in Toman. */}
            <span>{formatAmount(capacity.n > 0 ? toman(totals.total) : (hotel?.pricePerNight ?? 0))}</span>
          </div>
        </div>

        {capacity.n > 0 ? (
          <button
            type="button"
            onClick={handleBook}
            className="h-11 px-6 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs sm:text-sm flex items-center justify-center transition active:scale-95 shadow-md shadow-action/25"
          >
            {t('continuePay')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })}
            className="h-11 px-5 rounded-xl bg-brand hover:bg-brand-dark text-surface font-black text-xs sm:text-sm flex items-center justify-center transition active:scale-95 shadow-sm"
          >
            {lt(locale, { fa: 'انتخاب اتاق', en: 'Select Room', ar: 'اختر الغرفة', zh: '选择房型', ru: 'Выбрать номер' })}
          </button>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-[150] px-5 py-3 rounded-xl bg-ink text-surface text-sm font-extrabold shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
