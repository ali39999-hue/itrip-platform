'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, EXPERIENCE_CATEGORY_META, countryName, type CountryId, type ExperienceCategory } from '@/lib/countries';
import { num } from '@/lib/format';
import { CATEGORY_ICONS } from '@/components/shared/CountryExperiences';
import { ArrowLeft, ArrowRight, Sun, Sunset, MoonStar, Users, type LucideIcon } from 'lucide-react';
import { BUDGET_CAP, BUDGET_LABEL, type Answers, type BudgetTier, type Pace, type Who } from '@/hooks/usePlanner';
import { lt } from '@/lib/lt';

export const QUESTIONS = ['dest', 'who', 'days', 'interests', 'budget', 'pace'] as const;
const PACE_META: Record<Pace, { key: 'paceRelaxed' | 'paceBalanced' | 'pacePacked'; Icon: LucideIcon }> = {
  relaxed: { key: 'paceRelaxed', Icon: Sun },
  balanced: { key: 'paceBalanced', Icon: Sunset },
  packed: { key: 'pacePacked', Icon: MoonStar },
};

interface PlannerWizardProps {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  ans: Answers;
  setAns: React.Dispatch<React.SetStateAction<Answers>>;
  locale: string;
  setSeed: React.Dispatch<React.SetStateAction<number>>;
}

export function PlannerWizard({ step, setStep, ans, setAns, locale, setSeed }: PlannerWizardProps) {
  const t = useTranslations('Plan');
  const { country, setCountry } = useCountryStore();

  const poolCount = useMemo(() => {
    const c = COUNTRIES[ans.dest ?? country];
    const cap = BUDGET_CAP[ans.budget ?? 'balanced'];
    const interests = ans.interests ?? [];
    return c.signatureExperiences.filter((e) => {
      const catOk = interests.length === 0 || interests.includes(e.category);
      return catOk && e.fromPrice <= cap;
    }).length;
  }, [ans.dest, country, ans.budget, ans.interests]);

  const chip = (on: boolean) =>
    `min-h-11 px-5 rounded-full text-[13px] font-black transition-all inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none text-start ${on ? 'bg-brand text-surface shadow-sm shadow-brand/25' : 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark'}`;

  const rail = (
    <div className="flex items-center gap-1.5 mb-2" aria-hidden>
      {QUESTIONS.map((q, j) => (
        <span key={q} className={`h-1.5 rounded-full transition-all ${j === step ? 'w-8 bg-brand' : j < step ? 'w-4 bg-brand/60' : 'w-4 bg-line'}`} />
      ))}
    </div>
  );

  const qHead = (title: string, sub: string) => (
    <>
      {rail}
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="m-0 text-[12px] font-bold text-sub">{t('progress', { i: num(Math.min(step + 1, QUESTIONS.length), locale), n: num(QUESTIONS.length, locale) })}</p>
        <p className="m-0 text-[12px] font-bold text-brand-dark">{t('pool', { count: num(poolCount, locale) })}</p>
      </div>
      <h1 className="text-[24px] md:text-[30px] font-black tracking-tight m-0 mb-2">{title}</h1>
      <p className="text-sub text-[13px] md:text-[14px] m-0 mb-6">{sub}</p>
    </>
  );

  const qFoot = (canBack: boolean) => (
    <div className="flex items-center gap-4 mt-8 pt-4 border-t border-line">
      {canBack && (
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="text-[13px] font-bold text-sub underline underline-offset-4 hover:text-brand-dark inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
          <ArrowRight size={14} className="rtl:block ltr:hidden" /><ArrowLeft size={14} className="ltr:block rtl:hidden" /> {t('back')}
        </button>
      )}
      <button onClick={() => setStep((s) => s + 1)} className="text-[13px] font-bold text-sub underline underline-offset-4 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">{t('skip')}</button>
    </div>
  );

  const q = QUESTIONS[step];

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6 pt-8 md:pt-10 pb-20">
      <div className="p-6 md:p-8 rounded-xl bg-surface border border-line shadow-elev-1">
        {q === 'dest' && (
          <>
            {qHead(t('qDest'), t('qDestSub'))}
            <div className="flex flex-wrap gap-2">
              {COUNTRY_ORDER.map((id: CountryId) => (
                <button
                  key={id}
                  onClick={() => { setAns((a) => ({ ...a, dest: id })); if (id !== country) setCountry(id); setStep(1); }}
                  className={`${chip(ans.dest === id)} flex-col !items-start min-w-[150px]`}
                >
                  <span className="text-[17px]">{COUNTRIES[id].flag} {countryName(id, locale)}</span>
                  <span className={`text-[10.5px] font-bold ${ans.dest === id ? 'text-surface/80' : 'text-sub'}`}>{num(COUNTRIES[id].signatureExperiences.length, locale)} {lt(locale, { fa: 'تجربه', en: 'experiences', ar: 'تجربة', zh: '个体验', ru: 'впечатлений' })} · {COUNTRIES[id].currency}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {q === 'who' && (
          <>
            {qHead(t('qWho'), t('qWhoSub'))}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(['solo', 'duo', 'family', 'friends'] as Who[]).map((w) => (
                <button
                  key={w}
                  onClick={() => { setAns((a) => ({ ...a, who: w })); setStep(2); }}
                  className={`${chip(ans.who === w)} !items-start flex-col`}
                >
                  <span className="inline-flex items-center gap-2"><Users size={16} /> {t(`who${w[0].toUpperCase()}${w.slice(1)}`)}</span>
                  <span className={`text-[11px] font-bold ${ans.who === w ? 'text-surface/80' : 'text-sub'}`}>{t(`who${w[0].toUpperCase()}${w.slice(1)}H`)}</span>
                </button>
              ))}
            </div>
            {qFoot(true)}
          </>
        )}

        {q === 'days' && (
          <>
            {qHead(t('qDays'), t('qDaysSub'))}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {[3, 4, 5, 7, 10, 14].map((n) => (
                <button key={n} onClick={() => { setAns((a) => ({ ...a, days: n })); setStep(3); }} className={`w-14 h-14 rounded-2xl text-[15px] font-black num transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${ans.days === n ? 'bg-brand text-surface shadow-sm shadow-brand/25' : 'bg-soft border border-line text-sub hover:text-brand-dark'}`}>{num(n, locale)}</button>
              ))}
            </div>
            {qFoot(true)}
          </>
        )}

        {q === 'interests' && (
          <>
            {qHead(t('qInterests'), t('qInterestsSub'))}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EXPERIENCE_CATEGORY_META) as ExperienceCategory[]).map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const on = (ans.interests ?? []).includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setAns((a) => {
                      const cur = a.interests ?? [];
                      return { ...a, interests: cur.includes(cat) ? cur.filter((x) => x !== cat) : [...cur, cat] };
                    })}
                    className={`min-h-11 px-4 rounded-full text-[13px] font-black inline-flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${on ? 'bg-brand text-surface shadow-sm shadow-brand/25' : 'bg-soft border border-line text-sub hover:text-brand-dark'}`}
                  >
                    <Icon size={15} /> {lt(locale, { fa: EXPERIENCE_CATEGORY_META[cat].fa, en: EXPERIENCE_CATEGORY_META[cat].en, ar: EXPERIENCE_CATEGORY_META[cat].fa, zh: EXPERIENCE_CATEGORY_META[cat].en, ru: EXPERIENCE_CATEGORY_META[cat].en })}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(4)}
              className="mt-7 w-full min-h-12 rounded-full bg-brand hover:bg-brand-2 text-surface font-black text-sm inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {t('continue')} <ArrowLeft size={16} className="rtl:block ltr:hidden" /><ArrowRight size={16} className="ltr:block rtl:hidden" />
            </button>
            {qFoot(true)}
          </>
        )}

        {q === 'budget' && (
          <>
            {qHead(t('qBudget'), t('qBudgetSub'))}
            <div className="grid grid-cols-3 gap-2.5">
              {(['economy', 'balanced', 'luxury'] as BudgetTier[]).map((b) => (
                <button key={b} onClick={() => { setAns((a) => ({ ...a, budget: b })); setStep(5); }} className={`p-4 rounded-2xl border text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${ans.budget === b ? 'border-brand bg-mint/60 shadow-sm' : 'border-line bg-soft/50 hover:border-brand/40'}`}>
                  <b className="block text-[14px] font-black">{lt(locale, { fa: BUDGET_LABEL[b].fa, en: BUDGET_LABEL[b].en, ar: BUDGET_LABEL[b].fa, zh: BUDGET_LABEL[b].en, ru: BUDGET_LABEL[b].en })}</b>
                  <span className="block text-[10.5px] font-bold text-sub mt-1 num">≤ {num(BUDGET_CAP[b], locale)}</span>
                  <span className="block text-[9.5px] font-bold text-sub">{t('perPerson')}</span>
                </button>
              ))}
            </div>
            {qFoot(true)}
          </>
        )}

        {q === 'pace' && (
          <>
            {qHead(t('qPace'), t('qPaceSub'))}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(['relaxed', 'balanced', 'packed'] as Pace[]).map((p) => {
                const { key, Icon } = PACE_META[p];
                return (
                  <button key={p} onClick={() => { setAns((a) => ({ ...a, pace: p })); setStep(QUESTIONS.length); setSeed((s) => s + 1); }} className={`p-4 rounded-2xl border text-center text-[12.5px] font-black inline-flex flex-col items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${ans.pace === p ? 'border-brand bg-mint/60 shadow-sm' : 'border-line bg-soft/50 hover:border-brand/40'}`}>
                    <Icon size={20} className="text-brand-dark" /> {t(key)}
                  </button>
                );
              })}
            </div>
            {qFoot(true)}
          </>
        )}
      </div>
    </div>
  );
}

