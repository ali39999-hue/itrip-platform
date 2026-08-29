'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { Sparkles } from 'lucide-react';
import { num } from '@/lib/format';
import { countryName } from '@/lib/countries';
import { daysFromNow } from '@/lib/utils';
import { usePlanner, type Answers } from '@/hooks/usePlanner';

import { PlannerTimeline } from './PlannerTimeline';
import { PlannerSidebar } from './PlannerSidebar';

interface PlannerResultProps {
  ans: Answers;
  setAns: React.Dispatch<React.SetStateAction<Answers>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  locale: string;
  isEn: boolean;
  shared: boolean;
  shareUrl: () => void;
  seed: number;
  setSeed: React.Dispatch<React.SetStateAction<number>>;
}

export function PlannerResult({ ans, setStep, locale, isEn, shared, shareUrl, seed, setSeed }: PlannerResultProps) {
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
      title: `${t('kicker')} Â· ${countryName(c.id, locale)} Â· ${num(days, locale)} ${t('qDays')}`,
      subtitle: `${num(travelers, locale)} pax Â· ${plan.flight.flightNo} Â· ${plan.hotel.name} Â· ${num(plan.picked.length, locale)} exp`,
      amount: plan.total,
      travelDate: daysFromNow(days + 7),
      meta: { planner: 'smart', country: c.id, budget, pace },
    });
    router.push('/checkout');
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-6 md:pt-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[24px] md:text-[32px] font-black tracking-tight m-0">{t('resultTitle')}</h1>
          <p className="text-[12.5px] text-sub font-bold m-0 mt-1.5">{t('fromPool', { total: num(c.signatureExperiences.length, locale), count: num(plan.picked.length, locale) })}</p>
        </div>
        <button onClick={() => { setStep(0); setSeed((s) => s + 1); }} className="self-start md:self-auto min-h-10 px-4 rounded-full border border-line text-brand-dark font-black text-[12.5px] hover:bg-mint inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <Sparkles size={14} /> {t('editAnswers')}
        </button>
      </div>

      {/* Ú†ÛŒÙ¾â€ŒÙ‡Ø§ÛŒ ØªÙ†Ø¸ÛŒÙ… Ø²Ù†Ø¯Ù‡ */}
      <div className="flex flex-wrap items-center gap-2 mb-7">
        <span className="text-[12px] font-bold text-sub">{t('tuneTitle')}</span>
        <button onClick={() => setTune((v) => ({ ...v, cheaper: !v.cheaper }))} className={`min-h-9 px-4 rounded-full text-[12.5px] font-black border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tune.cheaper ? 'bg-mint border-brand text-brand-dark' : 'border-line text-sub hover:border-brand'}`}>{t('tuneCheaper')}</button>
        <button onClick={() => setTune((v) => ({ ...v, more: !v.more }))} className={`min-h-9 px-4 rounded-full text-[12.5px] font-black border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tune.more ? 'bg-mint border-brand text-brand-dark' : 'border-line text-sub hover:border-brand'}`}>{t('tuneMore')}</button>
        <button onClick={shareUrl} className="min-h-9 px-4 rounded-full text-[12.5px] font-black border border-line text-sub hover:border-brand hover:text-brand-dark ms-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          {shared ? t('shared') : t('share')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ØªØ§ÛŒÙ…â€ŒÙ„Ø§ÛŒÙ† */}
        <PlannerTimeline 
          plan={plan} 
          days={days} 
          locale={locale} 
          isEn={isEn}
          onRegenerate={() => setSeed(s => s + 1)}
          onEditAnswers={() => { setStep(0); setSeed((s) => s + 1); }}
        />

        {/* Ø³Ø§ÛŒØ¯Ø¨Ø§Ø± Ø¬Ù…Ø¹ */}
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
    </div>
  );
}

