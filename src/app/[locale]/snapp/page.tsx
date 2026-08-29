'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Wallet, Check } from 'lucide-react';
import { SnappRechargeWidget } from '@/components/snapp/SnappRechargeWidget';
import { TrustBar } from '@/components/shared/TrustBar';
import { ManualOpsNotice } from '@/components/shared/ManualOpsNotice';
import { SignatureBlock } from '@/components/shared/SignatureBlock';
import { ProcessSteps } from '@/components/shared/ProcessSteps';

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
            <Wallet size={16} /> {locale === 'fa' ? 'خدمات مالی و تاکسی محلی' : 'Fintech & Local Rides'}
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
          title={locale === 'fa' ? 'سرویس شارژ شناور و عودت باقیمانده' : 'Floating Balance & Refund Service'}
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
              {locale === 'fa' ? 'بسته‌های پیشنهادی برای انواع سفر' : 'Recommended Ride Packages'}
            </h2>
            <p className="text-sub text-[16px] leading-relaxed">
              {locale === 'fa' ? 'بر اساس تجربه گردشگران قبلی، بسته‌های متناسب با مدت زمان اقامت خود را انتخاب کنید.' : 'Choose the best package based on your expected length of stay.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Package 1 */}
            <div className="border border-line rounded-2xl p-6 bg-paper flex flex-col justify-between hover:border-brand/40 transition">
              <div>
                <span className="text-sub font-bold text-xs block mb-1">{locale === 'fa' ? 'سفر ۳ روزه' : '3-Day Stay'}</span>
                <h3 className="text-xl font-black mb-2">{locale === 'fa' ? 'بسته آخر هفته' : 'Weekend Package'}</h3>
                <div className="text-[28px] font-black text-ink mb-4">
                  ۱۰,۰۰۰,۰۰۰ <span className="text-sm font-bold text-sub">{locale === 'fa' ? 'تومان' : 'Toman'}</span>
                  <span className="block text-xs font-bold text-sub mt-0.5">≈ €۱۴ EUR</span>
                </div>
                <ul className="space-y-2.5 text-xs text-sub mb-6">
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {locale === 'fa' ? 'مناسب برای حدود ۸ تا ۱۰ سفر شهری' : 'Approx. 8-10 city rides'}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {locale === 'fa' ? 'شارژ آنی در ۵ دقیقه' : 'Instant 5-minute topup'}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {locale === 'fa' ? 'پشتیبانی ۲۴ ساعته در طول سفر' : '24/7 travel support'}</li>
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
                {locale === 'fa' ? 'محبوب‌ترین' : 'Most Popular'}
              </span>
              <div>
                <span className="text-sub font-bold text-xs block mb-1">{locale === 'fa' ? 'سفر ۷ روزه' : '7-Day Stay'}</span>
                <h3 className="text-xl font-black mb-2">{locale === 'fa' ? 'بسته یک هفته‌ای' : 'One Week Package'}</h3>
                <div className="text-[28px] font-black text-ink mb-4">
                  ۲۵,۰۰۰,۰۰۰ <span className="text-sm font-bold text-sub">{locale === 'fa' ? 'تومان' : 'Toman'}</span>
                  <span className="block text-xs font-bold text-sub mt-0.5">≈ €۳۵ EUR</span>
                </div>
                <ul className="space-y-2.5 text-xs text-sub mb-6">
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {locale === 'fa' ? 'مناسب برای حدود ۲۵ سفر شهری + فرودگاه' : 'Approx. 25 city rides + Airport'}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {locale === 'fa' ? 'سیم‌کارت توریستی هدیه' : 'Complimentary tourist SIM'}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {locale === 'fa' ? 'امکان عودت کامل باقیمانده' : 'Full refund of remaining balance'}</li>
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
                <span className="text-sub font-bold text-xs block mb-1">{locale === 'fa' ? 'سفر ۱۴ روزه+' : '14-Day+ Stay'}</span>
                <h3 className="text-xl font-black mb-2">{locale === 'fa' ? 'بسته اقامت طولانی' : 'Long Stay Package'}</h3>
                <div className="text-[28px] font-black text-ink mb-4">
                  ۵۰,۰۰۰,۰۰۰ <span className="text-sm font-bold text-sub">{locale === 'fa' ? 'تومان' : 'Toman'}</span>
                  <span className="block text-xs font-bold text-sub mt-0.5">≈ €۷۰ EUR</span>
                </div>
                <ul className="space-y-2.5 text-xs text-sub mb-6">
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {locale === 'fa' ? 'پوشش کامل سفرهای بین‌شهری و روزانه' : 'Full coverage for intercity & daily trips'}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {locale === 'fa' ? 'سیم‌کارت با ۲۰ گیگ اینترنت رایگان' : 'Tourist SIM with 20GB Data'}</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-brand-dark" /> {locale === 'fa' ? 'تضمین بهترین نرخ تبدیل ارز' : 'Best FX rate guaranteed'}</li>
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
              title: locale === 'fa' ? 'ورود شماره و انتخاب مبلغ' : 'Enter number & select amount',
              description: locale === 'fa' ? 'شماره موبایل فعال در ایران یا شماره سیم‌کارت توریستی خود را وارد کنید.' : 'Enter your active local or roaming mobile number.',
              eta: '۱ دقیقه'
            },
            {
              title: locale === 'fa' ? 'پرداخت با کارت بین‌المللی' : 'Pay with international card',
              description: locale === 'fa' ? 'با ویزا، مسترکارت یا رمزارز پرداخت را به صورت امن و آنی تکمیل نمایید.' : 'Complete secure instant payment via Visa, MasterCard or Crypto.',
              eta: '۲ دقیقه'
            },
            {
              title: locale === 'fa' ? 'شارژ آنی و شروع سفر' : 'Instant topup & ride away',
              description: locale === 'fa' ? 'در کمتر از ۵ دقیقه کیف پول اسنپ شما شارژ شده و پیامک تأیید ارسال می‌شود.' : 'Your ride credit arrives in under 5 minutes with SMS confirmation.',
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
