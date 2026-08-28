'use client';

import React from 'react';
import Image from 'next/image';
import { Star, Heart, MapPin } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { shimmerDataUrl } from '@/lib/image-utils';
import type { HotelCardProps } from './types';

const AM_FA: Record<string, string> = {
  wifi: 'وای‌فای',
  pool: 'استخر',
  spa: 'اسپا',
  restaurant: 'رستوران',
  parking: 'پارکینگ',
  shuttle: 'ترانسفر',
  garden: 'باغ',
  museum: 'موزه',
  teahouse: 'چایخانه',
  gym: 'باشگاه',
  beach_access: 'ساحل',
};

export function HotelCard({
  hotel,
  fav,
  onFav,
  cmpChecked,
  onCmp,
  nights = 4,
}: HotelCardProps) {
  const img = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&q=80';
  const priceMillion = (hotel.pricePerNight / 10000000).toFixed(1);
  const totalMillion = ((hotel.pricePerNight * nights) / 10000000).toFixed(1);

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
            کنسلی رایگان
          </span>
        )}
        <button
          type="button"
          onClick={onFav}
          aria-label="افزودن به علاقه‌مندی‌ها"
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
                <span className="text-xs text-sub">{hotel.city}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-ink group-hover:text-brand-dark transition-colors">
                {hotel.name}
              </h3>
              <p className="text-xs text-sub font-mono">{hotel.nameEn}</p>
            </div>
            <div className="text-end shrink-0">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand/10 text-brand-dark font-black text-sm">
                <span>{hotel.rating}</span>
                <span className="text-[11px] text-sub font-normal">/ 10</span>
              </div>
              <p className="text-[11px] text-sub mt-0.5">{hotel.reviewsCount} نظر</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-sub mb-3">
            <MapPin size={13} className="text-brand" />
            <span>{hotel.distanceFromCenter}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 4).map((am) => (
              <span key={am} className="px-2 py-0.5 rounded-lg bg-soft text-sub text-xs font-medium">
                {AM_FA[am] || am}
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
              <span>مقایسه اقامتگاه</span>
            </label>
            <div className="text-[11px] text-sub mt-1">
              جمع {nights} شب ≈ {totalMillion} میلیون ت
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="text-end">
              <span className="text-xs text-sub block">هر شب از</span>
              <span className="text-base sm:text-lg font-black text-ink font-mono num">
                {priceMillion} <span className="text-xs font-normal text-sub">میلیون ت</span>
              </span>
            </div>
            <Link
              href={`/hotels/${hotel.id}`}
              className="h-11 px-5 rounded-xl bg-action hover:bg-gold-light text-[#14201f] font-black text-xs sm:text-sm flex items-center justify-center transition shadow-sm hover:shadow-elev-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              مشاهده و رزرو
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
