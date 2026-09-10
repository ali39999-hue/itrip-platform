'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { Tour } from '@/lib/types';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { TourImage } from '../TourImage';
import {
  Compass,
  Star,
  MapPin,
  CalendarDays,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface RelatedToursProps {
  tours: Tour[];
}

export function RelatedTours({ tours }: RelatedToursProps) {
  const locale = useLocale();

  if (tours.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-line">
      <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-brand-dark text-xs font-black mb-1">
            <Compass size={15} />
            <span>{lt(locale, { fa: 'سفرهای پیشنهادی', en: 'Recommended Tours', ar: 'جولات مقترحة', zh: '推荐旅游路线', ru: 'Рекомендуемые туры' })}</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-ink">
            {lt(locale, { fa: 'سایر تورهای پرطرفدار فیروزو', en: 'Other Popular Tours on Firuzo', ar: 'جولات أخرى شائعة', zh: '其他热门旅游精选', ru: 'Другие популярные туры' })}
          </h2>
        </div>

        <Link
          href="/tours"
          className="inline-flex items-center gap-1 text-xs font-black text-brand hover:text-brand-dark transition shrink-0"
        >
          <span>{lt(locale, { fa: 'مشاهده همه', en: 'View all', ar: 'عرض الكل', zh: '查看全部', ru: 'Все' })}</span>
          <ArrowRight size={13} className="ltr:inline rtl:hidden" />
          <ArrowLeft size={13} className="rtl:inline ltr:hidden" />
        </Link>
      </div>

      {/* Mobile Horizontal Snap-scroll / Desktop Grid */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        {tours.map((t) => {
          const title = locale === 'fa' ? t.title : (t.titleEn || t.title);
          const city = locale === 'fa' ? t.city : (t.cityEn || t.city);
          const img = t.heroImage || (t.gallery && t.gallery[0]) || '/images/isfahan/sheikh-lotfollah.jpg';

          return (
            <Link
              key={t.id}
              href={`/tours/${t.id}`}
              className="w-[280px] sm:w-auto shrink-0 snap-start bg-surface rounded-2xl overflow-hidden border border-line shadow-xs hover:shadow-elev-2 hover:border-brand/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative aspect-[16/10] overflow-hidden bg-soft">
                  <TourImage
                    src={img}
                    alt={title}
                    loading="eager"
                    sizes="(max-width: 640px) 280px, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 start-2.5 bg-deep/80 backdrop-blur-md text-surface text-[10.5px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Star size={11} className="text-gold fill-gold" />
                    <span>{num(t.rating, locale)}</span>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 flex flex-col gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-bold text-sub">
                    <MapPin size={11} className="text-brand-dark shrink-0" />
                    <span>{city}</span>
                    <span className="mx-1">•</span>
                    <CalendarDays size={11} className="text-brand-dark shrink-0" />
                    <span>{num(t.durationDays, locale)} {lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })}</span>
                  </div>

                  <h3 className="font-black text-xs sm:text-sm text-ink group-hover:text-brand-dark transition-colors line-clamp-2 leading-snug">
                    {title}
                  </h3>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 pt-0 border-t border-line/60 mt-1 flex items-center justify-between">
                <div className="pt-2">
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-sub block">{lt(locale, { fa: 'شروع از', en: 'Starts from', ar: 'يبدأ من', zh: '起价', ru: 'от' })}</span>
                  <div className="text-xs sm:text-sm font-black text-price font-mono">
                    {num(t.price, locale)}
                    <span className="text-[10px] font-bold text-sub ms-1">تومان</span>
                  </div>
                </div>

                <span className="mt-2 text-[11px] sm:text-xs font-black text-brand-dark group-hover:translate-x-[-2px] transition-transform inline-flex items-center gap-1">
                  <span>{lt(locale, { fa: 'جزئیات', en: 'Details', ar: 'التفاصيل', zh: '详情', ru: 'Инфо' })}</span>
                  <ArrowRight size={12} className="ltr:inline rtl:hidden" />
                  <ArrowLeft size={12} className="rtl:inline ltr:hidden" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
