'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { COUNTRY_ORDER, EXPERIENCE_CATEGORY_META, type CountryId, type ExperienceCategory } from '@/lib/countries';
import type { Answers, BudgetTier, Pace, Who } from '@/hooks/usePlanner';
import { PlannerWizard, QUESTIONS } from '@/components/plan/PlannerWizard';
import { PlannerResult } from '@/components/plan/PlannerResult';
import { FiruzoAiLoading } from '@/components/shared/FiruzoAiLoading';

export function parseNaturalQuery(q: string): Answers | null {
  if (!q) return null;
  const a: Answers = {};
  const lower = q.toLowerCase();
  
  // Extract dest
  if (/(iran|ایران|تهران|شیراز|مشهد|اصفهان|کیش|قشم|تبریز|یزد|رشت|همدان|tehran|shiraz|mashhad|isfahan|esfahan|kish|qeshm|tabriz|yazd)/.test(lower)) a.dest = 'iran';
  else if (/(turkey|ترکیه|استانبول|آنتالیا|ازمیر|بدروم|istanbul|antalya|izmir|bodrum)/.test(lower)) a.dest = 'turkey';
  else if (/(uae|امارات|دبی|ابوظبی|شارجه|dubai|abu dhabi|sharjah)/.test(lower)) a.dest = 'uae';
  else if (/(georgia|گرجستان|تفلیس|باتومی|کازبگی|tbilisi|batumi|kazbegi)/.test(lower)) a.dest = 'georgia';
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
     if (/(یک|one|1)/.test(lower)) a.days = 2;
     if (/(دو|two|2)/.test(lower)) a.days = 2;
     if (/(سه|three|3)/.test(lower)) a.days = 3;
     if (/(چهار|four|4)/.test(lower)) a.days = 4;
     if (/(پنج|five|5)/.test(lower)) a.days = 5;
     if (/(شش|six|6)/.test(lower)) a.days = 6;
     if (/(هفت|seven|7)/.test(lower)) a.days = 7;
     if (/(ده|ten|10)/.test(lower)) a.days = 10;
     if (/(چهارده|دو هفته|fourteen|14)/.test(lower)) a.days = 14;
  }

  // Extract who
  if (/(خانواده|خانوادگی|بچه|فرزند|kids|family)/.test(lower)) a.who = 'family';
  else if (/(دوست|دوستان|رفقا|فرند|friends|group)/.test(lower)) a.who = 'friends';
  else if (/(همسر|پارتنر|دونفره|زن و شوهر|عاشقانه|رمانتیک|duo|couple)/.test(lower)) a.who = 'duo';
  else if (/(تنها|تکی|انفرادی|مجردی|تنهایی|solo|alone)/.test(lower)) a.who = 'solo';

  // Extract budget
  if (/(ارزان|اقتصادی|کم‌هزینه|مقرون‌به‌صرفه|cheap|economy|budget)/.test(lower)) a.budget = 'economy';
  else if (/(لوکس|گران|لاکچری|vip|پنج ستاره|۵ ستاره|luxury|expensive)/.test(lower)) a.budget = 'luxury';
  else if (/(متعادل|متوسط|معمولی|استاندارد|balanced|standard)/.test(lower)) a.budget = 'balanced';

  // Extract pace
  if (/(آرام|استراحت|ریلکس|کم‌عجله|سبک|relaxed|slow|rest)/.test(lower)) a.pace = 'relaxed';
  else if (/(فشرده|پربرنامه|پربار|سریع|ماکسیمم|packed|busy|fast|full)/.test(lower)) a.pace = 'packed';
  else if (/(متعادل|balanced)/.test(lower)) a.pace = 'balanced';

  // Extract interests
  const ints: ExperienceCategory[] = [];
  if (/(تاریخ|تاریخی|فرهنگ|فرهنگی|موزه|آثار باستانی|کاخ|مسجد|معماری|culture|history|museum)/.test(lower)) ints.push('culture');
  if (/(طبیعت|کوه|جنگل|طبیعت‌گردی|روستا|دریاچه|nature|mountain|forest|lake)/.test(lower)) ints.push('nature');
  if (/(کشتی|کروز|قایق|دریایی|ساحل|غواصی|شنا|yacht|boat|cruise|beach|sea)/.test(lower)) ints.push('yacht');
  if (/(ماجراجویی|هیجان|سافاری|کویر|آفرود|adventure|safari|desert)/.test(lower)) ints.push('adventure');
  if (/(آرامش|اسپا|ریلکس|آبگرم|سلامت|ماساژ|wellness|spa)/.test(lower)) ints.push('wellness');
  if (/(شبانه|شب‌گردی|کافه|تفریحات شب|کلاب|nightlife|club)/.test(lower)) ints.push('nightlife');
  if (/(خرید|مرکز خرید|پاساژ|بازار|سوغات|shopping|mall|bazaar|market|exhibition)/.test(lower)) ints.push('exhibition');
  if (/(جشنواره|فستیوال|کنسرت|هنر|تئاتر|موسیقی|festival|theater|concert)/.test(lower)) ints.push('festival');
  if (ints.length) a.interests = ints;

  return Object.keys(a).length > 0 ? a : null;
}

export default function PlanPage() {
  const locale = useLocale();
  const isEn = locale === 'en';

  const [step, setStep] = useState(0);
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
            fa: 'برنامه سفر هوشمند فیروزو',
            en: 'Firuzo Smart Trip Itinerary',
            ar: 'خطة السفر الذكية من فيروزو',
            zh: 'Firuzo 智能行程规划',
            ru: 'Умный маршрут путешествия Firuzo',
          }),
          text: lt(locale, {
            fa: 'برنامه اختصاصی سفر من در پلتفرم فیروزو را مشاهده کنید:',
            en: 'Check out my custom travel itinerary on Firuzo:',
            ar: 'شاهد خطة سفري المخصصة على منصة فيروزو:',
            zh: '在 Firuzo 查看我的专属旅行规划：',
            ru: 'Посмотрите мой индивидуальный маршрут на Firuzo:',
          }),
          url: fullUrl,
        });
      } catch {
        // Fallback to clipboard
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch {}
    }

    setShared(true);
    setTimeout(() => setShared(false), 2600);
  }

  const handleRefineWithPrompt = (promptText: string) => {
    const parsed = parseNaturalQuery(promptText);
    if (parsed) {
      setAns((prev) => ({ ...prev, ...parsed }));
    }
    setSeed((s) => s + 1);
  };

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
        onRefineWithPrompt={handleRefineWithPrompt}
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
