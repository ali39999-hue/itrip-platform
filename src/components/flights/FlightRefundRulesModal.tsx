'use client';

import React from 'react';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { lt } from '@/lib/lt';
import type { Flight } from '@/lib/types';

interface FlightRefundRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight | null;
  locale: string;
}

export function FlightRefundRulesModal({
  isOpen,
  onClose,
  flight,
  locale,
}: FlightRefundRulesModalProps) {
  if (!isOpen || !flight) return null;

  const rules = [
    {
      timeframe: lt(locale, {
        fa: 'از زمان صدور بلیت تا ساعت ۱۲ ظهر ۳ روز قبل از پرواز',
        en: 'From ticket issuance up to 12:00 PM (3 days before flight)',
        ar: 'من وقت الإصدار حتى 12 ظهراً قبل 3 أيام من الرحلة',
        zh: '自出票起至起飞前3天中午12:00',
        ru: 'С момента выписки до 12:00 за 3 дня до вылета',
      }),
      penalty: '۲۰٪',
      desc: lt(locale, { fa: 'کسر جریمه از کل بهای پایه بلیت', en: 'Deduction from base ticket fare', ar: 'خصم من السعر الأساسي للتذكرة', zh: '扣除机票基准票价的20%', ru: 'Удержание от базового тарифа' }),
    },
    {
      timeframe: lt(locale, {
        fa: 'از ساعت ۱۲ ظهر ۳ روز قبل تا ساعت ۱۲ ظهر ۱ روز قبل از پرواز',
        en: 'From 12:00 PM (3 days before) to 12:00 PM (1 day before flight)',
        ar: 'من 12 ظهراً قبل 3 أيام حتى 12 ظهراً قبل يوم واحد',
        zh: '起飞前3天中午12:00至起飞前1天中午12:00',
        ru: 'С 12:00 за 3 дня до 12:00 за 1 день до вылета',
      }),
      penalty: '۳۰٪',
      desc: lt(locale, { fa: 'کسر جریمه مصوب سازمان هواپیمایی', en: 'Aviation regulatory penalty deduction', ar: 'خصم الغرامة المعتمدة', zh: '按民航规定扣除', ru: 'Удержание по правилам авиакомпании' }),
    },
    {
      timeframe: lt(locale, {
        fa: 'از ساعت ۱۲ ظهر ۱ روز قبل تا ۳ ساعت قبل از پرواز',
        en: 'From 12:00 PM (1 day before) up to 3 hours before flight',
        ar: 'من 12 ظهراً قبل يوم واحد حتى 3 ساعات قبل الرحلة',
        zh: '起飞前1天中午12:00至起飞前3小时',
        ru: 'С 12:00 за 1 день до 3 часов до вылета',
      }),
      penalty: '۵۰٪',
      desc: lt(locale, { fa: 'کنسلی دیرهنگام پرواز', en: 'Late cancellation penalty', ar: 'غرامة الإلغاء المتأخر', zh: '起飞前临近退票手续费', ru: 'Поздняя отмена билета' }),
    },
    {
      timeframe: lt(locale, {
        fa: 'از ۳ ساعت قبل از پرواز به بعد و غیبت مسافر (No-Show)',
        en: 'Less than 3 hours before departure and passenger No-Show',
        ar: 'أقل من 3 ساعات قبل الإقلاع أو عدم الحضور (No-Show)',
        zh: '起飞前3小时以内及误机（No-Show）',
        ru: 'Менее чем за 3 часа до вылета и неявка (No-Show)',
      }),
      penalty: '۶۵٪',
      desc: lt(locale, { fa: 'استرداد مانده بهای بلیت به کیف پول', en: 'Remaining balance refunded to wallet', ar: 'استرداد المبلغ المتبقي للمحفظة', zh: '余款自动退回至您的钱包', ru: 'Остаток возвращается на баланс' }),
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-rules-title"
      className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-deep/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-line shadow-elev-3 overflow-hidden flex flex-col max-h-[88vh]">
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-line/80 mx-auto mt-2.5 mb-1" />
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-mint/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand text-surface grid place-items-center">
              <ShieldAlert size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 id="refund-rules-title" className="text-sm sm:text-base font-black text-ink">
                {lt(locale, {
                  fa: `قوانین کنسلی و استرداد — ${flight.airline} (${flight.flightNo})`,
                  en: `Cancellation & Refund Rules — ${flight.airlineEn} (${flight.flightNo})`,
                  ar: `شروط الإلغاء والاسترداد — ${flight.airline} (${flight.flightNo})`,
                  zh: `退订与改签规则 — ${flight.airlineEn} (${flight.flightNo})`,
                  ru: `Условия возврата билета — ${flight.airlineEn} (${flight.flightNo})`,
                })}
              </h3>
              <span className="text-[11px] text-sub font-bold block">
                {lt(locale, {
                  fa: 'طبق بخشنامه رسمی سازمان هواپیمایی کشوری و نرخ ایرلاین',
                  en: 'Official Civil Aviation Organization & Airline tariff rules',
                  ar: 'وفقاً للوائح الرسمية لهيئة الطيران المدني',
                  zh: '遵循民航局官方规定及航空公司统一标准',
                  ru: 'По официальным правилам гражданской авиации',
                })}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
            className="min-w-[44px] min-h-[44px] rounded-full text-sub hover:text-ink grid place-items-center transition"
          >
            <div className="w-8 h-8 rounded-full bg-soft grid place-items-center">
              <X size={18} />
            </div>
          </button>
        </div>

        {/* Rules Table */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-soft/70 border border-line/80 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1 min-w-0">
                <span className="font-black text-ink block leading-relaxed">{rule.timeframe}</span>
                <span className="text-[11px] text-sub block">{rule.desc}</span>
              </div>
              <div className="shrink-0 text-end">
                <span className="inline-block px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-black font-mono text-sm border border-rose-200 dark:border-rose-900">
                  {rule.penalty}
                </span>
                <span className="block text-[10px] text-sub font-bold mt-0.5">
                  {lt(locale, { fa: 'جریمه', en: 'Penalty', ar: 'غرامة', zh: '手续费', ru: 'штраф' })}
                </span>
              </div>
            </div>
          ))}

          {/* Instant Refund Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" aria-hidden="true" />
            <span>
              {lt(locale, {
                fa: 'پس از ثبت درخواست کنسلی در «سفرهای من»، مانده وجه در کمتر از چند دقیقه به کیف پول شما واریز می‌شود.',
                en: 'Refunds requested in "My Trips" are processed and credited to your wallet in minutes.',
                ar: 'يتم استرداد المبلغ المتبقي إلى محفظتك خلال دقائق فور تقديم الطلب.',
                zh: '在“我的行程”中申请退订后，退款将在数分钟内自动入账至您的钱包。',
                ru: 'После подачи заявки в «Мои поездки» средства поступят на кошелек за несколько минут.',
              })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line bg-paper flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-11 px-6 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black transition active:scale-95 cursor-pointer shadow-sm flex items-center justify-center"
          >
            {lt(locale, { fa: 'متوجه شدم', en: 'Got it', ar: 'فهمت ذلك', zh: '了解', ru: 'Понятно' })}
          </button>
        </div>
      </div>
    </div>
  );
}
