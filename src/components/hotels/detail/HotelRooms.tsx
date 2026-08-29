'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { Sparkles, BedDouble, Ruler, Eye, Users, Check, Flame, Ban, Coffee, Clock, Wallet } from 'lucide-react';
import { fa, gShort, wFmt } from '@/lib/hotel-format';
import { ROOMS, PLANS } from '@/lib/hotel-mock';
import { quote, NIGHTS, CHECKIN, CHECKOUT, ADULTS, CHILDREN, TAX, keyOf, type useHotelBooking } from '@/hooks/useHotelBooking';

interface HotelRoomsProps {
  booking: ReturnType<typeof useHotelBooking>;
  onApplyCombo: () => void;
}

export function HotelRooms({ booking, onApplyCombo }: HotelRoomsProps) {
  const { sel, setSel, takenOf, bestCombo, capacity } = booking;
  const [openBd, setOpenBd] = useState<string | null>(null);

  const canBook = capacity.n > 0 && capacity.a >= ADULTS && capacity.c >= CHILDREN;

  return (
    <section id="rooms" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">انتخاب اتاق</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">نرخ‌ها شامل مالیات و عوارض اقامت است.</p>

      <div className="flex items-center gap-3 flex-wrap p-3 border border-mint-bright/60 rounded-xl bg-mint/40 mb-4">
        {[['ورود', gShort.format(new Date(CHECKIN + 'T00:00:00'))], ['خروج', gShort.format(new Date(CHECKOUT + 'T00:00:00'))], ['مدت', `${fa(NIGHTS.length)} شب`], ['مسافران', `${fa(ADULTS)} بزرگسال، ${fa(CHILDREN)} کودک`]].map(([l, v]) => (
          <div key={l}>
            <span className="block text-[10.5px] font-extrabold text-sub">{l}</span>
            <b className="text-[13px] font-black">{v}</b>
          </div>
        ))}
        <Link href="/hotels/search" className="me-auto min-h-[38px] px-3.5 inline-flex items-center border border-mint-bright/70 rounded-[10px] bg-surface text-brand-dark text-[12.5px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          تغییر تاریخ یا مسافر
        </Link>
      </div>

      {bestCombo && !canBook && (
        <div className="flex items-center gap-3 p-3 border border-dashed border-gold/50 rounded-xl bg-gold-soft text-[12.5px] font-bold text-price mb-4">
          <Sparkles size={16} className="text-action-hover shrink-0" />
          <span>
            ارزان‌ترین چیدمان مناسب {fa(ADULTS)} بزرگسال و {fa(CHILDREN)} کودک:{' '}
            <b>{bestCombo.pick.map((o) => `${o.r.name} — ${PLANS[o.p].name}`).join(' + ')}</b> — جمع {fa(bestCombo.cost)} لیر
          </span>
          <button onClick={onApplyCombo} className="me-auto min-h-9 px-3.5 rounded-[10px] bg-price text-surface text-xs font-black shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">اعمال چیدمان</button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {ROOMS.map((room) => {
          const picked = takenOf(room.id);
          const fits = room.capA >= ADULTS && room.capC >= CHILDREN;
          return (
            <div key={room.id} className={`rounded-[14px] overflow-hidden bg-surface transition ${picked ? 'border-mint-bright ring-[3px] ring-brand/[0.07]' : ''} border border-line`}>
              <div className="grid grid-cols-1 sm:grid-cols-[196px_1fr]">
                <div className="relative min-h-[130px]" style={{ background: `linear-gradient(145deg, var(--color-brand-dark), var(--color-deep))` }}>
                  <BedDouble size={26} className="absolute inset-0 m-auto text-surface/60" />
                </div>
                <div className="p-4">
                  <h3 className="m-0 mb-1 text-[15.5px] font-black">{room.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="spec inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line bg-soft/50 text-sub text-[11px] font-bold"><Ruler size={12} /> {fa(room.size)} متر مربع</span>
                    <span className="spec inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line bg-soft/50 text-sub text-[11px] font-bold"><BedDouble size={12} /> {room.bed}</span>
                    <span className="spec inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line bg-soft/50 text-sub text-[11px] font-bold"><Eye size={12} /> {room.view}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 text-xs font-extrabold text-sub flex-wrap">
                    <Users size={14} className="text-brand" />
                    ظرفیت {fa(room.capA)} بزرگسال{room.capC ? ` و ${fa(room.capC)} کودک` : ''}
                    {fits ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-success/30 text-success bg-success/10 text-[11px] font-extrabold"><Check size={11} /> کافی برای شما</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full border border-line text-sub bg-soft text-[11px] font-extrabold">کافی نیست</span>
                    )}
                  </div>
                  {room.left <= 3 && (
                    <div className="inline-flex items-center gap-1 mt-2 text-rose-warm text-[11.5px] font-extrabold">
                      <Flame size={13} /> فقط {fa(room.left)} اتاق از این نوع باقی مانده
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-line">
                {room.plans.map((pid) => {
                  const p = PLANS[pid];
                  const cInRoom = Math.min(CHILDREN, room.capC);
                  const q = quote(room, pid, cInRoom);
                  const k = keyOf(room.id, pid);
                  const qty = sel[k] || 0;
                  const ref = quote(room, 'bb', cInRoom).total;
                  const maxSel = room.left - takenOf(room.id) + qty;
                  const isOpen = openBd === k;
                  const dl = new Date(new Date(CHECKIN + 'T14:00:00').getTime() - 48 * 36e5);

                  return (
                    <div key={pid} className={`grid grid-cols-1 md:grid-cols-[1fr_170px_150px] gap-3 items-center px-4 py-3 border-b border-line/70 last:border-0 ${qty ? 'bg-mint/40' : ''}`}>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <b className="text-[13px] font-black">{p.name}</b>
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${p.meal === 'بدون وعده' ? 'text-sub/70' : 'text-success'}`}>
                            {p.meal === 'بدون وعده' ? <Ban size={12} /> : <Coffee size={12} />} {p.meal}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${p.refund === 'free' ? 'text-success' : p.refund === 'partial' ? 'text-action-hover' : 'text-sub/70'}`}>
                            {p.refund === 'free' ? <><Check size={12} /> لغو رایگان تا {gShort.format(dl)}</> : p.refund === 'partial' ? <><Clock size={12} /> لغو با کسر یک شب</> : <><Ban size={12} /> غیرقابل استرداد</>}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sub"><Wallet size={12} /> {p.pay}</span>
                          {q.extraChild > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-action-hover"><Users size={12} /> تخت اضافه کودک: {fa(q.extraChild)} لیر</span>}
                        </div>
                        <button onClick={() => setOpenBd(isOpen ? null : k)} className="self-start border-0 bg-transparent p-0 text-brand-dark text-[11px] font-extrabold underline underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
                          {isOpen ? 'بستن جزئیات' : 'جزئیات قیمت هر شب'}
                        </button>
                      </div>
                      <div className="md:text-end">
                        {pid === 'saver' && <div className="text-sub text-xs font-bold line-through">{fa(ref)} لیر</div>}
                        <div className="text-lg font-black leading-snug text-price num">{fa(q.avg)} <small className="text-[11.5px] font-extrabold text-sub">لیر / شب</small></div>
                        <div className="text-[11.5px] font-bold text-sub">جمع {fa(NIGHTS.length)} شب: <b>{fa(q.total)} لیر</b></div>
                        <div className="text-[11px] font-bold text-sub">≈ {fa(Math.round((q.total * 2350) / 1000) * 1000)} تومان</div>
                      </div>
                      <div className="flex items-center justify-start md:justify-end gap-2">
                        <select
                          value={qty}
                          onChange={(e) => { const v = +e.target.value; setSel((s) => { const n = { ...s }; if (v) n[k] = v; else delete n[k]; return n; }); }}
                          disabled={maxSel < 1}
                          className="min-h-10 px-2 border border-line rounded-[10px] bg-surface text-[12.5px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          {Array.from({ length: maxSel + 1 }, (_, i) => (
                            <option key={i} value={i}>{i ? `${fa(i)} اتاق` : '—'}</option>
                          ))}
                        </select>
                      </div>
                      {isOpen && (
                        <div className="col-span-full mt-1 p-3 border border-line rounded-xl bg-soft/50">
                          <table className="w-full text-[11.5px]">
                            <tbody>
                              {q.nights.map((n, i) => (
                                <tr key={i} className="border-b border-dashed border-line/70 last:border-0">
                                  <td className="py-1 font-bold text-sub">
                                    {gShort.format(n.date)} — {wFmt.format(n.date)}
                                    {n.weekend && <span className="text-gold font-black"> (آخر هفته)</span>}
                                  </td>
                                  <td className="py-1 text-end font-extrabold">{fa(n.price)} لیر</td>
                                </tr>
                              ))}
                              {q.extraChild > 0 && <tr><td className="py-1 font-bold">تخت اضافه کودک</td><td className="py-1 text-end font-extrabold">{fa(q.extraChild)} لیر</td></tr>}
                              <tr><td className="py-1 font-bold">مالیات و عوارض ({fa(TAX * 100)}٪)</td><td className="py-1 text-end font-extrabold">{fa(q.tax)} لیر</td></tr>
                              <tr><td className="pt-1 font-black">جمع کل یک اتاق</td><td className="pt-1 text-end font-black">{fa(q.total)} لیر</td></tr>
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
