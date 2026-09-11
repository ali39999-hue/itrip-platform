'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, BedDouble, Ruler, Eye, Users, Check, Flame, Ban, Coffee, Clock, Wallet, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fa, stayDateShort } from '@/lib/hotel-format';
import { getRoomsForLocale, getPlansForLocale } from '@/lib/hotel-mock';
import { quote, TAX, keyOf, toman, type useHotelBooking } from '@/hooks/useHotelBooking';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import type { Hotel, RoomType } from '@/lib/types';
import {
  HotelRatePlanService,
  type RatePlanCode,
  STANDARD_RATE_PLANS,
} from '@/domains/pricing/HotelRatePlanService';

interface HotelRoomsProps {
  booking: ReturnType<typeof useHotelBooking>;
  hotel?: Hotel | null;
  onApplyCombo: () => void;
  onOpenEdit?: () => void;
}

export function HotelRooms({ booking, hotel, onApplyCombo, onOpenEdit }: HotelRoomsProps) {
  const t = useTranslations('HotelDetail');
  const locale = useLocale();
  const {
    sel,
    setSel,
    takenOf,
    bestCombo,
    capacity,
    adults,
    children,
    checkin,
    checkout,
    nights
  } = booking;
  const [openBd, setOpenBd] = useState<string | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<Record<string, RatePlanCode>>({});
  const rooms = getRoomsForLocale(locale);
  const plans = getPlansForLocale(locale);

  const liveRooms: RoomType[] | null =
    booking.isLive && hotel?.roomTypes && hotel.roomTypes.length > 0 ? hotel.roomTypes : null;

  if (liveRooms) {
    const canBookLive = capacity.n > 0 && capacity.a >= adults;
    const nightCount = Math.max(1, nights.length);
    return (
      <section id="rooms" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
        <h2 className="m-0 mb-1 text-lg font-black">{t('selectRoom')}</h2>
        <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">{t('ratesIncludeTax')}</p>

        <div className="flex items-center gap-4 flex-wrap p-3.5 border border-mint-bright/60 rounded-xl bg-mint/30 mb-4 justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <button type="button" onClick={onOpenEdit} className="text-start hover:opacity-80 transition cursor-pointer group bg-transparent border-0 p-0">
              <span className="block text-[10.5px] font-extrabold text-sub">{t('checkIn')}</span>
              <b className="text-[13px] font-black text-brand-dark group-hover:underline underline-offset-2">
                {stayDateShort(new Date(checkin + 'T00:00:00'), locale)}
              </b>
            </button>
            <button type="button" onClick={onOpenEdit} className="text-start hover:opacity-80 transition cursor-pointer group bg-transparent border-0 p-0">
              <span className="block text-[10.5px] font-extrabold text-sub">{t('checkOut')}</span>
              <b className="text-[13px] font-black text-brand-dark group-hover:underline underline-offset-2">
                {stayDateShort(new Date(checkout + 'T00:00:00'), locale)}
              </b>
            </button>
            <div>
              <span className="block text-[10.5px] font-extrabold text-sub">{t('duration')}</span>
              <span className="px-2 py-0.5 rounded-full bg-surface border border-brand/20 text-brand-dark text-xs font-black inline-block">
                {t('nightsCount', { nights: nightCount })}
              </span>
            </div>
            <button type="button" onClick={onOpenEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface text-ink text-[12px] font-black hover:border-brand transition shadow-2xs cursor-pointer">
              <Users size={14} className="text-brand" />
              <span>{t('passengersSummary', { adults, children })}</span>
              <span className="text-[10px] text-brand-dark underline ms-1">
                {lt(locale, { fa: '(تغییر نفرات)', en: '(Change)', ar: '(تعديل)', zh: '(修改人数)', ru: '(Изменить)' })}
              </span>
            </button>
          </div>
        </div>

        {bestCombo && !canBookLive && (
          <div className="flex items-center gap-3 p-3 border border-dashed border-gold/50 rounded-xl bg-gold-soft text-[12.5px] font-bold text-price mb-4">
            <Sparkles size={16} className="text-action-hover shrink-0" />
            <span>
              {t('bestCombo', { adults, children })}{' '}
              <b>{bestCombo.pick.map((o) => o.r.name).join(' + ')}</b> — {num(Math.round(bestCombo.cost), locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
            </span>
            <button onClick={onApplyCombo} className="me-auto min-h-9 px-3.5 rounded-[10px] bg-price text-surface text-xs font-black shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              {t('applyCombo')}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {liveRooms.map((room) => {
            const rid = String(room.id);
            const k = keyOf(rid, 'live');
            const qty = sel[k] || 0;
            const maxSel = (room.available ?? 5) - takenOf(rid) + qty;
            const priceToman = Math.round((room.pricePerNight || 0) / 10);
            const fits = (room.capacity || 2) * Math.max(1, qty || 1) >= adults || qty === 0;
            const activePlanCode: RatePlanCode =
              selectedPlans[rid] || (room.breakfast ? 'BREAKFAST_INCLUDED' : 'ROOM_ONLY');
            const rateCalc = HotelRatePlanService.calculateRate({
              basePricePerNight: priceToman,
              nights: nightCount,
              rooms: 1,
              ratePlanCode: activePlanCode,
            });
            const effectiveUnitPrice = rateCalc.unitPricePerNight;
            const effectiveTotalToman = effectiveUnitPrice * nightCount;
            return (
              <div key={rid} className={`rounded-[14px] overflow-hidden bg-surface transition ${qty ? 'border-mint-bright ring-[3px] ring-brand/[0.07]' : ''} border border-line`}>
                <div className="grid grid-cols-1 sm:grid-cols-[196px_1fr]">
                  <div className="relative min-h-[130px]" style={{ background: `linear-gradient(145deg, var(--color-brand-dark), var(--color-deep))` }}>
                    <BedDouble size={26} className="absolute inset-0 m-auto text-surface/60" />
                  </div>
                  <div className="p-4">
                    <h3 className="m-0 mb-1 text-[15.5px] font-black">{room.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="spec inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line bg-soft/50 text-sub text-[11px] font-bold">
                        <Users size={12} /> {t('capacity')} {num(room.capacity || 2, locale)} {lt(locale, { fa: 'نفر', en: 'guests', ar: 'ضيوف', zh: '人', ru: 'гостей' })}
                      </span>
                      <span className={`spec inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${rateCalc.plan.includesBreakfast ? 'border-success/30 text-success bg-success/10' : 'border-line bg-soft/50 text-sub'}`}>
                        {rateCalc.plan.includesBreakfast ? <Coffee size={12} /> : <Ban size={12} />}
                        {rateCalc.plan.includesBreakfast
                          ? lt(locale, { fa: 'صبحانه included', en: 'Breakfast included', ar: 'يشمل الإفطار', zh: '含早餐', ru: 'Завтрак включён' })
                          : lt(locale, { fa: 'بدون صبحانه', en: 'Room only', ar: 'بدون إفطار', zh: '无早餐', ru: 'Без завтрака' })}
                      </span>
                      {(room.available ?? 5) <= 3 && (
                        <span className="inline-flex items-center gap-1 text-rose-warm text-[11.5px] font-extrabold">
                          <Flame size={13} /> {t('roomsLeft', { count: num(room.available ?? 0, locale) })}
                        </span>
                      )}
                    </div>

                    {/* Rate Plan Selector Chips (Kamra PMS / QloApps pattern) */}
                    <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-line/60">
                      {(['ROOM_ONLY', 'BREAKFAST_INCLUDED', 'FLEXIBLE_CANCEL', 'NON_REFUNDABLE'] as RatePlanCode[]).map((pCode) => {
                        const planOpt = STANDARD_RATE_PLANS[pCode];
                        const isSelected = activePlanCode === pCode;
                        return (
                          <button
                            key={pCode}
                            type="button"
                            onClick={() => setSelectedPlans((prev) => ({ ...prev, [rid]: pCode }))}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-brand text-surface border-brand shadow-2xs'
                                : 'bg-soft/70 text-sub border-line hover:border-brand/40'
                            }`}
                          >
                            <span>{locale === 'fa' ? planOpt.name.fa : planOpt.name.en}</span>
                            {planOpt.priceMultiplier < 1 && (
                              <span className="text-[9.5px] bg-rose-500 text-white px-1 rounded font-black">
                                -8%
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {!fits && qty > 0 && (
                      <div className="mt-2 text-[11.5px] font-bold text-destructive">
                        {lt(locale, { fa: 'ظرفیت این انتخاب برای تعداد مسافران کافی نیست', en: 'Capacity insufficient for your party', ar: 'السعة غير كافية', zh: '容量不足', ru: 'Недостаточно мест' })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-line grid grid-cols-1 md:grid-cols-[1fr_170px_150px] gap-3 items-center px-4 py-3">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <b className="text-[13px] font-black">
                      {locale === 'fa' ? rateCalc.plan.name.fa : rateCalc.plan.name.en}
                    </b>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                        <Check size={12} /> {lt(locale, { fa: 'تأیید آنی', en: 'Instant confirmation', ar: 'تأكيد فوري', zh: '即时确认', ru: 'Мгновенное подтверждение' })}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sub"><Wallet size={12} /> {lt(locale, { fa: 'پرداخت ریالی', en: 'Pay in IRR', ar: 'الدفع بالريال', zh: '里亚尔支付', ru: 'Оплата в IRR' })}</span>
                      {rateCalc.plan.isRefundable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          {lt(locale, { fa: 'کنسلی مجاز', en: 'Free cancellation', ar: 'إلغاء مجاني', zh: '免费取消', ru: 'Бесплатная отмена' })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                          {lt(locale, { fa: 'غیرقابل استرداد', en: 'Non-refundable', ar: 'غير قابل للإلغاء', zh: '不可退改', ru: 'Без возврата' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="md:text-end">
                    <div className="text-lg font-black leading-snug text-price num">{num(effectiveUnitPrice, locale)} <small className="text-[11.5px] font-extrabold text-sub">{lt(locale, { fa: 'تومان / شب', en: 'Toman / night', ar: 'تومان / ليلة', zh: '图曼 / 晚', ru: 'томанов / ночь' })}</small></div>
                    <div className="text-[11.5px] font-bold text-sub">{lt(locale, { fa: `جمع ${num(nightCount, locale)} شب:`, en: `Total ${num(nightCount, locale)} nights:`, ar: `المجموع:`, zh: `共:`, ru: `Итого:` })} <b>{num(effectiveTotalToman, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</b></div>
                  </div>
                  <div className="flex items-center justify-start md:justify-end gap-2">
                    <Select
                      value={String(qty)}
                      onValueChange={(v) => { if (!v && v !== '0') return; const val = +v; setSel((s) => { const n = { ...s }; if (val) n[k] = val; else delete n[k]; return n; }); }}
                      disabled={maxSel < 1}
                    >
                      <SelectTrigger className="w-24 min-h-10 border border-line rounded-[10px] bg-surface text-[12.5px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxSel + 1 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {i ? `${num(i, locale)} ${lt(locale, { fa: 'اتاق', en: 'room', ar: 'غرفة', zh: '间', ru: 'номер' })}` : '—'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-sub font-bold">
          {lt(locale, { fa: 'قیمت‌های نمایش داده شده نرخ زنده هتل برای تاریخ‌های انتخابی شماست (مالیات ۱۰٪ در جمع لحاظ می‌شود).', en: 'Shown prices are the live hotel rates for your dates (10% tax included in totals).', ar: 'الأسعار المعروضة هي أسعار الفندق المباشرة لتواريخك.', zh: '所列为酒店针对您日期的实时价格（含10%税费）。', ru: 'Указаны актуальные тарифы отеля на ваши даты (включая налог 10%).' })}
        </p>
      </section>
    );
  }

  const canBook = capacity.n > 0 && capacity.a >= adults && capacity.c >= children;

  return (
    <section id="rooms" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">{t('selectRoom')}</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">{t('ratesIncludeTax')}</p>

      {/* Interactive Booking Bar (Dates + Editable Guests) */}
      <div className="flex items-center gap-4 flex-wrap p-3.5 border border-mint-bright/60 rounded-xl bg-mint/30 mb-4 justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={onOpenEdit}
            className="text-start hover:opacity-80 transition cursor-pointer group bg-transparent border-0 p-0"
          >
            <span className="block text-[10.5px] font-extrabold text-sub">{t('checkIn')}</span>
            <b className="text-[13px] font-black text-brand-dark group-hover:underline underline-offset-2">
              {stayDateShort(new Date(checkin + 'T00:00:00'), locale)}
            </b>
          </button>
          <button
            type="button"
            onClick={onOpenEdit}
            className="text-start hover:opacity-80 transition cursor-pointer group bg-transparent border-0 p-0"
          >
            <span className="block text-[10.5px] font-extrabold text-sub">{t('checkOut')}</span>
            <b className="text-[13px] font-black text-brand-dark group-hover:underline underline-offset-2">
              {stayDateShort(new Date(checkout + 'T00:00:00'), locale)}
            </b>
          </button>
          <div>
            <span className="block text-[10.5px] font-extrabold text-sub">{t('duration')}</span>
            <span className="px-2 py-0.5 rounded-full bg-surface border border-brand/20 text-brand-dark text-xs font-black inline-block">
              {t('nightsCount', { nights: nights.length })}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface text-ink text-[12px] font-black hover:border-brand transition shadow-2xs cursor-pointer"
          >
            <Users size={14} className="text-brand" />
            <span>{t('passengersSummary', { adults, children })}</span>
            <span className="text-[10px] text-brand-dark underline ms-1">
              {lt(locale, { fa: '(تغییر نفرات)', en: '(Change)', ar: '(تعديل)', zh: '(修改人数)', ru: '(Изменить)' })}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenEdit}
          className="px-3.5 py-1.5 rounded-lg border border-brand bg-brand text-surface text-xs font-bold hover:bg-brand-dark transition shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <Calendar size={13} />
          <span>
            {lt(locale, {
              fa: 'ویرایش مسافران و تاریخ',
              en: 'Edit party & dates',
              ar: 'تعديل المسافرين والتاريخ',
              zh: '编辑人数和日期',
              ru: 'Изменить гостей и даты',
            })}
          </span>
        </button>
      </div>

      {bestCombo && !canBook && (
        <div className="flex items-center gap-3 p-3 border border-dashed border-gold/50 rounded-xl bg-gold-soft text-[12.5px] font-bold text-price mb-4">
          <Sparkles size={16} className="text-action-hover shrink-0" />
          <span>
            {t('bestCombo', { adults, children })}{' '}
            <b>{bestCombo.pick.map((o) => `${o.r.name} — ${plans[o.p].name}`).join(' + ')}</b> — {t('totalLira', { cost: fa(bestCombo.cost) })}
          </span>
          <button onClick={onApplyCombo} className="me-auto min-h-9 px-3.5 rounded-[10px] bg-price text-surface text-xs font-black shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {t('applyCombo')}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rooms.map((room) => {
          const picked = takenOf(room.id);
          const fits = room.capA >= adults && room.capC >= children;
          return (
            <div key={room.id} className={`rounded-[14px] overflow-hidden bg-surface transition ${picked ? 'border-mint-bright ring-[3px] ring-brand/[0.07]' : ''} border border-line`}>
              <div className="grid grid-cols-1 sm:grid-cols-[196px_1fr]">
                <div className="relative min-h-[130px]" style={{ background: `linear-gradient(145deg, var(--color-brand-dark), var(--color-deep))` }}>
                  <BedDouble size={26} className="absolute inset-0 m-auto text-surface/60" />
                </div>
                <div className="p-4">
                  <h3 className="m-0 mb-1 text-[15.5px] font-black">{room.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="spec inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line bg-soft/50 text-sub text-[11px] font-bold">
                      <Ruler size={12} /> {fa(room.size)} {lt(locale, { fa: 'متر مربع', en: 'm²', ar: 'م²', zh: '平方米', ru: 'м²' })}
                    </span>
                    <span className="spec inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line bg-soft/50 text-sub text-[11px] font-bold">
                      <BedDouble size={12} /> {room.bed}
                    </span>
                    <span className="spec inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line bg-soft/50 text-sub text-[11px] font-bold">
                      <Eye size={12} /> {room.view}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 text-xs font-extrabold text-sub flex-wrap">
                    <Users size={14} className="text-brand" />
                    {t('capacity')} {t('passengersSummary', { adults: room.capA, children: room.capC })}
                    {fits ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-success/30 text-success bg-success/10 text-[11px] font-extrabold">
                        <Check size={11} /> {lt(locale, { fa: 'کافی برای شما', en: 'Fits your group', ar: 'تناسب مجموعتك', zh: '适合您的团队', ru: 'Подходит вашей группе' })}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full border border-line text-sub bg-soft text-[11px] font-extrabold">
                        {lt(locale, { fa: 'کافی نیست', en: 'Not enough space', ar: 'المساحة غير كافية', zh: '空间不足', ru: 'Недостаточно места' })}
                      </span>
                    )}
                  </div>
                  {room.left <= 3 && (
                    <div className="inline-flex items-center gap-1 mt-2 text-rose-warm text-[11.5px] font-extrabold">
                      <Flame size={13} /> {t('roomsLeft', { count: fa(room.left) })}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-line">
                {room.plans.map((pid) => {
                  const p = plans[pid];
                  const cInRoom = Math.min(children, room.capC);
                  const q = quote(room, pid, nights, cInRoom);
                  const k = keyOf(room.id, pid);
                  const qty = sel[k] || 0;
                  const ref = quote(room, 'bb', nights, cInRoom).total;
                  const maxSel = room.left - takenOf(room.id) + qty;
                  const isOpen = openBd === k;
                  const dl = new Date(new Date(checkin + 'T14:00:00').getTime() - 48 * 36e5);

                  return (
                    <div key={pid} className={`grid grid-cols-1 md:grid-cols-[1fr_170px_150px] gap-3 items-center px-4 py-3 border-b border-line/70 last:border-0 ${qty ? 'bg-mint/40' : ''}`}>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <b className="text-[13px] font-black">{p.name}</b>
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${p.meal === 'بدون وعده' ? 'text-sub/70' : 'text-success'}`}>
                            {p.meal === 'بدون وعده' ? <Ban size={12} /> : <Coffee size={12} />} {p.meal}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${p.refund === 'free' ? 'text-success' : p.refund === 'partial' ? 'text-action-hover' : 'text-sub/70'}`}>
                            {p.refund === 'free' ? <><Check size={12} /> {locale === 'fa' ? `لغو رایگان تا ${stayDateShort(dl, locale)}` : `Free cancellation until ${stayDateShort(dl, locale)}`}</> : p.refund === 'partial' ? <><Clock size={12} /> {lt(locale, { fa: 'لغو با کسر یک شب', en: 'Partial refund', ar: 'إلغاء مع خصم ليلة واحدة', zh: '取消扣一晚房费', ru: 'Отмена с вычетом одной ночи' })}</> : <><Ban size={12} /> {lt(locale, { fa: 'غیرقابل استرداد', en: 'Non-refundable', ar: 'غير قابل للاسترداد', zh: '不可退款', ru: 'Возврату не подлежит' })}</>}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sub"><Wallet size={12} /> {p.pay}</span>
                        </div>
                        <button onClick={() => setOpenBd(isOpen ? null : k)} className="self-start border-0 bg-transparent p-0 text-brand-dark text-[11px] font-extrabold underline underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
                          {isOpen ? (lt(locale, { fa: 'بستن جزئیات', en: 'Hide details', ar: 'إخفاء التفاصيل', zh: '收起详情', ru: 'Скрыть детали' })) : (lt(locale, { fa: 'جزئیات قیمت هر شب', en: 'Nightly rate details', ar: 'تفاصيل سعر كل ليلة', zh: '每晚价格明细', ru: 'Детали тарифа за ночь' }))}
                        </button>
                      </div>
                      <div className="md:text-end">
                        {pid === 'saver' && <div className="text-sub text-xs font-bold line-through">{fa(toman(ref))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</div>}
                        <div className="text-lg font-black leading-snug text-price num">{fa(toman(q.avg))} <small className="text-[11.5px] font-extrabold text-sub">{lt(locale, { fa: 'تومان / شب', en: 'Toman / night', ar: 'تومان / ليلة', zh: '图曼 / 晚', ru: 'томанов / ночь' })}</small></div>
                        <div className="text-[11.5px] font-bold text-sub">{locale === 'fa' ? `جمع ${fa(nights.length)} شب:` : `Total ${nights.length} nights:`} <b>{fa(toman(q.total))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</b></div>
                      </div>
                      <div className="flex items-center justify-start md:justify-end gap-2">
                        <Select
                          value={String(qty)}
                          onValueChange={(v) => { if (!v) return; const val = +v; setSel((s) => { const n = { ...s }; if (val) n[k] = val; else delete n[k]; return n; }); }}
                          disabled={maxSel < 1}
                        >
                          <SelectTrigger className="w-24 min-h-10 border border-line rounded-[10px] bg-surface text-[12.5px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: maxSel + 1 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i ? `${fa(i)} ${lt(locale, { fa: 'اتاق', en: 'room', ar: 'غرفة', zh: '间', ru: 'номер' })}` : '—'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {isOpen && (
                        <div className="col-span-full mt-1 p-3 border border-line rounded-xl bg-soft/50">
                          <table className="w-full text-[11.5px]">
                            <tbody>
                              {q.nights.map((n, i) => (
                                <tr key={i} className="border-b border-dashed border-line/70 last:border-0">
                                  <td className="py-1 font-bold text-sub">
                                    {stayDateShort(n.date, locale)}
                                  </td>
                                  <td className="py-1 text-end font-extrabold">
                                    <span>{fa(toman(n.price))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                                    <span className="text-[10px] text-sub font-mono ms-1.5">({fa(n.price)} TRY)</span>
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td className="py-1 font-bold">{lt(locale, { fa: `مالیات و عوارض (${fa(TAX * 100)}٪)`, en: `Taxes & Fees (${TAX * 100}%)`, ar: `الضرائب والرسوم (${TAX * 100}%)`, zh: `税费 (${TAX * 100}%)`, ru: `Налоги и сборы (${TAX * 100}%)` })}</td>
                                <td className="py-1 text-end font-extrabold">
                                  <span>{fa(toman(q.tax))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                                  <span className="text-[10px] text-sub font-mono ms-1.5">({fa(q.tax)} TRY)</span>
                                </td>
                              </tr>
                              <tr>
                                <td className="pt-1 font-black">{lt(locale, { fa: 'جمع کل یک اتاق', en: 'Total per room', ar: 'الإجمالي لكل غرفة', zh: '每间房合计', ru: 'Итого за номер' })}</td>
                                <td className="pt-1 text-end font-black text-price">
                                  <span>{fa(toman(q.total))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                                  <span className="text-[10px] text-sub font-mono ms-1.5">({fa(q.total)} TRY)</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
