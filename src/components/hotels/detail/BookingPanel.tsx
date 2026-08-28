'use client';

import { Ban, Check, ShieldCheck, X } from 'lucide-react';
import { fa, gFmt } from '@/lib/hotel-format';
import { ROOMS, PLANS, type PlanId } from '@/lib/hotel-mock';
import { quote, CHECKIN, CHECKOUT, ADULTS, CHILDREN, NIGHTS, toman, type useHotelBooking, FREE_CANCEL_HOURS } from '@/hooks/useHotelBooking';

interface BookingPanelProps {
  booking: ReturnType<typeof useHotelBooking>;
  onBook: () => void;
}

export function BookingPanel({ booking, onBook }: BookingPanelProps) {
  const { sel, setSel, totals, capacity } = booking;

  const cheapest = Math.min(...ROOMS.flatMap((r) => r.plans.map((p) => quote(r, p).total)));
  const panelAmount = capacity.n > 0 ? totals.total : cheapest;

  const needs: string[] = [];
  if (capacity.n > 0) {
    if (capacity.a < ADULTS) needs.push(`ظرفیت بزرگسال کافی نیست (${fa(capacity.a)} از ${fa(ADULTS)})`);
    if (capacity.c < CHILDREN) needs.push('جای کودک در نرخ‌های انتخابی لحاظ نشده است');
  }

  const chosenPlans = Object.keys(sel).map((k) => PLANS[k.split('|')[1] as PlanId].refund);
  const worst = chosenPlans.includes('none') ? 'none' : chosenPlans.includes('partial') ? 'partial' : 'free';
  const dl = new Date(new Date(CHECKIN + 'T14:00:00').getTime() - FREE_CANCEL_HOURS * 36e5);
  const canBook = capacity.n > 0 && needs.length === 0;

  return (
    <aside className="lg:sticky lg:top-[126px] border border-line rounded-xl bg-surface shadow-elev-2 overflow-hidden">
      <div className="p-4 border-b border-line bg-gradient-to-b from-mint/30 to-surface">
        <div className="text-[11.5px] font-extrabold text-sub">{capacity.n ? `جمع ${fa(capacity.n)} اتاق برای ${fa(NIGHTS.length)} شب` : 'شروع قیمت برای اقامت شما'}</div>
        <div className="flex items-baseline gap-1.5">
          <b className="text-[26px] font-black text-price num">{fa(panelAmount)}</b>
          <small className="text-xs font-extrabold text-sub">لیر</small>
        </div>
        <div className="text-[11.5px] font-bold text-sub">≈ {fa(toman(panelAmount))} تومان</div>
      </div>
      
      <div className="p-4 flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 border border-line rounded-xl">
            <span className="block text-[10px] font-extrabold text-sub">ورود</span>
            <b className="text-[12.5px] font-black">{gFmt.format(new Date(CHECKIN + 'T00:00:00'))}</b>
          </div>
          <div className="p-2.5 border border-line rounded-xl">
            <span className="block text-[10px] font-extrabold text-sub">خروج</span>
            <b className="text-[12.5px] font-black">{gFmt.format(new Date(CHECKOUT + 'T00:00:00'))}</b>
          </div>
        </div>
        
        <div className="p-2.5 border border-line rounded-xl">
          <span className="block text-[10px] font-extrabold text-sub">مسافران</span>
          <b className="text-[12.5px] font-black">{fa(ADULTS)} بزرگسال، {fa(CHILDREN)} کودک</b>
        </div>

        <div className="flex flex-col gap-1.5">
          {capacity.n === 0 ? (
            <div className="p-3.5 border border-dashed border-line rounded-xl text-center text-sub text-xs font-bold">هنوز اتاقی انتخاب نکرده‌اید</div>
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
                  <span className="text-xs font-black whitespace-nowrap">{fa(qt.total * q)} لیر</span>
                  <button onClick={() => setSel((s) => { const n = { ...s }; delete n[k]; return n; })} aria-label="حذف" className="w-[22px] h-[22px] grid place-items-center rounded-full bg-mint text-sub shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    <X size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {capacity.n > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12.5px] font-bold text-sub"><span>مبلغ اتاق‌ها</span><b>{fa(totals.sub)} لیر</b></div>
            {totals.extra > 0 && <div className="flex justify-between text-[12.5px] font-bold text-sub"><span>تخت اضافه کودک</span><b>{fa(totals.extra)} لیر</b></div>}
            <div className="flex justify-between text-[12.5px] font-bold text-sub"><span>مالیات و عوارض اقامت</span><b>{fa(totals.tax)} لیر</b></div>
            <div className="flex justify-between text-[12.5px] font-bold text-sub"><span>کارمزد درگاه ریالی</span><b className="text-success">رایگان</b></div>
            <div className="flex justify-between pt-2.5 border-t border-line text-[15px] font-black"><span>مبلغ قابل پرداخت</span><span>{fa(totals.total)} لیر</span></div>
            <div className="flex justify-between text-[10.5px] font-bold text-sub"><span>معادل تقریبی</span><span>{fa(toman(totals.total))} تومان</span></div>
          </div>
        )}

        {capacity.n > 0 && (needs.length > 0 ? (
          <div className="flex items-start gap-2 p-2.5 border border-destructive/30 rounded-xl bg-destructive/10 text-destructive text-[11.5px] font-extrabold leading-relaxed">
            <Ban size={15} className="shrink-0 mt-0.5" />
            <span>{needs.join('؛ ')}. یک اتاق دیگر اضافه کنید یا چیدمان پیشنهادی را اعمال کنید.</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-2.5 border border-success/30 rounded-xl bg-success/10 text-success text-[11.5px] font-bold leading-relaxed">
            <Check size={15} className="shrink-0 mt-0.5" />
            <span>{worst === 'free' ? `لغو رایگان تا ${gFmt.format(dl)} ساعت ۱۴:۰۰` : worst === 'partial' ? 'در صورت لغو، هزینه یک شب کسر می‌شود' : 'این انتخاب شامل نرخ غیرقابل استرداد است'}</span>
          </div>
        ))}

        <button
          onClick={onBook}
          disabled={!canBook}
          className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-action text-[#14201f] hover:bg-action-hover active:bg-action-active disabled:bg-line disabled:text-sub text-sm font-black transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {!capacity.n ? 'ابتدا یک اتاق انتخاب کنید' : !canBook ? 'ظرفیت انتخاب‌شده کافی نیست' : `ادامه و پرداخت ${fa(totals.total)} لیر`}
        </button>
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-sub">
          <ShieldCheck size={13} className="text-success" /> پرداخت امن درگاه ریالی iTrip؛ تسویه به لیر با هتل
        </div>
      </div>
    </aside>
  );
}
