import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ROOMS, PLANS, type RoomDef, type PlanId } from '@/lib/hotel-mock';
import type { RoomType } from '@/lib/types';

/**
 * Canonical Hotel Accommodation VAT: 10% (aligned with TaxEngine TR jurisdiction rule)
 */
export const TAX = 0.10;
export const WEEKEND_UPLIFT = 0.15;
export const FREE_CANCEL_HOURS = 48;
export const RATE_TOMAN = 2350;

// Default fallback dates & guests
export const DEFAULT_CHECKIN = '2026-09-22';
export const DEFAULT_CHECKOUT = '2026-09-26';
export const DEFAULT_ADULTS = 2;
export const DEFAULT_CHILDREN = 0;

export function nightsOf(a: string, b: string): Date[] {
  const out: Date[] = [];
  const end = new Date(b + 'T00:00:00');
  const start = new Date(a + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    const fallbackEnd = new Date('2026-09-26T00:00:00');
    for (let d = new Date('2026-09-22T00:00:00'); d < fallbackEnd; d = new Date(d.getTime() + 864e5)) {
      out.push(new Date(d));
    }
    return out;
  }
  for (let d = start; d < end; d = new Date(d.getTime() + 864e5)) {
    out.push(new Date(d));
  }
  return out;
}

export const isWeekend = (d: Date) => d.getDay() === 5 || d.getDay() === 6;
export const toman = (t: number) => Math.round((t * RATE_TOMAN) / 1000) * 1000;
export const keyOf = (r: string, p: string) => r + '|' + p;

export function nightlyRates(room: RoomDef, plan: PlanId, nightsList: Date[]) {
  const f = PLANS[plan].factor;
  return nightsList.map((d) => ({
    date: d,
    weekend: isWeekend(d),
    price: Math.round((room.base * f * (isWeekend(d) ? 1 + WEEKEND_UPLIFT : 1)) / 10) * 10,
  }));
}

export function quote(room: RoomDef, plan: PlanId, nightsList: Date[], childrenInRoom = 0) {
  const nts = nightlyRates(room, plan, nightsList);
  const sub = nts.reduce((s, n) => s + n.price, 0);
  const extraChild = Math.max(0, childrenInRoom - room.capC) * 350 * Math.max(1, nightsList.length);
  const tax = Math.round((sub + extraChild) * TAX);
  return {
    nights: nts,
    sub,
    extraChild,
    tax,
    total: sub + extraChild + tax,
    avg: Math.round((sub + extraChild + tax) / Math.max(1, nightsList.length))
  };
}

export function useHotelBooking(liveRooms?: RoomType[]) {
  const searchParams = useSearchParams();

  // Read initial values from URL query parameters if present
  const queryCheckin = searchParams?.get('checkin') || DEFAULT_CHECKIN;
  const queryCheckout = searchParams?.get('checkout') || DEFAULT_CHECKOUT;
  const queryAdults = Number(searchParams?.get('adults')) || DEFAULT_ADULTS;
  const queryChildren = Number(searchParams?.get('children')) || DEFAULT_CHILDREN;

  const [checkin, setCheckin] = useState<string>(queryCheckin);
  const [checkout, setCheckout] = useState<string>(queryCheckout);
  const [adults, setAdults] = useState<number>(Math.max(1, queryAdults));
  const [children, setChildren] = useState<number>(Math.max(0, queryChildren));

  const [sel, setSel] = useState<Record<string, number>>({});

  const nights = useMemo(() => nightsOf(checkin, checkout), [checkin, checkout]);

  // Live pricing mode: use the hotel's real roomTypes (IRR prices) instead of
  // the static Istanbul mock catalogue. Totals are computed directly in Toman
  // (IRR / 10) with 10% tax — no TRY conversion.
  const liveRoomList = useMemo(
    () => (liveRooms && liveRooms.length > 0 ? liveRooms : null),
    [liveRooms]
  );
  const isLive = liveRoomList !== null;
  const liveById = useMemo(() => {
    const m = new Map<string, RoomType>();
    liveRoomList?.forEach((r) => m.set(String(r.id), r));
    return m;
  }, [liveRoomList]);

  const takenOf = (rid: string) =>
    Object.entries(sel).filter(([k]) => k === rid || k.startsWith(rid + '|')).reduce((s, [, q]) => s + q, 0);

  const totals = useMemo(() => {
    if (liveRoomList) {
      let sub = 0;
      Object.entries(sel).forEach(([k, q]) => {
        const rid = k.split('|')[0];
        const room = liveById.get(rid);
        if (!room) return;
        const priceToman = Math.round((room.pricePerNight || 0) / 10);
        sub += priceToman * Math.max(1, nights.length) * q;
      });
      const tax = Math.round(sub * TAX);
      return { sub, tax, extra: 0, total: sub + tax };
    }
    let sub = 0, tax = 0, extra = 0, total = 0;
    Object.entries(sel).forEach(([k, q]) => {
      const [rid, pid] = k.split('|') as [string, PlanId];
      const r = ROOMS.find((x) => x.id === rid);
      if (!r) return;
      const cInRoom = Math.min(children, r.capC);
      const qt = quote(r, pid, nights, cInRoom);
      sub += qt.sub * q;
      tax += qt.tax * q;
      extra += qt.extraChild * q;
      total += qt.total * q;
    });
    return { sub, tax, extra, total };
  }, [sel, children, nights, liveRoomList, liveById]);

  const capacity = useMemo(() => {
    if (liveRoomList) {
      let a = 0, n = 0;
      Object.entries(sel).forEach(([k, q]) => {
        const rid = k.split('|')[0];
        const room = liveById.get(rid);
        if (!room) return;
        a += (room.capacity || 2) * q;
        n += q;
      });
      return { a, c: 99, n };
    }
    let a = 0, c = 0, n = 0;
    Object.entries(sel).forEach(([k, q]) => {
      const rid = k.split('|')[0];
      const r = ROOMS.find((x) => x.id === rid);
      if (!r) return;
      a += r.capA * q;
      c += r.capC * q;
      n += q;
    });
    return { a, c, n };
  }, [sel, liveRoomList, liveById]);

  const bestCombo = useMemo(() => {
    if (liveRoomList) {
      // Live mode: cheapest combination of real rooms covering adult capacity.
      // Cost is in Toman (no TRY conversion).
      type LiveOpt = { id: string; name: string; capacity: number; cost: number; available: number };
      const opts: LiveOpt[] = liveRoomList.map((r) => ({
        id: String(r.id),
        name: r.name,
        capacity: r.capacity || 2,
        cost: Math.round((r.pricePerNight || 0) / 10) * Math.max(1, nights.length) * 1.1,
        available: r.available ?? 5,
      }));
      let best: { cost: number; pick: Array<{ r: RoomDef; p: PlanId; cost: number }> } | null = null;
      const walk = (start: number, pick: LiveOpt[]) => {
        if (pick.length) {
          const a = pick.reduce((s, o) => s + o.capacity, 0);
          const cost = pick.reduce((s, o) => s + o.cost, 0);
          const counts: Record<string, number> = {};
          pick.forEach((o) => (counts[o.id] = (counts[o.id] || 0) + 1));
          const fitsLeft = Object.entries(counts).every(
            ([id, n]) => n <= (liveById.get(id)?.available ?? 5)
          );
          if (a >= adults && fitsLeft && (!best || cost < best.cost)) {
            best = {
              cost: Math.round(cost),
              pick: pick.map((o) => ({
                r: { id: o.id, name: o.name, size: 0, bed: '', view: '', capA: o.capacity, capC: 0, base: 0, left: o.available, art: 0, am: [], plans: ['bb' as PlanId] },
                p: 'bb' as PlanId,
                cost: Math.round(o.cost),
              })),
            };
          }
        }
        if (pick.length === 3) return;
        for (let i = start; i < opts.length; i++) {
          pick.push(opts[i]);
          walk(i, pick);
          pick.pop();
        }
      };
      walk(0, []);
      return best;
    }
    type Opt = { r: RoomDef; p: PlanId; cost: number };
    const opts: Opt[] = [];
    ROOMS.forEach((r) => r.plans.forEach((p) => opts.push({ r, p, cost: quote(r, p, nights, Math.min(children, r.capC)).total })));
    let best: { cost: number; pick: Opt[] } | null = null;
    const walk = (start: number, pick: Opt[]) => {
      if (pick.length) {
        const a = pick.reduce((s, o) => s + o.r.capA, 0);
        const c = pick.reduce((s, o) => s + o.r.capC, 0);
        const cost = pick.reduce((s, o) => s + o.cost, 0);
        const counts: Record<string, number> = {};
        pick.forEach((o) => (counts[o.r.id] = (counts[o.r.id] || 0) + 1));
        const fitsLeft = Object.entries(counts).every(([id, n]) => n <= (ROOMS.find((x) => x.id === id)?.left ?? 0));
        if (a >= adults && c >= children && fitsLeft && (!best || cost < best.cost)) best = { cost, pick: [...pick] };
      }
      if (pick.length === 3) return;
      for (let i = start; i < opts.length; i++) {
        pick.push(opts[i]);
        walk(i, pick);
        pick.pop();
      }
    };
    walk(0, []);
    return best as { cost: number; pick: Opt[] } | null;
  }, [adults, children, nights, liveRoomList, liveById]);

  return {
    checkin,
    setCheckin,
    checkout,
    setCheckout,
    adults,
    setAdults,
    children,
    setChildren,
    nights,
    sel,
    setSel,
    takenOf,
    totals,
    capacity,
    bestCombo,
    isLive,
  };
}

// Backward compatibility exports for existing static references
export const CHECKIN = DEFAULT_CHECKIN;
export const CHECKOUT = DEFAULT_CHECKOUT;
export const ADULTS = DEFAULT_ADULTS;
export const CHILDREN = DEFAULT_CHILDREN;
export const NIGHTS = nightsOf(DEFAULT_CHECKIN, DEFAULT_CHECKOUT);
