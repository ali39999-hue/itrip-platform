'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { useBookingStore } from '@/stores/booking-store';
import { countryName } from '@/lib/countries';
import {
  INTERPRETERS, INTERPRETER_PRICING as P, SPECIALTY_LABEL,
  interpreterGroupPlan, PHRASEBOOK, type InterpreterSpecialty,
} from '@/lib/interpreters';
import { daysFromNow } from '@/lib/utils';
import { num } from '@/lib/format';
import {
  Languages, Clock, Siren, BookOpenText, Star, MapPin, Check, Plus,
  PhoneCall, PhoneOff, Users, Sparkles, Wallet, ArrowLeft,
} from 'lucide-react';

type SosPhase = 'idle' | 'connecting' | 'live';

export default function InterpreterPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Interpreter');
  const isEn = locale === 'en';
  const { country } = useCountryStore();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  // فرم رزرو
  const [groupSize, setGroupSize] = useState(2);
  const [days, setDays] = useState(2);
  const [tier, setTier] = useState<'full' | 'hourly'>('full');
  const [hours, setHours] = useState(3);
  const [selectedInt, setSelectedInt] = useState<string | null>(null);
  const [specFilter, setSpecFilter] = useState<'all' | InterpreterSpecialty>('all');
  const [kitOpen, setKitOpen] = useState(false);
  const [kitLang, setKitLang] = useState<keyof typeof PHRASEBOOK>('ar');

  // SOS
  const [sosOpen, setSosOpen] = useState(false);
  const [sosPhase, setSosPhase] = useState<SosPhase>('idle');
  const [sosLang, setSosLang] = useState('en');
  const [sosSeconds, setSosSeconds] = useState(0);

  const group = useMemo(() => interpreterGroupPlan(groupSize), [groupSize]);

  const profiles = useMemo(() => {
    const list = INTERPRETERS.filter((i) => i.countries.includes(country) || country === 'iran');
    return (specFilter === 'all' ? list : list.filter((i) => i.specialty === specFilter))
      .slice()
      .sort((a, b) => b.rating - a.rating);
  }, [country, specFilter]);

  function priceOf(): number {
    if (tier === 'full') {
      return group.dailyTotal * days;
    }
    const h = Math.max(P.minHours, hours);
    return P.hourly * h;
  }

  function book(kind: 'full' | 'hourly') {
    const gi = INTERPRETERS.find((i) => i.id === selectedInt);
    const label = kind === 'full'
      ? `${t('tier1')} · ${countryName(country, locale)}`
      : `${t('tier2')} · ${countryName(country, locale)}`;
    setBookingContext({
      type: 'tours',
      title: `${t('kicker')} · ${label}`,
      subtitle: gi
        ? `${isEn ? gi.nameEn : gi.name} · ${num(groupSize, locale)} pax${group.whisperSet ? ' · whisper set' : ''}`
        : `${num(groupSize, locale)} pax${group.whisperSet ? ' · whisper set' : ''}`,
      amount: priceOf(),
      travelDate: daysFromNow(14),
      meta: { service: 'interpreter', tier: kind, group: String(groupSize) },
    });
    router.push('/checkout');
  }

  function startSos() {
    setSosOpen(true);
    setSosPhase('connecting');
    setSosSeconds(0);
    setTimeout(() => setSosPhase('live'), 2200);
  }

  useEffect(() => {
    if (sosPhase !== 'live') return;
    const id = setInterval(() => setSosSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [sosPhase]);

  const specChips: ('all' | InterpreterSpecialty)[] = ['all', 'tourism', 'business', 'medical', 'pilgrimage'];
  const chip = (on: boolean) =>
    `min-h-9 px-4 rounded-full text-[12.5px] font-black inline-flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${on ? 'bg-brand text-surface shadow-sm shadow-brand/25' : 'bg-soft/80 border border-line/70 text-sub hover:text-brand-dark'}`;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-6 md:pt-8 pb-20">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-brand-dark text-[11px] font-black mb-3">
          <Languages size={13} /> {t('kicker')}
        </span>
        <h1 className="text-[26px] md:text-[36px] font-black tracking-tight leading-tight mb-3">{t('title')}</h1>
        <p className="text-sub text-[13px] md:text-[15px] leading-relaxed m-0">{t('subtitle')}</p>
      </div>

      {/* چهار سطح */}
      <h2 className="text-lg font-black mb-4 text-center">{t('tiers')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
        {/* سطح ۱ */}
        <article className="p-5 rounded-xl bg-surface border-2 border-brand shadow-sm flex flex-col">
          <span className="w-10 h-10 rounded-full bg-brand text-surface grid place-items-center mb-3"><Languages size={19} /></span>
          <h3 className="text-[15.5px] font-black mb-1">{t('tier1')}</h3>
          <p className="text-[11.5px] font-bold text-sub leading-relaxed m-0 mb-4 flex-1">{t('tier1Desc')}</p>
          <b className="text-price text-lg font-black num">{num(P.fullDay, locale)}</b>
          <span className="text-[10.5px] font-bold text-sub mb-3">{t('perDay')} · {isEn ? 'per interpreter' : 'به ازای هر مترجم'}</span>
          <button onClick={() => { setTier('full'); document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' }); }} className="min-h-10 rounded-full bg-brand text-surface font-black text-[12.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{t('bookTier1')}</button>
        </article>
        {/* سطح ۲ */}
        <article className="p-5 rounded-xl bg-surface border border-line shadow-sm flex flex-col">
          <span className="w-10 h-10 rounded-xl bg-mint text-brand-dark grid place-items-center mb-3"><Clock size={19} /></span>
          <h3 className="text-[15.5px] font-black mb-1">{t('tier2')}</h3>
          <p className="text-[11.5px] font-bold text-sub leading-relaxed m-0 mb-4 flex-1">{t('tier2Desc')}</p>
          <b className="text-price text-lg font-black num">{num(P.hourly, locale)}</b>
          <span className="text-[10.5px] font-bold text-sub mb-3">{t('perHour')} · {t('minHours', { n: num(P.minHours, locale) })}</span>
          <button onClick={() => { setTier('hourly'); document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' }); }} className="min-h-10 rounded-xl border border-brand text-brand-dark font-black text-[12.5px] hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{t('bookTier2')}</button>
        </article>
        {/* سطح ۳ */}
        <article className="p-5 rounded-xl bg-surface border border-line shadow-sm flex flex-col">
          <span className="w-10 h-10 rounded-xl bg-rose-warm/15 text-rose-warm grid place-items-center mb-3"><Siren size={19} /></span>
          <h3 className="text-[15.5px] font-black mb-1">{t('tier3')}</h3>
          <p className="text-[11.5px] font-bold text-sub leading-relaxed m-0 mb-4 flex-1">{t('tier3Desc')}</p>
          <b className="text-price text-lg font-black num">{num(P.sosPerCall, locale)}</b>
          <span className="text-[10.5px] font-bold text-sub mb-3">{t('perCall', { min: num(P.sosMinutes, locale) })}</span>
          <button onClick={startSos} className="min-h-10 rounded-xl bg-rose-warm text-surface font-black text-[12.5px] inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><PhoneCall size={14} /> {t('trySos')}</button>
        </article>
        {/* سطح ۴ */}
        <article className="p-5 rounded-2xl bg-mint/50 border border-line shadow-sm flex flex-col">
          <span className="w-10 h-10 rounded-xl bg-surface text-brand-dark grid place-items-center mb-3"><BookOpenText size={19} /></span>
          <h3 className="text-[15.5px] font-black mb-1">{t('tier4')}</h3>
          <p className="text-[11.5px] font-bold text-sub leading-relaxed m-0 mb-4 flex-1">{t('tier4Desc')}</p>
          <b className="text-success text-lg font-black">{t('free')}</b>
          <span className="text-[10.5px] font-bold text-transparent mb-3 select-none">.</span>
          <button onClick={() => { setKitOpen(!kitOpen); document.getElementById('kit')?.scrollIntoView({ behavior: 'smooth' }); }} className="min-h-10 rounded-xl border border-brand-dark/30 text-brand-dark font-black text-[12.5px] hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{t('openKit')}</button>
        </article>
      </div>

      {/* فرم رزرو + پیشنهاد خودکار گروه */}
      <section id="booking" className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 mb-14 items-start">
        <div className="p-6 md:p-8 rounded-xl bg-surface border border-line shadow-sm">
          <h2 className="text-xl font-black mb-1">{t('booking')}</h2>
          <p className="text-[12px] font-bold text-sub m-0 mb-6">{t('groupSizeHint')}</p>

          <label className="block mb-2 text-[11px] font-black text-sub">{t('groupSize')}</label>
          <div className="flex items-center gap-2.5 mb-6">
            {[1, 2, 3, 4, 6, 8, 12, 18, 25].map((n) => (
              <button key={n} onClick={() => setGroupSize(n)} className={`w-11 h-11 rounded-full text-[13px] font-black num transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${groupSize === n ? 'bg-brand text-surface shadow-sm shadow-brand/25' : 'bg-soft border border-line text-sub hover:text-brand-dark'}`}>{num(n, locale)}</button>
            ))}
            <Users size={17} className="text-sub me-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-2 text-[11px] font-black text-sub">{t('days')}</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 5, 7].map((n) => (
                  <button key={n} onClick={() => setDays(n)} className={`w-11 h-11 rounded-full text-[13px] font-black num transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${days === n ? 'bg-brand text-surface' : 'bg-soft border border-line text-sub'}`}>{num(n, locale)}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-2 text-[11px] font-black text-sub">{t('tier2')}</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setTier('full')} className={`min-h-11 px-4 rounded-full text-[12.5px] font-black ${tier === 'full' ? chip(true) : chip(false)}`}>{t('tier1')}</button>
                <button onClick={() => setTier('hourly')} className={`min-h-11 px-4 rounded-full text-[12.5px] font-black ${tier === 'hourly' ? chip(true) : chip(false)}`}>{t('tier2')}</button>
                {tier === 'hourly' && (
                  <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="min-h-11 px-3 rounded-xl border border-line bg-surface text-[13px] font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    {[2, 3, 4, 6, 8].map((h) => <option key={h} value={h}>{num(h, locale)}h</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>

          <label className="block mb-2 text-[11px] font-black text-sub">{t('profiles')}</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {specChips.map((s) => (
              <button key={s} onClick={() => setSpecFilter(s)} className={chip(specFilter === s)}>
                {s === 'all' ? t('all') : isEn ? SPECIALTY_LABEL[s].en : SPECIALTY_LABEL[s].fa}
              </button>
            ))}
          </div>
        </div>

        {/* پیشنهاد خودکار */}
        <aside className="lg:sticky lg:top-[84px] p-6 rounded-2xl bg-deep text-surface shadow-sm">
          <h3 className="text-[15px] font-black mb-1 inline-flex items-center gap-2"><Sparkles size={16} className="text-mint-bright" /> {t('recTitle')}</h3>
          <p className="text-[11.5px] font-bold text-mint-bright/90 m-0 mb-4" dir="auto">{isEn ? group.noteEn : group.noteFa}</p>
          <div className="flex flex-col gap-2 text-[12.5px] font-bold">
            <div className="flex justify-between"><span className="text-surface/75">{isEn ? 'Interpreters' : 'مترجم'} × {num(group.interpreters, locale)}</span><b className="num">{num(group.interpreters * P.fullDay, locale)}</b></div>
            {group.whisperSet && (
              <div className="flex justify-between"><span className="text-surface/75 inline-flex items-center gap-1">{t('whisper')}</span><b className="num">{num(P.whisperSetPerDay, locale)}</b></div>
            )}
            <div className="border-t border-surface/15 pt-3 mt-1 flex justify-between items-end">
              <span className="font-black">{t('recDaily')}</span>
              <b className="text-mint-bright text-lg font-black num">{num(group.dailyTotal, locale)}</b>
            </div>
            {tier === 'full' && (
              <div className="flex justify-between"><span className="text-surface/75">{t('recTotal', { days: num(days, locale) })}</span><b className="num">{num(group.dailyTotal * days, locale)}</b></div>
            )}
            {tier === 'hourly' && (
              <div className="flex justify-between"><span className="text-surface/75">{t('tier2')} · {num(Math.max(P.minHours, hours), locale)}h</span><b className="num">{num(P.hourly * Math.max(P.minHours, hours), locale)}</b></div>
            )}
          </div>
          <button onClick={() => book(tier)} className="w-full mt-5 min-h-12 rounded-full bg-brand hover:bg-brand-2 text-surface font-black text-sm inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <Plus size={16} /> {tier === 'full' ? t('bookTier1') : t('bookTier2')}
          </button>
          <p className="text-[10px] font-bold text-surface/60 m-0 mt-3 leading-relaxed">{t('sosNote')}</p>
        </aside>
      </section>

      {/* پروفایل مترجم‌ها */}
      <section className="mb-14">
        <h2 className="text-xl font-black mb-1">{t('profiles')}</h2>
        <p className="text-[12px] font-bold text-sub m-0 mb-5">{t('profilesSub')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {profiles.map((i) => {
            const sel = selectedInt === i.id;
            return (
              <button
                key={i.id}
                onClick={() => setSelectedInt(sel ? null : i.id)}
                className={`text-end p-5 rounded-2xl bg-surface border shadow-sm transition-all card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${sel ? 'border-brand ring-2 ring-brand/30' : 'border-line hover:border-brand/40'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="w-12 h-12 rounded-full bg-mint text-brand-dark grid place-items-center text-[16px] font-black">{(isEn ? i.nameEn : i.name).slice(0, 1)}</span>
                  <span className="inline-flex items-center gap-1 bg-gold-soft text-price px-2 py-1 rounded-lg text-[11.5px] font-black">
                    <Star size={12} className="fill-gold text-gold" /> {num(i.rating, locale)}
                  </span>
                </div>
                <h3 className="text-[14.5px] font-black m-0 mb-0.5">{isEn ? i.nameEn : i.name}</h3>
                <span className="block text-[10.5px] font-bold text-sub mb-2 inline-flex items-center gap-1">
                  <MapPin size={11} /> {isEn ? i.baseCityEn : i.baseCity} · {num(i.reviews, locale)} {t('reviews')}
                </span>
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {i.langs.map((l) => <span key={l} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-soft text-sub border border-line/60">{l}</span>)}
                </div>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2 py-1 rounded-full bg-mint text-brand-dark">
                  {isEn ? SPECIALTY_LABEL[i.specialty].en : SPECIALTY_LABEL[i.specialty].fa}
                </span>
                {sel && <span className="block mt-3 text-[11px] font-black text-brand-dark inline-flex items-center gap-1"><Check size={13} /> {t('selected')}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* کیت عبارات (سطح ۴) */}
      <section id="kit" className="rounded-xl bg-surface border border-line shadow-sm overflow-hidden mb-4">
        <button onClick={() => setKitOpen(!kitOpen)} aria-expanded={kitOpen} aria-controls="kit-content" className="w-full flex items-center justify-between gap-3 p-6 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <div>
            <h2 className="text-xl font-black m-0 mb-1 inline-flex items-center gap-2"><BookOpenText size={20} className="text-brand-dark" /> {t('kit')}</h2>
            <p className="text-[12px] font-bold text-sub m-0">{t('kitSub')}</p>
          </div>
          <span className={`w-9 h-9 rounded-full bg-soft text-brand-dark grid place-items-center shrink-0 transition-transform ${kitOpen ? 'rotate-180' : ''}`}><ArrowLeft size={16} className="-rotate-90" /></span>
        </button>
        {kitOpen && (
          <div className="px-6 pb-6">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(Object.keys(PHRASEBOOK) as (keyof typeof PHRASEBOOK)[]).map((k) => (
                <button key={k} onClick={() => setKitLang(k)} className={chip(kitLang === k)}>
                  {PHRASEBOOK[k].flag} {isEn ? PHRASEBOOK[k].labelEn : PHRASEBOOK[k].label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PHRASEBOOK[kitLang].phrases.map((ph) => (
                <div key={ph.fa} className="p-3.5 rounded-xl bg-soft/70 border border-line/60">
                  <span className="block text-[10.5px] font-bold text-sub">{t('sayFa')}: {ph.fa}</span>
                  <b className="block text-[15px] font-black mt-1" dir="auto">{ph.local}</b>
                  <span className="block text-[10.5px] font-bold text-sub" dir="ltr">{ph.translit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      {/* لینک با سرویس مالی */}
      <div className="rounded-2xl bg-gold-soft/60 border border-gold/30 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <p className="m-0 text-[13px] font-black text-price inline-flex items-center gap-2">
          <Wallet size={17} /> {t('moneyLink', { country: countryName(country, locale) })}
        </p>
        <button onClick={() => router.push('/wallet')} className="min-h-10 px-5 rounded-full bg-surface border border-gold/40 text-price font-black text-[12.5px] inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          {isEn ? 'Go to wallet' : 'رفتن به کیف پول'} <ArrowLeft size={14} />
        </button>
      </div>

      {/* ---------- SOS Modal ---------- */}
      {sosOpen && (
        <div className="fixed inset-0 z-[200] grid place-items-center p-4 bg-ink/60 backdrop-blur-sm fade-soft" onClick={() => { setSosOpen(false); setSosPhase('idle'); }}>
          <div className="w-full max-w-md rounded-xl bg-surface shadow-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className={`p-6 text-center text-surface ${sosPhase === 'live' ? 'bg-gradient-to-b from-success to-[#0d5c39]' : 'bg-gradient-to-b from-rose-warm to-[#8f2417]'}`}>
              <span className={`mx-auto mb-4 w-20 h-20 rounded-full grid place-items-center ${sosPhase === 'live' ? 'bg-surface/20' : 'bg-surface/15 animate-pulse'}`}>
                {sosPhase === 'live' ? <PhoneCall size={34} /> : <Siren size={34} />}
              </span>
              <h3 className="text-lg font-black m-0 mb-1">
                {sosPhase === 'idle' || sosPhase === 'connecting' ? t('sosConnecting') : t('sosConnected', { name: isEn ? 'Elena Petrova' : 'النا پترووا' })}
              </h3>
              {sosPhase === 'live' && (
                <p className="text-[13px] font-bold m-0 opacity-90">
                  {t('sosTimer')}: <span dir="ltr" className="num">{String(Math.floor(sosSeconds / 60)).padStart(2, '0')}:{String(sosSeconds % 60).padStart(2, '0')}</span>
                </p>
              )}
            </div>
            <div className="p-6">
              {sosPhase !== 'live' ? (
                <>
                  <p className="text-[12.5px] font-bold text-sub m-0 mb-3">{t('sosPick')}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[['en', 'English'], ['ar', 'العربية'], ['ru', 'Русский'], ['tr', 'Türkçe']].map(([code, label]) => (
                      <button key={code} onClick={() => setSosLang(code)} className={chip(sosLang === code)}>{label}</button>
                    ))}
                  </div>
                  <button onClick={startSos} className="w-full min-h-12 rounded-xl bg-rose-warm hover:bg-rose-warm/90 text-surface font-black text-sm inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    <PhoneCall size={16} /> {t('sosTitle')}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[12px] font-bold text-sub m-0 mb-4 text-center">{t('sosCost', { price: num(P.sosPerCall, locale), min: num(P.sosMinutes, locale) })}</p>
                  <button
                    onClick={() => { setSosOpen(false); setSosPhase('idle'); }}
                    className="w-full min-h-12 rounded-full bg-ink text-surface font-black text-sm inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <PhoneOff size={16} /> {t('sosEnd')}
                  </button>
                </>
              )}
              <p className="text-[10.5px] font-bold text-sub m-0 mt-3 leading-relaxed text-center">{t('sosNote')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
