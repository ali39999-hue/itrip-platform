'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { Sparkles, Check, Share2 } from 'lucide-react';
import { num } from '@/lib/format';
import { countryName } from '@/lib/countries';
import { daysFromNow } from '@/lib/utils';
import { usePlanner, type Answers } from '@/hooks/usePlanner';
import { lt } from '@/lib/lt';

import { PlannerTimeline } from './PlannerTimeline';
import { PlannerSidebar } from './PlannerSidebar';

export interface PlannerResultProps {
  ans: Answers;
  setAns: React.Dispatch<React.SetStateAction<Answers>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  locale: string;
  isEn: boolean;
  shared: boolean;
  shareUrl: () => void;
  seed: number;
  setSeed: React.Dispatch<React.SetStateAction<number>>;
  onRefineWithPrompt?: (promptText: string) => void;
}

export function PlannerResult({ 
  ans, 
  setAns,
  setStep, 
  locale, 
  isEn, 
  shared, 
  shareUrl, 
  seed, 
  setSeed,
  onRefineWithPrompt 
}: PlannerResultProps) {
  const t = useTranslations('Plan');
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  const [tune, setTune] = useState<{ cheaper: boolean; more: boolean }>({ cheaper: false, more: false });
  const [addOnTransfer, setAddOnTransfer] = useState(true);
  const [addOnEsim, setAddOnEsim] = useState(true);
  const [addOnInsurance, setAddOnInsurance] = useState(true);
  const [addOnInterpreter, setAddOnInterpreter] = useState(true);

  const { plan, c, days, travelers, budget, pace } = usePlanner({
    ans, tune, addOnTransfer, addOnEsim, addOnInsurance, addOnInterpreter, seed, isEn
  });

  function bookAll() {
    setBookingContext({
      type: 'tours',
      title: `${t('kicker')} · ${countryName(c.id, locale)} · ${num(days, locale)} ${t('qDays')}`,
      subtitle: `${num(travelers, locale)} pax · ${plan.flight.flightNo} · ${plan.hotel.name} · ${num(plan.picked.length, locale)} exp`,
      amount: plan.total,
      travelDate: daysFromNow(days + 7),
      meta: { planner: 'smart', country: c.id, budget, pace },
    });
    router.push('/checkout');
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-6 md:pt-10 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-line/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint text-brand-dark text-xs font-black mb-2">
            <Sparkles size={13} />
            <span>{t('kicker')}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-ink tracking-tight m-0">
            {t('resultTitle')} ({countryName(c.id, locale)})
          </h1>
          <p className="text-xs sm:text-sm text-sub font-medium m-0 mt-1">
            {t('fromPool', { total: num(c.signatureExperiences.length, locale), count: num(plan.picked.length, locale) })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={shareUrl} 
            className="min-h-10 px-4 rounded-xl border border-line bg-surface text-ink font-bold text-xs hover:border-brand hover:text-brand-dark inline-flex items-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-2xs"
          >
            <Share2 size={15} />
            <span>{shared ? t('shared') : t('share')}</span>
          </button>
          <button 
            type="button"
            onClick={() => { setStep(0); setSeed((s) => s + 1); }} 
            className="min-h-10 px-4 rounded-xl border border-brand/30 bg-mint/50 text-brand-dark font-black text-xs hover:bg-mint inline-flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-2xs"
          >
            <Sparkles size={14} /> 
            <span>{t('editAnswers')}</span>
          </button>
        </div>
      </div>

      {/* Live Tuning Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-8 p-3 rounded-2xl bg-soft/50 border border-line/60">
        <span className="text-xs font-bold text-sub px-1">{t('tuneTitle')}</span>
        <button 
          type="button"
          onClick={() => setTune((v) => ({ ...v, cheaper: !v.cheaper }))} 
          className={`min-h-9 px-4 rounded-xl text-xs font-black border transition-all cursor-pointer ${
            tune.cheaper ? 'bg-brand text-surface border-brand shadow-xs' : 'border-line bg-surface text-sub hover:border-brand/60'
          }`}
        >
          {t('tuneCheaper')}
        </button>
        <button 
          type="button"
          onClick={() => setTune((v) => ({ ...v, more: !v.more }))} 
          className={`min-h-9 px-4 rounded-xl text-xs font-black border transition-all cursor-pointer ${
            tune.more ? 'bg-brand text-surface border-brand shadow-xs' : 'border-line bg-surface text-sub hover:border-brand/60'
          }`}
        >
          {t('tuneMore')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Timeline Itinerary & AI Refiner */}
        <PlannerTimeline 
          plan={plan} 
          days={days} 
          locale={locale} 
          isEn={isEn}
          countryId={c.id}
          onRegenerate={() => setSeed(s => s + 1)}
          onEditAnswers={() => { setStep(0); setSeed((s) => s + 1); }}
          onRefineWithPrompt={onRefineWithPrompt}
        />

        {/* Sidebar Summary & Addons */}
        <PlannerSidebar
          plan={plan}
          travelers={travelers}
          days={days}
          locale={locale}
          isEn={isEn}
          addOnTransfer={addOnTransfer}
          setAddOnTransfer={setAddOnTransfer}
          addOnEsim={addOnEsim}
          setAddOnEsim={setAddOnEsim}
          addOnInsurance={addOnInsurance}
          setAddOnInsurance={setAddOnInsurance}
          addOnInterpreter={addOnInterpreter}
          setAddOnInterpreter={setAddOnInterpreter}
          bookAll={bookAll}
        />
      </div>

      {/* MOBILE STICKY PLAN CONVERSION BAR */}
      <div className="lg:hidden fixed bottom-[calc(58px+env(safe-area-inset-bottom,0px))] inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line px-4 py-3 shadow-elev-3 flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-sub block leading-none mb-1">
            {num(days, locale)} {t('qDays')} • {num(travelers, locale)} {lt(locale, { fa: 'مسافر', en: 'travelers', ar: 'مسافر', zh: '名旅客', ru: 'пассажиров' })}
          </span>
          <div className="text-base font-black text-brand-dark font-mono flex items-baseline gap-1">
            <span>{num(plan.total, locale)}</span>
            <span className="text-[11px] font-bold text-sub">
              {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'туманов' })}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={bookAll}
          className="h-11 px-6 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs sm:text-sm flex items-center justify-center transition active:scale-95 shadow-md shadow-action/25 whitespace-nowrap"
        >
          {t('bookAll')}
        </button>
      </div>
    </div>
  );
}
