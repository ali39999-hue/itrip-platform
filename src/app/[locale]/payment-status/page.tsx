'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Wallet, ShieldCheck, RefreshCcw, Ticket, Download, ArrowLeft, Headset, MapPin, type LucideIcon } from 'lucide-react';
import { useBookingStore } from '@/stores/booking-store';
import { num } from '@/lib/format';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

type PayState = 'processing' | 'failed' | 'unknown' | 'paid_pending' | 'confirmed';

const STATES: Record<PayState, { 
  title: string; 
  desc: string; 
  icon: LucideIcon; 
  color: string; 
  pulseColor: string; 
  bgStyle: string; 
}> = {
  processing: {
    title: 'در حال بررسی پرداخت شما',
    desc: 'منتظر نتیجه قطعی درگاه هستیم. وضعیت به‌صورت خودکار به‌روزرسانی می‌شود.',
    icon: Clock, 
    color: 'bg-brand text-surface', 
    pulseColor: 'bg-brand/30',
    bgStyle: 'bg-brand'
  },
  failed: {
    title: 'پرداخت انجام نشد',
    desc: 'پیش‌نویس سفارش شما حفظ شده است. روش دیگری انتخاب کنید یا به مرحله بازبینی برگردید.',
    icon: XCircle, 
    color: 'bg-rose-warm text-surface', 
    pulseColor: 'bg-rose-warm/30',
    bgStyle: 'bg-rose-warm'
  },
  unknown: {
    title: 'وضعیت پرداخت نامشخص است',
    desc: 'لطفاً پرداخت را تکرار نکنید. با کد پیگیری وضعیت را بررسی کنید یا با پشتیبانی مالی تماس بگیرید.',
    icon: RefreshCcw, 
    color: 'bg-hotel text-surface', 
    pulseColor: 'bg-hotel/30',
    bgStyle: 'bg-hotel'
  },
  paid_pending: {
    title: 'پرداخت دریافت شد · در انتظار تایید',
    desc: 'وجه شما ثبت شده و تامین‌کننده در حال نهایی‌سازی رزرو است. کارت سفر به‌زودی صادر می‌شود.',
    icon: Wallet, 
    color: 'bg-flight text-surface', 
    pulseColor: 'bg-flight/30',
    bgStyle: 'bg-flight'
  },
  confirmed: {
    title: 'پرداخت با موفقیت انجام شد!',
    desc: 'رزرو شما تایید شد و جزئیات آن در بخش «سفرهای من» ثبت گردید.',
    icon: CheckCircle2, 
    color: 'bg-success text-surface', 
    pulseColor: 'bg-success/30',
    bgStyle: 'bg-success'
  },
};

export default function PaymentStatusPage() {
  const router = useRouter();
  const locale = useLocale();
  const bookings = useBookingStore((s) => s.bookings);
  const latestBooking = bookings[0];

  const [state, setState] = useState<PayState>('confirmed');
  const s = STATES[state];

  const trackingCode = latestBooking?.reference || 'IRP-892415';
  const displayAmount = latestBooking ? latestBooking.amount : 12500000;
  const displayCurrency = latestBooking?.currency || 'IRR';
  const displayTitle = latestBooking?.title || 'سفارش خدمات مسافرتی iTrip';
  const displayDate = latestBooking ? new Date(latestBooking.createdAt).toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })) : 'امروز';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-12">
      
      {/* Ambient Background Elements */}
      <div className="absolute top-0 start-0 w-full h-full pointer-events-none -z-10 opacity-30">
        <div className={`absolute -top-[10%] -start-[10%] w-[40%] h-[40%] rounded-full ${s.bgStyle} blur-[100px] opacity-40 mix-blend-multiply transition-colors duration-1000`}></div>
        <div className={`absolute -bottom-[10%] -end-[10%] w-[50%] h-[50%] rounded-full ${s.bgStyle} blur-[120px] opacity-30 mix-blend-multiply transition-colors duration-1000`}></div>
      </div>

      <div className="w-full px-4 md:px-8 max-w-[650px] z-10 flex flex-col">
        
        {/* State Toggle for Demo/Testing Purposes */}
        <div className="flex flex-wrap gap-2 justify-center mb-8 bg-surface/50 backdrop-blur-sm p-2 rounded-xl mx-auto shadow-sm border border-line">
          {(Object.keys(STATES) as PayState[]).map((id) => (
            <button
              key={id}
              onClick={() => setState(id)}
              className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm ${
                state === id ? 'bg-ink text-surface shadow-sm' : 'text-sub hover:bg-surface/80'
              }`}
            >
              {id === 'processing' ? 'در حال پردازش' : 
               id === 'failed' ? 'ناموفق' : 
               id === 'unknown' ? 'نامشخص' : 
               id === 'paid_pending' ? 'در انتظار' : 'قطعی'}
            </button>
          ))}
        </div>

        {/* Status Card (Glassmorphism) */}
        <div className="bg-surface/90 backdrop-blur-2xl rounded-3xl shadow-xl border border-surface/50 p-8 md:p-12 flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Animated Icon */}
          <div className="relative w-28 h-28 mb-8">
            <div className={`absolute inset-0 ${s.pulseColor} rounded-full animate-pulse duration-1000`}></div>
            <div className={`absolute inset-2 ${s.color} rounded-full flex items-center justify-center shadow-lg transition-colors duration-500`}>
              <s.icon size={44} strokeWidth={2.5} />
            </div>
          </div>
          
          <h1 className="font-black text-[26px] md:text-[32px] text-ink mb-4">{s.title}</h1>
          <p className="font-bold text-[15px] md:text-[16px] text-sub leading-relaxed mb-10 max-w-md">
            {s.desc}
          </p>
          
          {/* Booking Details */}
          <div className="w-full bg-soft rounded-2xl p-6 mb-10 border border-line/50 flex flex-col gap-4 text-start">
            <div className="flex justify-between items-center pb-3 border-b border-line/50">
              <span className="font-bold text-[14px] text-sub flex items-center gap-2">
                <Ticket size={18} className="opacity-70" /> شماره پیگیری:
              </span>
              <span className="font-black text-[18px] text-ink tracking-wider font-mono">{trackingCode}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-line/50">
              <span className="font-bold text-[14px] text-sub flex items-center gap-2">
                <MapPin size={18} className="opacity-70" /> عنوان سفارش:
              </span>
              <span className="font-bold text-[14px] text-ink truncate max-w-[240px]">{displayTitle}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-line/50">
              <span className="font-bold text-[14px] text-sub flex items-center gap-2">
                <Wallet size={18} className="opacity-70" /> مبلغ پرداختی:
              </span>
              <span className="font-black text-[18px] text-ink">
                {num(displayAmount, locale)} <span className="text-[13px] text-sub">{displayCurrency}</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-[14px] text-sub flex items-center gap-2">
                <Clock size={18} className="opacity-70" /> زمان تراکنش:
              </span>
              <span className="font-bold text-[13px] text-ink font-en">{displayDate}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row w-full gap-4">
            {(state === 'processing' || state === 'unknown') && (
              <>
                <Button onClick={() => setState('confirmed')} className="flex-1 bg-ink text-surface hover:bg-ink/90 py-6 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 shadow-sm">
                  <RefreshCcw size={20} /> بررسی مجدد وضعیت
                </Button>
                <Button variant="outline" onClick={() => router.push('/support')} className="flex-1 bg-surface text-ink hover:bg-soft py-6 border-line/50 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2">
                  <Headset size={20} /> تماس با پشتیبانی
                </Button>
              </>
            )}
            {state === 'failed' && (
              <>
                <Button onClick={() => router.push('/checkout')} className="flex-1 bg-rose-warm text-surface hover:bg-rose-warm/90 py-6 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 shadow-sm">
                  <ArrowLeft size={20} /> تلاش مجدد برای پرداخت
                </Button>
                <Button variant="outline" onClick={() => router.push('/support')} className="flex-1 bg-surface text-ink hover:bg-soft py-6 border-line/50 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2">
                  <Headset size={20} /> پشتیبانی مالی
                </Button>
              </>
            )}
            {state === 'paid_pending' && (
              <>
                <Button onClick={() => router.push('/my-trips')} className="flex-1 bg-flight text-surface hover:bg-flight/90 py-6 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 shadow-sm">
                  <MapPin size={20} /> پیگیری در سفرهای من
                </Button>
                <Button variant="outline" onClick={() => router.push('/support')} className="flex-1 bg-surface text-ink hover:bg-soft py-6 border-line/50 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2">
                  <Headset size={20} /> پشتیبانی
                </Button>
              </>
            )}
            {state === 'confirmed' && (
              <>
                <Button onClick={() => router.push('/my-trips')} className="flex-1 bg-brand text-surface hover:bg-brand-2 py-6 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 shadow-sm">
                  <Download size={20} /> مشاهده سند و کارت سفر
                </Button>
                <Button variant="outline" onClick={() => router.push('/')} className="flex-1 bg-surface text-ink hover:bg-soft py-6 border-line/50 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2">
                  <ArrowLeft size={20} /> بازگشت به خانه
                </Button>
              </>
            )}
          </div>

        </div>
        
        {/* Helper text indicating dynamic state */}
        <div className="mt-8 text-center flex items-center justify-center gap-2 text-sub opacity-70">
          <ShieldCheck size={16} />
          <span className="font-bold text-[12px]">این محیط امن و رمزنگاری شده است.</span>
        </div>

      </div>
    </div>
  );
}
