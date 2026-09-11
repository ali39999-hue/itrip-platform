'use client';

import { useState } from 'react';
import { lt } from '@/lib/lt';
import { ShieldAlert, ChevronDown, CheckCircle2 } from 'lucide-react';

interface CancellationPolicyCardProps {
  locale: string;
}

export function CancellationPolicyCard({ locale }: CancellationPolicyCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tiers = [
    {
      time: lt(locale, {
        fa: 'بیش از ۷۲ ساعت قبل از شروع سفر',
        en: 'More than 72 hours before travel',
        ar: 'أكثر من 72 ساعة قبل موعد السفر',
        zh: '出发前72小时以上',
        ru: 'Более чем за 72 часа до вылета',
      }),
      fee: lt(locale, {
        fa: '۱۰٪ جریمه کنسلی (۹۰٪ استرداد وجه)',
        en: '10% cancellation fee (90% refunded)',
        ar: '10% رسوم إلغاء (استرداد 90%)',
        zh: '收取10%退订费（退还90%）',
        ru: '10% штраф (возврат 90%)',
      }),
      status: 'safe',
    },
    {
      time: lt(locale, {
        fa: 'بین ۲۴ تا ۷۲ ساعت قبل از شروع سفر',
        en: 'Between 24 to 72 hours before travel',
        ar: 'بين 24 إلى 72 ساعة قبل موعد السفر',
        zh: '出发前24至72小时之间',
        ru: 'От 24 до 72 часов до вылета',
      }),
      fee: lt(locale, {
        fa: '۳۰٪ جریمه کنسلی (۷۰٪ استرداد وجه)',
        en: '30% cancellation fee (70% refunded)',
        ar: '30% رسوم إلغاء (استرداد 70%)',
        zh: '收取30%退订费（退还70%）',
        ru: '30% штраф (возврат 70%)',
      }),
      status: 'moderate',
    },
    {
      time: lt(locale, {
        fa: 'کمتر از ۲۴ ساعت تا زمان حرکت/ورود',
        en: 'Less than 24 hours before travel',
        ar: 'أقل من 24 ساعة قبل موعد السفر',
        zh: '出发前24小时以内',
        ru: 'Менее чем за 24 часа до вылета',
      }),
      fee: lt(locale, {
        fa: '۵۰٪ جریمه کنسلی (۵۰٪ استرداد وجه)',
        en: '50% cancellation fee (50% refunded)',
        ar: '50% رسوم إلغاء (استرداد 50%)',
        zh: '收取50%退订费（退还50%）',
        ru: '50% штраф (возврат 50%)',
      }),
      status: 'high',
    },
    {
      time: lt(locale, {
        fa: 'پس از حرکت پرواز یا عدم حضور (No-Show)',
        en: 'After departure or No-Show',
        ar: 'بعد موعد المغادرة أو عدم الحضور',
        zh: '起飞后或误机（No-Show）',
        ru: 'После вылета или неявка (No-Show)',
      }),
      fee: lt(locale, {
        fa: 'غیرقابل استرداد (۱۰۰٪ جریمه)',
        en: 'Non-refundable (100% fee)',
        ar: 'غير قابل للاسترداد (رسوم 100%)',
        zh: '不可退款（100%手续费）',
        ru: 'Возврату не подлежит (100% штраф)',
      }),
      status: 'none',
    },
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-elev-1 transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
            <ShieldAlert size={16} aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-ink">
              {lt(locale, {
                fa: 'قوانین و جدول شفاف جریمه کنسلی',
                en: 'Cancellation & Refund Penalty Policy',
                ar: 'سياسة وجدول رسوم الإلغاء الشفاف',
                zh: '透明取消与退款政策明细',
                ru: 'Прозрачные правила и шкала штрафов при отмене',
              })}
            </h4>
            <span className="text-[11px] text-sub font-medium">
              {lt(locale, {
                fa: 'مشاهده شرایط استرداد و بازگشت وجه پیش از پرداخت نهایی',
                en: 'Review refund tiers and policy terms before final checkout',
                ar: 'راجع شروط الاسترداد وسياسة الإلغاء قبل الدفع النهائي',
                zh: '在最终结账前查阅退款梯队与政策条款',
                ru: 'Ознакомьтесь с условиями возврата перед оплатой',
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-dark shrink-0">
          <span>
            {isOpen
              ? lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '收起', ru: 'Закрыть' })
              : lt(locale, { fa: 'مشاهده', en: 'View', ar: 'عرض', zh: '查看', ru: 'Открыть' })}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-line/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            {tiers.map((tier, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-soft/60 border border-line/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      tier.status === 'safe'
                        ? 'bg-emerald-500'
                        : tier.status === 'moderate'
                        ? 'bg-amber-500'
                        : tier.status === 'high'
                        ? 'bg-orange-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-bold text-ink">{tier.time}</span>
                </div>
                <span
                  className={`font-mono sm:text-end text-[11px] font-black ${
                    tier.status === 'none' ? 'text-rose-600 dark:text-rose-400' : 'text-sub'
                  }`}
                >
                  {tier.fee}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-mint/30 border border-brand/15 text-[11px] text-sub space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 text-brand-dark font-black">
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>
                {lt(locale, {
                  fa: 'نحوه و زمان‌بندی بازگشت وجه:',
                  en: 'Refund Process & Timelines:',
                  ar: 'آلية وجدول استرداد الأموال:',
                  zh: '退款方式及到账时效：',
                  ru: 'Порядок и сроки возврата средств:',
                })}
              </span>
            </div>
            <p>
              {lt(locale, {
                fa: '• استرداد به کیف پول iTrip: آنی، بدون کارمزد و با امکان استفاده در خریدهای بعدی.',
                en: '• Refund to iTrip Wallet: Instant, zero bank fees, usable for any future booking.',
                ar: '• الاسترداد إلى محفظة iTrip: فوري وبدون رسوم بنكية، وصالح للاستخدام في أي حجز لاحق.',
                zh: '• 退款至 iTrip 钱包：即时到账，零银行手续费，可随时用于后续预订。',
                ru: '• Возврат на кошелек iTrip: мгновенно, без комиссии, доступен для будущих заказов.',
              })}
            </p>
            <p>
              {lt(locale, {
                fa: '• استرداد به حساب بانکی مبدأ: ۲۴ الی ۷۲ ساعت کاری طبق سیکل‌های پایا/ساتنای شاپرک.',
                en: '• Refund to source bank card: 24 to 72 business hours via interbank clearing cycles.',
                ar: '• الاسترداد إلى البطاقة المصرفية: 24 إلى 72 ساعة عمل وفق دورات المقاصة البنكية.',
                zh: '• 原路退回银行卡：根据跨行清算周期需24至72个工作小时。',
                ru: '• Возврат на банковскую карту: от 24 до 72 рабочих часов по межбанковским протоколам.',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
