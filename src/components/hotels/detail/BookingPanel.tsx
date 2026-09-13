'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Ban, Check, ShieldCheck, X, Calendar, Users } from 'lucide-react';
import { fa, stayDate } from '@/lib/hotel-format';
import { ROOMS, PLANS, type PlanId } from '@/lib/hotel-mock';
import { quote, toman, type useHotelBooking, FREE_CANCEL_HOURS } from '@/hooks/useHotelBooking';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import type { Hotel } from '@/lib/types';

interface BookingPanelProps {
  booking: ReturnType<typeof useHotelBooking>;
  hotel?: Hotel | null;
  onBook: () => void;
  onOpenEdit?: () => void;
}

export function BookingPanel({ booking, hotel, onBook, onOpenEdit }: BookingPanelProps) {
  const t = useTranslations('HotelDetail');
  const ariaT = useTranslations('Common.aria');
  const locale = useLocale();
  const {
    sel,
    setSel,
    totals,
    capacity,
    adults,
    children,
    checkin,
    checkout,
    nights,
    isLive,
  } = booking;

  const liveRooms = isLive && hotel?.roomTypes && hotel.roomTypes.length > 0 ? hotel.roomTypes : null;
  const liveById = new Map((liveRooms || []).map((r) => [String(r.id), r]));
  const cheapestLive = liveRooms
    ? Math.min(...liveRooms.map((r) => Math.round((r.pricePerNight || 0) / 10) * Math.max(1, nights.length) * 1.1))
    : 0;
  const cheapestMock = Math.min(...ROOMS.flatMap((r) => r.plans.map((p) => quote(r, p, nights, 0).total)));
  const cheapest = liveRooms ? cheapestLive : cheapestMock;
  const panelAmount = capacity.n > 0 ? (isLive ? Math.round(totals.total) : toman(totals.total)) : (liveRooms ? Math.round(cheapest) : toman(cheapest));
  const totalToman = isLive ? Math.round(totals.total) : toman(totals.total);
  const taxToman = isLive ? Math.round(totals.tax) : toman(totals.tax);
  const extraToman = totals.extra > 0 ? (isLive ? Math.round(totals.extra) : toman(totals.extra)) : 0;
  const subToman = Math.max(0, totalToman - taxToman - extraToman);
  const tomanLabel = lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' });

  const needs: string[] = [];
  if (capacity.n > 0) {
    if (capacity.a < adults) needs.push(`${lt(locale, { fa: 'ظرفیت بزرگسال کافی نیست', en: 'Adult capacity insufficient', ar: 'سعة البالغين غير كافية', zh: '成人容量不足', ru: 'Недостаточно мест для взрослых' })} (${fa(capacity.a)} / ${fa(adults)})`);
    if (children > 0 && capacity.c < children) needs.push(lt(locale, { fa: 'جای کودک در نرخ‌های انتخابی لحاظ نشده است', en: 'Child occupancy not covered', ar: 'لا تشمل الأسعار المختارة مقاعد الأطفال', zh: '所选价格未包含儿童床位', ru: 'Выбранные тарифы не учитывают детей' }));
  }

  const chosenPlans = Object.keys(sel).map((k) => PLANS[k.split('|')[1] as PlanId].refund);
  const worst = chosenPlans.includes('none') ? 'none' : chosenPlans.includes('partial') ? 'partial' : 'free';
  const dl = new Date(new Date(checkin + 'T14:00:00').getTime() - FREE_CANCEL_HOURS * 36e5);
  const canBook = capacity.n > 0 && needs.length === 0;
  // Jalali for fa/ar readers (hotel dates are consumed in Jalali in Iran),
  // Gregorian for other locales (see stayDate in lib/hotel-format).
  const fmtDate = (d: Date) => stayDate(d, locale);

  return (
    <aside className="lg:sticky lg:top-[126px] border border-line rounded-xl bg-surface shadow-elev-2 overflow-hidden">
      <div className="p-4 border-b border-line bg-gradient-to-b from-mint/30 to-surface">
        <div className="text-[11.5px] font-extrabold text-sub">
          {capacity.n ? `${locale === 'fa' ? `جمع ${fa(capacity.n)} اتاق برای ${fa(nights.length)} شب` : `Total ${capacity.n} rooms for ${nights.length} nights`}` : (lt(locale, { fa: 'شروع قیمت برای اقامت شما', en: 'Starting rate for your dates', ar: 'السعر الابتدائي لتواريخ إقامتك', zh: '您所选日期的起步价', ru: 'Стартовая цена на ваши даты' }))}
        </div>
        <div className="flex items-baseline gap-1.5">
          <b className="text-[26px] font-black text-price num">{num(Math.round(panelAmount), locale)}</b>
          <small className="text-xs font-extrabold text-sub">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</small>
        </div>
      </div>
      
      <div className="p-4 flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenEdit}
            className="p-2.5 border border-line rounded-xl text-start hover:border-brand transition group cursor-pointer bg-surface"
          >
            <div className="flex items-center justify-between">
              <span className="block text-[10px] font-extrabold text-sub">{t('checkIn')}</span>
              <Calendar size={12} className="text-sub group-hover:text-brand transition" />
            </div>
            <b className="text-[12.5px] font-black group-hover:text-brand-dark transition">{fmtDate(new Date(checkin + 'T00:00:00'))}</b>
          </button>
          <button
            type="button"
            onClick={onOpenEdit}
            className="p-2.5 border border-line rounded-xl text-start hover:border-brand transition group cursor-pointer bg-surface"
          >
            <div className="flex items-center justify-between">
              <span className="block text-[10px] font-extrabold text-sub">{t('checkOut')}</span>
              <Calendar size={12} className="text-sub group-hover:text-brand transition" />
            </div>
            <b className="text-[12.5px] font-black group-hover:text-brand-dark transition">{fmtDate(new Date(checkout + 'T00:00:00'))}</b>
          </button>
        </div>
        
        <button
          type="button"
          onClick={onOpenEdit}
          className="w-full p-2.5 border border-line rounded-xl text-start hover:border-brand transition group cursor-pointer bg-surface"
        >
          <div className="flex items-center justify-between">
            <span className="block text-[10px] font-extrabold text-sub">{t('capacity')}</span>
            <Users size={12} className="text-sub group-hover:text-brand transition" />
          </div>
          <div className="flex items-center justify-between">
            <b className="text-[12.5px] font-black group-hover:text-brand-dark transition">{t('passengersSummary', { adults, children })}</b>
            <span className="text-[10px] font-bold text-brand-dark underline">
              {lt(locale, { fa: 'ویرایش', en: 'Edit', ar: 'تعديل', zh: '修改', ru: 'Изменить' })}
            </span>
          </div>
        </button>

        <div className="flex flex-col gap-1.5">
          {capacity.n === 0 ? (
            <div className="p-3.5 border border-dashed border-line rounded-xl text-center text-sub text-xs font-bold">
              {lt(locale, { fa: 'هنوز اتاقی انتخاب نکرده‌اید', en: 'No rooms selected yet', ar: 'لم تختر أي غرف بعد', zh: '尚未选择房间', ru: 'Номера ещё не выбраны' })}
            </div>
          ) : (
            Object.entries(sel).map(([k, q]) => {
              const [rid, pid] = k.split('|') as [string, PlanId];
              if (liveRooms) {
                const room = liveById.get(rid);
                if (!room) return null;
                const priceToman = Math.round((room.pricePerNight || 0) / 10);
                const itemTotalToman = priceToman * Math.max(1, nights.length) * q * 1.1;
                return (
                  <div key={k} className="flex items-start gap-2 p-2.5 border border-mint-bright/60 rounded-xl bg-mint/30">
                    <div className="flex-1 min-w-0">
                      <b className="block text-xs font-black">{num(q, locale)} × {room.name}</b>
                      <span className="block text-[10.5px] font-bold text-sub">
                        {room.breakfast
                          ? lt(locale, { fa: 'با صبحانه', en: 'With breakfast', ar: 'مع الإفطار', zh: '含早餐', ru: 'С завтраком' })
                          : lt(locale, { fa: 'بدون صبحانه', en: 'Room only', ar: 'بدون إفطار', zh: '无早餐', ru: 'Без завтрака' })}
                      </span>
                    </div>
                    <div className="text-end shrink-0">
                      <span className="text-xs font-black whitespace-nowrap block text-price">
                        {num(Math.round(itemTotalToman), locale)} {tomanLabel}
                      </span>
                    </div>
                    <button
                      onClick={() => setSel((s) => { const n = { ...s }; delete n[k]; return n; })}
                      aria-label={ariaT('remove')}
                      className="min-h-[44px] min-w-[44px] w-[22px] h-[22px] grid place-items-center rounded-full bg-mint text-sub shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              }
              const r = ROOMS.find((x) => x.id === rid)!;
              const qt = quote(r, pid, nights, Math.min(children, r.capC));
              const itemTotalToman = toman(qt.total * q);
              return (
                <div key={k} className="flex items-start gap-2 p-2.5 border border-mint-bright/60 rounded-xl bg-mint/30">
                  <div className="flex-1 min-w-0">
                    <b className="block text-xs font-black">{fa(q)} × {r.name}</b>
                    <span className="block text-[10.5px] font-bold text-sub">{PLANS[pid].name}</span>
                  </div>
                  <div className="text-end shrink-0">
                    <span className="text-xs font-black whitespace-nowrap block text-price">
                      {fa(itemTotalToman)} {tomanLabel}
                    </span>
                    <span className="text-[10px] text-sub font-mono block">
                      ({fa(qt.total * q)} TRY)
                    </span>
                  </div>
                  <button
                    onClick={() => setSel((s) => { const n = { ...s }; delete n[k]; return n; })}
                    aria-label={ariaT('remove')}
                    className="min-h-[44px] min-w-[44px] w-[22px] h-[22px] grid place-items-center rounded-full bg-mint text-sub shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {capacity.n > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex justify-between items-center text-[12.5px] font-bold text-sub">
              <span>{lt(locale, { fa: 'مبلغ اتاق‌ها', en: 'Rooms total', ar: 'إجمالي الغرف', zh: '房费合计', ru: 'Итого за номера' })}</span>
              <div className="text-end">
                <b className="text-ink">{num(subToman, locale)} {tomanLabel}</b>
                {!isLive && <span className="text-[10px] text-sub font-mono block">({fa(totals.sub)} TRY)</span>}
              </div>
            </div>
            {totals.extra > 0 && (
              <div className="flex justify-between items-center text-[12.5px] font-bold text-sub">
                <span>{lt(locale, { fa: 'تخت اضافه کودک', en: 'Extra child bed', ar: 'سرير أطفال إضافي', zh: '儿童加床', ru: 'Детская кровать' })}</span>
                <div className="text-end">
                  <b className="text-ink">{num(extraToman, locale)} {tomanLabel}</b>
                  {!isLive && <span className="text-[10px] text-sub font-mono block">({fa(totals.extra)} TRY)</span>}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center text-[12.5px] font-bold text-sub">
              <span>{lt(locale, { fa: 'مالیات و عوارض اقامت (۱۰٪)', en: 'Taxes and fees (10%)', ar: 'الضرائب والرسوم (10%)', zh: '税费 (10%)', ru: 'Налоги и сборы (10%)' })}</span>
              <div className="text-end">
                <b className="text-ink">{num(taxToman, locale)} {tomanLabel}</b>
                {!isLive && <span className="text-[10px] text-sub font-mono block">({fa(totals.tax)} TRY)</span>}
              </div>
            </div>
            <div className="flex justify-between items-center text-[12.5px] font-bold text-sub">
              <span>{lt(locale, { fa: 'کارمزد درگاه پرداخت', en: 'Payment gateway fee', ar: 'رسوم بوابة الدفع', zh: '支付网关手续费', ru: 'Комиссия платежа' })}</span>
              <b className="text-success">{lt(locale, { fa: 'رایگان', en: 'Free', ar: 'مجاني', zh: '免费', ru: 'Бесплатно' })}</b>
            </div>
            <div className="flex justify-between items-baseline pt-2.5 border-t border-line text-[15px] font-black">
              <span>{lt(locale, { fa: 'مبلغ قابل پرداخت', en: 'Total payable', ar: 'المبلغ المستحق', zh: '应付金额', ru: 'К оплате' })}</span>
              <span className="text-[19px] text-price font-black">{num(totalToman, locale)} {tomanLabel}</span>
            </div>
            {!isLive && (
              <div className="flex justify-between text-[10.5px] font-bold text-sub">
                <span>{lt(locale, { fa: 'معادل ارزی هتل', en: 'Hotel base currency', ar: 'العملة الأساسية للفندق', zh: '酒店基础货币', ru: 'Базовая валюта отеля' })}</span>
                <span className="font-mono font-bold">{fa(totals.total)} TRY</span>
              </div>
            )}
          </div>
        )}

        {capacity.n > 0 && (needs.length > 0 ? (
          <div className="flex items-start gap-2 p-2.5 border border-destructive/30 rounded-xl bg-destructive/10 text-destructive text-[11.5px] font-extrabold leading-relaxed">
            <Ban size={15} className="shrink-0 mt-0.5" />
            <span>{needs.join('; ')}. {lt(locale, { fa: 'یک اتاق دیگر اضافه کنید یا چیدمان پیشنهادی را اعمال کنید.', en: 'Please add another room or apply suggested combo.', ar: 'أضف غرفة أخرى أو طبّق التركيبة المقترحة.', zh: '请再添加一间房或采用推荐组合。', ru: 'Добавьте ещё один номер или примените предложенный вариант.' })}</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-2.5 border border-success/30 rounded-xl bg-success/10 text-success text-[11.5px] font-bold leading-relaxed">
            <Check size={15} className="shrink-0 mt-0.5" />
            <span>{lt(locale, { fa: 'ظرفیت برای مسافران شما کافی است.', en: 'Capacity is sufficient for your party.', ar: 'السعة كافية لمجموعتك.', zh: '容量满足您的团队需求。', ru: 'Вместимости достаточно для вашей группы.' })}</span>
          </div>
        ))}

        <button
          onClick={onBook}
          disabled={!canBook}
          className="w-full min-h-[46px] mt-1 border-0 rounded-xl bg-price text-surface text-sm font-black transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-price/90 active:scale-[0.98] shadow-md shadow-price/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {t('continuePay')}
        </button>

        <div className="p-3 border border-line/70 rounded-xl bg-soft/50 flex items-start gap-2 text-[11px] font-bold text-sub leading-snug">
          <ShieldCheck size={15} className="text-brand shrink-0 mt-0.5" />
          <span>{worst === 'free' ? `${locale === 'fa' ? `کنسلی رایگان تا ${fmtDate(dl)}.` : `Free cancellation until ${fmtDate(dl)}.`}` : (lt(locale, { fa: 'تابع شرایط استرداد هتل.', en: 'Subject to hotel cancellation policies.', ar: 'خاضع لسياسات الإلغاء الخاصة بالفندق.', zh: '以酒店取消政策为准。', ru: 'Согласно правилам отмены отеля.' }))}</span>
        </div>
      </div>
    </aside>
  );
}
