'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, countryName } from '@/lib/countries';
import { dualDate } from '@/lib/jalali';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import { num } from '@/lib/format';
import {
  MapPin, CalendarDays, Users, Search, Minus, Plus, CheckCircle2, X, ChevronDown,
  Plane, BedDouble, Compass, ArrowLeftRight, Sparkles
} from 'lucide-react';

const TABS = [
  { id: 'plan', labelKey: 'tabPlan', routeMode: false, Icon: Sparkles },
  { id: 'flights', labelKey: 'tabFlights', routeMode: true, Icon: Plane },
  { id: 'hotels', labelKey: 'tabHotels', routeMode: false, Icon: BedDouble },
  { id: 'tours', labelKey: 'tabTours', routeMode: false, Icon: Compass },
] as const;

type TabId = (typeof TABS)[number]['id'];

const ROUTES = {
  plan: '/plan',
  flights: '/flights/search',
  hotels: '/hotels/search',
  tours: '/tours',
};

export function SearchWidget() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Search');
  const { country } = useCountryStore();
  const c = COUNTRIES[country];

  const [tab, setTab] = useState<TabId>('plan');
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [date1, setDate1] = useState('');
  const [time1, setTime1] = useState('14:30');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [guestOpen, setGuestOpen] = useState(false);
  const [sheet, setSheet] = useState<'none' | 'dates' | 'guests'>('none');
  const [error, setError] = useState('');
  const [tourType, setTourType] = useState('recreational');
  const guestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guestOpen) return;
    function onDoc(e: MouseEvent) {
      if (!guestRef.current?.contains(e.target as Node)) setGuestOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setGuestOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [guestOpen]);

  const tabDef = TABS.find((tb) => tb.id === tab)!;
  const needsTime = false;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === 'plan') {
      if (!query.trim()) {
        router.push('/plan');
      } else {
        router.push(`/plan?q=${encodeURIComponent(query)}`);
      }
      return;
    }
    
    if (!dest.trim()) {
      setError(tabDef.routeMode ? t('errFrom') : t('errDest'));
      return;
    }
    if (tabDef.routeMode && !routeTo.trim()) {
      setError(t('errDest'));
      return;
    }
    setError('');
    const q = tabDef.routeMode
      ? `?from=${encodeURIComponent(dest)}&to=${encodeURIComponent(routeTo)}`
      : `?city=${encodeURIComponent(dest)}`;
    router.push(`${ROUTES[tab]}${q}`);
  }

  function swap() {
    setDest(routeTo);
    setRouteTo(dest);
  }

  const guestSummary = t('guestSummary', { rooms, adults, children });

  const guestSteppers = ([
    ['adult', 'adultHint', adults, setAdults, 1],
    ['child', 'childHint', children, setChildren, 0],
    ['room', 'roomHint', rooms, setRooms, 1],
  ] as const).map(([labelKey, hintKey, val, setter, min]) => (
    <div key={labelKey} className="flex items-center justify-between py-2.5 border-b border-line/60 last:border-0">
      <div>
        <strong className="block text-[13px]">{t(labelKey)}</strong>
        <span className="block text-[10px] text-sub">{t(hintKey)}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t(labelKey) + ' −'}
          onClick={() => setter(Math.max(min, val - 1))}
          disabled={val <= min}
          className="w-8 h-8 grid place-items-center border border-brand/40 rounded-full text-brand-dark disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        ><Minus size={14} /></button>
        <b className="min-w-4 text-center">{num(val, locale)}</b>
        <button
          type="button"
          aria-label={t(labelKey) + ' +'}
          onClick={() => setter(Math.min(9, val + 1))}
          className="w-8 h-8 grid place-items-center border border-brand/40 rounded-full text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        ><Plus size={14} /></button>
      </div>
    </div>
  ));

  const fieldCls =
    'min-h-[58px] flex items-center gap-3 px-3 rounded-xl bg-surface border border-line/80 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand transition';

  return (
    <div className="w-full max-w-4xl mx-auto relative z-[60]">
      {error && (
        <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface/95 border border-destructive/30 text-destructive text-sm font-bold shadow-md animate-in fade-in slide-in-from-top-2">
          <X size={16} /> {error}
        </div>
      )}
      <div className="glass-card rounded-3xl p-5 md:p-7 shadow-elev-3 overflow-visible">
        {/* Segmented Pill Tabs */}
        <div className="flex justify-start md:justify-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-soft/80 border border-line/60">
            {TABS.map(({ id, labelKey, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => { setTab(id); setError(''); }}
                  className={`shrink-0 min-h-[42px] px-4 md:px-5 inline-flex items-center gap-2 rounded-xl transition-all font-black text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    active
                      ? 'bg-brand text-surface shadow-md shadow-brand/25 scale-[1.02]'
                      : 'text-sub hover:text-brand-dark hover:bg-surface/60'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-surface' : 'text-sub'} />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={submit} noValidate className={`grid grid-cols-1 ${tab === 'plan' ? 'md:grid-cols-[1fr_auto]' : tab === 'tours' ? 'md:grid-cols-7' : 'md:grid-cols-6'} gap-3 relative`}>
          {tab === 'plan' ? (
            <div className={`${fieldCls} md:col-span-1 shadow-inner bg-soft/50`}>
              <Sparkles size={20} className="text-brand shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('planPlaceholder')}
                className="w-full h-full border-0 outline-0 p-0 text-[15px] font-extrabold text-ink bg-transparent placeholder:text-sub"
              />
            </div>
          ) : (
            <>
              <div className={`${fieldCls} md:col-span-2`}>
                <MapPin size={18} className="text-brand-dark shrink-0" />
                <div className="w-full min-w-0">
                  <label className="block mb-0.5 text-[10px] font-extrabold text-sub">{tabDef.routeMode ? t('from') : t('destination')}</label>
                  <input
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    placeholder={tabDef.routeMode ? t('fromPlaceholder') : t('destPlaceholder', { country: countryName(country, locale) })}
                    className="w-full border-0 outline-0 p-0 text-[13px] font-extrabold text-ink bg-transparent placeholder:text-sub"
                  />
                </div>
              </div>

              {tab === 'tours' && (
                <div className={`${fieldCls} md:col-span-1`}>
                  <Compass size={18} className="text-brand-dark shrink-0" />
                  <div className="w-full min-w-0">
                    <label className="block mb-0.5 text-[10px] font-extrabold text-sub">نوع تور</label>
                    <select
                      value={tourType}
                      onChange={(e) => setTourType(e.target.value)}
                      className="w-full border-0 outline-0 p-0 text-[13px] font-extrabold text-ink bg-transparent appearance-none"
                    >
                      <option value="recreational">تفریحی</option>
                      <option value="medical">درمانی</option>
                      <option value="commercial">تجاری</option>
                    </select>
                  </div>
                </div>
              )}

              {tabDef.routeMode && (
                <div className={`${fieldCls} md:col-span-2`}>
                  <MapPin size={18} className="text-brand-dark shrink-0" />
                  <div className="w-full min-w-0">
                    <label className="block mb-0.5 text-[10px] font-extrabold text-sub">{t('to')}</label>
                    <input
                      value={routeTo}
                      onChange={(e) => setRouteTo(e.target.value)}
                      placeholder={t('toPlaceholder')}
                      className="w-full border-0 outline-0 p-0 text-[13px] font-extrabold bg-transparent placeholder:text-sub"
                    />
                  </div>
                </div>
              )}

              {/* Floating swap (route tabs, desktop) */}
              {tabDef.routeMode && (
                <button
                  type="button"
                  onClick={swap}
                  aria-label={t('swap')}
                  className="hidden md:grid absolute top-[24px] rtl:right-[33.333%] ltr:left-[33.333%] rtl:translate-x-1/2 ltr:-translate-x-1/2 z-30 w-9 h-9 place-items-center rounded-full bg-surface border border-line/70 shadow-md text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rtl:-scale-x-100"
                >
                  <ArrowLeftRight size={15} />
                </button>
              )}

              {/* Dates — desktop inline */}
              <div className={`hidden md:flex ${fieldCls}`}>
                <CalendarDays size={18} className="text-brand-dark shrink-0" />
                <div className="w-full min-w-0">
                  <label className="block mb-0.5 text-[10px] font-extrabold text-sub">{needsTime ? t('time') : t('departDate')}</label>
                  {needsTime ? (
                    <input type="time" value={time1} onChange={(e) => setTime1(e.target.value)} dir="ltr" className="w-full min-w-0 border-0 outline-0 p-0 text-[12px] font-extrabold bg-transparent" />
                  ) : (
                    <>
                      <JalaliDatePicker value={date1} onChange={(val) => setDate1(val || '')} />
                      {date1 && (
                        <span className="block text-[9.5px] font-bold text-sub truncate">
                          {dualDate(date1).j} · {dualDate(date1).weekday}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!needsTime && (
                <div className={`hidden md:flex ${fieldCls}`}>
                  <CalendarDays size={18} className="text-brand-dark shrink-0" />
                  <div className="w-full min-w-0">
                    <label className="block mb-0.5 text-[10px] font-extrabold text-sub">{t('returnDate')}</label>
                    <input type="date" dir="ltr" className="w-full min-w-0 border-0 outline-0 p-0 text-[11px] font-extrabold bg-transparent" />
                  </div>
                </div>
              )}

              {/* Dates — mobile step trigger */}
              <button
                type="button"
                onClick={() => setSheet('dates')}
                aria-expanded={sheet === 'dates'}
                aria-controls="mobile-date-sheet"
                className={`md:hidden ${fieldCls} text-end bg-surface`}
              >
                <CalendarDays size={18} className="text-brand-dark shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block mb-0.5 text-[10px] font-extrabold text-sub">{needsTime ? t('departTime') : t('departReturnDate')}</span>
                  <span className="block text-[12.5px] font-extrabold truncate">
                    {needsTime
                      ? <span dir="ltr">{time1}</span>
                      : date1
                        ? `${dualDate(date1).j} · ${dualDate(date1).weekday}`
                        : t('pickDate')}
                  </span>
                </span>
                <ChevronDown size={16} className="text-sub shrink-0" />
              </button>

              {/* Guest selector — desktop popover (opens upward, stays inside the card) */}
              <div ref={guestRef} className={`hidden md:flex ${fieldCls} relative`}>
                <button
                  type="button"
                  onClick={() => setGuestOpen(!guestOpen)}
                  aria-expanded={guestOpen}
                  aria-haspopup="dialog"
                  aria-controls="guest-popover"
                  className="flex items-center justify-between w-full min-w-0 h-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Users size={18} className="text-brand-dark shrink-0" />
                    <div className="min-w-0 flex-1">
                      <label className="block mb-0.5 text-[10px] font-extrabold text-sub cursor-pointer">{t('guests')}</label>
                      <span className="block text-[11px] font-extrabold truncate">{guestSummary}</span>
                    </div>
                  </div>
                  <ChevronDown size={14} className={`text-sub shrink-0 transition-transform ms-1 ${guestOpen ? 'rotate-180' : ''}`} />
                </button>

                {guestOpen && (
                  <div
                    id="guest-popover"
                    role="dialog"
                    aria-label={t('guestsDialog')}
                    className="absolute z-[110] end-0 bottom-[calc(100%+12px)] w-[300px] max-w-[calc(100vw-2rem)] p-3.5 border border-line rounded-xl bg-surface shadow-sm sheet-up"
                  >
                    {guestSteppers}
                    <button type="button" onClick={() => setGuestOpen(false)} className="w-full mt-3 min-h-10 rounded-xl bg-mint text-brand-dark font-extrabold text-[13px] flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                      <CheckCircle2 size={15} /> {t('confirm')}
                    </button>
                  </div>
                )}
              </div>

              {/* Guest selector — mobile step trigger */}
              <button
                type="button"
                onClick={() => setSheet('guests')}
                aria-expanded={sheet === 'guests'}
                aria-controls="mobile-guest-sheet"
                className={`md:hidden ${fieldCls} text-end bg-surface`}
              >
                <Users size={18} className="text-brand-dark shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block mb-0.5 text-[10px] font-extrabold text-sub">{t('guests')}</span>
                  <span className="block text-[12.5px] font-extrabold truncate">{guestSummary}</span>
                </span>
                <ChevronDown size={16} className="text-sub shrink-0" />
              </button>
            </>
          )}

          <button
            type="submit"
            className={`min-h-[58px] px-8 rounded-xl font-black flex items-center justify-center gap-2 transition shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              tab === 'plan' 
                ? 'bg-brand hover:bg-brand-2 text-surface shadow-brand/25 md:px-12' 
                : 'bg-brand hover:bg-brand-2 text-surface shadow-brand/25'
            }`}
          >
            {tab === 'plan' ? (
              <>{t('planSubmit')}</>
            ) : (
              <><Search size={17} /> {t('search')}</>
            )}
          </button>
        </form>

        {/* Mobile step sheets */}
        {sheet !== 'none' && (
          <div className="md:hidden">
            <div className="fixed inset-0 z-90 bg-ink/45 fade-soft" onClick={() => setSheet('none')} />
            <div
              id={sheet === 'dates' ? 'mobile-date-sheet' : 'mobile-guest-sheet'}
              role="dialog"
              aria-modal="true"
              className="fixed inset-x-0 bottom-0 z-95 sheet-up rounded-t-[22px] bg-surface px-5 pt-3 pb-[calc(18px+env(safe-area-inset-bottom))] shadow-sm"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
              <div className="flex items-center justify-between mb-2">
                <b className="text-[15px] font-black">{sheet === 'dates' ? (needsTime ? t('departTime') : t('departReturnDate')) : t('guests')}</b>
                <button onClick={() => setSheet('none')} aria-label={t('close')} className="grid place-items-center w-8 h-8 rounded-full bg-soft text-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  <X size={15} />
                </button>
              </div>
              {sheet === 'dates' ? (
                needsTime ? (
                  <input type="time" value={time1} onChange={(e) => setTime1(e.target.value)} dir="ltr" className="w-full min-h-[52px] px-3 border border-line rounded-xl text-[15px] font-extrabold" />
                ) : (
                  <div className="flex flex-col gap-3">
                    <label className="block p-3 border border-line rounded-xl">
                      <span className="block mb-1 text-[10px] font-extrabold text-sub">{t('departLabel')}</span>
                      <JalaliDatePicker value={date1} onChange={(val) => setDate1(val || '')} />
                      {date1 && <span className="block mt-1 text-[10px] font-bold text-sub">{dualDate(date1).j} · {dualDate(date1).weekday}</span>}
                    </label>
                    <label className="block p-3 border border-line rounded-xl">
                      <span className="block mb-1 text-[10px] font-extrabold text-sub">{t('returnLabel')}</span>
                      <input type="date" dir="ltr" className="w-full border-0 outline-0 p-0 text-[14px] font-extrabold bg-transparent" />
                    </label>
                  </div>
                )
              ) : (
                guestSteppers
              )}
              <button onClick={() => setSheet('none')} className="w-full mt-4 min-h-[48px] rounded-full bg-brand hover:bg-brand-2 text-surface font-black text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                {t('confirmBack')}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 px-1 pt-3.5 text-ink/60 text-[11px] font-bold">
          <CheckCircle2 size={14} className="text-success shrink-0" />
          {t('footnote', { country: countryName(country, locale), currency: c.currency })}
        </div>
      </div>
    </div>
  );
}
