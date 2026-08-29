'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Ban, Check, ShieldCheck, X } from 'lucide-react';
import { fa, gFmt } from '@/lib/hotel-format';
import { ROOMS, PLANS, type PlanId } from '@/lib/hotel-mock';
import { quote, CHECKIN, CHECKOUT, ADULTS, CHILDREN, NIGHTS, toman, type useHotelBooking, FREE_CANCEL_HOURS } from '@/hooks/useHotelBooking';

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
    if (capacity.a < ADULTS) needs.push(`${locale === 'fa' ? 'ظرفیت بزرگسال کافی نیست' : 'Adult capacity insufficient'} (${fa(capacity.a)} / ${fa(ADULTS)})`);
    if (capacity.c < CHILDREN) needs.push(locale === 'fa' ? 'جای کودک در نرخ‌های انتخابی لحاظ نشده است' : 'Child occupancy not covered');
  }

  const chosenPlans = Object.keys(sel).map((k) => PLANS[k.split('|')[1] as PlanId].refund);
  const worst = chosenPlans.includes('none') ? 'none' : chosenPlans.includes('partial') ? 'partial' : 'free';
  const dl = new Date(new Date(CHECKIN + 'T14:00:00').getTime() - FREE_CANCEL_HOURS * 36e5);
  const canBook = capacity.n > 0 && needs.length === 0;

  return (
    <aside className="lg:sticky lg:top-[126px] border border-line rounded-xl bg-surface shadow-elev-2 overflow-hidden">
      <div className="p-4 border-b border-line bg-gradient-to-b from-mint/30 to-surface">
        <div className="text-[11.5px] font-extrabold text-sub">
          {capacity.n ? `${locale === 'fa' ? `جمع ${fa(capacity.n)} اتاق برای ${fa(NIGHTS.length)} شب` : `Total ${capacity.n} rooms for ${NIGHTS.length} nights`}` : (locale === 'fa' ? 'شروع قیمت برای اقامت شما' : 'Starting rate for your dates')}
        </div>
        <div className="flex items-baseline gap-1.5">
          <b className="text-[26px] font-black text-price num">{fa(panelAmount)}</b>
          <small className="text-xs font-extrabold text-sub">TRY</small>
        </div>
        <div className="text-[11.5px] font-bold text-sub">≈ {fa(toman(panelAmount))} {locale === 'fa' ? 'تومان' : 'Toman'}</div>
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
              {locale === 'fa' ? 'هنوز اتاقی انتخاب نکرده‌اید' : 'No rooms selected yet'}
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
              <span>{locale === 'fa' ? 'مبلغ اتاق‌ها' : 'Rooms total'}</span>
              <b>{fa(totals.sub)} TRY</b>
            </div>
            {totals.extra > 0 && (
              <div className="flex justify-between text-[12.5px] font-bold text-sub">
                <span>{locale === 'fa' ? 'تخت اضافه کودک' : 'Extra child bed'}</span>
                <b>{fa(totals.extra)} TRY</b>
              </div>
            )}
            <div className="flex justify-between text-[12.5px] font-bold text-sub">
              <span>{locale === 'fa' ? 'مالیات و عوارض اقامت' : 'Taxes and fees'}</span>
              <b>{fa(totals.tax)} TRY</b>
            </div>
            <div className="flex justify-between text-[12.5px] font-bold text-sub">
              <span>{locale === 'fa' ? 'کارمزد درگاه' : 'Gateway fee'}</span>
              <b className="text-success">{locale === 'fa' ? 'رایگان' : 'Free'}</b>
            </div>
            <div className="flex justify-between pt-2.5 border-t border-line text-[15px] font-black">
              <span>{locale === 'fa' ? 'مبلغ قابل پرداخت' : 'Total payable'}</span>
              <span>{fa(totals.total)} TRY</span>
            </div>
            <div className="flex justify-between text-[10.5px] font-bold text-sub">
              <span>{locale === 'fa' ? 'معادل تقریبی' : 'Approx. equivalent'}</span>
              <span>{fa(toman(totals.total))} {locale === 'fa' ? 'تومان' : 'Toman'}</span>
            </div>
          </div>
        )}

        {capacity.n > 0 && (needs.length > 0 ? (
          <div className="flex items-start gap-2 p-2.5 border border-destructive/30 rounded-xl bg-destructive/10 text-destructive text-[11.5px] font-extrabold leading-relaxed">
            <Ban size={15} className="shrink-0 mt-0.5" />
            <span>{needs.join('; ')}. {locale === 'fa' ? 'یک اتاق دیگر اضافه کنید یا چیدمان پیشنهادی را اعمال کنید.' : 'Please add another room or apply suggested combo.'}</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-2.5 border border-success/30 rounded-xl bg-success/10 text-success text-[11.5px] font-bold leading-relaxed">
            <Check size={15} className="shrink-0 mt-0.5" />
            <span>{locale === 'fa' ? 'ظرفیت برای مسافران شما کافی است.' : 'Capacity is sufficient for your party.'}</span>
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
          <span>{worst === 'free' ? `${locale === 'fa' ? `کنسلی رایگان تا ${gFmt.format(dl)}.` : `Free cancellation until ${gFmt.format(dl)}.`}` : (locale === 'fa' ? 'تابع شرایط استرداد هتل.' : 'Subject to hotel cancellation policies.')}</span>
        </div>
      </div>
    </aside>
  );
}
