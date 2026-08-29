'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plane, Briefcase, ChevronDown, Armchair, Ticket, Clock, CheckCircle2 } from 'lucide-react';
import type { Flight } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

/* "3h 50m" → minutes (for sorting) */
export function durationMinutes(d: string): number {
  const h = /(\d+)\s*h/.exec(d)?.[1] ?? '0';
  const m = /(\d+)\s*m/.exec(d)?.[1] ?? '0';
  return Number(h) * 60 + Number(m);
}

/* "3h 50m" → localized duration string */
export function durationLocalized(d: string, locale: string): string {
  const h = Number(/(\d+)\s*h/.exec(d)?.[1] ?? 0);
  const m = Number(/(\d+)\s*m/.exec(d)?.[1] ?? 0);
  if (locale === 'fa') {
    const parts: string[] = [];
    if (h) parts.push(`${h.toLocaleString('fa-IR')} ساعت`);
    if (m) parts.push(`${m.toLocaleString('fa-IR')} دقیقه`);
    return parts.join(' و ');
  }
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ');
}

export function BentoFlightCard({ flight, onSelect }: { flight: Flight; onSelect: () => void }) {
  const t = useTranslations('Flights');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const overnight = flight.arrivalTime < flight.departureTime;
  const business = flight.cabinClass === 'business';

  return (
    <article
      className="bg-surface rounded-2xl border border-line overflow-hidden shadow-elev-1 hover:shadow-elev-2 hover:border-brand/40 transition-all group"
    >
      <div className="flex flex-col md:flex-row">
        {/* Flight info + timeline */}
        <div className="flex-grow p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6 gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-mint rounded-xl grid place-items-center text-brand-dark shadow-sm">
                  <Plane size={18} className="-rotate-45" />
                </span>
                <div>
                  <h4 className="font-black text-base text-ink leading-snug">{flight.airline}</h4>
                  <span className="text-xs text-sub font-mono" dir="ltr">
                    {flight.flightNo} • {business ? 'Business' : 'Economy'}
                  </span>
                </div>
              </div>
              <Badge variant={business ? 'gold' : 'mint'}>
                {business ? <Ticket size={13} /> : <CheckCircle2 size={13} />}
                <span>{business ? (locale === 'fa' ? 'بیزینس کلاس' : 'Business Class') : (locale === 'fa' ? 'تایید آنی' : 'Instant Confirmation')}</span>
              </Badge>
            </div>

            {/* Visual flight path */}
            <div className="flex items-center justify-between w-full py-2">
              <div className="text-start shrink-0">
                <div className="text-xl md:text-2xl font-black text-ink font-mono" dir="ltr">
                  {flight.departureTime}
                </div>
                <div className="text-xs text-sub font-bold mt-0.5">{flight.origin}</div>
              </div>

              <div className="flex-grow mx-3 md:mx-8 relative flex flex-col items-center justify-center min-w-0">
                <span className="text-[11px] font-bold text-sub mb-1 whitespace-nowrap">
                  {durationLocalized(flight.duration, locale)}
                </span>
                <div className="w-full relative h-8 flex items-center justify-between px-1">
                  {/* dashed path */}
                  <span className="absolute top-1/2 -translate-y-1/2 inset-x-1 h-0.5 bg-[repeating-linear-gradient(90deg,var(--color-line)_0_6px,transparent_6px_12px)]" />
                  <span className="relative w-3 h-3 rounded-full bg-brand border-2 border-surface" />
                  <span className="relative w-8 h-8 rounded-full bg-surface border border-line grid place-items-center shadow-sm text-brand group-hover:scale-110 transition-transform">
                    <Plane size={14} className="-rotate-45" />
                  </span>
                  <span className="relative w-3 h-3 rounded-full bg-line border-2 border-surface" />
                </div>
                <span
                  className={`text-[11px] font-bold mt-1 ${
                    flight.stops === 0 ? 'text-brand-dark' : 'text-gold'
                  }`}
                >
                  {flight.stops === 0 ? t('directFlight') : `${flight.stops.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')} ${t('stops')}`}
                </span>
              </div>

              <div className="text-end shrink-0">
                <div className="text-xl md:text-2xl font-black text-ink font-mono" dir="ltr">
                  {flight.arrivalTime}
                </div>
                {overnight && <div className="text-[10.5px] text-destructive font-bold">{t('plusOneDay')}</div>}
                <div className="text-xs text-sub font-bold mt-0.5">{flight.destination}</div>
              </div>
            </div>
          </div>

          {/* Expandable details button */}
          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="text-xs text-sub hover:text-brand-dark font-bold flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
            >
              <span>{t('flightDetails')}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            <span className="text-[11px] text-sub font-medium flex items-center gap-1">
              <Briefcase size={13} className="text-brand-dark" />
              <span>{t('baggageIncluded')}: {flight.baggage}</span>
            </span>
          </div>

          {/* Expanded details container */}
          {open && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-3 p-4 bg-soft/70 border border-line/70 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {([
                [locale === 'fa' ? 'شماره پرواز' : 'Flight No', <span dir="ltr" key="n" className="font-mono">{flight.flightNo}</span>],
                [locale === 'fa' ? 'مدت کل پرواز' : 'Duration', durationLocalized(flight.duration, locale)],
                [t('baggageIncluded'), <span key="b" className="inline-flex items-center gap-1"><Briefcase size={12} /> {flight.baggage}</span>],
                [locale === 'fa' ? 'صندلی باقی‌مانده' : 'Seats Left', <span key="s" className="inline-flex items-center gap-1"><Armchair size={12} /> {flight.seatsLeft.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>],
              ] as [string, React.ReactNode][]).map(([l, v]) => (
                <div key={l}>
                  <b className="block text-[10.5px] text-sub font-bold mb-0.5">{l}</b>
                  <span className="font-bold text-ink">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price & action column */}
        <div className="bg-soft/50 p-5 md:p-6 flex flex-col justify-between items-stretch border-t md:border-t-0 md:border-s border-line w-full md:w-64 shrink-0">
          <div className="flex md:flex-col justify-between md:justify-start items-center md:items-end gap-1 mb-4 md:mb-0">
            {flight.seatsLeft < 5 ? (
              <div className="text-[11px] text-destructive font-bold flex items-center gap-1 md:mb-2 md:order-1">
                <Armchair size={13} />
                {locale === 'fa' ? `فقط ${flight.seatsLeft.toLocaleString('fa-IR')} صندلی باقی مانده` : `Only ${flight.seatsLeft} seats left`}
              </div>
            ) : (
              <div className="hidden md:flex text-[11px] text-sub items-center gap-1 mb-2 order-1">
                <Clock size={12} />
                {durationLocalized(flight.duration, locale)}
              </div>
            )}
            <div className="text-end md:text-start md:order-2">
              <span className="text-[11px] text-sub block mb-1">{t('perPassenger')}</span>
              <div className="text-xl md:text-2xl font-black text-ink font-mono num flex items-baseline gap-1">
                {flight.price.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                <span className="text-xs font-normal text-sub">{t('toman')}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSelect}
            className="w-full h-11 px-5 rounded-xl bg-action hover:bg-action-hover text-[#14201f] font-black text-xs md:text-sm flex items-center justify-center transition shadow-sm hover:shadow-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]"
          >
            {t('selectTicket')}
          </button>
        </div>
      </div>
    </article>
  );
}
