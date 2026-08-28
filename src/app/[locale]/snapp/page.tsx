'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Wallet, Check, Phone, RefreshCw } from 'lucide-react';
import { SnappRechargeWidget } from '@/components/snapp/SnappRechargeWidget';
import { TrustBar } from '@/components/shared/TrustBar';
import { ManualOpsNotice } from '@/components/shared/ManualOpsNotice';
import { SignatureBlock } from '@/components/shared/SignatureBlock';
import { ProcessSteps } from '@/components/shared/ProcessSteps';

export default function SnappChargePage() {
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
            <Wallet size={16} /> خدمات مالی و تاکسی محلی
          </span>
          <h1 className="text-[32px] md:text-[48px] font-black leading-tight tracking-tight mb-4 max-w-[18ch]">
            شارژ اسنپ با کارت بین‌المللی؛ <em className="not-italic text-brand">بی‌وقفه</em> در خیابان‌های ایران
          </h1>
          <p className="text-[18px] text-sub max-w-[52ch] leading-relaxed mb-8">
            توریست‌ها کارت شتاب ندارند. ما کیف پول اسنپ شما را با کارت ویزا/مستر در کمتر از ۵ دقیقه شارژ می‌کنیم تا برای گرفتن تاکسی معطل نمانید. کاملاً شفاف، بدون کارمزد پنهان.
          </p>

          <SnappRechargeWidget locale={locale} initialAmount={selectedAmount} />
        </div>
      </section>

      {/* Signature Ops Block */}
      <section className="py-12 max-w-[1180px] mx-auto px-6">
        <SignatureBlock 
          title="سرویس شارژ شناور و عودت باقیمانده"
          description={
            <>
              نمی‌دانید در طول سفر دقیقاً چقدر برای اسنپ هزینه خواهید کرد؟ <strong>نیاز به محاسبه نیست، تنبل باشید!</strong><br />
              کافی‌ست یک مبلغ پایه (مثلاً ۵۰ یورو) نزد iTrip امانت بگذارید. سیستم ما کیف پول اسنپ شما را همیشه پر نگه می‌دارد تا هیچ‌گاه در خیابان لنگ نمانید. 
              در روز آخر سفر، معادل ارزیِ دقیقِ <em>باقیمانده‌ی پولتان</em> را در فرودگاه (به صورت نقد یا واریز مجدد به کارت) به شما <strong>برمی‌گردانیم</strong>. حداکثر راحتی، بدون یک ریال هدررفت.
            </>
          }
        />
      </section>

      {/* Packages Section */}
      <section className="py-16 bg-surface">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-[62ch] mb-12">
            <h2 className="text-[28px] font-black mb-3">بسته‌های سفارشی برای شرایط مختلف</h2>
            <p className="text-[16px] text-sub leading-[1.8]">
              فرقی نمی‌کند تازه به فرودگاه رسیده‌اید یا در وسط شهر شارژتان تمام شده؛ ما راه‌حل داریم.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* مقطعی */}
            <article className="bg-surface border border-line rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="aspect-[16/10] rounded-[50%_50%_16px_16px/28%_28%_16px_16px] bg-gradient-to-br from-mint to-brand flex items-center justify-center text-surface mb-6">
                <RefreshCw size={56} className="opacity-90" />
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-[20px] font-black m-0 mb-1">شارژ مقطعی سریع</h3>
                  <span className="text-[14px] text-sub">مناسب مواقع اضطراری</span>
                </div>
                <span className="text-[12px] font-bold bg-soft text-sub px-3 py-1 rounded-full">آنی</span>
              </div>
              <div className="flex flex-col gap-3 flex-1 text-[14px] text-sub">
                <span className="flex gap-2"><Check size={18} className="text-brand" /> انجام در کمتر از ۵ دقیقه</span>
                <span className="flex gap-2"><Check size={18} className="text-brand" /> بدون نیاز به احراز هویت پیچیده</span>
                <span className="flex gap-2"><Check size={18} className="text-brand" /> پرداخت با لینک مستقیم</span>
              </div>
              <div className="flex justify-between items-end border-t border-line pt-4 mt-6">
                <div><span className="font-en text-[24px] font-bold text-price block leading-none">۵٪</span><span className="text-[12px] text-sub">کارمزد شفاف</span></div>
                <button 
                  onClick={() => selectPackage(10000000)}
                  aria-label="انتخاب شارژ مقطعی سریع" 
                  className="px-4 py-2 border border-brand/30 rounded-xl text-brand-dark text-[14px] font-bold hover:bg-mint transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  انتخاب
                </button>
              </div>
            </article>

            {/* شناور */}
            <article className="bg-surface border-2 border-brand rounded-xl p-6 flex flex-col shadow-md hover:-translate-y-1 transition-transform relative">
              <div className="absolute top-0 end-1/2 translate-x-1/2 -translate-y-1/2 bg-action text-[#14201f] text-[12px] font-black px-4 py-1 rounded-full">
                پیشنهاد ویژه
              </div>
              <div className="aspect-[16/10] rounded-[50%_50%_16px_16px/28%_28%_16px_16px] bg-gradient-to-br from-[#F8CE7E] to-[#9C6209] flex items-center justify-center text-surface mb-6 mt-2">
                <Wallet size={56} className="opacity-90" />
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-[20px] font-black m-0 mb-1">کیف پول شناور</h3>
                  <span className="text-[14px] text-sub">همیشه شارژ، عودت در پایان</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 flex-1 text-[14px] text-sub">
                <span className="flex gap-2"><Check size={18} className="text-brand" /> پایش و شارژ خودکار حساب</span>
                <span className="flex gap-2"><Check size={18} className="text-brand" /> <b>عودت باقیمانده</b> در فرودگاه</span>
                <span className="flex gap-2"><Check size={18} className="text-brand" /> گزارش ریز مصرف روزانه</span>
              </div>
              <div className="flex justify-between items-end border-t border-line pt-4 mt-6">
                <div><span className="font-en text-[24px] font-bold text-price block leading-none">€ 50</span><span className="text-[12px] text-sub">ودیعه اولیه</span></div>
                <button 
                  onClick={() => selectPackage(32500000)}
                  aria-label="فعال‌سازی کیف پول شناور" 
                  className="px-4 py-2 bg-action hover:bg-action-hover rounded-full text-[#14201f] text-[14px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  فعال‌سازی
                </button>
              </div>
            </article>

            {/* پکیج */}
            <article className="bg-surface border border-line rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="aspect-[16/10] rounded-[50%_50%_16px_16px/28%_28%_16px_16px] bg-gradient-to-br from-[#3EBFBA] to-[#053F3E] flex items-center justify-center text-surface mb-6">
                <Phone size={56} className="opacity-90" />
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-[20px] font-black m-0 mb-1">سیم‌کارت + اسنپ</h3>
                  <span className="text-[14px] text-sub">آماده پیش از ورود</span>
                </div>
                <span className="text-[12px] font-bold bg-mint text-brand-dark px-3 py-1 rounded-full">فرودگاه</span>
              </div>
              <div className="flex flex-col gap-3 flex-1 text-[14px] text-sub">
                <span className="flex gap-2"><Check size={18} className="text-brand" /> سیم‌کارت توریستی فعال</span>
                <span className="flex gap-2"><Check size={18} className="text-brand" /> اکانت اسنپ از پیش ساخته شده</span>
                <span className="flex gap-2"><Check size={18} className="text-brand" /> شارژ اولیه ۵ میلیون ریالی</span>
              </div>
              <div className="flex justify-between items-end border-t border-line pt-4 mt-6">
                <div><span className="font-en text-[24px] font-bold text-price block leading-none">€ 25</span><span className="text-[12px] text-sub">همه‌چیز با هم</span></div>
                <button 
                  onClick={() => selectPackage(16250000)}
                  aria-label="درخواست پکیج سیم‌کارت و اسنپ" 
                  className="px-4 py-2 border border-brand/30 rounded-xl text-brand-dark text-[14px] font-bold hover:bg-mint transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  درخواست
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-[62ch] mb-12">
            <h2 className="text-[28px] font-black mb-3">روند اجرای سخت‌گیرانه اما راحت</h2>
            <p className="text-[16px] text-sub leading-[1.8]">
              ما ریسک مسدودی حساب‌های محلی را صفر کرده‌ایم. تراکنش‌ها از طریق حساب‌های شرکتی معتبر انجام می‌شود.
            </p>
          </div>

          <ProcessSteps 
            steps={[
              { title: 'ثبت شماره و مبلغ', description: 'شماره موبایلی که با آن در اسنپ ثبت‌نام کرده‌اید را وارد کنید. بدون نیاز به پسورد شما.', eta: 'آنی' },
              { title: 'پرداخت بین‌المللی', description: 'فاکتور دقیق با نرخ تبدیل شفاف به شما نمایش داده می‌شود. پرداخت با ویزا، مستر یا رمزارز.', eta: 'درگاه امن Stripe' },
              { title: 'شارژ شرکتی و سریع', description: 'تیم محلی ما فوراً مبلغ را از طریق درگاه‌های مجاز ایرانی به کیف پول اسنپ شما واریز می‌کند.', eta: 'کمتر از ۵ دقیقه' },
              { title: 'عودت وجه (در صورت لزوم)', description: 'در مدل کیف پول شناور، هرچه در روز آخر باقی مانده باشد را بدون هیچ سوالی به شما پس می‌دهیم.', eta: 'روز خروج' }
            ]} 
          />

          <ManualOpsNotice />
        </div>
      </section>

      {/* Trust */}
      <section className="py-12 mb-16 max-w-[1180px] mx-auto px-6">
        <TrustBar />
      </section>
    </div>
  );
}
