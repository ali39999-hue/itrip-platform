'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { COUNTRY_ORDER, EXPERIENCE_CATEGORY_META, type CountryId, type ExperienceCategory } from '@/lib/countries';
import type { Answers, BudgetTier, Pace, Who } from '@/hooks/usePlanner';
import { PlannerWizard, QUESTIONS } from '@/components/plan/PlannerWizard';
import { PlannerResult } from '@/components/plan/PlannerResult';
import { FiruzoAiLoading } from '@/components/shared/FiruzoAiLoading';

function parseNaturalQuery(q: string): Answers | null {
  if (!q) return null;
  const a: Answers = {};
  const lower = q.toLowerCase();
  
  // Extract dest
  if (/(iran|ایران|تهران|شیراز|مشهد|اصفهان|کیش|قشم|تبریز|یزد|رشت|همدان|tehran|shiraz|mashhad|isfahan|esfahan|kish|qeshm|tabriz|yazd)/.test(lower)) a.dest = 'iran';
  else if (/(turkey|ترکیه|استانبول|آنتالیا|ازمیر|istanbul|antalya|izmir)/.test(lower)) a.dest = 'turkey';
  else if (/(uae|امارات|دبی|ابوظبی|dubai|abu dhabi)/.test(lower)) a.dest = 'uae';
  else if (/(georgia|گرجستان|تفلیس|باتومی|tbilisi|batumi)/.test(lower)) a.dest = 'georgia';
  else if (/(russia|روسیه|مسکو|سن پترزبورگ|moscow|saint petersburg)/.test(lower)) a.dest = 'russia';
  else if (/(oman|عمان|مسقط|صلاله|muscat|salalah)/.test(lower)) a.dest = 'oman';
  else if (/(china|چین|پکن|شانگهای|گوانگجو|beijing|shanghai|guangzhou)/.test(lower)) a.dest = 'china';

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

export default function PlanPage() {
  const locale = useLocale();
  const isEn = locale === 'en';

  // SSR-safe initial state. The URL query is applied after hydration in the
  // effect below — reading window.location.search during the first render made
  // the client tree diverge from the server HTML (hydration failure) whenever
  // the page was opened with ?q= or ?dest= deep links.
  const [step, setStep] = useState(0); // index در QUESTIONS
  const [ans, setAns] = useState<Answers>({});
  const [startAtResult, setStartAtResult] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState(0);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (step >= QUESTIONS.length && !startAtResult) {
      setIsGenerating(true);
      const timer = setTimeout(() => {
        setIsGenerating(false);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [step, startAtResult]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const q = p.get('q');

    let fromQuery: Answers = {};
    if (q) {
      const parsed = parseNaturalQuery(q);
      if (parsed) {
        fromQuery = { ...parsed };
      }
    } else if (p.has('dest')) {
      const a: Answers = {};
      if (COUNTRY_ORDER.includes(p.get('dest') as CountryId)) a.dest = p.get('dest') as CountryId;
      if (['solo', 'duo', 'family', 'friends'].includes(p.get('who') ?? '')) a.who = p.get('who') as Who;
      const d = Number(p.get('days'));
      if (d >= 2 && d <= 14) a.days = d;
      const ints = (p.get('int') ?? '').split(',').filter((x) => x in EXPERIENCE_CATEGORY_META) as ExperienceCategory[];
      if (ints.length) a.interests = ints;
      if (['economy', 'balanced', 'luxury'].includes(p.get('bud') ?? '')) a.budget = p.get('bud') as BudgetTier;
      if (['relaxed', 'balanced', 'packed'].includes(p.get('pace') ?? '')) a.pace = p.get('pace') as Pace;
      if (a.dest) fromQuery = a;
    }

    if (Object.keys(fromQuery).length > 0) setAns(fromQuery);

    let startFromQuery = false;
    if (p.has('dest')) startFromQuery = true;
    else if (q) startFromQuery = !!parseNaturalQuery(q)?.dest;
    if (startFromQuery) setStartAtResult(true);
  }, []);

  const done = startAtResult || step >= QUESTIONS.length;

  async function shareUrl() {
    const p = new URLSearchParams();
    if (ans.dest) p.set('dest', ans.dest);
    if (ans.who) p.set('who', ans.who);
    if (ans.days) p.set('days', String(ans.days));
    if (ans.interests?.length) p.set('int', ans.interests.join(','));
    if (ans.budget) p.set('bud', ans.budget);
    if (ans.pace) p.set('pace', ans.pace);
    
    const shareQuery = p.toString() ? `?${p.toString()}` : '';
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}${shareQuery}` : '';

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', shareQuery || window.location.pathname);
    }

    if (typeof navigator !== 'undefined' && navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: lt(locale, {
            fa: 'برنامه سفر هوشمند فیروزه',
            en: 'Firuzo Smart Trip Itinerary',
            ar: 'خطة السفر الذكية من فيروزو',
            zh: 'Firuzo 智能行程规划',
            ru: 'Умный маршрут путешествия Firuzo',
          }),
          text: lt(locale, {
            fa: 'برنامه اختصاصی سفر من در پلتفرم فیروزه را مشاهده کنید:',
            en: 'Check out my custom travel itinerary on Firuzo:',
            ar: 'شاهد خطة سفري المخصصة على منصة فيروزو:',
            zh: '在 Firuzo 查看我的专属旅行规划：',
            ru: 'Посмотрите мой индивидуальный маршрут на Firuzo:',
          }),
          url: fullUrl,
        });
      } catch {
        // Fallback to clipboard if share dialog dismissed
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch {}
    }

    setShared(true);
    setTimeout(() => setShared(false), 2600);
  }

  if (isGenerating) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-soft/30 py-10 px-4">
        <FiruzoAiLoading />
      </div>
    );
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
