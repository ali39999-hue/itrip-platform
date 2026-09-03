'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { useParams, notFound } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { HOTELS } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
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
    notFound();
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

      {/* Mobile Sticky Booking Bar */}
      <div className="lg:hidden fixed bottom-[62px] md:bottom-0 inset-x-0 z-70 bg-surface/95 backdrop-blur-xl border-t border-line shadow-elev-3 px-4 py-3">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            {totals.total > 0 ? (
              <>
                <div className="text-[11px] font-bold text-sub">
                  {num(capacity.n, locale)} {t('navRooms')} • {num(NIGHTS.length, locale)} {t('duration')}
                </div>
                <div className="text-base sm:text-lg font-black text-price font-mono leading-tight">
                  {num(totals.total, locale)} <span className="text-[11px] font-bold text-sub">TRY</span>
                </div>
              </>
            ) : (
              <div>
                <span className="text-xs font-bold text-sub block">
                  {t('selectRoom')}
                </span>
                <span className="text-[11px] text-brand-dark font-extrabold">
                  {t('ratesIncludeTax')}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (totals.total > 0) {
                handleBook();
              } else {
                document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="shrink-0 min-h-[44px] px-6 rounded-xl bg-action hover:bg-action-hover text-ink text-xs sm:text-sm font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {totals.total > 0
              ? lt(locale, { fa: 'ادامه به پرداخت', en: 'Continue to Payment', ar: 'المتابعة إلى الدفع', zh: '前往支付', ru: 'Перейти к оплате' })
              : t('selectRoom')}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 md:bottom-16 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-95 bg-brand text-surface px-5 py-2.5 rounded-full shadow-elev-3 text-xs font-bold transition-all">
          {toast}
        </div>
      )}
    </div>
  );
}
