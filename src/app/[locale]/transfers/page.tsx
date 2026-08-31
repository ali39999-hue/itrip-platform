'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { TRANSFERS } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import { daysFromNow } from '@/lib/utils';
import { shimmerDataUrl } from '@/lib/image-utils';
import { CarFront, Users, Luggage, Clock, Search, Crown, PlaneTakeoff, MapPin, TrainFront, BusFront, Star } from 'lucide-react';
import { lt } from '@/lib/lt';

const TRANSFER_IMGS: Record<string, string> = {
  tr1: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=70&w=800',
  tr2: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=70&w=800',
  tr3: 'https://images.unsplash.com/photo-1570733577524-3a047079e80d?auto=format&fit=crop&q=70&w=800',
};

type CarCat = 'eco' | 'vip' | 'van';

const catOf = (t: (typeof TRANSFERS)[number]): CarCat =>
  t.vehicleType.includes('VIP') ? 'vip' : t.vehicleType.includes('ون') || t.vehicleType.includes('هایس') ? 'van' : 'eco';

export default function TransfersPage() {
  const t = useTranslations('Transfers');
  const locale = useLocale();
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  const CATS: { id: CarCat; label: string }[] = [
    { id: 'eco', label: lt(locale, { fa: 'اقتصادی', en: 'Economy', ar: 'اقتصادي', zh: '经济型', ru: 'Эконом' }) },
    { id: 'vip', label: lt(locale, { fa: 'تشریفات (VIP)', en: 'VIP / Luxury', ar: 'تشريفية (VIP)', zh: '豪华型（VIP）', ru: 'VIP / Люкс' }) },
    { id: 'van', label: lt(locale, { fa: 'ون و مینی‌بوس', en: 'Van & Minibus', ar: 'فان وميني باص', zh: '厢式车与小巴', ru: 'Фургон и микроавтобус' }) },
  ];

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

  function reserve(transfer: (typeof TRANSFERS)[number]) {
    setBookingContext({
      type: 'transfers',
      title: `${transfer.from} → ${transfer.to}`,
      subtitle: transfer.vehicleType,
      amount: transfer.price,
      travelDate: date || daysFromNow(2),
    });
    router.push('/checkout');
  }

  return (
    <>
      {/* Hero + Floating Search */}
      <section className="relative w-full h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden img-overlay-strong">
        <Image
          src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=75&w=1800"
          alt={t('title')}
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={shimmerDataUrl(1800, 600)}
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-deep/40" />
        <div className="relative z-10 w-full max-w-4xl px-4 md:px-0 mt-8">
          <div className="glass-panel shadow-sm rounded-xl p-5 md:p-6 flex flex-col gap-6">
            
            <div className="flex gap-6 border-b border-line/50 pb-2 overflow-x-auto scrollbar-none">
              <span className="text-brand-dark font-black text-[14px] border-b-2 border-brand pb-3 flex items-center gap-2 whitespace-nowrap">
                <CarFront size={18} /> {t('title')}
              </span>
              <Link href="/trains" className="text-sub hover:text-brand-dark font-black text-[14px] pb-3 flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <TrainFront size={18} /> {lt(locale, { fa: 'قطار', en: 'Trains', ar: 'قطارات', zh: '火车', ru: 'Поезда' })}
              </Link>
              <Link href="/trains" className="text-sub hover:text-brand-dark font-black text-[14px] pb-3 flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <BusFront size={18} /> {lt(locale, { fa: 'اتوبوس', en: 'Buses', ar: 'حافلات', zh: '巴士', ru: 'Автобусы' })}
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <PlaneTakeoff size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
                <Select value={from || undefined} onValueChange={(v) => setFrom(v ?? '')}>
                  <SelectTrigger aria-label={t('airportPickup')} className="h-12 w-full rounded-lg border-line bg-surface ps-10 focus:ring-brand focus:border-brand focus-visible:ring-brand font-bold text-[14px]">
                    <SelectValue placeholder={t('airportPickup')} />
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
                  <SelectTrigger aria-label={t('hotelDropoff')} className="h-12 w-full rounded-lg border-line bg-surface ps-10 focus:ring-brand focus:border-brand focus-visible:ring-brand font-bold text-[14px]">
                    <SelectValue placeholder={t('hotelDropoff')} />
                  </SelectTrigger>
                  <SelectContent>
                    {tos.map((item) => (
                      <SelectItem key={item} value={item} className="text-sm font-bold">{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <DatePicker 
                  value={date} 
                  onChange={(d: string | undefined) => setDate(d || '')} 
                  placeholder={lt(locale, { fa: 'تاریخ سفر', en: 'Travel date', ar: 'تاريخ السفر', zh: '出行日期', ru: 'Дата поездки' })} 
                />
              </div>
              
              <Button onClick={() => setSearched(true)} aria-label={lt(locale, { fa: 'جستجو ترانسفر', en: 'Search transfers', ar: 'البحث عن خدمات النقل', zh: '搜索接送服务', ru: 'Поиск трансферов' })} className="h-12 bg-brand hover:bg-brand-dark text-surface font-black text-[14px] rounded-lg w-full flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                <Search size={18} /> {lt(locale, { fa: 'جستجو', en: 'Search', ar: 'بحث', zh: '搜索', ru: 'Поиск' })}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 md:py-10 flex flex-col md:flex-row gap-8 pb-24">
        {/* Sidebar filters */}
        <aside className="w-full md:w-1/4 hidden md:block">
          <div className="bg-surface rounded-xl shadow-sm border border-line p-6 sticky top-24">
            <h3 className="font-black text-ink text-[24px] mb-6 border-b border-line pb-3">{lt(locale, { fa: 'فیلترها', en: 'Filters', ar: 'الفلاتر', zh: '筛选', ru: 'Фильтры' })}</h3>
            <div>
              <h4 className="font-bold text-[14px] text-sub mb-4">{lt(locale, { fa: 'نوع خودرو', en: 'Vehicle Type', ar: 'نوع السيارة', zh: '车型', ru: 'Тип автомобиля' })}</h4>
              <div className="flex flex-col gap-3">
                {CATS.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={types.includes(c.id)}
                      onChange={() => toggleType(c.id)}
                      aria-label={`Filter by ${c.label}`}
                      className="rounded border-line text-brand focus:ring-brand w-4 h-4"
                    />
                    <span className="text-[14px] font-bold text-ink">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results grid */}
        <section className="w-full md:w-3/4 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="font-black text-ink text-[20px] md:text-[24px]">
              {results.length.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} {t('availableVehicles')}
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {results.map((tr) => (
              <article
                key={tr.id}
                className="bg-surface rounded-2xl border border-line p-5 md:p-6 flex flex-col md:flex-row gap-6 shadow-sm hover:shadow-md transition-all hover:border-brand/40"
              >
                <div className="relative w-full md:w-56 h-40 rounded-xl overflow-hidden bg-soft shrink-0">
                  <Image
                    src={TRANSFER_IMGS[tr.id] || TRANSFER_IMGS.tr1}
                    alt={tr.vehicleType}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    placeholder="blur"
                    blurDataURL={shimmerDataUrl(400, 300)}
                    className="object-cover"
                  />
                  {tr.vehicleType.includes('VIP') && (
                    <span className="absolute top-2 start-2 bg-gold text-[#14201f] text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Crown size={12} /> VIP
                    </span>
                  )}
                </div>

                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-[18px] text-ink">{tr.vehicleType}</h3>
                      <div className="flex items-center gap-1 text-gold text-xs font-bold">
                        <Star size={14} className="fill-gold" />
                        <span>۴.۹</span>
                      </div>
                    </div>
                    
                    <p className="text-xs font-bold text-sub mb-4">
                      {tr.from} → {tr.to}
                    </p>

                    <div className="flex flex-wrap gap-4 text-xs font-bold text-sub">
                      <span className="flex items-center gap-1.5 bg-soft px-3 py-1.5 rounded-lg">
                        <Users size={14} className="text-brand-dark" />
                        {locale === 'fa' ? `ظرفیت تا ${tr.capacity.toLocaleString('fa-IR')} نفر` : `Capacity up to ${tr.capacity}`}
                      </span>
                      <span className="flex items-center gap-1.5 bg-soft px-3 py-1.5 rounded-lg">
                        <Luggage size={14} className="text-brand-dark" />
                        {locale === 'fa' ? `ظرفیت ${tr.luggage.toLocaleString('fa-IR')} چمدان` : `Luggage: ${tr.luggage}`}
                      </span>
                      <span className="flex items-center gap-1.5 bg-soft px-3 py-1.5 rounded-lg">
                        <Clock size={14} className="text-brand-dark" />
                        {lt(locale, { fa: 'انتظار رایگان تا ۶۰ دقیقه', en: 'Free 60 min wait time', ar: 'انتظار مجاني حتى 60 دقيقة', zh: '免费等待 60 分钟', ru: 'Бесплатное ожидание 60 минут' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-line">
                    <div>
                      <span className="text-xs font-bold text-sub block">{lt(locale, { fa: 'قیمت کل مسیر', en: 'Total route price', ar: 'سعر المسار الإجمالي', zh: '全程总价', ru: 'Итоговая цена маршрута' })}</span>
                      <span className="text-[20px] md:text-[24px] font-black text-price font-mono num">
                        {tr.price.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                        <span className="text-xs font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => reserve(tr)}
                      aria-label={`رزرو ${tr.vehicleType}`}
                      className="bg-action hover:bg-action-hover text-[#14201f] px-6 py-3 rounded-xl font-black text-[13px] transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {t('bookTransfer')}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
