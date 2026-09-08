'use client';

import { useTranslations } from 'next-intl';
import { num } from '@/lib/format';
import { Plane, BedDouble, Sparkles, Plus, CheckCircle2, Check, CarTaxiFront, Wifi, Languages, ShieldCheck, Headphones } from 'lucide-react';
import type { PlanPackage } from '@/hooks/usePlanner';
import { lt } from '@/lib/lt';

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
  const currencyLabel = lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'туманов' });

  return (
    <aside className="lg:sticky lg:top-[84px] flex flex-col gap-4">
      <div className="rounded-2xl bg-surface border border-line/80 shadow-elev-2 p-6">
        <h3 className="text-base font-black text-ink mb-4">{t('total')}</h3>
        <div className="flex flex-col gap-3 text-xs font-bold">
          <div className="flex justify-between items-center">
            <span className="text-sub inline-flex items-center gap-1.5"><Plane size={14} className="text-brand-dark" /> {t('flight')}</span>
            <b className="num text-ink">{num(plan.flightTotal, locale)}</b>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sub inline-flex items-center gap-1.5"><BedDouble size={14} className="text-hotel" /> {t('hotel')}</span>
            <b className="num text-ink">{num(plan.hotelTotal, locale)}</b>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sub inline-flex items-center gap-1.5"><Sparkles size={14} className="text-gold" /> {t('experiences')}</span>
            <b className="num text-ink">{num(plan.expTotalAll, locale)}</b>
          </div>
          {plan.addOnsTotal > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sub inline-flex items-center gap-1.5"><Plus size={14} className="text-brand-dark" /> {t('addOns')}</span>
              <b className="num text-ink">{num(plan.addOnsTotal, locale)}</b>
            </div>
          )}
          <div className="border-t border-line/80 pt-3 mt-1 flex justify-between items-end">
            <div>
              <span className="font-black text-sm text-ink block">{t('total')}</span>
              <span className="text-[10.5px] text-sub font-medium">
                {t('totalHint', { travelers: num(travelers, locale), days: num(days, locale) })}
              </span>
            </div>
            <div className="text-end">
              <b className="text-price text-xl font-black num block">{num(plan.total, locale)}</b>
              <span className="text-[11px] font-bold text-sub">{currencyLabel}</span>
            </div>
          </div>
        </div>

        <div className={`mt-4 rounded-xl px-3.5 py-2.5 text-xs font-black inline-flex items-start gap-1.5 w-full ${plan.overBy <= 0 ? 'bg-mint text-brand-dark' : 'bg-gold-soft text-price'}`}>
          {plan.overBy <= 0 ? <><CheckCircle2 size={15} className="shrink-0 mt-0.5" /> {t('budgetOk')}</> : <>{t('budgetOver', { over: num(plan.overBy, locale) })}</>}
        </div>

        <button 
          type="button"
          onClick={bookAll} 
          disabled={!plan.picked.length} 
          className="w-full mt-4 min-h-12 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-elev-2 active:scale-95 transition cursor-pointer"
        >
          <Check size={18} /> 
          <span>{t('bookAll')}</span>
        </button>

        <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-center gap-2 text-[11px] text-sub font-medium">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>{lt(locale, { fa: 'تضمین اصالت خدمات و صدور فوری', en: '100% Guaranteed & Instant Voucher', ar: 'ضمان الأصالة والإصدار الفوري', zh: '服务保障与即时出票', ru: '100% гарантия и мгновенные ваучеры' })}</span>
        </div>
      </div>

      {/* Addons Card */}
      <div className="rounded-2xl bg-surface border border-line/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm font-black text-ink m-0">{t('addOns')}</h3>
          <span className="text-[10px] font-bold text-sub bg-soft px-2 py-0.5 rounded-md">
            {lt(locale, { fa: 'انتخابی', en: 'Optional', ar: 'اختياري', zh: '可选服务', ru: 'Опционально' })}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {plan.transfer && (
            <button 
              type="button"
              onClick={() => setAddOnTransfer((v) => !v)} 
              className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-start transition cursor-pointer ${
                addOnTransfer ? 'border-brand bg-mint/50 ring-1 ring-brand/20' : 'border-line/70 bg-soft/50 hover:bg-soft'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 min-w-0">
                <CarTaxiFront size={16} className="text-brand-dark shrink-0" />
                <span className="min-w-0">
                  <b className="block text-xs font-black truncate">{t('transfer')}</b>
                  <span className="block text-[10px] font-medium text-sub truncate">{isEn ? plan.transfer.vehicleTypeEn : plan.transfer.vehicleType}</span>
                </span>
              </span>
              <span className="text-xs font-black num shrink-0">{num(plan.transferTotal, locale)}</span>
            </button>
          )}

          {plan.esim && (
            <button 
              type="button"
              onClick={() => setAddOnEsim((v) => !v)} 
              className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-start transition cursor-pointer ${
                addOnEsim ? 'border-brand bg-mint/50 ring-1 ring-brand/20' : 'border-line/70 bg-soft/50 hover:bg-soft'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 min-w-0">
                <Wifi size={16} className="text-brand-dark shrink-0" />
                <span className="min-w-0">
                  <b className="block text-xs font-black truncate">{t('esim')}</b>
                  <span className="block text-[10px] font-medium text-sub num">{num(plan.esim.dataGb, locale)}GB · {num(plan.esim.validityDays, locale)}d</span>
                </span>
              </span>
              <span className="text-xs font-black num shrink-0">{num(plan.esimTotal, locale)}</span>
            </button>
          )}

          {plan.suggestInterpreter && (
            <button 
              type="button"
              onClick={() => setAddOnInterpreter((v) => !v)} 
              className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-start transition cursor-pointer ${
                addOnInterpreter ? 'border-brand bg-mint/50 ring-1 ring-brand/20' : 'border-line/70 bg-soft/50 hover:bg-soft'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 min-w-0">
                <Languages size={16} className="text-brand-dark shrink-0" />
                <span className="min-w-0">
                  <b className="block text-xs font-black truncate">{t('interpreter')}</b>
                  <span className="block text-[10px] font-medium text-sub truncate">{t('interpreterNote', { n: num(plan.gi.interpreters, locale), group: plan.gi.whisperSet ? (isEn ? 'whisper set' : 'ویسپرینگ') : (isEn ? 'no gear' : 'بدون تجهیزات') })}</span>
                </span>
              </span>
              <span className="text-xs font-black num shrink-0">{num(plan.gi.dailyTotal * plan.interpreterDays, locale)}</span>
            </button>
          )}

          {plan.insurance && (
            <button 
              type="button"
              onClick={() => setAddOnInsurance((v) => !v)} 
              className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-start transition cursor-pointer ${
                addOnInsurance ? 'border-brand bg-mint/50 ring-1 ring-brand/20' : 'border-line/70 bg-soft/50 hover:bg-soft'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 min-w-0">
                <ShieldCheck size={16} className="text-brand-dark shrink-0" />
                <span className="min-w-0">
                  <b className="block text-xs font-black truncate">{t('insurance')}</b>
                  <span className="block text-[10px] font-medium text-sub truncate">{isEn ? 'Standard' : plan.insurance.name}</span>
                </span>
              </span>
              <span className="text-xs font-black num shrink-0">{num(plan.insuranceTotal, locale)}</span>
            </button>
          )}
        </div>
      </div>

      {/* 24/7 Concierge Note */}
      <div className="rounded-2xl bg-surface border border-line/60 p-4 flex items-center gap-3 text-xs text-sub">
        <Headphones size={18} className="text-brand-dark shrink-0" />
        <span className="leading-snug">
          {lt(locale, { fa: 'پشتیبانی اختصاصی سفر و راهنمای فارسی‌زبان در تمام طول سفر همراه شماست.', en: '24/7 Travel concierge and native support available throughout your trip.', ar: 'دعم وخدمة كونسيرج مخصصة طوال فترة رحلتك.', zh: '全天候出行管家与专属客服随时为您服务。', ru: 'Круглосуточный консьерж и поддержка на протяжении всей поездки.' })}
        </span>
      </div>
    </aside>
  );
}
