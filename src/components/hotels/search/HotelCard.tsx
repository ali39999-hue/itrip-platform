'use client';

import React from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Star, Heart, MapPin } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { shimmerDataUrl, getHotelImage } from '@/lib/image-utils';
import type { HotelCardProps } from './types';

const AM_MAP: Record<string, { fa: string; en: string }> = {
  wifi: { fa: 'وای‌فای', en: 'Wi-Fi' },
  pool: { fa: 'استخر', en: 'Pool' },
  spa: { fa: 'اسپا', en: 'Spa' },
  restaurant: { fa: 'رستوران', en: 'Restaurant' },
  parking: { fa: 'پارکینگ', en: 'Parking' },
  shuttle: { fa: 'ترانسفر', en: 'Shuttle' },
  garden: { fa: 'باغ', en: 'Garden' },
  museum: { fa: 'موزه', en: 'Museum' },
  teahouse: { fa: 'چایخانه', en: 'Tea House' },
  gym: { fa: 'باشگاه', en: 'Gym' },
  beach_access: { fa: 'ساحل', en: 'Beach' },
  terrace: { fa: 'تراس', en: 'Terrace' },
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
  const isRtl = ['fa', 'ar'].includes(locale);

  const img = getHotelImage(hotel);
  const rawPriceMillion = hotel.pricePerNight / 10000000;
  const rawTotalMillion = (hotel.pricePerNight * nights) / 10000000;

  const priceMillion = isRtl
    ? rawPriceMillion.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : rawPriceMillion.toFixed(1);

  const totalMillion = isRtl
    ? rawTotalMillion.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : rawTotalMillion.toFixed(1);

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
              <p className="text-xs text-sub font-mono">{locale === 'fa' ? hotel.nameEn : hotel.name}</p>
            </div>

            {/* Score Rating Badge with LTR protection to prevent flipped slashes */}
            <div className="text-end shrink-0">
              <div
                dir="ltr"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-mint text-brand-dark font-black text-sm border border-brand/20 shadow-xs"
              >
                <span>{isRtl ? hotel.rating.toLocaleString('fa-IR') : hotel.rating}</span>
                <span className="text-[11px] text-sub font-bold">/ {isRtl ? (10).toLocaleString('fa-IR') : '10'}</span>
              </div>
              <p className="text-[11px] text-sub font-bold mt-1">
                {isRtl ? hotel.reviewsCount.toLocaleString('fa-IR') : hotel.reviewsCount} {t('reviews')}
              </p>
            </div>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-1.5 text-xs text-sub mb-3">
            <MapPin size={13} className="text-brand-dark shrink-0" />
            <span>{hotel.distanceFromCenter}</span>
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 5).map((am) => (
              <span key={am} className="px-2.5 py-0.5 rounded-lg bg-soft border border-line/50 text-sub text-[11px] font-bold">
                {AM_MAP[am]?.[isRtl ? 'fa' : 'en'] || am}
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
              className="h-11 px-5 rounded-xl bg-action hover:bg-gold-light text-[#14201f] font-black text-xs sm:text-sm flex items-center justify-center transition shadow-sm hover:shadow-elev-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:scale-[0.98]"
            >
              {t('viewAndBook')}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
