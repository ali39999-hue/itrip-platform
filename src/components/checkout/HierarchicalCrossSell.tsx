'use client';

import React, { useState } from 'react';
import {
  Plane,
  BedDouble,
  Plus,
  Check,
  X,
  Clock,
  Star,
  Luggage,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';

export interface HierarchicalCrossSellProps {
  locale: string;
  bookingType?: 'flights' | 'hotels' | 'stays' | 'tours' | 'transfers';
  title?: string;
  travelDate?: string;
  onAddService?: (service: { type: string; title: string; price: number }) => void;
  className?: string;
}

export function HierarchicalCrossSell({
  locale,
  bookingType = 'hotels',
  title = '',
  onAddService,
  className = '',
}: HierarchicalCrossSellProps) {
  const [dismissed, setDismissed] = useState(false);
  const [added, setAdded] = useState(false);

  if (dismissed) return null;

  // Extract destination city if mentioned in title
  const cityMatch =
    title.includes('استانبول') || title.toLowerCase().includes('istanbul')
      ? 'استانبول'
      : title.includes('دبی') || title.toLowerCase().includes('dubai')
      ? 'دبی'
      : title.includes('کیش') || title.toLowerCase().includes('kish')
      ? 'کیش'
      : title.includes('مشهد') || title.toLowerCase().includes('mashhad')
      ? 'مشهد'
      : title.includes('اصفهان') || title.toLowerCase().includes('isfahan')
      ? 'اصفهان'
      : title.includes('شیراز') || title.toLowerCase().includes('shiraz')
      ? 'شیراز'
      : title.includes('تفلیس') || title.toLowerCase().includes('tbilisi')
      ? 'تفلیس'
      : 'مقصد سفر شما';

  const isHotelBooking = bookingType === 'hotels' || bookingType === 'stays';

  // If neither hotel nor flight, default to suggesting accommodations or flights
  const mode = isHotelBooking ? 'suggest_flight' : 'suggest_hotel';

  const handleToggleAdd = () => {
    if (added) {
      setAdded(false);
    } else {
      setAdded(true);
      if (onAddService) {
        if (mode === 'suggest_flight') {
          onAddService({
            type: 'flight_addon',
            title: `پرواز مستقیم رفت و برگشت به ${cityMatch} با ماهان ایر`,
            price: 7_800_000,
          });
        } else {
          onAddService({
            type: 'hotel_addon',
            title: `۳ شب اقامت در هتل ۴ ستاره برگزیده ${cityMatch}`,
            price: 6_200_000,
          });
        }
      }
    }
  };

  return (
    <div
      className={`rounded-2xl border-2 transition-all p-4 sm:p-5 relative overflow-hidden ${
        added
          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-elev-1'
          : 'border-brand/30 bg-gradient-to-br from-brand/5 via-mint/10 to-surface hover:border-brand/60 shadow-xs'
      } ${className}`}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={lt(locale, { fa: 'بستن پیشنهاد', en: 'Dismiss', ar: 'إغلاق', zh: '关闭推荐', ru: 'Закрыть' })}
        className="absolute top-3 end-3 w-7 h-7 rounded-full bg-surface/80 hover:bg-soft text-sub hover:text-ink grid place-items-center transition cursor-pointer border border-line"
      >
        <X size={14} />
      </button>

      {/* CASE 1: USER IS BOOKING A HOTEL -> SUGGEST MATCHING FLIGHT */}
      {mode === 'suggest_flight' && (
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
              <Plane size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-ink m-0">
                  {lt(locale, {
                    fa: `پرواز رفت و برگشت به ${cityMatch} را هم اضافه کنید؟`,
                    en: `Add Round-Trip Flight to ${cityMatch}?`,
                    ar: `هل ترغب في إضافة طيران إلى ${cityMatch}؟`,
                    zh: `是否添加前往${cityMatch}的往返机票？`,
                    ru: `Добавить авиаперелет в ${cityMatch}?`,
                  })}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  {lt(locale, { fa: '۱۰٪ تخفیف پکیج', en: '10% Off Bundle', ar: 'خصم 10%', zh: '套票9折', ru: 'Скидка 10%' })}
                </span>
              </div>
              <p className="text-[11px] text-sub font-medium mt-0.5 mb-0">
                {lt(locale, {
                  fa: `هماهنگ با تاریخ اقامت شما · ترانسفر فرودگاهی رایگان و صدور آنی بلیت سیستمی`,
                  en: `Synced with your check-in dates · Free airport transfer & instant e-ticket`,
                  ar: `متزامن مع تواريخ إقامتك مع نقل مجاني من المطار`,
                  zh: `行程日期精准匹配，赠送单程接机并即时出票`,
                  ru: `Синхронизировано с датами проживания · Бесплатный трансфер`,
                })}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-ink">
                <span className="font-mono text-brand-dark font-black">W5 1120</span>
                <span>•</span>
                <span>هواپیمایی ماهان (Mahan Air)</span>
                <span>•</span>
                <span className="text-[11px] text-sub font-mono">تهران ← {cityMatch}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-sub">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>پرواز مستقیم رفت ۰۸:۳۰ • برگشت ۲۱:۱۵</span>
                </span>
                <span className="flex items-center gap-1">
                  <Luggage size={12} />
                  <span>بار مجاز ۳۰ کیلوگرم</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
              <div>
                <span className="text-[10px] text-sub block sm:text-end">نرخ ویژه رفت و برگشت:</span>
                <span className="text-sm sm:text-base font-black font-mono text-price">
                  {num(7800000, locale)} <span className="text-xs font-normal">تومان</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleAdd}
                className={`min-h-10 px-4 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand hover:bg-brand-dark text-white'
                }`}
              >
                {added ? (
                  <>
                    <Check size={14} />
                    <span>{lt(locale, { fa: 'پرواز افزوده شد', en: 'Flight Added', ar: 'تمت الإضافة', zh: '已添加机票', ru: 'Рейс добавлен' })}</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>{lt(locale, { fa: 'افزودن پرواز به رزرو', en: 'Add Flight', ar: 'إضافة الطيران', zh: '一键加购机票', ru: 'Добавить перелет' })}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASE 2: USER IS BOOKING A FLIGHT -> SUGGEST MATCHING HOTEL */}
      {mode === 'suggest_hotel' && (
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
              <BedDouble size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-ink m-0">
                  {lt(locale, {
                    fa: `اقامتگاه‌های برگزیده در ${cityMatch} همزمان با ورود شما`,
                    en: `Top Stays in ${cityMatch} for your Travel Dates`,
                    ar: `أفضل الفنادق في ${cityMatch} لتاريخ وصولك`,
                    zh: `${cityMatch}热门精选酒店（与抵离日期匹配）`,
                    ru: `Отели в ${cityMatch} на даты вашего прилета`,
                  })}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-mint text-brand-dark border border-brand/20">
                  {lt(locale, { fa: 'تضمین تمیزی و تطابق عکس', en: 'Verified Hygiene', ar: 'نظافة مؤكدة', zh: '实拍保真', ru: 'Гарантия чистоты' })}
                </span>
              </div>
              <p className="text-[11px] text-sub font-medium mt-0.5 mb-0">
                {lt(locale, {
                  fa: `هتل‌های ۴ و ۵ ستاره با دسترسی پیاده به مراکز خرید و صبحانه بوفه رایگان`,
                  en: `4 & 5-star hotels with walking access to shopping & free buffet breakfast`,
                  ar: `فنادق 4 و 5 نجوم قريبة من المعالم مع إفطار مجاني`,
                  zh: `地处市中心商圈，含双人自助早餐与免费取消特权`,
                  ru: `Отели 4-5 звезд в центре с включенным завтраком`,
                })}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-ink">
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={11} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <strong className="text-xs font-black">هتل ۵ ستاره الیت پالاس {cityMatch}</strong>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                  {lt(locale, { fa: 'صبحانه رایگان', en: 'Free Breakfast', ar: 'إفطار مجاني', zh: '含早', ru: 'Завтрак' })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-sub">
                <span>مرکز شهر • فاصله ۵ دقیقه تا ایستگاه مترو • کنسلی رایگان تا ۴۸ ساعت قبل</span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
              <div>
                <span className="text-[10px] text-sub block sm:text-end">شروع قیمت هر شب از:</span>
                <span className="text-sm sm:text-base font-black font-mono text-price">
                  {num(3200000, locale)} <span className="text-xs font-normal">تومان</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleAdd}
                className={`min-h-10 px-4 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand hover:bg-brand-dark text-white'
                }`}
              >
                {added ? (
                  <>
                    <Check size={14} />
                    <span>{lt(locale, { fa: 'اقامت افزوده شد', en: 'Hotel Added', ar: 'تمت الإضافة', zh: '已加购酒店', ru: 'Отель добавлен' })}</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>{lt(locale, { fa: 'رزرو اتاق هتل', en: 'Add Hotel', ar: 'إضافة فندق', zh: '加订酒店', ru: 'Добавить отель' })}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
