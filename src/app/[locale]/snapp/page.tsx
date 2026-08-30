'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Wallet, Check } from 'lucide-react';
import { SnappRechargeWidget } from '@/components/snapp/SnappRechargeWidget';
import { TrustBar } from '@/components/shared/TrustBar';
import { ManualOpsNotice } from '@/components/shared/ManualOpsNotice';
import { SignatureBlock } from '@/components/shared/SignatureBlock';
import { ProcessSteps } from '@/components/shared/ProcessSteps';
import { lt } from '@/lib/lt';

export default function SnappChargePage() {
  const t = useTranslations('Snapp');
  const locale = useLocale();
  const [selectedAmount, setSelectedAmount] = useState<number>(10000000);

  const selectPackage = (amount: number) => {
    setSelectedAmount(amount);
    const el = document.getElementById('snapp-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="bg-paper min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mint to-paper pt-20 pb-16">
        <div className="max-w-[1180px] mx-auto px-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 text-[13px] font-bold text-brand-dark bg-surface border border-brand/20 rounded-full mb-6">
            <Wallet size={16} /> {lt(locale, { fa: 'خدمات مالی و تاکسی محلی', en: 'Fintech & Local Rides', ar: 'خدمات مالية ومواصلات محلية', zh: '金融服务与本地出行', ru: 'Финтех и местное такси' })}
          </span>
          <h1 className="text-[32px] md:text-[48px] font-black leading-tight tracking-tight mb-4 max-w-[18ch]">
            {t('title')}
          </h1>
          <p className="text-[18px] text-sub max-w-[52ch] leading-relaxed mb-8">
            {t('subtitle')}
          </p>

          <SnappRechargeWidget locale={locale} initialAmount={selectedAmount} />
        </div>
      </section>

      {/* Signature Ops Block */}
      <section className="py-12 max-w-[1180px] mx-auto px-6">
        <SignatureBlock 
          title={lt(locale, { fa: 'سرویس شارژ شناور و عودت باقیمانده', en: 'Floating Balance & Refund Service', ar: 'خدمة الرصيد العائم واسترداد المتبقي', zh: '浮动充值与余额退还服务', ru: 'Плавающий баланс и возврат остатка' })}
          description={
            locale === 'fa' ? (
              <>
                نمی‌دانید در طول سفر دقیقاً چقدر برای اسنپ هزینه خواهید کرد؟ <strong>نیاز به محاسبه نیست، تنبل باشید!</strong><br />
                کافی‌ست یک مبلغ پایه (مثلاً ۵۰ یورو) نزد فیروز امانت بگذارید. سیستم ما کیف پول اسنپ شما را همیشه پر نگه می‌دارد تا هیچ‌گاه در خیابان لنگ نمانید. 
                در روز آخر سفر، معادل ارزیِ دقیقِ <em>باقیمانده‌ی پولتان</em> را در فرودگاه (به صورت نقد یا واریز مجدد به کارت) به شما <strong>برمی‌گردانیم</strong>. حداکثر راحتی، بدون یک ریال هدررفت.
              </>
            ) : (
              <>
                Unsure how much ride credit you will need? <strong>No calculations needed!</strong><br />
                Deposit a base amount with Firuzo. Our concierge keeps your local wallet topped up automatically.
                On your departure day, any unused balance is refunded directly to your international card.
              </>
            )
          }
        />
      </section>

      {/* Packages Section */}
      <section className="py-16 bg-surface">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-[62ch] mb-12">
            <h2 className="text-[28px] md:text-[36px] font-black tracking-tight mb-4">
              {lt(locale, { fa: 'بسته‌های پیشنهادی برای انواع سفر', en: 'Recommended Ride Packages', ar: 'باقات موصى بها لكل أنواع الرحلات', zh: '各类出行推荐套餐', ru: 'Рекомендуемые пакеты поездок' })}
            </h2>
            <p className="text-sub text-[16px] leading-relaxed">
              {lt(locale, { fa: 'بر اساس تجربه گردشگران قبلی، بسته‌های متناسب با مدت زمان اقامت خود را انتخاب کنید.', en: 'Choose the best package based on your expected length of stay.', ar: 'بناءً على تجارب المسافرين السابقين، اختر الباقة المناسبة لمدة إقامتك.', zh: '根据以往游客的经验，选择适合您停留时长的套餐。', ru: 'Опираясь на опыт других путешественников, выберите пакет под длительность вашей поездки.' })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Package 1 */}
            <div className="border border-line rounded-2xl p-6 bg-paper flex flex-col justify-between hover:border-brand/40 transition">
              <div>
                <span className="text-sub font-bold text-xs block mb-1">{lt(locale, { fa: 'سفر ۳ روزه', en: '3-Day Stay', ar: 'إقامة 3 أيام', zh: '3 天行程', ru: 'Поездка на 3 дня' })}</span>
                <h3 className="text-xl font-black mb-2">{lt(locale, { fa: 'بسته آخر هفته', en: 'Weekend Package', ar: 'باقة نهاية الأسبوع', zh: '周末套餐', ru: 'Пакет на выходные' })}</h3>
                <div className="text-[28px] font-black text-ink mb-4">
                  ۱۰,۰۰۰,۰۰۰ <span className="text-sm font-bold text-sub">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                  <span className="block text-xs font-bold text-sub mt-0.5">≈ €۱۴ EUR</span>
                </div>
                <ul className="space-y-2.5 text-xs text-sub mb-6">
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {lt(locale, { fa: 'مناسب برای حدود ۸ تا ۱۰ سفر شهری', en: 'Approx. 8-10 city rides', ar: 'مناسبة لنحو 8-10 رحلات داخل المدينة', zh: '约适合 8–10 次市内出行', ru: 'Примерно на 8–10 поездок по городу' })}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {lt(locale, { fa: 'شارژ آنی در ۵ دقیقه', en: 'Instant 5-minute topup', ar: 'شحن فوري خلال 5 دقائق', zh: '5 分钟即时到账', ru: 'Мгновенное пополнение за 5 минут' })}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {lt(locale, { fa: 'پشتیبانی ۲۴ ساعته در طول سفر', en: '24/7 travel support', ar: 'دعم على مدار الساعة طوال الرحلة', zh: '全程 24 小时支持', ru: 'Поддержка 24/7 на всём пути' })}</li>
                </ul>
              </div>
              <button 
                onClick={() => selectPackage(10000000)}
                className="w-full py-3 rounded-xl border border-brand text-brand-dark font-black text-xs hover:bg-brand hover:text-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
              >
                {t('selectPackage')}
              </button>
            </div>

            {/* Package 2 - Popular */}
            <div className="border-2 border-brand rounded-2xl p-6 bg-paper flex flex-col justify-between relative shadow-sm">
              <span className="absolute -top-3 start-6 bg-brand text-surface text-[11px] font-black px-3 py-0.5 rounded-full">
                {lt(locale, { fa: 'محبوب‌ترین', en: 'Most Popular', ar: 'الأكثر طلباً', zh: '最受欢迎', ru: 'Самый популярный' })}
              </span>
              <div>
                <span className="text-sub font-bold text-xs block mb-1">{lt(locale, { fa: 'سفر ۷ روزه', en: '7-Day Stay', ar: 'إقامة 7 أيام', zh: '7 天行程', ru: 'Поездка на 7 дней' })}</span>
                <h3 className="text-xl font-black mb-2">{lt(locale, { fa: 'بسته یک هفته‌ای', en: 'One Week Package', ar: 'باقة أسبوعية', zh: '一周套餐', ru: 'Недельный пакет' })}</h3>
                <div className="text-[28px] font-black text-ink mb-4">
                  ۲۵,۰۰۰,۰۰۰ <span className="text-sm font-bold text-sub">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                  <span className="block text-xs font-bold text-sub mt-0.5">≈ €۳۵ EUR</span>
                </div>
                <ul className="space-y-2.5 text-xs text-sub mb-6">
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {lt(locale, { fa: 'مناسب برای حدود ۲۵ سفر شهری + فرودگاه', en: 'Approx. 25 city rides + Airport', ar: 'نحو 25 رحلة داخل المدينة + المطار', zh: '约 25 次市内出行 + 机场', ru: 'Около 25 поездок по городу + аэропорт' })}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {lt(locale, { fa: 'سیم‌کارت توریستی هدیه', en: 'Complimentary tourist SIM', ar: 'شريحة سياحية مجانية', zh: '赠送旅游 SIM 卡', ru: 'Туристическая SIM в подарок' })}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {lt(locale, { fa: 'امکان عودت کامل باقیمانده', en: 'Full refund of remaining balance', ar: 'استرداد كامل للرصيد المتبقي', zh: '余额可全额退还', ru: 'Полный возврат остатка' })}</li>
                </ul>
              </div>
              <button 
                onClick={() => selectPackage(25000000)}
                className="w-full py-3 rounded-xl bg-brand text-surface font-black text-xs hover:bg-brand-dark transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
              >
                {t('selectPackage')}
              </button>
            </div>

            {/* Package 3 */}
            <div className="border border-line rounded-2xl p-6 bg-paper flex flex-col justify-between hover:border-brand/40 transition">
              <div>
                <span className="text-sub font-bold text-xs block mb-1">{lt(locale, { fa: 'سفر ۱۴ روزه+', en: '14-Day+ Stay', ar: 'إقامة 14 يوماً أو أكثر', zh: '14 天以上行程', ru: 'Поездка 14+ дней' })}</span>
                <h3 className="text-xl font-black mb-2">{lt(locale, { fa: 'بسته اقامت طولانی', en: 'Long Stay Package', ar: 'باقة الإقامة الطويلة', zh: '长住套餐', ru: 'Пакет для долгого пребывания' })}</h3>
                <div className="text-[28px] font-black text-ink mb-4">
                  ۵۰,۰۰۰,۰۰۰ <span className="text-sm font-bold text-sub">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                  <span className="block text-xs font-bold text-sub mt-0.5">≈ €۷۰ EUR</span>
                </div>
                <ul className="space-y-2.5 text-xs text-sub mb-6">
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {lt(locale, { fa: 'پوشش کامل سفرهای بین‌شهری و روزانه', en: 'Full coverage for intercity & daily trips', ar: 'تغطية كاملة للرحلات بين المدن واليومية', zh: '全面覆盖城际与日常出行', ru: 'Полное покрытие междугородних и ежедневных поездок' })}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {lt(locale, { fa: 'سیم‌کارت با ۲۰ گیگ اینترنت رایگان', en: 'Tourist SIM with 20GB Data', ar: 'شريحة سياحية مع 20 جيجابايت مجاناً', zh: '含 20GB 流量的旅游 SIM', ru: 'Туристическая SIM с 20 ГБ трафика' })}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {lt(locale, { fa: 'تضمین بهترین نرخ تبدیل ارز', en: 'Best FX rate guaranteed', ar: 'ضمان أفضل سعر صرف', zh: '最优汇率保证', ru: 'Гарантия лучшего курса обмена' })}</li>
                </ul>
              </div>
              <button 
                onClick={() => selectPackage(50000000)}
                className="w-full py-3 rounded-xl border border-brand text-brand-dark font-black text-xs hover:bg-brand hover:text-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
              >
                {t('selectPackage')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="max-w-[1180px] mx-auto px-6 py-12">
        <ProcessSteps 
          steps={[
            {
              title: lt(locale, { fa: 'ورود شماره و انتخاب مبلغ', en: 'Enter number & select amount', ar: 'أدخل الرقم واختر المبلغ', zh: '输入号码并选择金额', ru: 'Введите номер и выберите сумму' }),
              description: lt(locale, { fa: 'شماره موبایل فعال در ایران یا شماره سیم‌کارت توریستی خود را وارد کنید.', en: 'Enter your active local or roaming mobile number.', ar: 'أدخل رقم جوالك الفعّال في إيران أو رقم شريحتك السياحية.', zh: '请输入您在伊朗的有效手机号或旅游 SIM 号码。', ru: 'Введите действующий номер в Иране или номер туристической SIM.' }),
              eta: '۱ دقیقه'
            },
            {
              title: lt(locale, { fa: 'پرداخت با کارت بین‌المللی', en: 'Pay with international card', ar: 'الدفع ببطاقة دولية', zh: '使用国际卡支付', ru: 'Оплата международной картой' }),
              description: lt(locale, { fa: 'با ویزا، مسترکارت یا رمزارز پرداخت را به صورت امن و آنی تکمیل نمایید.', en: 'Complete secure instant payment via Visa, MasterCard or Crypto.', ar: 'أكمل الدفع الآمن والفوري عبر Visa أو MasterCard أو العملات الرقمية.', zh: '使用 Visa、MasterCard 或加密货币安全即时完成支付。', ru: 'Завершите безопасную мгновенную оплату через Visa, MasterCard или криптовалюту.' }),
              eta: '۲ دقیقه'
            },
            {
              title: lt(locale, { fa: 'شارژ آنی و شروع سفر', en: 'Instant topup & ride away', ar: 'شحن فوري وابدأ رحلتك', zh: '即时充值，即刻出行', ru: 'Мгновенное пополнение — и в путь' }),
              description: lt(locale, { fa: 'در کمتر از ۵ دقیقه کیف پول اسنپ شما شارژ شده و پیامک تأیید ارسال می‌شود.', en: 'Your ride credit arrives in under 5 minutes with SMS confirmation.', ar: 'يصل رصيد رحلاتك خلال أقل من 5 دقائق مع رسالة تأكيد نصية.', zh: '打车余额 5 分钟内到账，并收到短信确认。', ru: 'Баланс поступает менее чем за 5 минут с SMS-подтверждением.' }),
              eta: '۳ دقیقه'
            }
          ]}
        />
      </section>

      {/* Manual Ops Notice */}
      <section className="max-w-[1180px] mx-auto px-6 mb-12">
        <ManualOpsNotice 
          description="تیم پشتیبانی مالی فیروز به صورت ۲۴ ساعته تراکنش‌های ارزی را پردازش و حساب اسنپ شما را شارژ می‌کند."
        />
      </section>

      {/* Trust Bar */}
      <TrustBar />
    </div>
  );
}
