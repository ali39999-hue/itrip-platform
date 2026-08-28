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
  const rawPriceMillion = (hotel.pricePerNight / 10000000);
  const rawTotalMillion = ((hotel.pricePerNight * nights) / 10000000);
  
  const priceMillion = isRtl
    ? rawPriceMillion.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : rawPriceMillion.toFixed(1);
    
  const totalMillion = isRtl
    ? rawTotalMillion.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : rawTotalMillion.toFixed(1);

  return (
    <article className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 hover:border-brand/40 transition-all shadow-elev-1 hover:shadow-elev-2 group">
      <div className="relative w-full md:w-64 h-48 md:h-auto rounded-xl overflow-hidden shrink-0 bg-soft">
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
          <span className="absolute top-2.5 start-2.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-surface text-xs font-bold shadow-sm backdrop-blur-sm">
            {t('freeCancel')}
          </span>
        )}
        <button
          type="button"
          onClick={onFav}
          aria-label={t('addFav')}
          className="absolute top-2.5 end-2.5 w-8 h-8 rounded-full bg-surface/80 backdrop-blur-sm text-ink grid place-items-center hover:bg-surface transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <Heart size={16} className={fav ? 'fill-rose-500 text-rose-500' : 'text-sub'} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="flex text-gold">
                  {Array.from({ length: hotel.stars }).map((_, i) => (
                    <Star key={i} size={13} className="fill-gold text-gold" />
                  ))}
                </div>
                <span className="text-xs text-sub">{locale === 'fa' ? hotel.city : hotel.cityEn}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-ink group-hover:text-brand-dark transition-colors">
                {locale === 'fa' ? hotel.name : hotel.nameEn}
              </h3>
              <p className="text-xs text-sub font-mono">{locale === 'fa' ? hotel.nameEn : hotel.name}</p>
            </div>
            <div className="text-end shrink-0">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand/10 text-brand-dark font-black text-sm">
                <span>{isRtl ? hotel.rating.toLocaleString('fa-IR') : hotel.rating}</span>
                <span className="text-[11px] text-sub font-normal">/ 10</span>
              </div>
              <p className="text-[11px] text-sub mt-0.5">
                {isRtl ? hotel.reviewsCount.toLocaleString('fa-IR') : hotel.reviewsCount} {t('reviews')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-sub mb-3">
            <MapPin size={13} className="text-brand" />
            <span>{hotel.distanceFromCenter}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 4).map((am) => (
              <span key={am} className="px-2 py-0.5 rounded-lg bg-soft text-sub text-xs font-medium">
                {AM_MAP[am]?.[isRtl ? 'fa' : 'en'] || am}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-sub font-medium">
              <input
                type="checkbox"
                checked={cmpChecked}
                onChange={onCmp}
                className="w-4 h-4 rounded border-line text-brand focus:ring-brand"
              />
              <span>{t('compare')}</span>
            </label>
            <div className="text-[11px] text-sub mt-1">
              {t('totalNights', { nights, price: totalMillion })}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="text-end">
              <span className="text-xs text-sub block">{t('perNightFrom')}</span>
              <span className="text-base sm:text-lg font-black text-ink font-mono num">
                {priceMillion} <span className="text-xs font-normal text-sub">{t('millionToman')}</span>
              </span>
            </div>
            <Link
              href={`/hotels/${hotel.id}`}
              className="h-11 px-5 rounded-xl bg-action hover:bg-gold-light text-[#14201f] font-black text-xs sm:text-sm flex items-center justify-center transition shadow-sm hover:shadow-elev-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              {t('viewAndBook')}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
