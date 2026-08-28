'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { PassengerForm } from '@/components/flights/PassengerForm';
import { Plane, ShieldCheck, Wifi, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { num } from '@/lib/format';
import { useLocale } from 'next-intl';

const BASE_FARE = 28500000;
const TAX_FARE = 2150000;
const ESIM_PRICE = 4500000;
const INSURANCE_PRICE = 2100000;

export default function FlightCheckoutPage() {
  const router = useRouter();
  const locale = useLocale();
  const [hasEsim, setHasEsim] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(true);

  const subtotal = BASE_FARE + TAX_FARE;
  const addonsTotal = (hasEsim ? ESIM_PRICE : 0) + (hasInsurance ? INSURANCE_PRICE : 0);
  const total = subtotal + addonsTotal;

  const handleProceed = () => {
    useBookingStore.getState().setBookingContext({
      type: 'flights',
      title: 'پرواز تهران به مشهد - ماهان‌ایر',
      subtitle: 'تهران (IKA) به مشهد (MHD) • کلاس اقتصادی',
      amount: total,
      travelDate: daysFromNow(7),
    });
    router.push('/checkout');
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 bg-soft min-h-screen">
      <div className="mb-6 flex items-center text-sub text-sm gap-2">
        <span className="cursor-pointer hover:text-brand-dark" onClick={() => router.push('/flights/search')}>جستجوی پرواز</span> 
        <ArrowLeft size={14} className="rtl:rotate-0 ltr:rotate-180 transition-transform" />
        <span className="cursor-pointer hover:text-brand-dark" onClick={() => router.push('/flights/search')}>انتخاب پرواز</span> 
        <ArrowLeft size={14} className="rtl:rotate-0 ltr:rotate-180 transition-transform" />
        <span className="text-ink font-bold">اطلاعات مسافران و پرداخت</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column (Forms & Extras) */}
        <div className="flex-1 space-y-6">
          <PassengerForm />

          {/* Unified Cart Extras */}
          <div className="bg-surface rounded-xl border border-line p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink mb-6 border-b pb-4">
              خدمات تکمیلی (پیشنهادی)
            </h2>
            
            <div className="space-y-4">
              {/* eSIM */}
              <div className={`flex items-start md:items-center gap-4 p-4 border rounded-xl transition-all ${hasEsim ? 'border-brand bg-mint/20' : 'border-line hover:border-brand/40'}`}>
                <div className="bg-mint p-3 rounded-full text-brand-dark shrink-0">
                  <Wifi size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-ink flex items-center gap-2">
                    سیم‌کارت توریستی ایرانسل + 10GB اینترنت
                    {hasEsim && <CheckCircle2 size={16} className="text-brand" />}
                  </h3>
                  <p className="text-sm text-sub mt-1">تحویل فوری در فرودگاه بین‌المللی</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="font-bold text-brand-dark">{num(ESIM_PRICE, locale)} <span className="text-xs">IRR</span></p>
                  <Button 
                    variant={hasEsim ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setHasEsim(!hasEsim)}
                    className={hasEsim ? "mt-2 w-full bg-brand hover:bg-brand-2 text-surface" : "mt-2 w-full"}
                  >
                    {hasEsim ? 'حذف' : 'افزودن'}
                  </Button>
                </div>
              </div>

              {/* Insurance */}
              <div className={`flex items-start md:items-center gap-4 p-4 border rounded-xl transition-all ${hasInsurance ? 'border-brand bg-mint/20' : 'border-line hover:border-brand/40'}`}>
                <div className="bg-mint p-3 rounded-full text-brand-dark shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-ink flex items-center gap-2">
                    بیمه مسافرتی سامان (پوشش تا سقف ۱۰ هزار یورو)
                    {hasInsurance && <CheckCircle2 size={16} className="text-brand" />}
                  </h3>
                  <p className="text-sm text-sub mt-1">پوشش کامل حوادث و هزینه‌های پزشکی</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="font-bold text-brand-dark">{num(INSURANCE_PRICE, locale)} <span className="text-xs">IRR</span></p>
                  <Button 
                    variant={hasInsurance ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setHasInsurance(!hasInsurance)}
                    className={hasInsurance ? "mt-2 w-full bg-brand hover:bg-brand-2 text-surface" : "mt-2 w-full"}
                  >
                    {hasInsurance ? 'حذف' : 'افزودن'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Price Summary & Booking) */}
        <aside className="lg:w-[350px] shrink-0">
          <div className="bg-surface rounded-xl border border-line p-6 sticky top-24 shadow-sm">
            <h2 className="text-lg font-bold text-ink mb-6 border-b pb-4">
              جزئیات قیمت
            </h2>

            {/* Flight Summary */}
            <div className="mb-6 pb-6 border-b border-dashed border-line">
              <div className="flex items-center gap-2 font-bold mb-2">
                <Plane size={18} className="text-brand"/>
                پرواز تهران به مشهد
              </div>
              <div className="flex justify-between text-sm text-sub mb-2">
                <span>۱ عدد مسافر بزرگسال</span>
                <span>{num(BASE_FARE, locale)} IRR</span>
              </div>
              <div className="flex justify-between text-sm text-sub">
                <span>مالیات و عوارض</span>
                <span>{num(TAX_FARE, locale)} IRR</span>
              </div>
            </div>

            {/* Extras Summary */}
            {(hasEsim || hasInsurance) && (
              <div className="mb-6 pb-6 border-b border-dashed border-line space-y-2">
                <span className="text-xs font-bold text-sub block">خدمات افزوده</span>
                {hasEsim && (
                  <div className="flex justify-between text-sm text-sub">
                    <span>سیم‌کارت توریستی</span>
                    <span>{num(ESIM_PRICE, locale)} IRR</span>
                  </div>
                )}
                {hasInsurance && (
                  <div className="flex justify-between text-sm text-sub">
                    <span>بیمه مسافرتی</span>
                    <span>{num(INSURANCE_PRICE, locale)} IRR</span>
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className="mb-6">
              <div className="flex justify-between items-end">
                <span className="font-bold text-ink">مبلغ قابل پرداخت</span>
                <div className="text-start">
                  <p className="text-2xl font-black text-price num">{num(total, locale)}</p>
                  <p className="text-xs text-sub">IRR</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleProceed}
              className="w-full h-14 text-lg font-black bg-action hover:bg-action-hover text-[#14201f] mb-4 shadow-sm"
            >
              تایید و ادامه پرداخت
            </Button>

            <div className="bg-gold-soft text-price p-3.5 rounded-lg text-xs flex gap-2">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p>
                طبق قوانین پلتفرم، صدور سند رزرو و کسر وجه با تضمین قطعی PNR صورت می‌پذیرد.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
