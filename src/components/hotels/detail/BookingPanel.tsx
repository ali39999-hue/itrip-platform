'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Ban, Check, ShieldCheck, X } from 'lucide-react';
import { fa, gFmt } from '@/lib/hotel-format';
import { ROOMS, PLANS, type PlanId } from '@/lib/hotel-mock';
import { quote, CHECKIN, CHECKOUT, ADULTS, CHILDREN, NIGHTS, toman, type useHotelBooking, FREE_CANCEL_HOURS } from '@/hooks/useHotelBooking';
import { lt } from '@/lib/lt';

interface BookingPanelProps {
  booking: ReturnType<typeof useHotelBooking>;
  onBook: () => void;
}

export function BookingPanel({ booking, onBook }: BookingPanelProps) {
  const t = useTranslations('HotelDetail');
  const locale = useLocale();
  const { sel, setSel, totals, capacity } = booking;

  const cheapest = Math.min(...ROOMS.flatMap((r) => r.plans.map((p) => quote(r, p).total)));
  const panelAmount = capacity.n > 0 ? totals.total : cheapest;

  const needs: string[] = [];
  if (capacity.n > 0) {
    if (capacity.a < ADULTS) needs.push(`${lt(locale, { fa: 'ظرفیت بزرگسال کافی نیست', en: 'Adult capacity insufficient', ar: 'سعة البالغين غير كافية', zh: '成人容量不足', ru: 'Недостаточно мест для взрослых' })} (${fa(capacity.a)} / ${fa(ADULTS)})`);
    if (capacity.c < CHILDREN) needs.push(lt(locale, { fa: 'جای کودک در نرخ‌های انتخابی لحاظ نشده است', en: 'Child occupancy not covered', ar: 'لا تشمل الأسعار المختارة مقاعد الأطفال', zh: '所选价格未包含儿童床位', ru: 'Выбранные тарифы не учитывают детей' }));
  }

  const chosenPlans = Object.keys(sel).map((k) => PLANS[k.split('|')[1] as PlanId].refund);
  const worst = chosenPlans.includes('none') ? 'none' : chosenPlans.includes('partial') ? 'partial' : 'free';
  const dl = new Date(new Date(CHECKIN + 'T14:00:00').getTime() - FREE_CANCEL_HOURS * 36e5);
  const canBook = capacity.n > 0 && needs.length === 0;

  return (
    <aside className="lg:sticky lg:top-[126px] border border-line rounded-xl bg-surface shadow-elev-2 overflow-hidden">
      <div className="p-4 border-b border-line bg-gradient-to-b from-mint/30 to-surface">
        <div className="text-[11.5px] font-extrabold text-sub">
          {capacity.n ? `${locale === 'fa' ? `جمع ${fa(capacity.n)} اتاق برای ${fa(NIGHTS.length)} شب` : `Total ${capacity.n} rooms for ${NIGHTS.length} nights`}` : (lt(locale, { fa: 'شروع قیمت برای اقامت شما', en: 'Starting rate for your dates', ar: 'السعر الابتدائي لتواريخ إقامتك', zh: '您所选日期的起步价', ru: 'Стартовая цена на ваши даты' }))}
        </div>
        <div className="flex items-baseline gap-1.5">
          <b className="text-[26px] font-black text-price num">{fa(panelAmount)}</b>
          <small className="text-xs font-extrabold text-sub">TRY</small>
        </div>
        <div className="text-[11.5px] font-bold text-sub">≈ {fa(toman(panelAmount))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</div>
      </div>
      
      <div className="p-4 flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 border border-line rounded-xl">
            <span className="block text-[10px] font-extrabold text-sub">{t('checkIn')}</span>
            <b className="text-[12.5px] font-black">{gFmt.format(new Date(CHECKIN + 'T00:00:00'))}</b>
          </div>
          <div className="p-2.5 border border-line rounded-xl">
            <span className="block text-[10px] font-extrabold text-sub">{t('checkOut')}</span>
            <b className="text-[12.5px] font-black">{gFmt.format(new Date(CHECKOUT + 'T00:00:00'))}</b>
          </div>
        </div>
        
        <div className="p-2.5 border border-line rounded-xl">
          <span className="block text-[10px] font-extrabold text-sub">{t('capacity')}</span>
          <b className="text-[12.5px] font-black">{t('passengersSummary', { adults: ADULTS, children: CHILDREN })}</b>
        </div>

        <div className="flex flex-col gap-1.5">
          {capacity.n === 0 ? (
            <div className="p-3.5 border border-dashed border-line rounded-xl text-center text-sub text-xs font-bold">
              {lt(locale, { fa: 'هنوز اتاقی انتخاب نکرده‌اید', en: 'No rooms selected yet', ar: 'لم تختر أي غرف بعد', zh: '尚未选择房间', ru: 'Номера ещё не выбраны' })}
            </div>
          ) : (
            Object.entries(sel).map(([k, q]) => {
              const [rid, pid] = k.split('|') as [string, PlanId];
              const r = ROOMS.find((x) => x.id === rid)!;
              const qt = quote(r, pid, Math.min(CHILDREN, r.capC));
              return (
                <div key={k} className="flex items-start gap-2 p-2.5 border border-mint-bright/60 rounded-xl bg-mint/30">
                  <div className="flex-1 min-w-0">
                    <b className="block text-xs font-black">{fa(q)} × {r.name}</b>
                    <span className="block text-[10.5px] font-bold text-sub">{PLANS[pid].name}</span>
                  </div>
                  <span className="text-xs font-black whitespace-nowrap">{fa(qt.total * q)} TRY</span>
                  <button
                    onClick={() => setSel((s) => { const n = { ...s }; delete n[k]; return n; })}
                    aria-label="Remove"
                    className="w-[22px] h-[22px] grid place-items-center rounded-full bg-mint text-sub shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {capacity.n > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12.5px] font-bold text-sub">
              <span>{lt(locale, { fa: 'مبلغ اتاق‌ها', en: 'Rooms total', ar: 'إجمالي الغرف', zh: '房费合计', ru: 'Итого за номера' })}</span>
              <b>{fa(totals.sub)} TRY</b>
            </div>
            {totals.extra > 0 && (
              <div className="flex justify-between text-[12.5px] font-bold text-sub">
                <span>{lt(locale, { fa: 'تخت اضافه کودک', en: 'Extra child bed', ar: 'سرير أطفال إضافي', zh: '儿童加床', ru: 'Детская кровать' })}</span>
                <b>{fa(totals.extra)} TRY</b>
              </div>
            )}
            <div className="flex justify-between text-[12.5px] font-bold text-sub">
              <span>{lt(locale, { fa: 'مالیات و عوارض اقامت', en: 'Taxes and fees', ar: 'الضرائب والرسوم', zh: '税费', ru: 'Налоги и сборы' })}</span>
              <b>{fa(totals.tax)} TRY</b>
            </div>
            <div className="flex justify-between text-[12.5px] font-bold text-sub">
              <span>{lt(locale, { fa: 'کارمزد درگاه', en: 'Gateway fee', ar: 'رسوم البوابة', zh: '网关手续费', ru: 'Комиссия шлюза' })}</span>
              <b className="text-success">{lt(locale, { fa: 'رایگان', en: 'Free', ar: 'مجاني', zh: '免费', ru: 'Бесплатно' })}</b>
            </div>
            <div className="flex justify-between pt-2.5 border-t border-line text-[15px] font-black">
              <span>{lt(locale, { fa: 'مبلغ قابل پرداخت', en: 'Total payable', ar: 'المبلغ المستحق', zh: '应付金额', ru: 'К оплате' })}</span>
              <span>{fa(totals.total)} TRY</span>
            </div>
            <div className="flex justify-between text-[10.5px] font-bold text-sub">
              <span>{lt(locale, { fa: 'معادل تقریبی', en: 'Approx. equivalent', ar: 'ما يعادل تقريباً', zh: '约合', ru: 'Примерный эквивалент' })}</span>
              <span>{fa(toman(totals.total))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
            </div>
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
          <span>{worst === 'free' ? `${locale === 'fa' ? `کنسلی رایگان تا ${gFmt.format(dl)}.` : `Free cancellation until ${gFmt.format(dl)}.`}` : (lt(locale, { fa: 'تابع شرایط استرداد هتل.', en: 'Subject to hotel cancellation policies.', ar: 'خاضع لسياسات الإلغال الخاصة بالفندق.', zh: '以酒店取消政策为准。', ru: 'Согласно правилам отмены отеля.' }))}</span>
        </div>
      </div>
    </aside>
  );
}
