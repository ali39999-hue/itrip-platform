'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { ShieldCheck, RefreshCw, Headphones, CreditCard } from 'lucide-react';
import { lt } from '@/lib/lt';

export function WhyFiruzoSection() {
  const locale = useLocale();

  const pillars = [
    {
      icon: ShieldCheck,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
      title: lt(locale, { fa: 'تضمین اصالت و کمترین نرخ', en: 'Best Price Guarantee', ar: 'ضمان أقل سعر', zh: '最优价格保证', ru: 'Гарантия лучшей цены' }),
      desc: lt(locale, {
        fa: 'اتصال مستقیم به سامانه تأمین‌کنندگان رسمی با حذف واسطه‌ها و ارائه کمترین نرخ مصوب.',
        en: 'Direct integration with official global suppliers with zero middleman markup.',
        ar: 'اتصال مباشر بموردي الطيران والفنادق دون وسائط.',
        zh: '直连全球官方优质供应商，无中间商加价。',
        ru: 'Прямая интеграция с поставщиками без посредников.',
      }),
    },
    {
      icon: RefreshCw,
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      title: lt(locale, { fa: 'استرداد آنلاین و آنی وجه', en: 'Instant Online Refund', ar: 'استرداد فوري للأموال', zh: '极速在线退订退款', ru: 'Мгновенный возврат средств' }),
      desc: lt(locale, {
        fa: 'کنسلی بلیت یا هتل با محاسبه هوشمند جریمه و واریز فوری مانده وجه به کیف پول.',
        en: 'Automated policy-based penalty calculation with instant credit to your wallet.',
        ar: 'حساب تلقائي لغرامة الإلغاء وإعادة المبلغ المتبقي لمحفظتك فوراً.',
        zh: '系统自动计算退订手续费，剩余款项秒级退回电子钱包。',
        ru: 'Автоматический расчет штрафа и моментальный возврат на кошелек.',
      }),
    },
    {
      icon: Headphones,
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      title: lt(locale, { fa: 'پشتیبانی ۲۴ ساعته به ۵ زبان', en: '24/7 Multilingual Support', ar: 'دعم على مدار الساعة', zh: '24/7 全天候多语言客服', ru: 'Круглосуточная поддержка' }),
      desc: lt(locale, {
        fa: 'همراهی کارشناسان اختصاصی در تمام طول سفر، فرودگاه و هتل از طریق تماس و چت.',
        en: 'Dedicated travel specialists assisting you before, during, and after your journey.',
        ar: 'فريق دعم متخصص يرافقك طوال مراحل السفر والإقامة.',
        zh: '旅行管家团队在您的出行、值机和入住全程随时提供协助。',
        ru: 'Специалисты поддержки сопровождают вас на всех этапах поездки.',
      }),
    },
    {
      icon: CreditCard,
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      title: lt(locale, { fa: 'پرداخت چندارزی امن', en: 'Multi-Currency Settlement', ar: 'دفع متعدد العملات', zh: '多币种安全便捷支付', ru: 'Безопасная мультивалютная оплата' }),
      desc: lt(locale, {
        fa: 'امکان پرداخت با کارت‌های بانکی شتاب، تتر (TRC-20) و کارت‌های بین‌المللی با پروتکل امنیتی.',
        en: 'Pay securely using Iranian Shetab debit cards, Tether USDT, or international bank cards.',
        ar: 'الدفع الآمن ببطاقات شتاب، وتيثر، والبطاقات العالمية.',
        zh: '支持伊朗Shetab银行卡、USDT加密货币及国际银行卡合规结算。',
        ru: 'Оплата картами Shetab, криптовалютой USDT и международными картами.',
      }),
    },
  ];

  return (
    <section aria-label="Why Firuzo" className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8">
      <div className="text-center mb-8">
        <span className="text-xs font-black text-brand-dark tracking-wider uppercase block mb-1">
          {lt(locale, { fa: 'چرا فیروزو؟', en: 'Why Firuzo?', ar: 'لماذا فيروزو؟', zh: '为什么选择 Firuzo？', ru: 'Почему Firuzo?' })}
        </span>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-ink">
          {lt(locale, {
            fa: 'امن‌ترین و سریع‌ترین تجربه خرید خدمات سفر',
            en: 'The Safest & Fastest Way to Book Travel',
            ar: 'التجربة الأكثر أماناً وسرعة لحجز السفر',
            zh: '更安全、更便捷的综合旅行预订体验',
            ru: 'Самый надежный и быстрый способ бронирования',
          })}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-surface border border-line hover:border-brand/40 hover:shadow-elev-2 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
            >
              <div>
                <div className={`w-12 h-12 rounded-2xl grid place-items-center mb-4 transition-transform group-hover:scale-105 ${item.color}`}>
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-ink mb-2 group-hover:text-brand-dark transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-sub leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
