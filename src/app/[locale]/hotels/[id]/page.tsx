'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { HOTELS } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { Building2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { num } from '@/lib/format';

// Hooks & Mocks
import { useHotelBooking, CHECKIN, NIGHTS, keyOf, toman } from '@/hooks/useHotelBooking';

// Components
import { HotelHero } from '@/components/hotels/detail/HotelHero';
import { HotelOverview, HotelLocation, HotelAmenities, HotelReviews, HotelPolicies } from '@/components/hotels/detail/HotelInfo';
import { HotelRooms } from '@/components/hotels/detail/HotelRooms';
import { BookingPanel } from '@/components/hotels/detail/BookingPanel';

export default function HotelDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('HotelDetail');
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const hotel = HOTELS.find((h) => h.id === params.id);

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

  useEffect(() => {
    const ids = ['overview', 'location', 'rooms', 'amenities', 'reviews', 'policies'];
    const io = new IntersectionObserver(
      (es) => es.forEach((en) => en.isIntersecting && setActiveSec(en.target.id)),
      { rootMargin: '-140px 0px -70% 0px' }
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  if (!hotel) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-24 text-center">
        <Building2 size={52} className="mx-auto text-line mb-4" />
        <h1 className="text-xl font-black mb-2 text-ink">{t('hotelNotFound')}</h1>
        <Link href="/hotels/search" className="text-brand-dark font-extrabold hover:underline">{t('backToResults')}</Link>
      </div>
    );
  }

  function handleBook() {
    setBookingContext({
      type: 'hotels',
      title: hotel!.name,
      subtitle: `${num(capacity.n, locale)} ${t('navRooms')} • ${num(NIGHTS.length, locale)} ${t('nights') || 'شب'}`,
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

      {/* Main Layout */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Main Sections */}
          <div className="space-y-10 min-w-0">
            <HotelOverview hotel={hotel} />
            <HotelLocation hotel={hotel} />
            <HotelRooms booking={booking} onApplyCombo={handleApplyCombo} />
            <HotelAmenities />
            <HotelReviews hotel={hotel} />
            <HotelPolicies checkinDate={CHECKIN} />
          </div>

          {/* Sticky Booking Panel */}
          <div className="hidden lg:block sticky top-32">
            <BookingPanel
              booking={booking}
              onBook={handleBook}
            />
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-95 bg-brand text-surface px-5 py-2.5 rounded-full shadow-elev-3 text-xs font-bold transition-all">
          {toast}
        </div>
      )}
    </div>
  );
}
