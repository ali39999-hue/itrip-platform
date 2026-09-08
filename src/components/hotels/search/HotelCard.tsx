'use client';

import React from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Star, Heart, MapPin, Coffee, Flame } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { shimmerDataUrl, getHotelImage } from '@/lib/image-utils';
import { num, formatDistance } from '@/lib/format';
import { lt, LText } from '@/lib/lt';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import type { HotelCardProps } from './types';

const AM_MAP: Record<string, LText> = {
  wifi: { fa: 'وای‌فای رایگان', en: 'Free Wi-Fi', ar: 'واي فاي مجاني', zh: '免费无线', ru: 'Бесплатный Wi-Fi' },
  pool: { fa: 'استخر', en: 'Pool', ar: 'مسبح', zh: '游泳池', ru: 'Бассейн' },
  spa: { fa: 'مرکز اسپا', en: 'Spa', ar: 'سبا', zh: '水疗中心', ru: 'Спа' },
  restaurant: { fa: 'رستوران سنتی', en: 'Restaurant', ar: 'مطعم', zh: '特色餐厅', ru: 'Ресторан' },
  parking: { fa: 'پارکینگ اختصاصی', en: 'Parking', ar: 'موقف سيارات', zh: '专属停车', ru: 'Парковка' },
  shuttle: { fa: 'ترانسفر فرودگاهی', en: 'Airport Shuttle', ar: 'نقل المطار', zh: '机场接送', ru: 'Трансфер' },
  garden: { fa: 'باغ تاریخی', en: 'Garden', ar: 'حديقة', zh: '花园', ru: 'Сад' },
  museum: { fa: 'موزه اختصاصی', en: 'Museum', ar: 'متحف', zh: '博物馆', ru: 'Музей' },
  teahouse: { fa: 'چایخانه سنتی', en: 'Tea House', ar: 'بيت شاي', zh: '传统茶馆', ru: 'Чайный дом' },
  gym: { fa: 'باشگاه ورزشی', en: 'Gym', ar: 'صالة رياضية', zh: '健身房', ru: 'Фитнес' },
  beach_access: { fa: 'دسترسی اختصاصی ساحل', en: 'Private Beach', ar: 'شاطئ خاص', zh: '私人沙滩', ru: 'Частный пляж' },
  terrace: { fa: 'تراس و بام سبز', en: 'Terrace', ar: 'تراس', zh: '观景露台', ru: 'Терраса' },
};

const DISTANCE_MAP: Record<string, LText> = {
  '۵۰۰ متر تا حرم': { fa: '۵۰۰ متر تا حرم', en: '500m to the Shrine', ar: 'على بُعد ٥٠٠ متر من الحرم', zh: '距圣地500米', ru: '500 м до святыни' },
  '۱ کیلومتر تا میدان نقش جهان': { fa: '۱ کیلومتر تا میدان نقش جهان', en: '1 km to Naqsh-e Jahan Square', ar: 'على بُعد ١ كم من ساحة نقش جهان', zh: '距伊玛目广场1公里', ru: '1 км до площади Накш-е Джахан' },
  '۳۰۰ متر از ساحل جبرعلی': { fa: '۳۰۰ متر از ساحل جبرعلی', en: '300m from Jebel Ali Beach', ar: 'على بُعد ٣٠٠ متر من شاطئ جبل علي', zh: '距杰贝阿里海滩300米', ru: '300 м от пляжа Джебель-Али' },
  'قلب شهر قدیم': { fa: 'قلب شهر قدیم', en: 'Heart of the old town', ar: 'في قلب المدينة القديمة', zh: '老城中心地带', ru: 'В самом сердце старого города' },
  '۵۰۰ متر تا تاکسیم': { fa: '۵۰۰ متر تا تاکسیم', en: '500m to Taksim Square', ar: 'على بُعد ٥٠٠ متر من تقسيم', zh: '距塔克西姆500米', ru: '500 м до Таксим' },
  '۲۰۰ متر تا میدان سرخ': { fa: '۲۰۰ متر تا میدان سرخ', en: '200m to Red Square', ar: 'على بُعد ٢٠٠ متر من الساحة الحمراء', zh: '距红场200米', ru: '200 м до Красной площади' },
  'ساحل القرم': { fa: 'ساحل القرم', en: 'Al Qurm Beachfront', ar: 'شاطئ القرم', zh: '阿尔古姆海滩', ru: 'Пляж Аль-Курм' },
};

export function HotelCard({
  hotel,
  fav,
  onFav,
  cmpChecked,
  onCmp,
  nights = 4,
  checkin,
  checkout,
  adults,
  childrenCount,
}: HotelCardProps) {
  const locale = useLocale();
  const t = useTranslations('HotelsSearch');
  const { formatAmount } = useDisplayCurrency();

  const queryParams = new URLSearchParams();
  if (checkin) queryParams.set('checkin', checkin);
  if (checkout) queryParams.set('checkout', checkout);
  if (adults !== undefined) queryParams.set('adults', String(adults));
  if (childrenCount !== undefined) queryParams.set('children', String(childrenCount));
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const img = getHotelImage(hotel);
  const fallbackImg = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
  const [imgSrc, setImgSrc] = React.useState(img);

  React.useEffect(() => {
    setImgSrc(img);
  }, [img]);

  const distanceText = hotel.distanceKm !== undefined
    ? formatDistance(hotel.distanceKm, hotel.nearestPoiName, locale)
    : lt(
        locale,
        DISTANCE_MAP[hotel.distanceFromCenter] ?? {
          fa: hotel.distanceFromCenter,
          en: hotel.distanceFromCenterEn || hotel.distanceFromCenter,
        }
      );

  return (
    <article
      aria-label={`${locale === 'fa' ? hotel.name : hotel.nameEn}, ${hotel.stars} stars, ${locale === 'fa' ? hotel.city : hotel.cityEn}`}
      className="bg-surface border border-line rounded-2xl p-3.5 sm:p-5 hover:border-brand/40 transition-all shadow-elev-1 hover:shadow-elev-2 group"
    >
      {/* ========================================================================= */}
      {/* 1. MOBILE COMPACT VIEW (< MD) — FLYTODAY MOBILE STANDARD                  */}
      {/* ========================================================================= */}
      <div className="md:hidden flex flex-col gap-3">
        {/* Top: Image Thumbnail + Main Info in a 2-Column Row */}
        <div className="flex items-start gap-3">
          {/* Thumbnail with free cancel & fav */}
          <div className="relative w-28 h-32 rounded-xl overflow-hidden shrink-0 bg-soft">
            <Image
              src={imgSrc}
              alt={hotel.name}
              fill
              sizes="112px"
              placeholder="blur"
              blurDataURL={shimmerDataUrl(112, 128)}
              className="object-cover"
              onError={() => setImgSrc(fallbackImg)}
            />
            {hotel.freeCancellation && (
              <span className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded-md bg-success/90 text-surface text-[9px] font-black shadow-xs">
                {t('freeCancel')}
              </span>
            )}
            <button
              type="button"
              onClick={onFav}
              aria-label={t('addFav')}
              className="absolute top-1.5 end-1.5 w-8 h-8 rounded-full bg-surface/90 backdrop-blur-xs text-ink grid place-items-center shadow-xs active:scale-90 transition"
            >
              <Heart size={14} className={fav ? 'fill-rose-warm text-rose-warm' : 'text-sub'} aria-hidden="true" />
            </button>
          </div>

          {/* Details Column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between h-32">
            <div>
              {/* Stars & City */}
              <div className="flex items-center gap-1 mb-0.5">
                <div
                  role="img"
                  aria-label={lt(locale, { fa: `${hotel.stars} ستاره از ۵`, en: `${hotel.stars} out of 5 stars`, ar: `${hotel.stars} نجوم من 5`, zh: `${hotel.stars}星级（共5星）`, ru: `${hotel.stars} из 5 звезд` })}
                  className="flex text-gold"
                >
                  {Array.from({ length: hotel.stars }).map((_, i) => (
                    <Star key={i} size={11} className="fill-gold text-gold" aria-hidden="true" />
                  ))}
                </div>
                <span className="text-[11px] text-sub font-bold truncate">
                  {locale === 'fa' ? hotel.city : hotel.cityEn}
                </span>
              </div>

              {/* Hotel Name */}
              <h3 className="text-sm font-black text-ink leading-snug line-clamp-2">
                {locale === 'fa' ? hotel.name : hotel.nameEn}
              </h3>

              {/* Distance to Center */}
              <div className="flex items-center gap-1 text-[10.5px] text-brand-dark font-bold mt-1 truncate">
                <MapPin size={11} className="text-brand shrink-0" />
                <span className="truncate">{distanceText}</span>
              </div>
            </div>

            {/* Rating Score Badge */}
            <div className="flex items-center justify-between mt-auto">
              <div
                dir="ltr"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-mint text-brand-dark font-black text-xs border border-brand/20"
              >
                <span>{num(hotel.rating, locale)}</span>
                <span className="text-[10px] text-sub font-bold">/ {num(10, locale)}</span>
              </div>
              <span className="text-[10px] text-sub font-bold">
                {num(hotel.reviewsCount, locale)} {t('reviews')}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Price & Booking CTA */}
        <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-sub block font-bold leading-none mb-0.5">
              {t('perNightFrom')}
            </span>
            <div className="text-sm font-black text-brand-dark font-mono num flex items-baseline gap-1">
              <span>{formatAmount(hotel.pricePerNight)}</span>
            </div>
          </div>

          <Link
            href={`/hotels/${hotel.id}${queryString}`}
            aria-label={`${t('viewAndBook')} - ${locale === 'fa' ? hotel.name : hotel.nameEn}`}
            className="h-9 px-4 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs flex items-center justify-center transition active:scale-95 shadow-xs"
          >
            {t('viewAndBook')}
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP VIEW (MD+)                                                     */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-row gap-5">
        {/* Hotel Image with Badges */}
        <div className="relative w-64 h-auto rounded-2xl overflow-hidden shrink-0 bg-soft">
          <Image
            src={imgSrc}
            alt={hotel.name}
            fill
            sizes="256px"
            placeholder="blur"
            blurDataURL={shimmerDataUrl(256, 192)}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgSrc(fallbackImg)}
          />
          {hotel.freeCancellation && (
            <span className="absolute top-2.5 start-2.5 px-2.5 py-1 rounded-full bg-success/90 text-surface text-xs font-black shadow-elev-1 backdrop-blur-sm">
              {t('freeCancel')}
            </span>
          )}
          <button
            type="button"
            onClick={onFav}
            aria-label={t('addFav')}
            className="absolute top-2.5 end-2.5 w-8 h-8 rounded-full bg-surface/85 backdrop-blur-sm text-ink grid place-items-center hover:bg-surface transition shadow-elev-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <Heart size={16} className={fav ? 'fill-rose-warm text-rose-warm' : 'text-sub'} aria-hidden="true" />
          </button>
        </div>

        {/* Hotel Content & Info */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
            {/* Header Row: Stars, City, Name & Rating */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    role="img"
                    aria-label={lt(locale, { fa: `${hotel.stars} ستاره از ۵`, en: `${hotel.stars} out of 5 stars`, ar: `${hotel.stars} نجوم من 5`, zh: `${hotel.stars}星级（共5星）`, ru: `${hotel.stars} из 5 звезд` })}
                    className="flex text-gold"
                  >
                    {Array.from({ length: hotel.stars }).map((_, i) => (
                      <Star key={i} size={13} className="fill-gold text-gold" aria-hidden="true" />
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
                  <span className="text-brand-dark font-black me-1">
                    {hotel.rating >= 9.0
                      ? lt(locale, { fa: 'فوق‌العاده', en: 'Exceptional', ar: 'استثنائي', zh: '极佳', ru: 'Превосходно' })
                      : hotel.rating >= 8.5
                      ? lt(locale, { fa: 'عالی', en: 'Excellent', ar: 'ممتاز', zh: '很好', ru: 'Отлично' })
                      : lt(locale, { fa: 'بسیار خوب', en: 'Very Good', ar: 'جيد جداً', zh: '好', ru: 'Очень хорошо' })}
                  </span>
                  <span>({num(hotel.reviewsCount, locale)} {t('reviews')})</span>
                </p>
              </div>
            </div>

            {/* Decision Value Proposition Badge Row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-soft text-brand-dark text-xs font-bold border border-line/60">
                <MapPin size={12} className="text-brand shrink-0" aria-hidden="true" />
                <span>{distanceText}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200">
                <Coffee size={12} className="text-emerald-700" aria-hidden="true" />
                <span>{lt(locale, { fa: 'صبحانه بوفه رایگان', en: 'Free Breakfast', ar: 'إفطار مجاني', zh: '免费早餐', ru: 'Бесплатный завтрак' })}</span>
              </span>
              {hotel.rating >= 8.5 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-black border border-rose-200">
                  <Flame size={12} className="text-rose-600" aria-hidden="true" />
                  <span>
                    {lt(locale, {
                      fa: 'تنها ۲ اتاق با این نرخ باقی مانده',
                      en: 'Only 2 rooms left at this price',
                      ar: 'غرفتان فقط بهذا السعر',
                      zh: '仅剩2间特惠房',
                      ru: 'Осталось 2 номера',
                    })}
                  </span>
                </span>
              )}
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

          {/* Footer Row: Compare, Total Stay & Booking CTA */}
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
              <div className="text-xs text-sub font-medium">
                <span className="text-sub font-bold">
                  {lt(locale, {
                    fa: `جمع ${num(nights, locale)} شب:`,
                    en: `Total for ${num(nights, locale)} nights:`,
                    ar: `المجموع لـ ${num(nights, locale)} ليالٍ:`,
                    zh: `${num(nights, locale)} 晚总价:`,
                    ru: `Всего за ${num(nights, locale)} ноч.:`,
                  })}
                </span>{' '}
                <strong className="text-ink font-black font-mono">{formatAmount(hotel.pricePerNight * nights)}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="text-end">
                <span className="text-[11px] text-sub block font-medium">{t('perNightFrom')}</span>
                <div className="text-base sm:text-lg font-black text-brand-dark font-mono num flex items-baseline gap-1">
                  <span>{formatAmount(hotel.pricePerNight)}</span>
                </div>
              </div>
              <Link
                href={`/hotels/${hotel.id}${queryString}`}
                aria-label={`${t('viewAndBook')} - ${locale === 'fa' ? hotel.name : hotel.nameEn}`}
                className="h-11 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs sm:text-sm flex items-center justify-center transition shadow-sm hover:shadow-elev-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:scale-[0.98]"
              >
                {t('viewAndBook')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
