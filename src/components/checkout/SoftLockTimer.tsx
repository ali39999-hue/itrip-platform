'use client';

import { useState, useEffect } from 'react';
import { lt } from '@/lib/lt';
import { Lock, Clock, AlertCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface SoftLockTimerProps {
  locale: string;
  initialSeconds?: number;
  onExpire?: () => void;
}

export function SoftLockTimer({
  locale,
  initialSeconds = 900, // 15 minutes default
  onExpire,
}: SoftLockTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!hasExpired) {
        setHasExpired(true);
        trackEvent('soft_lock_expired', { locale });
        onExpire?.();
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, hasExpired, locale, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = (secondsLeft / initialSeconds) * 100;

  const isUrgent = secondsLeft < 120 && secondsLeft > 0;
  const isWarning = secondsLeft >= 120 && secondsLeft < 300;

  const statusColors = hasExpired
    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
    : isUrgent
    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 animate-pulse'
    : isWarning
    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200'
    : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200';

  const badgeColors = hasExpired || isUrgent
    ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
    : isWarning
    ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
    : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300';

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={lt(locale, {
        fa: `زمان باقی‌مانده قفل قیمت: ${formattedTime}`,
        en: `Price lock time remaining: ${formattedTime}`,
        ar: `الوقت المتبقي لتثبيت السعر: ${formattedTime}`,
        zh: `锁价剩余时间：${formattedTime}`,
        ru: `Оставшееся время фиксации цены: ${formattedTime}`,
      })}
      className={`p-4 rounded-2xl border transition-all duration-300 ${statusColors}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${badgeColors}`}>
            {hasExpired ? (
              <AlertCircle size={18} aria-hidden="true" />
            ) : isUrgent ? (
              <Clock size={18} aria-hidden="true" />
            ) : (
              <Lock size={18} aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black">
                {hasExpired
                  ? lt(locale, {
                      fa: 'انقضای مهلت قفل قیمت',
                      en: 'Price Lock Expired',
                      ar: 'انتهت صلاحية تثبيت السعر',
                      zh: '锁定期已过期',
                      ru: 'Срок фиксации цены истек',
                    })
                  : lt(locale, {
                      fa: 'قفل موقت قیمت و ظرفیت',
                      en: 'Price & Inventory Soft-Lock',
                      ar: 'تثبيت السعر والسعة مؤقتاً',
                      zh: '价格与库存临时锁定',
                      ru: 'Временная фиксация цены и мест',
                    })}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-black/5 dark:bg-white/10">
                15:00 Hold
              </span>
            </div>
            <p className="text-[11px] opacity-85 truncate mt-0.5">
              {hasExpired
                ? lt(locale, {
                    fa: 'مهلت تکمیل تراکنش به پایان رسید. جهت اطمینان از ظرفیت، صفحه را بازآوری کنید.',
                    en: 'Transaction window expired. Refresh the page to verify seat allotment.',
                    ar: 'انتهت المهلة. يرجى تحديث الصفحة للتأكد من توفر السعة.',
                    zh: '交易窗口已过期。请刷新页面以核对最新座位/房间库存。',
                    ru: 'Время ожидания истекло. Обновите страницу для проверки наличия мест.',
                  })
                : lt(locale, {
                    fa: 'نرخ پرواز و ظرفیت اتاق تا پایان زمان شمارنده برای شما محفوظ است.',
                    en: 'Fare rate and room allotment are guaranteed until the timer ends.',
                    ar: 'سعر الرحلة والغرفة مضمون حتى انتهاء العداد.',
                    zh: '机票运价与客房配额在计时结束前为您锁定。',
                    ru: 'Тариф и бронь номера гарантированы до окончания таймера.',
                  })}
            </p>
          </div>
        </div>

        {/* Digital Countdown Timer */}
        <div className="text-end shrink-0">
          <span className="block font-mono text-lg sm:text-xl font-black tracking-wider">
            {formattedTime}
          </span>
          <span className="block text-[10px] opacity-75 font-medium">
            {lt(locale, {
              fa: 'دقیقه : ثانیه',
              en: 'min : sec',
              ar: 'دقيقة : ثانية',
              zh: '分 : 秒',
              ru: 'мин : сек',
            })}
          </span>
        </div>
      </div>

      {/* Visual countdown progress bar */}
      {!hasExpired && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
