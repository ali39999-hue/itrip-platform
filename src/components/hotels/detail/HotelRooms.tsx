'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, BedDouble, Ruler, Eye, Users, Check, Flame, Ban, Coffee, Clock, Wallet, Minus, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fa, gShort } from '@/lib/hotel-format';
import { getRoomsForLocale, getPlansForLocale } from '@/lib/hotel-mock';
import { quote, TAX, keyOf, type useHotelBooking } from '@/hooks/useHotelBooking';
import { lt } from '@/lib/lt';

interface HotelRoomsProps {
  booking: ReturnType<typeof useHotelBooking>;
  onApplyCombo: () => void;
}

export function HotelRooms({ booking, onApplyCombo }: HotelRoomsProps) {
  const t = useTranslations('HotelDetail');
  const locale = useLocale();
  const {
    sel,
    setSel,
    takenOf,
    bestCombo,
    capacity,
    adults,
    setAdults,
    children,
    setChildren,
    checkin,
    checkout,
    nights
  } = booking;
  const [openBd, setOpenBd] = useState<string | null>(null);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const rooms = getRoomsForLocale(locale);
  const plans = getPlansForLocale(locale);

  const canBook = capacity.n > 0 && capacity.a >= adults && capacity.c >= children;

  return (
    <section id="rooms" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">{t('selectRoom')}</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">{t('ratesIncludeTax')}</p>

      {/* Interactive Booking Bar (Dates + Editable Guests) */}
      <div className="flex items-center gap-4 flex-wrap p-3.5 border border-mint-bright/60 rounded-xl bg-mint/30 mb-4 justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="block text-[10.5px] font-extrabold text-sub">{t('checkIn')}</span>
            <b className="text-[13px] font-black">{gShort.format(new Date(checkin + 'T00:00:00'))}</b>
          </div>
          <div>
            <span className="block text-[10.5px] font-extrabold text-sub">{t('checkOut')}</span>
            <b className="text-[13px] font-black">{gShort.format(new Date(checkout + 'T00:00:00'))}</b>
          </div>
          <div>
            <span className="block text-[10.5px] font-extrabold text-sub">{t('duration')}</span>
            <b className="text-[13px] font-black">{t('nightsCount', { nights: nights.length })}</b>
          </div>
          <div className="relative">
            <span className="block text-[10.5px] font-extrabold text-sub">{t('capacity')}</span>
            <button
              type="button"
              onClick={() => setGuestPickerOpen(!guestPickerOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line bg-surface text-ink text-[12px] font-black hover:border-brand transition shadow-2xs"
            >
              <Users size={14} className="text-brand" />
              <span>{t('passengersSummary', { adults, children })}</span>
              <span className="text-[10px] text-brand-dark underline ms-1">
                {lt(locale, { fa: '(تغییر نفرات)', en: '(Change)', ar: '(تعديل)', zh: '(修改人数)', ru: '(Изменить)' })}
              </span>
            </button>

            {guestPickerOpen && (
              <div className="absolute top-[calc(100%+6px)] start-0 z-50 w-64 p-3.5 rounded-2xl bg-surface border border-line shadow-elev-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    {lt(locale, { fa: 'بزرگسال', en: 'Adults', ar: 'البالغين', zh: '成人', ru: 'Взрослые' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="w-7 h-7 rounded-lg bg-soft border border-line grid place-items-center disabled:opacity-40"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-xs font-bold font-mono">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(Math.min(9, adults + 1))}
                      disabled={adults >= 9}
                      className="w-7 h-7 rounded-lg bg-soft border border-line grid place-items-center disabled:opacity-40"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    {lt(locale, { fa: 'کودک', en: 'Children', ar: 'الأطفال', zh: '儿童', ru: 'Дети' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                      className="w-7 h-7 rounded-lg bg-soft border border-line grid place-items-center disabled:opacity-40"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-xs font-bold font-mono">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren(Math.min(6, children + 1))}
                      disabled={children >= 6}
                      className="w-7 h-7 rounded-lg bg-soft border border-line grid place-items-center disabled:opacity-40"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setGuestPickerOpen(false)}
                  className="w-full py-1.5 rounded-lg bg-brand text-surface text-xs font-bold hover:bg-brand-dark"
                >
                  {lt(locale, { fa: 'تایید نفرات', en: 'Done', ar: 'تأكيد', zh: '确定', ru: 'Готово' })}
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGuestPickerOpen(true)}
          className="px-3 py-1.5 rounded-lg border border-brand/40 bg-surface text-brand-dark text-xs font-bold hover:bg-mint transition"
        >
          {lt(locale, { fa: 'ویرایش مسافران و تاریخ', en: 'Edit party & dates', ar: 'تعديل المسافرين والتاريخ', zh: '编辑人数和日期', ru: 'Изменить гостей и даты' })}
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
                            {p.refund === 'free' ? <><Check size={12} /> {locale === 'fa' ? `لغو رایگان تا ${gShort.format(dl)}` : `Free cancellation until ${gShort.format(dl)}`}</> : p.refund === 'partial' ? <><Clock size={12} /> {lt(locale, { fa: 'لغو با کسر یک شب', en: 'Partial refund', ar: 'إلغاء مع خصم ليلة واحدة', zh: '取消扣一晚房费', ru: 'Отмена с вычетом одной ночи' })}</> : <><Ban size={12} /> {lt(locale, { fa: 'غیرقابل استرداد', en: 'Non-refundable', ar: 'غير قابل للاسترداد', zh: '不可退款', ru: 'Возврату не подлежит' })}</>}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sub"><Wallet size={12} /> {p.pay}</span>
                        </div>
                        <button onClick={() => setOpenBd(isOpen ? null : k)} className="self-start border-0 bg-transparent p-0 text-brand-dark text-[11px] font-extrabold underline underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
                          {isOpen ? (lt(locale, { fa: 'بستن جزئیات', en: 'Hide details', ar: 'إخفاء التفاصيل', zh: '收起详情', ru: 'Скрыть детали' })) : (lt(locale, { fa: 'جزئیات قیمت هر شب', en: 'Nightly rate details', ar: 'تفاصيل سعر كل ليلة', zh: '每晚价格明细', ru: 'Детали тариفا за ночь' }))}
                        </button>
                      </div>
                      <div className="md:text-end">
                        {pid === 'saver' && <div className="text-sub text-xs font-bold line-through">{fa(ref)} TRY</div>}
                        <div className="text-lg font-black leading-snug text-price num">{fa(q.avg)} <small className="text-[11.5px] font-extrabold text-sub">TRY / {lt(locale, { fa: 'شب', en: 'night', ar: 'ليلة', zh: '晚', ru: 'ночь' })}</small></div>
                        <div className="text-[11.5px] font-bold text-sub">{locale === 'fa' ? `جمع ${fa(nights.length)} شب:` : `Total ${nights.length} nights:`} <b>{fa(q.total)} TRY</b></div>
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
                                    {gShort.format(n.date)}
                                  </td>
                                  <td className="py-1 text-end font-extrabold">{fa(n.price)} TRY</td>
                                </tr>
                              ))}
                              <tr><td className="py-1 font-bold">{lt(locale, { fa: `مالیات و عوارض (${fa(TAX * 100)}٪)`, en: `Taxes & Fees (${TAX * 100}%)`, ar: `الضرائب والرسوم (${TAX * 100}%)`, zh: `税费 (${TAX * 100}%)`, ru: `Налоги и сборы (${TAX * 100}%)` })}</td><td className="py-1 text-end font-extrabold">{fa(q.tax)} TRY</td></tr>
                              <tr><td className="pt-1 font-black">{lt(locale, { fa: 'جمع کل یک اتاق', en: 'Total per room', ar: 'الإجمالي لكل غرفة', zh: '每间房合计', ru: 'Итого за номер' })}</td><td className="pt-1 text-end font-black">{fa(q.total)} TRY</td></tr>
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
