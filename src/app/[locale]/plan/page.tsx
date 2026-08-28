'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { COUNTRY_ORDER, EXPERIENCE_CATEGORY_META, type CountryId, type ExperienceCategory } from '@/lib/countries';
import type { Answers, BudgetTier, Pace, Who } from '@/hooks/usePlanner';
import { PlannerWizard, QUESTIONS } from '@/components/plan/PlannerWizard';
import { PlannerResult } from '@/components/plan/PlannerResult';

export default function PlanPage() {
  const locale = useLocale();
  const isEn = locale === 'en';

  const [step, setStep] = useState(0); // index در QUESTIONS
  const [ans, setAns] = useState<Answers>(() => {
    /* اشتراک‌گذاری نتیجه با URL — بدون effect (الگوی مقدار اولیه) */
    if (typeof window === 'undefined') return {};
    const p = new URLSearchParams(window.location.search);
    if (!p.has('dest')) return {};
    const a: Answers = {};
    if (COUNTRY_ORDER.includes(p.get('dest') as CountryId)) a.dest = p.get('dest') as CountryId;
    if (['solo', 'duo', 'family', 'friends'].includes(p.get('who') ?? '')) a.who = p.get('who') as Who;
    const d = Number(p.get('days'));
    if (d >= 2 && d <= 14) a.days = d;
    const ints = (p.get('int') ?? '').split(',').filter((x) => x in EXPERIENCE_CATEGORY_META) as ExperienceCategory[];
    if (ints.length) a.interests = ints;
    if (['economy', 'balanced', 'luxury'].includes(p.get('bud') ?? '')) a.budget = p.get('bud') as BudgetTier;
    if (['relaxed', 'balanced', 'packed'].includes(p.get('pace') ?? '')) a.pace = p.get('pace') as Pace;
    return a.dest ? a : {};
  });
  
  const [startAtResult] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dest'));
  const [seed, setSeed] = useState(0);
  const [shared, setShared] = useState(false);

  const done = startAtResult || step >= QUESTIONS.length;

  function shareUrl() {
    const p = new URLSearchParams();
    if (ans.dest) p.set('dest', ans.dest);
    if (ans.who) p.set('who', ans.who);
    if (ans.days) p.set('days', String(ans.days));
    if (ans.interests?.length) p.set('int', ans.interests.join(','));
    if (ans.budget) p.set('bud', ans.budget);
    if (ans.pace) p.set('pace', ans.pace);
    window.history.replaceState(null, '', `?${p.toString()}`);
    setShared(true);
    setTimeout(() => setShared(false), 2600);
  }

  if (done) {
    return (
      <PlannerResult 
        ans={ans} 
        setAns={setAns} 
        setStep={setStep} 
        locale={locale} 
        isEn={isEn} 
        shared={shared} 
        shareUrl={shareUrl} 
        seed={seed}
        setSeed={setSeed}
      />
    );
  }

  return (
    <PlannerWizard 
      step={step} 
      setStep={setStep} 
      ans={ans} 
      setAns={setAns} 
      locale={locale} 
      isEn={isEn} 
      setSeed={setSeed} 
    />
  );
}
