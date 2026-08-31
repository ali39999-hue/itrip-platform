'use client';

import React from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Star, Heart, MapPin } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { shimmerDataUrl, getHotelImage } from '@/lib/image-utils';
import { num } from '@/lib/format';
import { lt, LText } from '@/lib/lt';
import type { HotelCardProps } from './types';

const AM_MAP: Record<string, LText> = {
  wifi: { fa: 'وای‌فای', en: 'Wi-Fi', ar: 'واي فاي', zh: '无线网络', ru: 'Wi-Fi' },
  pool: { fa: 'استخر', en: 'Pool', ar: 'مسبح', zh: '游泳池', ru: 'Бассейн' },
  spa: { fa: 'اسپا', en: 'Spa', ar: 'سبا', zh: '水疗', ru: 'Спа' },
  restaurant: { fa: 'رستوران', en: 'Restaurant', ar: 'مطعم', zh: '餐厅', ru: 'Ресторан' },
  parking: { fa: 'پارکینگ', en: 'Parking', ar: 'موقف سيارات', zh: '停车场', ru: 'Парковка' },
  shuttle: { fa: 'ترانسفر', en: 'Shuttle', ar: 'نقل مكوكي', zh: '接送服务', ru: 'Трансфер' },
  garden: { fa: 'باغ', en: 'Garden', ar: 'حديقة', zh: '花园', ru: 'Сад' },
  museum: { fa: 'موزه', en: 'Museum', ar: 'متحف', zh: '博物馆', ru: 'Музей' },
  teahouse: { fa: 'چایخانه', en: 'Tea House', ar: 'بيت شاي', zh: '茶馆', ru: 'Чайный дом' },
  gym: { fa: 'باشگاه', en: 'Gym', ar: 'صالة رياضية', zh: '健身房', ru: 'Фитнес' },
  beach_access: { fa: 'ساحل', en: 'Beach', ar: 'شاطئ', zh: '海滩', ru: 'Пляж' },
  terrace: { fa: 'تراس', en: 'Terrace', ar: 'تراس', zh: '露台', ru: 'Терраса' },
};

const DISTANCE_MAP: Record<string, LText> = {
  '۵۰۰ متر تا حرم': { fa: '۵۰۰ متر تا حرم', en: '500 m to the Shrine', ar: 'على بُعد ٥٠٠ متر من الحرم', zh: '距圣地500米', ru: '500 м до святыни' },
  '۱ کیلومتر تا میدان نقش جهان': { fa: '۱ کیلومتر تا میدان نقش جهان', en: '1 km to Naqsh-e Jahan Square', ar: 'على بُعد ١ كم من ساحة نقش جهان', zh: '距伊玛目广场1公里', ru: '1 км до площади Накш-е Джахан' },
  '۳۰۰ متر از ساحل جبرعلی': { fa: '۳۰۰ متر از ساحل جبرعلی', en: '300 m from Jebel Ali Beach', ar: 'على بُعد ٣٠٠ متر من شاطئ جبل علي', zh: '距杰贝阿里海滩300米', ru: '300 м от пляжа Джебель-Али' },
  'قلب شهر قدیم': { fa: 'قلب شهر قدیم', en: 'Heart of the old town', ar: 'في قلب المدينة القديمة', zh: '老城中心地带', ru: 'В самом сердце старого города' },
  '۵۰۰ متر تا تاکسیم': { fa: '۵۰۰ متر تا تاکسیم', en: '500 m to Taksim', ar: 'على بُعد ٥٠٠ متر من تقسيم', zh: '距塔克西姆500米', ru: '500 м до Таксим' },
  '۲۰۰ متر تا میدان سرخ': { fa: '۲۰۰ متر تا میدان سرخ', en: '200 m to Red Square', ar: 'على بُعد ٢٠٠ متر من الساحة الحمراء', zh: '距红场200米', ru: '200 м до Красной площади' },
  'ساحل القرم': { fa: 'ساحل القرم', en: 'Al Qurm Beach', ar: 'شاطئ القرم', zh: '阿尔古姆海滩', ru: 'Пляж Аль-Курм' },
};

export function HotelCard({
  hotel,
  fav,
  onFav,
  cmpChecked,
  onCmp,
  nights = 4,
}: HotelCardProps) {
  const locale = useLocale();
  const t = useTranslations('HotelsSearch');

  const img = getHotelImage(hotel);
  const priceMillion = num(hotel.pricePerNight / 10000000, locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const totalMillion = num((hotel.pricePerNight * nights) / 10000000, locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <article className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 hover:border-brand/40 transition-all shadow-elev-1 hover:shadow-elev-2 group">
      {/* Hotel Image with Badges */}
      <div className="relative w-full md:w-64 h-52 md:h-auto rounded-2xl overflow-hidden shrink-0 bg-soft">
        <Image
          src={img}
          alt={hotel.name}
          fill
          sizes="(max-width: 768px) 100vw, 256px"
          placeholder="blur"
          blurDataURL={shimmerDataUrl(256, 192)}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {hotel.freeCancellation && (
          <span className="absolute top-2.5 start-2.5 px-2.5 py-1 rounded-full bg-emerald-600/90 text-surface text-xs font-black shadow-sm backdrop-blur-sm">
            {t('freeCancel')}
          </span>
        )}
        <button
          type="button"
          onClick={onFav}
          aria-label={t('addFav')}
          className="absolute top-2.5 end-2.5 w-8 h-8 rounded-full bg-surface/85 backdrop-blur-sm text-ink grid place-items-center hover:bg-surface transition shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <Heart size={16} className={fav ? 'fill-rose-500 text-rose-500' : 'text-sub'} />
        </button>
      </div>

      {/* Hotel Content & Info */}
      <div className="flex-1 flex flex-col justify-between gap-4">
        <div>
          {/* Header Row: Stars, City, Name & Rating */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex text-gold">
                  {Array.from({ length: hotel.stars }).map((_, i) => (
                    <Star key={i} size={13} className="fill-gold text-gold" />
                  ))}
                </div>
                <span className="text-xs text-sub font-bold">{locale === 'fa' ? hotel.city : hotel.cityEn}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-ink group-hover:text-brand-dark transition-colors">
                {locale === 'fa' ? hotel.name : hotel.nameEn}
              </h3>
              {locale === 'fa' && (
                <p className="text-xs text-sub font-mono">{hotel.nameEn}</p>
              )}
            </div>

            {/* Score Rating Badge with LTR protection to prevent flipped slashes */}
            <div className="text-end shrink-0">
              <div
                dir="ltr"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-mint text-brand-dark font-black text-sm border border-brand/20 shadow-xs"
              >
                <span>{num(hotel.rating, locale)}</span>
                <span className="text-[11px] text-sub font-bold">/ {num(10, locale)}</span>
              </div>
              <p className="text-[11px] text-sub font-bold mt-1">
                {num(hotel.reviewsCount, locale)} {t('reviews')}
              </p>
            </div>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-1.5 text-xs text-sub mb-3">
            <MapPin size={13} className="text-brand-dark shrink-0" />
            <span>
              {lt(locale, DISTANCE_MAP[hotel.distanceFromCenter] ?? { fa: hotel.distanceFromCenter, en: hotel.distanceFromCenter })}
            </span>
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 5).map((am) => (
              <span key={am} className="px-2.5 py-0.5 rounded-lg bg-soft border border-line/50 text-sub text-[11px] font-bold">
                {(AM_MAP[am] && lt(locale, AM_MAP[am])) || am}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Row: Compare & Total + Price & Booking CTA */}
        <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-sub font-bold">
              <input
                type="checkbox"
                checked={cmpChecked}
                onChange={onCmp}
                className="w-4 h-4 rounded border-line text-brand focus:ring-brand"
              />
              <span>{t('compare')}</span>
            </label>
            <div className="text-[11px] text-sub font-medium">
              {t('totalNights', { nights, price: totalMillion })}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="text-end">
              <span className="text-[11px] text-sub block font-medium">{t('perNightFrom')}</span>
              <div className="text-base sm:text-lg font-black text-ink font-mono num flex items-baseline gap-1">
                <span>{priceMillion}</span>
                <span className="text-xs font-bold text-sub">{t('millionToman')}</span>
              </div>
            </div>
            <Link
              href={`/hotels/${hotel.id}`}
              className="h-11 px-5 rounded-xl bg-action hover:bg-action-hover text-[#14201f] font-black text-xs sm:text-sm flex items-center justify-center transition shadow-sm hover:shadow-elev-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:scale-[0.98]"
            >
              {t('viewAndBook')}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
