'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/DatePicker';
import { daysFromNow } from '@/lib/utils';
import { shimmerDataUrl } from '@/lib/image-utils';
import { TrainFront, BusFront, MapPin, CalendarDays, CircleDot, Search } from 'lucide-react';
import { lt } from '@/lib/lt';

const SERVICES = [
  { id: 't1', kind: 'قطار', provider: 'رجاء', stars: '۴ ستاره', title: 'قطار پنج‌ستاره تهران ← مشهد', dep: '20:50', arr: '08:15', from: 'تهران', to: 'مشهد', duration: '۱۱ ساعت و ۲۵ دقیقه', cls: 'کوپه ۴ تخته', price: 9800000, tag: 'پیشنهاد فیروز' },
  { id: 't2', kind: 'قطار اتوبوسی', provider: 'فدک', stars: '۵ ستاره', title: 'قطار تندرو تهران ← مشهد', dep: '06:30', arr: '14:00', from: 'تهران', to: 'مشهد', duration: '۷ ساعت و ۳۰ دقیقه', cls: 'سالنی', price: 12500000, tag: 'سریع‌ترین' },
  { id: 't3', kind: 'اتوبوس', provider: 'رویال سفر', stars: 'VIP', title: 'اتوبوس VIP تهران ← شیراز', dep: '16:00', arr: '02:30', from: 'تهران', to: 'شیراز', duration: '۱۰ ساعت و ۳۰ دقیقه', cls: 'تخت‌خواب‌شو ۲۵ صندلی', price: 3400000, tag: 'ظرفیت محدود' },
  { id: 't4', kind: 'اتوبوس', provider: 'همسفر', stars: 'VIP', title: 'اتوبوس VIP مشهد ← تهران', dep: '09:00', arr: '19:30', from: 'مشهد', to: 'تهران', duration: '۱۰ ساعت و ۳۰ دقیقه', cls: 'VIP ۲۵ نفره', price: 3100000, tag: '' },
];

export default function TrainsPage() {
  const t = useTranslations('Trains');
  const locale = useLocale();
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  
  const [filterTrain, setFilterTrain] = useState(true);
  const [filterBus, setFilterBus] = useState(true);

  const list = SERVICES.filter((s) => {
    if (s.kind === 'قطار' && filterTrain) return true;
    if (s.kind === 'اتوبوس' && filterBus) return true;
    return false;
  });

  function reserve(service: (typeof SERVICES)[number]) {
    setBookingContext({
      type: 'trains',
      title: service.title,
      subtitle: `${service.cls} • ${service.dep}`,
      amount: service.price,
      travelDate: daysFromNow(7),
    });
    router.push('/checkout');
  }

  return (
    <div className="flex flex-col min-h-screen bg-soft">
      {/* Hero / Search Section */}
      <section className="relative w-full h-[50vh] min-h-[450px] flex items-center justify-center overflow-hidden img-overlay-strong">
        <Image
          src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=75&w=1800"
          alt={t('title')}
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={shimmerDataUrl(1800, 500)}
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-brand-dark/70 mix-blend-multiply" />
        
        <div className="relative z-10 w-full px-4 md:px-0 flex flex-col items-center text-center pt-8">
          <h1 className="text-[32px] md:text-[40px] font-black text-surface mb-2 tracking-tight">{t('title')}</h1>
          <p className="text-[16px] md:text-[18px] font-bold text-surface/90 mb-10">{t('subtitle')}</p>
          
          {/* Search Floating Card */}
          <div className="glass-panel shadow-sm rounded-xl p-5 md:p-6 w-full max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <MapPin size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
                <Input
                  defaultValue={lt(locale, { fa: 'تهران', en: 'Tehran', ar: 'طهران', zh: '德黑兰', ru: 'Тегеран' })}
                  aria-label={t('fromStation')}
                  className="h-12 w-full rounded-lg border-line bg-surface ps-10 font-bold text-[14px] text-ink focus-visible:ring-brand focus:border-brand"
                  placeholder={t('fromStation')}
                />
              </div>
              <div className="relative flex-1">
                <MapPin size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
                <Input
                  defaultValue={lt(locale, { fa: 'مشهد', en: 'Mashhad', ar: 'مشهد', zh: '马什哈德', ru: 'Мешхед' })}
                  aria-label={t('toStation')}
                  className="h-12 w-full rounded-lg border-line bg-surface ps-10 font-bold text-[14px] text-ink focus-visible:ring-brand focus:border-brand"
                  placeholder={t('toStation')}
                />
              </div>
              <div className="relative flex-1">
                <DatePicker
                  placeholder={lt(locale, { fa: 'تاریخ حرکت', en: 'Departure date', ar: 'تاريخ المغادرة', zh: '出发日期', ru: 'Дата выезда' })}
                />
              </div>
              <Button
                aria-label={lt(locale, { fa: 'جستجوی بلیط', en: 'Search tickets', ar: 'البحث عن تذاكر', zh: '搜索车票', ru: 'Поиск билетов' })}
                className="h-12 bg-brand hover:bg-brand-dark text-surface font-black text-[14px] rounded-lg px-8 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Search size={18} /> {lt(locale, { fa: 'جستجو', en: 'Search', ar: 'بحث', zh: '搜索', ru: 'Поиск' })}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Results */}
      <main className="max-w-[1280px] w-full mx-auto px-4 md:px-10 py-10 flex flex-col md:flex-row gap-8 pb-24">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-surface rounded-xl border border-line p-6 sticky top-24 shadow-sm flex flex-col gap-6">
            <h3 className="font-black text-ink text-[18px] border-b border-line pb-3">{lt(locale, { fa: 'نوع وسیله نقلیه', en: 'Transport Type', ar: 'نوع المركبة', zh: '交通工具类型', ru: 'Тип транспорта' })}</h3>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterTrain}
                  onChange={(e) => setFilterTrain(e.target.checked)}
                  aria-label={t('trainOption')}
                  className="rounded border-line text-brand focus:ring-brand w-4 h-4"
                />
                <span className="text-[14px] font-bold text-ink flex items-center gap-2">
                  <TrainFront size={16} className="text-brand-dark" /> {t('trainOption')}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterBus}
                  onChange={(e) => setFilterBus(e.target.checked)}
                  aria-label={t('busOption')}
                  className="rounded border-line text-brand focus:ring-brand w-4 h-4"
                />
                <span className="text-[14px] font-bold text-ink flex items-center gap-2">
                  <BusFront size={16} className="text-brand-dark" /> {t('busOption')}
                </span>
              </label>
            </div>
          </div>
        </aside>

        {/* Results List */}
        <section className="flex-1 flex flex-col gap-4">
          <h2 className="font-black text-ink text-[20px] mb-2">
            {list.length.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} {lt(locale, { fa: 'سرویس موجود', en: 'Available Services', ar: 'الخدمات المتاحة', zh: '可用服务', ru: 'Доступные услуги' })}
          </h2>

          {list.map((s) => (
            <article
              key={s.id}
              className="bg-surface rounded-2xl border border-line p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm hover:shadow-md transition-all hover:border-brand/40"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-mint grid place-items-center text-brand-dark">
                    {s.kind.includes('قطار') ? <TrainFront size={20} /> : <BusFront size={20} />}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-[16px] text-ink">{s.title}</h3>
                      {s.tag && (
                        <span className="bg-gold-soft text-[#14201f] text-[10.5px] font-black px-2 py-0.5 rounded-full">
                          {s.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-sub">
                      {s.provider} • {s.cls} • {s.stars}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-line/60">
                  <div className="flex items-center gap-2">
                    <CircleDot size={14} className="text-brand" />
                    <span className="font-mono font-black text-[16px] text-ink" dir="ltr">{s.dep}</span>
                    <span className="text-xs font-bold text-sub">{s.from}</span>
                  </div>
                  <span className="text-xs font-bold text-sub bg-soft px-2.5 py-1 rounded-full">
                    {s.duration}
                  </span>
                  <div className="flex items-center gap-2">
                    <CircleDot size={14} className="text-brand-dark" />
                    <span className="font-mono font-black text-[16px] text-ink" dir="ltr">{s.arr}</span>
                    <span className="text-xs font-bold text-sub">{s.to}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end w-full md:w-auto gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-line">
                <div className="text-start md:text-end">
                  <span className="text-xs font-bold text-sub block">{t('perPassenger')}</span>
                  <span className="text-[20px] font-black text-price font-mono num">
                    {s.price.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                    <span className="text-xs font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                  </span>
                </div>
                <button
                  onClick={() => reserve(s)}
                  aria-label={`انتخاب ${s.title}`}
                  className="bg-action hover:bg-action-hover text-[#14201f] px-6 py-2.5 rounded-xl font-black text-[13px] transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {t('selectTicket')}
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
