'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { Star, MapPin, Heart, Wallet, Check, ChevronLeft, X } from 'lucide-react';
import { fa1, fa } from '@/lib/hotel-format';
import { GALLERY } from '@/lib/hotel-mock';
import type { Hotel } from '@/lib/types';

export function HotelHero({ hotel }: { hotel: Hotel }) {
  const [fav, setFav] = useState(false);
  const [lbIndex, setLbIndex] = useState<number | null>(null);

  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-3 py-2.5 text-xs font-bold text-sub">
          <Link href="/hotels/search" className="inline-flex items-center gap-1.5 text-brand-dark font-extrabold">→ بازگشت به نتایج جستجو</Link>
          <span className="me-auto flex items-center gap-1.5 flex-wrap">
            <Link href="/destinations" className="hover:text-brand">مقاصد</Link>
            <ChevronLeft size={11} className="text-line" />
            <span>{hotel.city}</span>
            <ChevronLeft size={11} className="text-line" />
            <span className="font-extrabold text-ink">{hotel.name}</span>
          </span>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="pt-5 pb-3 flex items-start gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="inline-flex gap-px">{Array.from({ length: hotel.stars }).map((_, i) => <Star key={i} size={15} className="fill-gold text-gold" />)}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gold/40 text-price bg-gold-soft text-[11px] font-extrabold"><Wallet size={12} /> پرداخت با درگاه ریالی</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-success/30 text-success bg-success/10 text-[11px] font-extrabold"><Check size={12} /> تأییدشده توسط iTrip</span>
            </div>
            <h1 className="m-0 mb-1.5 text-[clamp(22px,3vw,30px)] font-black tracking-tight">{hotel.name}</h1>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-sub flex-wrap">
              <MapPin size={15} className="text-brand" />
              {hotel.city} — {hotel.distanceFromCenter}
              <a href="#location" className="text-brand-dark font-extrabold underline underline-offset-[3px]">نمایش روی نقشه</a>
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2.5">
            <button onClick={() => setFav(!fav)} aria-label="ذخیره" className={`w-10 h-10 grid place-items-center border rounded-xl bg-surface ${fav ? 'text-rose-warm border-destructive/30 bg-destructive/10' : 'border-line text-sub'}`}>
              <Heart size={17} className={fav ? 'fill-rose-warm' : ''} />
            </button>
            <div className="flex items-center gap-2">
              <div className="text-end">
                <b className="block text-[13px] font-black leading-tight">فوق‌العاده</b>
                <span className="block text-[11px] font-bold text-sub">{hotel.reviewsCount.toLocaleString('fa-IR')} نظر تأییدشده</span>
              </div>
              <span className="min-w-[52px] h-[42px] grid place-items-center rounded-full rounded-es-sm text-surface bg-brand text-[17px] font-black">{fa1(hotel.rating)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr] grid-rows-[132px_132px] md:grid-rows-[150px_150px] gap-2 rounded-2xl overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <button
              key={i}
              onClick={() => setLbIndex(i)}
              className={`relative overflow-hidden border-0 p-0 cursor-pointer group ${i === 0 ? 'row-span-2 col-span-2 md:col-span-1' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={GALLERY[i]}
                alt={['نمای بیرونی', 'لابی', 'اتاق دلوکس', 'تراس صبحانه', 'سوئیت'][i]}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute bottom-2.5 end-2.5 px-2 py-1 rounded-lg bg-black/55 text-surface text-[10.5px] font-extrabold">
                {['نمای بیرونی', 'لابی', 'اتاق دلوکس', 'تراس صبحانه', 'سوئیت'][i]}
              </span>
              {i === 4 && <span className="absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-[2px] text-surface text-[13px] font-black">+۱۹ تصویر دیگر</span>}
            </button>
          ))}
        </div>
      </main>

      {lbIndex !== null && (
        <div className="fixed inset-0 z-140 flex items-center justify-center bg-ink/95 p-4" onClick={() => setLbIndex(null)}>
          <div className="w-full max-w-[760px]" onClick={(e) => e.stopPropagation()}>
            <div className="img-arch overflow-hidden aspect-[4/3] grid place-items-center bg-deep ph-texture">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={GALLERY[lbIndex]} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2.5 mt-3 text-mint-bright text-[12.5px] font-extrabold">
              <button onClick={() => setLbIndex((lbIndex + 4) % 5)} className="w-10 h-10 grid place-items-center border border-white/25 rounded-xl bg-surface/10">›</button>
              <button onClick={() => setLbIndex((lbIndex + 1) % 5)} className="w-10 h-10 grid place-items-center border border-white/25 rounded-xl bg-surface/10">‹</button>
              <span>{['نمای بیرونی', 'لابی', 'اتاق دلوکس', 'تراس صبحانه', 'سوئیت'][lbIndex]} — {fa(lbIndex + 1)} از {fa(5)}</span>
              <button onClick={() => setLbIndex(null)} className="me-auto w-10 h-10 grid place-items-center border border-white/25 rounded-xl bg-surface/10"><X size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
