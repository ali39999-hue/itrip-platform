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
    const q = p.get('q');
    
    
function parseNaturalQuery(q: string): Answers | null {
  if (!q) return null;
  const a: Answers = {};
  const lower = q.toLowerCase();
  
  // Extract dest
  if (/(iran|ایران|تهران|شیراز|مشهد|tehran|shiraz)/.test(lower)) a.dest = 'iran';
  else if (/(turkey|ترکیه|استانبول|istanbul)/.test(lower)) a.dest = 'turkey';
  else if (/(uae|امارات|دبی|dubai)/.test(lower)) a.dest = 'uae';
  else if (/(georgia|گرجستان|تفلیس|tbilisi)/.test(lower)) a.dest = 'georgia';
  else if (/(russia|روسیه|مسکو|moscow)/.test(lower)) a.dest = 'russia';
  else if (/(oman|عمان|مسقط|muscat)/.test(lower)) a.dest = 'oman';
  else if (/(china|چین|پکن|beijing)/.test(lower)) a.dest = 'china';

  // Extract days (e.g. 3 روزه, 5 days, 4 روز)
  const daysMatch = lower.match(/([0-9۰-۹]+)\s*(روزه|روز|days|day)/);
  if (daysMatch) {
    const p2e = (s: string) => s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
    const d = parseInt(p2e(daysMatch[1]), 10);
    if (d >= 2 && d <= 14) a.days = d;
  } else {
     // Check words
     if (/(دو|two)/.test(lower)) a.days = 2;
     if (/(سه|three)/.test(lower)) a.days = 3;
     if (/(چهار|four)/.test(lower)) a.days = 4;
     if (/(پنج|five)/.test(lower)) a.days = 5;
     if (/(شش|six)/.test(lower)) a.days = 6;
     if (/(هفت|seven)/.test(lower)) a.days = 7;
  }

  // Extract who
  if (/(خانواده|family|بچه)/.test(lower)) a.who = 'family';
  else if (/(دوست|فرند|friends)/.test(lower)) a.who = 'friends';
  else if (/(همسر|پارتنر|دونفره|duo|couple)/.test(lower)) a.who = 'duo';
  else if (/(تنها|تکی|solo)/.test(lower)) a.who = 'solo';

  // Extract budget
  if (/(ارزان|اقتصادی|economy|cheap)/.test(lower)) a.budget = 'economy';
  else if (/(لوکس|گران|لاکچری|luxury)/.test(lower)) a.budget = 'luxury';

  return Object.keys(a).length > 0 ? a : null;
}


    if (q) {
      const parsed = parseNaturalQuery(q);
      if (parsed) {
        // We inject the URL with the found parameters directly to simulate an exact entry
        const a: Answers = { ...parsed };
        if (a.dest) return a;
        // if dest is not found from text, we will let the wizard handle the rest
        return a;
      }
    }
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
  
  const [startAtResult] = useState(() => {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    if (p.has('dest')) return true;
    if (p.has('q')) {
       
function parseNaturalQuery(q: string): Answers | null {
  if (!q) return null;
  const a: Answers = {};
  const lower = q.toLowerCase();
  
  // Extract dest
  if (/(iran|ایران|تهران|شیراز|مشهد|tehran|shiraz)/.test(lower)) a.dest = 'iran';
  else if (/(turkey|ترکیه|استانبول|istanbul)/.test(lower)) a.dest = 'turkey';
  else if (/(uae|امارات|دبی|dubai)/.test(lower)) a.dest = 'uae';
  else if (/(georgia|گرجستان|تفلیس|tbilisi)/.test(lower)) a.dest = 'georgia';
  else if (/(russia|روسیه|مسکو|moscow)/.test(lower)) a.dest = 'russia';
  else if (/(oman|عمان|مسقط|muscat)/.test(lower)) a.dest = 'oman';
  else if (/(china|چین|پکن|beijing)/.test(lower)) a.dest = 'china';

  // Extract days (e.g. 3 روزه, 5 days, 4 روز)
  const daysMatch = lower.match(/([0-9۰-۹]+)\s*(روزه|روز|days|day)/);
  if (daysMatch) {
    const p2e = (s: string) => s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
    const d = parseInt(p2e(daysMatch[1]), 10);
    if (d >= 2 && d <= 14) a.days = d;
  } else {
     // Check words
     if (/(دو|two)/.test(lower)) a.days = 2;
     if (/(سه|three)/.test(lower)) a.days = 3;
     if (/(چهار|four)/.test(lower)) a.days = 4;
     if (/(پنج|five)/.test(lower)) a.days = 5;
     if (/(شش|six)/.test(lower)) a.days = 6;
     if (/(هفت|seven)/.test(lower)) a.days = 7;
  }

  // Extract who
  if (/(خانواده|family|بچه)/.test(lower)) a.who = 'family';
  else if (/(دوست|فرند|friends)/.test(lower)) a.who = 'friends';
  else if (/(همسر|پارتنر|دونفره|duo|couple)/.test(lower)) a.who = 'duo';
  else if (/(تنها|تکی|solo)/.test(lower)) a.who = 'solo';

  // Extract budget
  if (/(ارزان|اقتصادی|economy|cheap)/.test(lower)) a.budget = 'economy';
  else if (/(لوکس|گران|لاکچری|luxury)/.test(lower)) a.budget = 'luxury';

  return Object.keys(a).length > 0 ? a : null;
}

       const ans = parseNaturalQuery(p.get('q') || '');
       return !!ans?.dest;
    }
    return false;
  });
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
      setSeed={setSeed} 
    />
  );
}
