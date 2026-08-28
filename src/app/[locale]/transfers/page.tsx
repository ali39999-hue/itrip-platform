'use client';

import { useMemo, useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { TRANSFERS } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { daysFromNow } from '@/lib/utils';
import { CarFront, Users, Luggage, Clock, Search, Crown, PlaneTakeoff, MapPin, CalendarDays, TrainFront, BusFront, Star } from 'lucide-react';

/* placeholder تصاویر — باید با عکس واقعی ناوگان جایگزین شود (work/stitch-mockup-notes.md)
   همه URLها HEAD-تست شده و موضوعشان بازبینی بصری شده (200) */
const TRANSFER_IMGS: Record<string, string> = {
  tr1: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=70&w=800',
  tr2: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=70&w=800',
  tr3: 'https://images.unsplash.com/photo-1570733577524-3a047079e80d?auto=format&fit=crop&q=70&w=800',
};

type CarCat = 'eco' | 'vip' | 'van';
const CATS: { id: CarCat; label: string }[] = [
  { id: 'eco', label: 'اقتصادی' },
  { id: 'vip', label: 'تشریفات (VIP)' },
  { id: 'van', label: 'ون و مینی‌بوس' },
];
const catOf = (t: (typeof TRANSFERS)[number]): CarCat =>
  t.vehicleType.includes('VIP') ? 'vip' : t.vehicleType.includes('ون') || t.vehicleType.includes('هایس') ? 'van' : 'eco';

export default function TransfersPage() {
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  const froms = useMemo(() => [...new Set(TRANSFERS.map((t) => t.from))], []);
  const tos = useMemo(() => [...new Set(TRANSFERS.map((t) => t.to))], []);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [searched, setSearched] = useState(false);
  const [types, setTypes] = useState<CarCat[]>([]);

  function toggleType(c: CarCat) {
    setTypes((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  const results = useMemo(
    () =>
      (searched ? TRANSFERS.filter((t) => (!from || t.from === from) && (!to || t.to === to)) : TRANSFERS).filter(
        (t) => types.length === 0 || types.includes(catOf(t))
      ),
    [searched, from, to, types]
  );

  function reserve(t: (typeof TRANSFERS)[number]) {
    setBookingContext({
      type: 'transfers',
      title: `${t.from} → ${t.to}`,
      subtitle: t.vehicleType,
      amount: t.price,
      travelDate: date || daysFromNow(2),
    });
    router.push('/checkout');
  }

  return (
    <>
      {/* Hero + Floating Search (mockup firuzo_page_7) */}
      <section className="relative w-full h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden img-overlay-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_d9jKBCNZP6iWYCGorautpDaOVGldWhorlt_tFwO1Ppagj51wxkdBfJZOj2x1VdTfMJJ9372c6WMxadYN0CLiiBT8wZMbn4BIJFLAnLHh5SleHOsUMs6QYFadIPhVkmTOx82CTC7yuHDesGcWCLrr0Fv7ACGhIJhcu0MhpUXDyM1ESfw7bCuGUkvFlS3wEgLm8kYrWw0PkXN3Zo-Lt_yRXJOwkyzauzo62tY8E_eqYiBJgbEjs6tV"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-deep/40" />
        <div className="relative z-10 w-full max-w-4xl px-4 md:px-0 mt-8">
          <div className="glass-panel shadow-sm rounded-xl p-5 md:p-6 flex flex-col gap-6">
            
            <div className="flex gap-6 border-b border-line/50 pb-2 overflow-x-auto scrollbar-none">
              <span className="text-brand-dark font-black text-[14px] border-b-2 border-brand pb-3 flex items-center gap-2 whitespace-nowrap">
                <CarFront size={18} /> ترانسفر فرودگاهی
              </span>
              <Link href="/trains" className="text-sub hover:text-brand-dark font-black text-[14px] pb-3 flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <TrainFront size={18} /> قطار
              </Link>
              <Link href="/trains" className="text-sub hover:text-brand-dark font-black text-[14px] pb-3 flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <BusFront size={18} /> اتوبوس
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <PlaneTakeoff size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
                <Select value={from || undefined} onValueChange={(v) => setFrom(v ?? '')}>
                  <SelectTrigger aria-label="فرودگاه مبدا" className="h-12 w-full rounded-lg border-line bg-surface ps-10 focus:ring-brand focus:border-brand focus-visible:ring-brand font-bold text-[14px]">
                    <SelectValue placeholder="فرودگاه مبدا" />
                  </SelectTrigger>
                  <SelectContent>
                    {froms.map((f) => (
                      <SelectItem key={f} value={f} className="text-sm font-bold">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <MapPin size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
                <Select value={to || undefined} onValueChange={(v) => setTo(v ?? '')}>
                  <SelectTrigger aria-label="مقصد (هتل یا آدرس)" className="h-12 w-full rounded-lg border-line bg-surface ps-10 focus:ring-brand focus:border-brand focus-visible:ring-brand font-bold text-[14px]">
                    <SelectValue placeholder="مقصد (هتل یا آدرس)" />
                  </SelectTrigger>
                  <SelectContent>
                    {tos.map((t) => (
                      <SelectItem key={t} value={t} className="text-sm font-bold">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <CalendarDays size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
                <Input type="date" aria-label="تاریخ سفر" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 w-full rounded-lg border-line bg-surface ps-10 focus-visible:ring-brand focus:ring-brand focus:border-brand font-bold text-[14px] text-sub" />
              </div>
              
              <Button onClick={() => setSearched(true)} aria-label="جستجو ترانسفر" className="h-12 bg-brand hover:bg-brand-dark text-surface font-black text-[14px] rounded-lg w-full flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                <Search size={18} /> جستجو
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 md:py-10 flex flex-col md:flex-row gap-8 pb-24">
        {/* سایدبار فیلتر نوع خودرو */}
        <aside className="w-full md:w-1/4 hidden md:block">
          <div className="bg-surface rounded-xl shadow-sm border border-line p-6 sticky top-24">
            <h3 className="font-black text-ink text-[24px] mb-6 border-b border-line pb-3">فیلترها</h3>
            <div>
              <h4 className="font-bold text-[14px] text-sub mb-4">نوع خودرو</h4>
              {CATS.map((c) => (
                <label key={c.id} className="flex items-center gap-3 mb-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={types.includes(c.id)}
                    onChange={() => toggleType(c.id)}
                    className="size-4 rounded text-brand focus-visible:ring-brand focus:ring-brand cursor-pointer"
                  />
                  <span className="text-[16px] font-bold text-ink group-hover:text-brand-dark transition-colors">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* نتایج */}
        <section className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
            <h2 className="font-black text-ink text-[24px]">
              نتایج برای مسیر: {from || 'همه مبدأها'} به {to || 'همه مقصدها'}
            </h2>
            <span className="text-[12px] font-bold text-sub num">{results.length.toLocaleString('fa-IR')} خودرو یافت شد</span>
          </div>

          <div className="rtl:bg-gradient-to-l ltr:bg-gradient-to-r from-brand to-brand-dark rounded-xl p-5 text-surface flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <Crown size={30} className="text-mint-bright shrink-0" />
              <div>
                <p className="font-black text-[18px]">ترانسفر VIP</p>
                <p className="text-[14px] font-bold text-surface/90">خودروهای لوکس مرسدس و BMW با رانندگان حرفه‌ای</p>
              </div>
            </div>
          </div>

          {results.map((t) => (
            <article key={t.id} className="bg-surface rounded-xl shadow-sm hover:shadow-md transition-shadow border border-line overflow-hidden flex flex-col md:flex-row group">
              <div className="md:w-1/3 h-48 md:h-auto relative bg-soft overflow-hidden shrink-0">
                {TRANSFER_IMGS[t.id] ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={TRANSFER_IMGS[t.id]}
                      alt={t.vehicleType}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 ph-texture flex items-center justify-center">
                    <CarFront size={48} className="text-sub/70" />
                  </div>
                )}
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-[24px] text-ink mb-1">{t.vehicleType}</h3>
                      <p className="text-[16px] font-normal text-sub">{t.from} ← {t.to}</p>
                    </div>
                    <div className="bg-soft text-brand-dark px-2 py-1 rounded text-[12px] font-bold flex items-center gap-1 num">
                      <Star size={16} className="fill-brand-dark" />
                      ۴.۹
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-5 text-[12px] font-bold text-sub flex-wrap">
                    <div className="flex items-center gap-1.5"><Users size={18} /> ظرفیت: {t.capacity.toLocaleString('fa-IR')} نفر</div>
                    <div className="flex items-center gap-1.5"><Luggage size={18} /> {t.luggage.toLocaleString('fa-IR')} چمدان</div>
                    <div className="flex items-center gap-1.5"><Clock size={18} /> ~{t.durationMinutes.toLocaleString('fa-IR')} دقیقه</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-6 pt-5 border-t border-line/50">
                  <div>
                    <span className="block text-[12px] font-bold text-sub mb-1">قیمت نهایی</span>
                    <span className="text-price text-[24px] font-black num leading-none">
                      {t.price.toLocaleString('fa-IR')}
                      <span className="text-[12px] font-bold text-sub me-1">تومان</span>
                    </span>
                  </div>
                  
                  {/* دکمه اکشن زعفرانی طبق قوانین Firuzo */}
                  <Button onClick={() => reserve(t)} aria-label={`انتخاب خودرو ${t.vehicleType}`} className="bg-brand hover:bg-brand-2 text-surface px-6 py-2 h-auto rounded-full font-black text-[14px] shrink-0 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                    انتخاب خودرو
                  </Button>
                </div>
              </div>
            </article>
          ))}

          {results.length === 0 && (
            <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-line text-sub font-bold text-[14px]">
              خودرویی با این مشخصات یافت نشد؛ فیلترها را تغییر دهید.
            </div>
          )}
        </section>
      </main>
    </>
  );
}
