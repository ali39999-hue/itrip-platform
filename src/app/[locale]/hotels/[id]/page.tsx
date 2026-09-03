'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { useParams, notFound } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { HOTELS } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { num } from '@/lib/format';
import { useHotelBooking, CHECKIN, NIGHTS, keyOf, toman } from '@/hooks/useHotelBooking';
import type { DetailedHotelWithMeta } from '@/services/hotels-service';

// Components
import { HotelHero } from '@/components/hotels/detail/HotelHero';
import { HotelOverview, HotelLocation, HotelAmenities, HotelReviews, HotelPolicies } from '@/components/hotels/detail/HotelInfo';
import { HotelRooms } from '@/components/hotels/detail/HotelRooms';
import { BookingPanel } from '@/components/hotels/detail/BookingPanel';
import { Loader2 } from 'lucide-react';

export default function HotelDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('HotelDetail');
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

  // Fetch live hotel details from API
  useEffect(() => {
    async function loadDetail() {
      if (!params.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/hotels/${params.id}`);
        if (!res.ok) {
          // Fallback to static mock if id matches demo mock
          const staticMatch = HOTELS.find((h) => h.id === params.id);
          if (staticMatch) {
            setHotel({
              ...staticMatch,
              countryId: 'iran',
              galleryImages: [staticMatch.imageQuery || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'],
              detailedRooms: staticMatch.roomTypes,
            });
            return;
          }
          setNotFoundState(true);
          return;
        }
        const json = await res.json();
        if (json.success && json.data) {
          setHotel(json.data);
        } else {
          setNotFoundState(true);
        }
      } catch (e) {
        console.error('Failed to load hotel detail:', e);
        setNotFoundState(true);
      } finally {
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-paper p-10">
        <Loader2 size={36} className="animate-spin text-brand" />
        <span className="text-sm font-bold text-sub">در حال بارگذاری اطلاعات لایو هتل و اتاق‌ها...</span>
      </div>
    );
  }

  function handleBook() {
    const hotelTitle = locale === 'fa' ? hotel!.name : (hotel!.nameEn || hotel!.name);
    setBookingContext({
      type: 'hotels',
      id: hotel!.id,
      title: hotelTitle,
      subtitle: `${num(capacity.n, locale)} ${t('navRooms')} • ${num(NIGHTS.length, locale)} ${t('duration')}`,
      amount: toman(totals.total),
      travelDate: CHECKIN,
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
    <div className="bg-paper pb-24">
      <HotelHero hotel={hotel} />

      {/* subnav */}
      <div className="sticky top-16 z-60 mt-4 border-y border-line/80 bg-paper/95 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {subnavItems.map(([id, label]) => (
            <button
              key={id}
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
              className={`shrink-0 min-h-12 px-3.5 border-b-[3px] border-transparent bg-transparent text-[13px] font-extrabold whitespace-nowrap transition ${activeSec === id ? 'text-brand-dark border-brand' : 'text-sub hover:text-brand-dark'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 md:px-10 mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <HotelOverview hotel={hotel} />
          <HotelLocation hotel={hotel} />
          <HotelRooms booking={booking} onApplyCombo={handleApplyCombo} />
          <HotelAmenities />
          <HotelReviews hotel={hotel} />
          <HotelPolicies checkinDate={CHECKIN} />
        </div>

        {/* sticky booking summary */}
        <div className="lg:sticky lg:top-36">
          <BookingPanel booking={booking} onBook={handleBook} />
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-150 px-5 py-3 rounded-xl bg-ink text-surface text-sm font-extrabold shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
