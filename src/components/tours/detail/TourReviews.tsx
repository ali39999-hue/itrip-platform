'use client';

import { useLocale } from 'next-intl';
import type { Tour } from '@/lib/types';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  Star,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

interface TourReviewsProps {
  tour: Tour;
}

export function TourReviews({ tour }: TourReviewsProps) {
  const locale = useLocale();
  const reviews = tour.reviews || [];

  const breakdown = [
    { label: lt(locale, { fa: 'برنامه‌ریزی و زمان‌بندی', en: 'Pacing & Itinerary', ar: 'الجدول والتوقيت', zh: '行程节奏与安排', ru: 'Программа и тайминг' }), score: 4.9 },
    { label: lt(locale, { fa: 'کیفیت هتل و اقامت', en: 'Hotel & Comfort', ar: 'الفندق والراحة', zh: '酒店与住宿舒适度', ru: 'Отель и комфорт' }), score: 4.8 },
    { label: lt(locale, { fa: 'تسلط و اخلاق راهنمای تور', en: 'Tour Guide Mastery', ar: 'كفاءة المرشد', zh: '导游专业与态度', ru: 'Гид и сопровождение' }), score: 4.9 },
    { label: lt(locale, { fa: 'ارزش خدمات نسبت به قیمت', en: 'Value for Money', ar: 'القيمة مقابل السعر', zh: '性价比满意度', ru: 'Соотношение цена/качество' }), score: 4.7 },
  ];

  return (
    <section id="reviews" className="scroll-mt-32 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-xs flex flex-col gap-4 sm:gap-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-1.5 text-brand-dark font-black text-xs sm:text-sm mb-1">
          <MessageSquare size={16} />
          <span>{lt(locale, { fa: 'دیدگاه‌های مستند مسافران', en: 'Traveler Reviews & Ratings', ar: 'آراء وتقييمات المسافرين', zh: '真实旅客评价与口碑', ru: 'Отзывы путешественников' })}</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-ink">
          {lt(locale, { fa: 'تجربه همسفران قبلی از شرکت در این تور', en: 'What Fellow Travelers Say About This Tour', ar: 'ماذا يقول المسافرون عن هذه الجولة', zh: '来自往期参团旅客的真实心声', ru: 'Отзывы участников тура' })}
        </h2>
      </div>

      {/* Score and breakdown card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-soft border border-line grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 sm:gap-6 items-center">
        <div className="flex flex-col items-center justify-center text-center p-2 border-b md:border-b-0 md:border-e border-line/70">
          <div className="text-3xl sm:text-5xl font-black text-ink font-mono mb-1">
            {num(tour.rating, locale)}
          </div>
          <div className="flex items-center gap-1 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < Math.floor(tour.rating) ? 'fill-gold text-gold' : 'text-line'}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-sub">
            {lt(locale, { fa: 'بر اساس', en: 'Based on', ar: 'بناءً على', zh: '基于', ru: 'На основе' })} {num(tour.reviewsCount || 48, locale)} {lt(locale, { fa: 'نظر ثبت‌شده', en: 'reviews', ar: 'تقييم', zh: '条点评', ru: 'отзывов' })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {breakdown.map((item, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-ink">
                <span className="truncate">{item.label}</span>
                <span className="font-mono text-brand-dark shrink-0 ms-2">{num(item.score, locale)}</span>
              </div>
              <div className="w-full h-1.5 sm:h-2 rounded-full bg-surface overflow-hidden border border-line/60">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${(item.score / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Review Cards */}
      <div className="space-y-3">
        {reviews.map((rev) => {
          const comment = locale === 'fa' ? rev.comment : (rev.commentEn || rev.comment);

          return (
            <div
              key={rev.id}
              className="p-3.5 sm:p-5 rounded-2xl bg-surface border border-line/80 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand/10 text-brand-dark grid place-items-center font-black text-xs shrink-0">
                    {rev.author.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-ink">{rev.author}</span>
                      <span className="inline-flex items-center gap-0.5 text-[9.5px] sm:text-[10px] font-bold text-mint-bright bg-mint px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 size={10} /> {lt(locale, { fa: 'خریدار تاییدشده', en: 'Verified Buyer', ar: 'مشتري مؤكد', zh: '已验证买家', ru: 'Подтверждён' })}
                      </span>
                    </div>
                    <span className="text-[10.5px] sm:text-[11px] font-medium text-sub">{rev.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-gold-soft px-2 py-0.5 rounded-lg text-xs font-black text-price font-mono shrink-0">
                  <Star size={11} className="fill-gold text-gold" />
                  <span>{num(rev.rating, locale)}</span>
                </div>
              </div>

              <p className="text-xs sm:text-[13px] font-medium text-sub leading-relaxed pt-1">
                {comment}
              </p>

              {rev.travelType && (
                <div className="pt-1.5 border-t border-line/50 text-[10.5px] sm:text-[11px] font-bold text-sub">
                  <span>{lt(locale, { fa: 'همسفر:', en: 'Type:', ar: 'النوع:', zh: '出行：', ru: 'Тип:' })} </span>
                  <span className="text-ink">{rev.travelType}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
