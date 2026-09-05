'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Star, MapPin, Heart, Wallet, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fa1 } from '@/lib/hotel-format';
import { shimmerDataUrl } from '@/lib/image-utils';
import { GALLERY } from '@/lib/hotel-mock';
import type { Hotel } from '@/lib/types';
import { lt } from '@/lib/lt';
import { formatDistance } from '@/lib/format';

export function HotelHero({ hotel }: { hotel: Hotel }) {
  const t = useTranslations('HotelDetail');
  const locale = useLocale();
  const isRtl = ['fa', 'ar'].includes(locale);
  const [fav, setFav] = useState(false);
  const [lbIndex, setLbIndex] = useState<number | null>(null);

  // Localized hotel name, city and distance
  const displayName = locale === 'fa' ? hotel.name : (hotel.nameEn || hotel.name);
  const displayCity = locale === 'fa' ? hotel.city : (hotel.cityEn || hotel.city);

  // Approximate localized distance for the 7 demo hotels
  const distanceMap: Record<string, { en: string; fa: string }> = {
    h1: { fa: '۵۰۰ متر تا حرم', en: '500 m to Holy Shrine' },
    h2: { fa: '۱ کیلومتر تا میدان نقش جهان', en: '1 km to Naqsh-e Jahan Square' },
    h3: { fa: '۳۰۰ متر از ساحل جبرعلی', en: '300 m from JBR Beach' },
    h4: { fa: 'قلب شهر قدیم', en: 'Heart of Old Town' },
    h5: { fa: '۵۰۰ متر تا تاکسیم', en: '500 m to Taksim Square' },
    h6: { fa: '۲۰۰ متر تا میدان سرخ', en: '200 m to Red Square' },
    h7: { fa: 'ساحل القرم', en: 'Qurum Beachfront' },
  };
  const displayDist = hotel.distanceKm !== undefined
    ? formatDistance(hotel.distanceKm, hotel.nearestPoiName, locale)
    : (locale === 'fa'
        ? hotel.distanceFromCenter
        : (distanceMap[hotel.id]?.en || hotel.distanceFromCenterEn || hotel.distanceFromCenter));

  const displayRating = locale === 'fa'
    ? fa1(hotel.rating)
    : hotel.rating.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const galleryLabels = [
    t('exteriorView'),
    t('lobby'),
    t('deluxeRoom'),
    t('breakfastTerrace'),
    t('suite'),
  ];

  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-3 py-2.5 text-xs font-bold text-sub">
          <Link href="/hotels/search" className="inline-flex items-center gap-1.5 text-brand-dark font-extrabold">
            {isRtl ? '→ ' : '← '} {t('backToSearch')}
          </Link>
          <span className="me-auto flex items-center gap-1.5 flex-wrap">
            <Link href="/destinations" className="hover:text-brand">{t('destinations')}</Link>
            <ChevronLeft size={11} className="text-line ltr:rotate-180" />
            <span>{displayCity}</span>
            <ChevronLeft size={11} className="text-line ltr:rotate-180" />
            <span className="font-extrabold text-ink">{displayName}</span>
          </span>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="pt-5 pb-3 flex items-start gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="inline-flex gap-px">
                {Array.from({ length: hotel.stars }).map((_, i) => (
                  <Star key={i} size={15} className="fill-gold text-gold" />
                ))}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gold/40 text-price bg-gold-soft text-[11px] font-extrabold">
                <Wallet size={12} /> {t('payRial')}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-success/30 text-success bg-success/10 text-[11px] font-extrabold">
                <Check size={12} /> {t('verifiedByFiruzo')}
              </span>
            </div>
            <h1 className="m-0 mb-1.5 text-[clamp(22px,3vw,30px)] font-black tracking-tight">{displayName}</h1>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-sub flex-wrap">
              <MapPin size={15} className="text-brand" />
              {displayCity} — {displayDist}
              <a href="#location" className="text-brand-dark font-extrabold underline underline-offset-[3px]">
                {t('showOnMap')}
              </a>
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2.5">
            <button
              onClick={() => setFav(!fav)}
              aria-label={lt(locale, { fa: 'علاقه‌مندی', en: 'Add to favorites', ar: 'المفضلة', zh: '收藏', ru: 'В избранное' })}
              className={`w-10 h-10 grid place-items-center border rounded-xl bg-surface ${
                fav ? 'text-rose-warm border-destructive/30 bg-destructive/10' : 'border-line text-sub'
              }`}
            >
              <Heart size={17} className={fav ? 'fill-rose-warm' : ''} />
            </button>
            <div className="flex items-center gap-2">
              <div className="text-end">
                <b className="block text-[13px] font-black leading-tight">{t('superb')}</b>
                <span className="block text-[11px] font-bold text-sub">
                  {hotel.reviewsCount.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} {t('verifiedReviews')}
                </span>
              </div>
              <span className="min-w-[52px] h-[42px] grid place-items-center rounded-full rounded-es-sm text-surface bg-brand text-[17px] font-black">
                {displayRating}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr] grid-rows-[132px_132px] md:grid-rows-[150px_150px] gap-2 rounded-2xl overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <button
              key={i}
              onClick={() => setLbIndex(i)}
              className={`relative overflow-hidden border-0 p-0 cursor-pointer group ${
                i === 0 ? 'row-span-2 col-span-2 md:col-span-1' : ''
              }`}
            >
              <Image
                src={GALLERY[i]}
                alt={galleryLabels[i]}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(800, 600)}
                priority={i === 0}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute bottom-2.5 end-2.5 px-2 py-1 rounded-lg bg-black/55 text-surface text-[10.5px] font-extrabold z-10">
                {galleryLabels[i]}
              </span>
              {i === 4 && (
                <span className="absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-[2px] text-surface text-[13px] font-black z-10">
                  {t('morePhotos', { count: 19 })}
                </span>
              )}
            </button>
          ))}
        </div>
      </main>

      {lbIndex !== null && (
        <div className="fixed inset-0 z-140 flex items-center justify-center bg-ink/95 p-4" onClick={() => setLbIndex(null)}>
          <div className="w-full max-w-[760px]" onClick={(e) => e.stopPropagation()}>
            <div className="relative overflow-hidden aspect-[4/3] rounded-2xl bg-deep ph-texture shadow-2xl">
              <Image
                src={GALLERY[lbIndex]}
                alt={galleryLabels[lbIndex]}
                fill
                sizes="760px"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(800, 600)}
                className="object-cover"
              />
            </div>
            <div className="flex items-center gap-2.5 mt-3 text-mint-bright text-[12.5px] font-extrabold">
              <button
                onClick={() => setLbIndex((lbIndex + 4) % 5)}
                aria-label={t('aria.previous')}
                className="w-10 h-10 grid place-items-center border border-white/25 rounded-xl bg-surface/10 hover:bg-surface/20 transition"
              >
                {isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
              <button
                onClick={() => setLbIndex((lbIndex + 1) % 5)}
                aria-label={t('aria.next')}
                className="w-10 h-10 grid place-items-center border border-white/25 rounded-xl bg-surface/10 hover:bg-surface/20 transition"
              >
                {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
              <span>
                {galleryLabels[lbIndex]} — {lbIndex + 1} / {5}
              </span>
              <button
                onClick={() => setLbIndex(null)}
                aria-label={t('aria.close')}
                className="me-auto w-10 h-10 grid place-items-center border border-white/25 rounded-xl bg-surface/10 hover:bg-surface/20 transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
