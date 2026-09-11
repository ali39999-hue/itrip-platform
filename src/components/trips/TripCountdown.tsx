'use client';

import React, { useEffect, useState } from 'react';
import { Clock, PlaneTakeoff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { lt } from '@/lib/lt';

interface TripCountdownProps {
  targetDate: string; // YYYY-MM-DD
  targetTime?: string; // HH:mm
  locale: string;
  variant?: 'banner' | 'card' | 'badge';
  className?: string;
}

interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  isBoardingSoon: boolean; // within 3 hours
}

export function calculateTimeRemaining(targetDate: string, targetTime = '08:00'): TimeRemaining {
  try {
    const [year, month, day] = targetDate.split('-').map(Number);
    const [hours, minutes] = targetTime.split(':').map(Number);
    const target = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0);
    const now = new Date();
    const diff = target.getTime() - now.getTime();

    if (isNaN(diff) || diff <= 0) {
      return {
        totalMs: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isPast: true,
        isBoardingSoon: false,
      };
    }

    const seconds = Math.floor((diff / 1000) % 60);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const isBoardingSoon = diff <= 3 * 60 * 60 * 1000;

    return {
      totalMs: diff,
      days,
      hours: hrs,
      minutes: mins,
      seconds,
      isPast: false,
      isBoardingSoon,
    };
  } catch {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
      isBoardingSoon: false,
    };
  }
}

export function TripCountdown({
  targetDate,
  targetTime = '08:00',
  locale,
  variant = 'card',
  className = '',
}: TripCountdownProps) {
  const [time, setTime] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(targetDate, targetTime)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(calculateTimeRemaining(targetDate, targetTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate, targetTime]);

  if (time.isPast) {
    if (variant === 'badge') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold ${className}`}
        >
          <CheckCircle2 size={13} className="text-slate-500" />
          <span>
            {lt(locale, {
              fa: 'سفر انجام شده',
              en: 'Trip Completed',
              ar: 'اكتملت الرحلة',
              zh: '行程已完成',
              ru: 'Поездка завершена',
            })}
          </span>
        </span>
      );
    }

    return (
      <div
        className={`p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-slate-700 dark:text-slate-300 ${className}`}
      >
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 grid place-items-center shrink-0">
          <CheckCircle2 size={18} className="text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h4 className="text-xs font-black text-ink">
            {lt(locale, {
              fa: 'تاریخ این سفر به پایان رسیده است',
              en: 'This trip date has concluded',
              ar: 'انتهى موعد هذه الرحلة',
              zh: '此行程日期已结束',
              ru: 'Дата этой поездки завершилась',
            })}
          </h4>
          <span className="text-[11px] text-sub">
            {lt(locale, {
              fa: 'امیدواریم سفر خاطره‌انگیزی را تجربه کرده باشید.',
              en: 'We hope you had a memorable journey.',
              ar: 'نتمنى لك تجربة سفر لا تُنسى.',
              zh: '希望您度过了一段难忘的旅程。',
              ru: 'Надеемся, поездка оставила приятные воспоминания.',
            })}
          </span>
        </div>
      </div>
    );
  }

  // Boarding Soon (< 3 hours)
  if (time.isBoardingSoon) {
    return (
      <div
        className={`p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4 animate-pulse ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white grid place-items-center shrink-0 shadow-sm">
            <PlaneTakeoff size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
              <AlertTriangle size={14} />
              <span>
                {lt(locale, {
                  fa: 'زمان پرواز نزدیک است! حضور در فرودگاه الزامی است',
                  en: 'Flight Boarding Soon! Please be at the gate',
                  ar: 'اقترب موعد الرحلة! يرجى التواجد عند البوابة',
                  zh: '登机在即！请前往登机口',
                  ru: 'Скоро посадка! Пожалуйста, пройдите к выходу',
                })}
              </span>
            </div>
            <p className="text-sm font-black text-ink mt-0.5">
              {time.hours} {lt(locale, { fa: 'ساعت', en: 'hr', ar: 'ساعة', zh: '小时', ru: 'ч' })}{' '}
              {time.minutes} {lt(locale, { fa: 'دقیقه', en: 'min', ar: 'دقيقة', zh: '分', ru: 'мин' })}{' '}
              {time.seconds} {lt(locale, { fa: 'ثانیه تا پرواز', en: 'sec to departure', ar: 'ثانية حتى الإقلاع', zh: '秒后起飞', ru: 'сек до вылета' })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Standard Countdown Card / Banner
  return (
    <div
      className={`p-4 rounded-2xl bg-brand/5 dark:bg-brand/10 border border-brand/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand-dark dark:text-brand grid place-items-center shrink-0">
          <Clock size={20} />
        </div>
        <div>
          <span className="text-[11px] font-bold text-sub block">
            {lt(locale, {
              fa: 'زمان باقی‌مانده تا شروع سفر',
              en: 'Time Remaining Until Departure',
              ar: 'الوقت المتبقي حتى موعد الرحلة',
              zh: '距出发剩余时间',
              ru: 'Времени до отправления',
            })}
          </span>
          <h4 className="text-xs sm:text-sm font-black text-ink">
            {lt(locale, {
              fa: 'شمارش معکوس پرواز / چک‌این',
              en: 'Trip Departure Countdown',
              ar: 'العد التنازلي للرحلة',
              zh: '行程出发倒计时',
              ru: 'Обратный отсчет до вылета',
            })}
          </h4>
        </div>
      </div>

      {/* Countdown Digits */}
      <div className="flex items-center gap-2 font-mono text-center self-stretch sm:self-auto justify-center">
        {/* Days */}
        <div className="bg-surface dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-line shadow-2xs min-w-[52px]">
          <span className="text-base sm:text-lg font-black text-brand-dark dark:text-brand block leading-tight">
            {time.days}
          </span>
          <span className="text-[9px] font-bold text-sub">
            {lt(locale, { fa: 'روز', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн' })}
          </span>
        </div>

        <span className="font-black text-sub">:</span>

        {/* Hours */}
        <div className="bg-surface dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-line shadow-2xs min-w-[52px]">
          <span className="text-base sm:text-lg font-black text-ink block leading-tight">
            {String(time.hours).padStart(2, '0')}
          </span>
          <span className="text-[9px] font-bold text-sub">
            {lt(locale, { fa: 'ساعت', en: 'Hours', ar: 'ساعات', zh: '小时', ru: 'час' })}
          </span>
        </div>

        <span className="font-black text-sub">:</span>

        {/* Minutes */}
        <div className="bg-surface dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-line shadow-2xs min-w-[52px]">
          <span className="text-base sm:text-lg font-black text-ink block leading-tight">
            {String(time.minutes).padStart(2, '0')}
          </span>
          <span className="text-[9px] font-bold text-sub">
            {lt(locale, { fa: 'دقیقه', en: 'Mins', ar: 'دقائق', zh: '分钟', ru: 'мин' })}
          </span>
        </div>

        <span className="font-black text-sub">:</span>

        {/* Seconds */}
        <div className="bg-surface dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-line shadow-2xs min-w-[52px]">
          <span className="text-base sm:text-lg font-black text-ink block leading-tight text-brand">
            {String(time.seconds).padStart(2, '0')}
          </span>
          <span className="text-[9px] font-bold text-sub">
            {lt(locale, { fa: 'ثانیه', en: 'Secs', ar: 'ثوانٍ', zh: '秒', ru: 'сек' })}
          </span>
        </div>
      </div>
    </div>
  );
}
