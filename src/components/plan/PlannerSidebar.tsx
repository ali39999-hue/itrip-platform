'use client';

import { useTranslations } from 'next-intl';
import { num } from '@/lib/format';
import { Plane, BedDouble, Sparkles, Plus, CheckCircle2, Check, CarTaxiFront, Wifi, Languages, ShieldCheck } from 'lucide-react';
import type { PlanPackage } from '@/hooks/usePlanner';

interface PlannerSidebarProps {
  plan: PlanPackage;
  travelers: number;
  days: number;
  locale: string;
  isEn: boolean;
  addOnTransfer: boolean;
  setAddOnTransfer: React.Dispatch<React.SetStateAction<boolean>>;
  addOnEsim: boolean;
  setAddOnEsim: React.Dispatch<React.SetStateAction<boolean>>;
  addOnInterpreter: boolean;
  setAddOnInterpreter: React.Dispatch<React.SetStateAction<boolean>>;
  addOnInsurance: boolean;
  setAddOnInsurance: React.Dispatch<React.SetStateAction<boolean>>;
  bookAll: () => void;
}

export function PlannerSidebar({
  plan, travelers, days, locale, isEn,
  addOnTransfer, setAddOnTransfer,
  addOnEsim, setAddOnEsim,
  addOnInterpreter, setAddOnInterpreter,
  addOnInsurance, setAddOnInsurance,
  bookAll,
}: PlannerSidebarProps) {
  const t = useTranslations('Plan');

  return (
    <aside className="lg:sticky lg:top-[84px] flex flex-col gap-4">
      <div className="rounded-xl bg-surface border border-line shadow-elev-1 p-5">
        <h3 className="text-[15px] font-black mb-4">{t('total')}</h3>
        <div className="flex flex-col gap-2.5 text-[12.5px] font-bold">
          <div className="flex justify-between"><span className="text-sub inline-flex items-center gap-1.5"><Plane size={13} /> {t('flight')}</span><b className="num">{num(plan.flightTotal, locale)}</b></div>
          <div className="flex justify-between"><span className="text-sub inline-flex items-center gap-1.5"><BedDouble size={13} /> {t('hotel')}</span><b className="num">{num(plan.hotelTotal, locale)}</b></div>
          <div className="flex justify-between"><span className="text-sub inline-flex items-center gap-1.5"><Sparkles size={13} /> {t('experiences')}</span><b className="num">{num(plan.expTotalAll, locale)}</b></div>
          {plan.addOnsTotal > 0 && (
            <div className="flex justify-between"><span className="text-sub inline-flex items-center gap-1.5"><Plus size={13} /> {t('addOns')}</span><b className="num">{num(plan.addOnsTotal, locale)}</b></div>
          )}
          <div className="border-t border-line pt-3 mt-1 flex justify-between items-end">
            <span className="font-black">{t('total')}<span className="block text-[10px] text-sub font-bold">{t('totalHint', { travelers: num(travelers, locale), days: num(days, locale) })}</span></span>
            <b className="text-price text-lg font-black num">{num(plan.total, locale)}<span className="text-[10px] font-bold text-sub"> {isEn ? 'Toman' : 'تومان'}</span></b>
          </div>
        </div>
        <div className={`mt-4 rounded-xl px-3.5 py-2.5 text-[11.5px] font-black inline-flex items-start gap-1.5 w-full ${plan.overBy <= 0 ? 'bg-mint text-brand-dark' : 'bg-gold-soft text-price'}`}>
          {plan.overBy <= 0 ? <><CheckCircle2 size={14} className="shrink-0 mt-0.5" /> {t('budgetOk')}</> : <>{t('budgetOver', { over: num(plan.overBy, locale) })}</>}
        </div>
        <button onClick={bookAll} disabled={!plan.picked.length} className="w-full mt-4 min-h-12 rounded-full bg-action hover:bg-action-hover text-ink font-black text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm focus-visible:ring-2 focus-visible:ring-brand">
          <Check size={16} /> {t('bookAll')}
        </button>
      </div>

      <div className="rounded-xl bg-surface border border-line shadow-sm p-5">
        <h3 className="text-[14px] font-black mb-3.5">{t('addOns')}</h3>
        <div className="flex flex-col gap-2">
          {plan.transfer && (
            <button onClick={() => setAddOnTransfer((v) => !v)} className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-start transition focus-visible:ring-2 focus-visible:ring-brand ${addOnTransfer ? 'border-brand bg-mint/50' : 'border-line bg-soft/50'}`}>
              <span className="inline-flex items-center gap-2 min-w-0"><CarTaxiFront size={15} className="text-brand-dark shrink-0" />
                <span className="min-w-0"><b className="block text-[12px] font-black truncate">{t('transfer')}</b><span className="block text-[10px] font-bold text-sub truncate">{isEn ? plan.transfer.vehicleTypeEn : plan.transfer.vehicleType}</span></span></span>
              <b className="text-[11.5px] font-black num shrink-0">{num(plan.transferTotal, locale)}</b>
            </button>
          )}
          {plan.esim && (
            <button onClick={() => setAddOnEsim((v) => !v)} className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-start transition focus-visible:ring-2 focus-visible:ring-brand ${addOnEsim ? 'border-brand bg-mint/50' : 'border-line bg-soft/50'}`}>
              <span className="inline-flex items-center gap-2 min-w-0"><Wifi size={15} className="text-brand-dark shrink-0" />
                <span className="min-w-0"><b className="block text-[12px] font-black truncate">{t('esim')}</b><span className="block text-[10px] font-bold text-sub num">{num(plan.esim.dataGb, locale)}GB · {num(plan.esim.validityDays, locale)}d</span></span></span>
              <b className="text-[11.5px] font-black num shrink-0">{num(plan.esimTotal, locale)}</b>
            </button>
          )}
          {plan.suggestInterpreter && (
            <button onClick={() => setAddOnInterpreter((v) => !v)} className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-start transition focus-visible:ring-2 focus-visible:ring-brand ${addOnInterpreter ? 'border-brand bg-mint/50' : 'border-line bg-soft/50'}`}>
              <span className="inline-flex items-center gap-2 min-w-0"><Languages size={15} className="text-brand-dark shrink-0" />
                <span className="min-w-0"><b className="block text-[12px] font-black truncate">{t('interpreter')}</b><span className="block text-[10px] font-bold text-sub truncate">{t('interpreterNote', { n: num(plan.gi.interpreters, locale), group: plan.gi.whisperSet ? (isEn ? 'whisper set' : 'ویسپرینگ') : (isEn ? 'no gear' : 'بدون تجهیزات') })}</span></span></span>
              <b className="text-[11.5px] font-black num shrink-0">{num(plan.gi.dailyTotal * plan.interpreterDays, locale)}</b>
            </button>
          )}
          {plan.insurance && (
            <button onClick={() => setAddOnInsurance((v) => !v)} className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-start transition focus-visible:ring-2 focus-visible:ring-brand ${addOnInsurance ? 'border-brand bg-mint/50' : 'border-line bg-soft/50'}`}>
              <span className="inline-flex items-center gap-2 min-w-0"><ShieldCheck size={15} className="text-brand-dark shrink-0" />
                <span className="min-w-0"><b className="block text-[12px] font-black truncate">{t('insurance')}</b><span className="block text-[10px] font-bold text-sub truncate">{isEn ? 'Standard' : plan.insurance.name}</span></span></span>
              <b className="text-[11.5px] font-black num shrink-0">{num(plan.insuranceTotal, locale)}</b>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

