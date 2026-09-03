import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ROOMS, PLANS, type RoomDef, type PlanId } from '@/lib/hotel-mock';

export const TAX = 0.12;
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

export function useHotelBooking() {
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

  const takenOf = (rid: string) =>
    Object.entries(sel).filter(([k]) => k.startsWith(rid + '|')).reduce((s, [, q]) => s + q, 0);

  const totals = useMemo(() => {
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
  }, [sel, children, nights]);

  const capacity = useMemo(() => {
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
  }, [sel]);

  const bestCombo = useMemo(() => {
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
  }, [adults, children, nights]);

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
  };
}

// Backward compatibility exports for existing static references
export const CHECKIN = DEFAULT_CHECKIN;
export const CHECKOUT = DEFAULT_CHECKOUT;
export const ADULTS = DEFAULT_ADULTS;
export const CHILDREN = DEFAULT_CHILDREN;
export const NIGHTS = nightsOf(DEFAULT_CHECKIN, DEFAULT_CHECKOUT);
