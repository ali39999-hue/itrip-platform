'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { TOURS } from '@/lib/data';
import type { Tour } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { CountryExperiencesSection } from '@/components/shared/CountryExperiences';
import { MapPin, Star, ArrowLeft, CalendarDays, SlidersHorizontal, ChevronDown, Tent } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'همه تورها' },
  { id: 'cultural', label: 'فرهنگی و زیارتی' },
  { id: 'nature', label: 'طبیعت‌گردی' },
  { id: 'medical', label: 'درمانی' },
  { id: 'adventure', label: 'ماجراجویی' },
  { id: 'signature', label: 'تجربه اصیل' },
] as const;

const CAT_FA: Record<Tour['category'], string> = {
  cultural: 'فرهنگی', nature: 'طبیعت‌گردی', medical: 'درمانی', adventure: 'ماجراجویی',
};

/* placeholder تصاویر — باید با عکس واقعی تورها جایگزین شود (work/stitch-mockup-notes.md)
   URLها HEAD-تست شده (200): سی‌وسه‌پل اصفهان، حرم امام رضا (Wikimedia)، کوهستان گرجستان (Unsplash) */
const TOUR_IMGS: Record<string, string> = {
  t1: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Si-o-se-Pol.jpg/960px-Si-o-se-Pol.jpg',
  t2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Imam_Reza_shrine.jpg/960px-Imam_Reza_shrine.jpg',
  t3: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=70&w=800',
  t4: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=70&w=800',
};

const ASPECTS = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/3]', 'aspect-[3/4]'];

type SortKey = 'rec' | 'cheap' | 'expensive';

function ToursContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const [sort, setSort] = useState<SortKey>('rec');

  /* دسته‌بندی کاملاً از URL مشتق می‌شود — دیپ‌لینک /tours?category=signature
     از کاتالوگ خدمات و پیشنهادهای ویژه + دکمه‌های فیلتر URL را به‌روز می‌کنند */
  const qParam = searchParams.get('category');
  const category = CATEGORIES.some((c) => c.id === qParam) ? qParam! : 'all';
  function setCategory(id: string) {
    router.replace(id === 'all' ? '/tours' : `/tours?category=${id}`, { scroll: false });
  }

  const isSignature = category === 'signature';

  const filtered = useMemo(() => {
    let list = category === 'all' ? TOURS : TOURS.filter((t) => t.category === category);
    if (sort === 'cheap') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'expensive') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rec') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [category, sort]);

  function book(tour: Tour) {
    setBookingContext({
      type: 'tours',
      title: tour.title,
      subtitle: `${tour.city} • ${tour.durationDays} روزه`,
      amount: tour.price,
      travelDate: daysFromNow(14),
    });
    router.push('/checkout');
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-6 md:pt-8 pb-20">
      {/* Hero banner (mockup firuzo_page_5) */}
      <div className="relative mb-10 rounded-2xl overflow-hidden h-64 md:h-80 shadow-sm img-overlay-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&q=75&w=1800"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute bottom-0 inset-x-0 p-6 md:p-8 text-start">
          <h1 className="text-surface mb-2 text-[28px] md:text-[40px] leading-tight font-black tracking-tight">
            کشف تجربه‌های ناب
          </h1>
          <p className="text-surface/85 max-w-2xl text-[13.5px] md:text-lg leading-relaxed">
            از سفرهای ماجراجویانه در دل طبیعت تا تورهای فرهنگی در شهرهای تاریخی، ما بهترین مسیرها را برای شما آماده کرده‌ایم.
          </p>
        </div>
      </div>

      {/* Sticky glass filter bar */}
      <div className="sticky top-[72px] z-40 mb-8 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="glass-panel shadow-sm border-line/60 rounded-full py-2.5 px-3 md:px-5 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          <span className="hidden md:inline-flex items-center gap-1.5 shrink-0 text-[13px] font-black text-ink">
            <SlidersHorizontal size={15} className="text-brand-dark" />
            فیلترها:
          </span>
          <div className="flex gap-1.5 flex-nowrap">
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`whitespace-nowrap min-h-9 px-4 rounded-full text-[12.5px] md:text-[13px] font-black transition-all ${
                    active
                      ? 'bg-brand text-surface shadow-sm shadow-brand/25'
                      : 'bg-soft/80 border border-line/70 text-sub hover:bg-soft hover:text-brand-dark'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {!isSignature && (
            <div className="hidden md:flex items-center gap-1.5 pe-3 border-s border-line/70 shrink-0">
              <span className="text-[12px] font-black text-sub">مرتب‌سازی:</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="appearance-none bg-transparent text-brand-dark font-black text-[13px] border-0 cursor-pointer py-1 ps-6 pe-1 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="rec">پیشنهاد ما</option>
                  <option value="cheap">ارزان‌ترین</option>
                  <option value="expensive">گران‌ترین</option>
                </select>
                <ChevronDown size={14} className="absolute end-1 top-1/2 -translate-y-1/2 text-brand-dark pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {isSignature ? (
        /* تجربه‌های اصیل مخصوص کشور انتخابی (یات/جشنواره/تئاتر/نمایشگاه/شبانه/...) */
        <CountryExperiencesSection variant="embedded" />
      ) : (
        /* Masonry grid */
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-xl border border-dashed border-line">
              <Tent size={44} className="mx-auto text-line mb-3" />
              <p className="text-sub font-bold text-[13px]">توری در این دسته‌بندی موجود نیست</p>
            </div>
          ) : (
            <div className="masonry-grid">
              {filtered.map((tour, i) => (
                <button
                  key={tour.id}
                  onClick={() => book(tour)}
                  className="masonry-item group relative w-full text-start rounded-xl overflow-hidden shadow-sm hover:shadow-sm transition-shadow bg-surface border border-line/60 img-overlay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div className={`${ASPECTS[i % ASPECTS.length]} w-full overflow-hidden relative ph-texture bg-brand-dark`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={TOUR_IMGS[tour.id]}
                      alt={tour.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-4 end-4 bg-surface/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm text-[12px] font-black text-ink">
                      <Star size={14} className="fill-gold text-gold" />
                      {tour.rating.toLocaleString('fa-IR')}
                    </span>
                  </div>

                  <div className="absolute bottom-0 inset-x-0 p-5">
                    <div className="flex justify-between items-end gap-2 mb-2">
                      <h3 className="text-surface text-lg md:text-xl font-black leading-snug">{tour.title}</h3>
                      <span className="shrink-0 bg-brand/85 text-surface text-[11px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
                        {CAT_FA[tour.category]}
                      </span>
                    </div>
                    <div className="flex gap-4 text-surface/80 text-[12px] font-bold mb-3">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={14} /> {tour.durationDays.toLocaleString('fa-IR')} روزه
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {tour.city}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-surface/25 pt-3">
                      <div className="text-start">
                        <span className="block text-surface/75 text-[11px] font-bold">شروع از</span>
                        <span className="text-price text-lg md:text-[20px] font-black num">
                          {tour.price.toLocaleString('fa-IR')}
                          <span className="text-[11px] font-bold text-surface/80 me-1">تومان</span>
                        </span>
                      </div>
                      <span className="bg-surface/15 hover:bg-surface/30 text-surface p-2.5 rounded-full backdrop-blur-sm transition-colors group-hover:bg-brand group-hover:text-surface">
                        <ArrowLeft size={16} className="ltr:rotate-180" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ToursPage() {
  return (
    <Suspense fallback={null}>
      <ToursContent />
    </Suspense>
  );
}
