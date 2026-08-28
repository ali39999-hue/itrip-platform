'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { HOTELS } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { Check, Building2 } from 'lucide-react';
import { fa } from '@/lib/hotel-format';
import { Link } from '@/i18n/routing';

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
        <h1 className="text-xl font-black mb-2">هتل یافت نشد</h1>
        <Link href="/hotels/search" className="text-brand-dark font-extrabold hover:underline">بازگشت به نتایج</Link>
      </div>
    );
  }

  function handleBook() {
    setBookingContext({
      type: 'hotels',
      title: hotel!.name,
      subtitle: `${capacity.n.toLocaleString('fa-IR')} اتاق • ${NIGHTS.length.toLocaleString('fa-IR')} شب`,
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
    showToast('چیدمان پیشنهادی اعمال شد');
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
  }

  const panelAmount = capacity.n > 0 ? totals.total : 0; // Handled nicely in BookingPanel

  return (
    <div className="bg-paper pb-24">
      <HotelHero hotel={hotel} />

      {/* subnav */}
      <div className="sticky top-16 z-60 mt-4 border-y border-line bg-paper/95 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {([
            ['overview', 'معرفی'], ['location', 'موقعیت'], ['rooms', 'اتاق‌ها و نرخ‌ها'],
            ['amenities', 'امکانات'], ['reviews', 'نظرات'], ['policies', 'قوانین'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
              className={`shrink-0 min-h-12 px-3.5 border-b-[3px] border-transparent bg-transparent text-[13px] font-extrabold whitespace-nowrap transition ${activeSec === id ? 'text-brand-dark border-brand' : 'text-sub hover:text-brand-dark'}`}
            >
              {label}
            </button>
          ))}
          <div className="me-auto hidden lg:flex items-center gap-2.5 ps-3">
            <div className="text-end">
              <b className="text-[15px] font-black">{fa(panelAmount)} لیر</b>
              <small className="block text-[11px] font-bold text-sub">برای {fa(NIGHTS.length)} شب</small>
            </div>
            <button onClick={() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })} className="min-h-9 px-4 rounded-[10px] bg-action hover:bg-action-hover text-[#14201f] text-[12.5px] font-black transition">
              انتخاب اتاق
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_352px] gap-6 items-start py-6">
          <div className="min-w-0 flex flex-col gap-3.5">
            <HotelOverview hotel={hotel} />
            <HotelLocation hotel={hotel} />
            <HotelRooms booking={booking} onApplyCombo={handleApplyCombo} />
            <HotelAmenities />
            <HotelReviews hotel={hotel} />
            <HotelPolicies checkinDate={CHECKIN} />
          </div>

          <BookingPanel booking={booking} onBook={handleBook} />
        </div>
      </div>

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 end-6 z-130 flex items-center gap-2 px-4 py-3 rounded-xl bg-deep text-surface text-[12.5px] font-extrabold shadow-xl">
          <Check size={15} className="text-mint-bright" /> {toast}
        </div>
      )}

      {/* mobile bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-80 border-t border-line bg-surface/95 backdrop-blur shadow-[0_-10px_30px_rgba(5,63,62,.1)]">
        <div className="max-w-[1280px] mx-auto px-4 flex items-center gap-3 py-2.5">
          <div className="text-end">
            <span className="block text-[10.5px] font-bold text-sub">{capacity.n ? `جمع ${fa(capacity.n)} اتاق` : 'شروع از'}</span>
            <b className="text-lg font-black text-price">{fa(panelAmount)} لیر</b>
          </div>
          <button onClick={() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })} className="me-auto min-h-12 px-6 rounded-full bg-action hover:bg-action-hover text-[#14201f] text-[13px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm">
            انتخاب اتاق
          </button>
        </div>
      </div>
    </div>
  );
}
