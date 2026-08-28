'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { daysFromNow } from '@/lib/utils';
import { TrainFront, BusFront, MapPin, CalendarDays, CircleDot, Search } from 'lucide-react';

const SERVICES = [
  { id: 't1', kind: 'قطار', provider: 'رجاء', stars: '۴ ستاره', title: 'قطار پنج‌ستاره تهران ← مشهد', dep: '20:50', arr: '08:15', from: 'تهران', to: 'مشهد', duration: '۱۱ ساعت و ۲۵ دقیقه', cls: 'کوپه ۴ تخته', price: 9800000, tag: 'پیشنهاد فیروز' },
  { id: 't2', kind: 'قطار اتوبوسی', provider: 'فدک', stars: '۵ ستاره', title: 'قطار تندرو تهران ← مشهد', dep: '06:30', arr: '14:00', from: 'تهران', to: 'مشهد', duration: '۷ ساعت و ۳۰ دقیقه', cls: 'سالنی', price: 12500000, tag: 'سریع‌ترین' },
  { id: 't3', kind: 'اتوبوس', provider: 'رویال سفر', stars: 'VIP', title: 'اتوبوس VIP تهران ← شیراز', dep: '16:00', arr: '02:30', from: 'تهران', to: 'شیراز', duration: '۱۰ ساعت و ۳۰ دقیقه', cls: 'تخت‌خواب‌شو ۲۵ صندلی', price: 3400000, tag: 'ظرفیت محدود' },
  { id: 't4', kind: 'اتوبوس', provider: 'همسفر', stars: 'VIP', title: 'اتوبوس VIP مشهد ← تهران', dep: '09:00', arr: '19:30', from: 'مشهد', to: 'تهران', duration: '۱۰ ساعت و ۳۰ دقیقه', cls: 'VIP ۲۵ نفره', price: 3100000, tag: '' },
];

export default function TrainsPage() {
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  
  const [filterTrain, setFilterTrain] = useState(true);
  const [filterBus, setFilterBus] = useState(true);

  const list = SERVICES.filter((s) => {
    if (s.kind === 'قطار' && filterTrain) return true;
    if (s.kind === 'اتوبوس' && filterBus) return true;
    return false;
  });

  function reserve(s: (typeof SERVICES)[number]) {
    setBookingContext({
      type: 'trains',
      title: s.title,
      subtitle: `${s.cls} • ${s.dep}`,
      amount: s.price,
      travelDate: daysFromNow(7),
    });
    router.push('/checkout');
  }

  return (
    <div className="flex flex-col min-h-screen bg-soft">
      {/* Hero / Search Section */}
      <section className="relative w-full h-[50vh] min-h-[450px] flex items-center justify-center overflow-hidden img-overlay-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRtugYc6KVBoB-nI62UP-PEPpZ5yFw6H0rmQODp7ivpffVixXES82XMMO8Huv8PJjuK2kAw379zSlVxLjoc8LLay194PK13lB4DrwzlD69_X9OIQvqrazlRftya789ExVuZuir68q2QH72l-4S_x2-6HUUKUmp9ne_VQqfvraZG5na864W4CGY-EXKdeIcJBI-0nP5wRd-n6YOIzjbzECUKKiPDYyTe6OTnH97BPI1e18iH3PzEYa1Lg4W9PBDFqwycA"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-brand-dark/70 mix-blend-multiply" />
        
        <div className="relative z-10 w-full px-4 md:px-0 flex flex-col items-center text-center pt-8">
          <h1 className="text-[32px] md:text-[40px] font-black text-surface mb-2 tracking-tight">سفر با قطار و اتوبوس</h1>
          <p className="text-[16px] md:text-[18px] font-bold text-surface/90 mb-10">آسان، راحت و مقرون به صرفه سفر کنید.</p>
          
          {/* Search Floating Card */}
          <div className="glass-panel shadow-sm rounded-xl p-5 md:p-6 w-full max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <MapPin size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
                <Input aria-label="مبدا" className="w-full ps-10 pe-3 py-3 h-12 rounded-lg border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand font-bold text-[14px] bg-surface text-ink" placeholder="مبدا" type="text" />
              </div>
              <div className="flex-1 relative">
                <MapPin size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
                <Input aria-label="مقصد" className="w-full ps-10 pe-3 py-3 h-12 rounded-lg border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand font-bold text-[14px] bg-surface text-ink" placeholder="مقصد" type="text" />
              </div>
              <div className="flex-1 relative">
                <CalendarDays size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
                <Input aria-label="تاریخ" className="w-full ps-10 pe-3 py-3 h-12 rounded-lg border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand font-bold text-[14px] bg-surface text-sub" type="date" />
              </div>
              <Button aria-label="جستجوی بلیت قطار و اتوبوس" className="bg-brand text-surface h-12 px-8 rounded-lg font-black text-[14px] hover:bg-brand-dark transition-colors shadow-sm flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                <Search size={18} /> جستجو
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-10 flex flex-col md:flex-row gap-8 pb-24 -mt-10 relative z-20">
        
        {/* Filters Sidebar */}
        <aside className="w-full md:w-72 shrink-0">
          <div className="bg-surface rounded-xl p-6 sticky top-24 shadow-sm border border-line">
            <h3 className="font-black text-[20px] text-ink mb-5 border-b border-line pb-3">فیلترها</h3>
            
            <div className="mb-6">
              <h4 className="font-bold text-[14px] text-sub mb-4">نوع وسیله نقلیه</h4>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={filterTrain} onChange={(e) => setFilterTrain(e.target.checked)} className="size-4 rounded text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer" />
                  <span className="font-bold text-[16px] text-ink group-hover:text-brand-dark transition-colors">قطار</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={filterBus} onChange={(e) => setFilterBus(e.target.checked)} className="size-4 rounded text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer" />
                  <span className="font-bold text-[16px] text-ink group-hover:text-brand-dark transition-colors">اتوبوس</span>
                </label>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-bold text-[14px] text-sub mb-4">محدوده قیمت</h4>
              <input type="range" aria-label="محدوده قیمت" min="0" max="100" defaultValue="50" className="w-full accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
              <div className="flex justify-between font-bold text-[11px] text-sub mt-2">
                <span>ارزان‌ترین</span>
                <span>گران‌ترین</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Results List */}
        <div className="flex-1 flex flex-col gap-5">
          {list.map((s) => (
            <div key={s.id} className="bg-surface rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-line flex flex-col md:flex-row gap-6 items-center group card-lift">
              
              {/* Provider Info */}
              <div className="flex flex-col items-center w-full md:w-28 text-center shrink-0">
                {s.kind === 'قطار' ? (
                  <TrainFront size={40} className="text-brand mb-2" />
                ) : (
                  <BusFront size={40} className="text-brand-dark mb-2" />
                )}
                <span className="font-black text-[16px] text-ink">{s.provider}</span>
                <span className="font-bold text-[12px] text-sub mt-0.5">{s.stars}</span>
              </div>
              
              {/* Timeline */}
              <div className="flex-1 w-full relative flex items-center justify-between py-6 my-2 md:my-0">
                <div className="absolute top-1/2 start-0 end-0 h-[2px] bg-line -z-10" />
                
                <div className="flex flex-col items-center bg-surface px-3">
                  <span className="font-black text-[22px] text-ink num">{s.dep}</span>
                  <span className="font-bold text-[14px] text-sub">{s.from}</span>
                </div>
                
                <div className="flex flex-col items-center bg-surface px-3 text-center -mt-2">
                  <span className="font-bold text-[12px] text-brand-dark mb-1 num">{s.duration}</span>
                  <CircleDot size={16} className="text-line bg-surface rounded-full" />
                </div>
                
                <div className="flex flex-col items-center bg-surface px-3">
                  <span className="font-black text-[22px] text-ink num">{s.arr}</span>
                  <span className="font-bold text-[14px] text-sub">{s.to}</span>
                </div>
              </div>
              
              {/* Price & Action */}
              <div className="flex flex-col items-center md:items-end w-full md:w-48 md:border-e border-line pt-4 md:pt-0 md:pe-6 shrink-0 border-t md:border-t-0">
                <span className="font-bold text-[11px] text-sub mb-1">قیمت برای هر نفر</span>
                <span className="font-black text-[22px] text-price mb-4 num">
                  {s.price.toLocaleString('fa-IR')} <span className="font-bold text-[12px] text-sub">تومان</span>
                </span>
                
                {/* دکمه اکشن زعفرانی طبق قوانین Firuzo */}
                <Button onClick={() => reserve(s)} aria-label={`انتخاب بلیت ${s.title}`} className="w-full bg-brand hover:bg-brand-2 text-surface py-2 h-11 rounded-full font-black text-[14px] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                  انتخاب بلیت
                </Button>
              </div>
              
            </div>
          ))}
          
          {list.length === 0 && (
            <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-line text-sub font-bold text-[14px]">
              بلیتی با این مشخصات یافت نشد؛ فیلترها را تغییر دهید.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
