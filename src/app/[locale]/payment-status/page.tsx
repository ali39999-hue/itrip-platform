'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Wallet, RefreshCcw, Ticket, Headset, type LucideIcon } from 'lucide-react';
import { useBookingStore } from '@/stores/booking-store';
import { num } from '@/lib/format';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { useHydration } from '@/hooks/useHydration';

type PayState = 'processing' | 'failed' | 'unknown' | 'paid_pending' | 'confirmed';

const VALID_STATES: PayState[] = ['processing', 'failed', 'unknown', 'paid_pending', 'confirmed'];

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-12 px-4" aria-busy="true" aria-live="polite">
          <div className="w-full max-w-[650px] h-80 rounded-3xl bg-soft animate-pulse" />
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  );
}

function PaymentStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const hydrated = useHydration();
  const bookings = useBookingStore((s) => s.bookings);
  const latestBooking = bookings[0];

  // State comes from the gateway callback (?status=...); default is the
  // pending-verification view — never a fabricated "success".
  const state: PayState = useMemo(() => {
    const param = searchParams.get('status');
    return VALID_STATES.includes(param as PayState) ? (param as PayState) : 'processing';
  }, [searchParams]);

  const statesConfig: Record<PayState, { 
    title: string; 
    desc: string; 
    icon: LucideIcon; 
    color: string; 
    pulseColor: string; 
    bgStyle: string; 
  }> = {
    processing: {
      title: lt(locale, { fa: 'در حال بررسی پرداخت شما', en: 'Processing Your Payment', ar: 'جارٍ التحقق من الدفع', zh: '正在处理您的付款', ru: 'Обработка вашего платежа' }),
      desc: lt(locale, { fa: 'منتظر نتیجه قطعی درگاه هستیم. وضعیت به‌صورت خودکار به‌روزرسانی می‌شود.', en: 'Awaiting payment gateway confirmation. Status will update automatically.', ar: 'بانتظار تأكيد بوابة الدفع. سيتم التحديث تلقائياً.', zh: '正在等待支付网关确认，状态将自动更新。', ru: 'Ожидаем подтверждения шлюза. Статус обновится автоматически.' }),
      icon: Clock, 
      color: 'bg-brand text-surface', 
      pulseColor: 'bg-brand/30',
      bgStyle: 'bg-brand'
    },
    failed: {
      title: lt(locale, { fa: 'پرداخت انجام نشد', en: 'Payment Failed', ar: 'فشلت عملية الدفع', zh: '支付失败', ru: 'Платеж не выполнен' }),
      desc: lt(locale, { fa: 'پیش‌نویس سفارش شما حفظ شده است. روش دیگری انتخاب کنید یا دوباره تلاش نمایید.', en: 'Your booking draft is saved. Try another payment method or retry.', ar: 'تم حفظ مسودة الحجز. اختر طريقة دفع أخرى أو حاول ثانية.', zh: '您的预订草稿已保存，请选择其他支付方式或重试。', ru: 'Черновик сохранен. Попробуйте другой способ оплаты или повторите попытку.' }),
      icon: XCircle, 
      color: 'bg-rose-warm text-surface', 
      pulseColor: 'bg-rose-warm/30',
      bgStyle: 'bg-rose-warm'
    },
    unknown: {
      title: lt(locale, { fa: 'وضعیت پرداخت نامشخص است', en: 'Payment Status Unknown', ar: 'حالة الدفع غير معروفة', zh: '支付状态未知', ru: 'Статус платежа неизвестен' }),
      desc: lt(locale, { fa: 'لطفاً پرداخت را تکرار نکنید. با کد پیگیری وضعیت را بررسی کنید یا با پشتیبانی تماس بگیرید.', en: 'Please do not repeat payment. Use your tracking code or contact concierge support.', ar: 'يرجى عدم تكرار الدفع. تحقق برقم التتبع أو تواصل مع الدعم.', zh: '请勿重复付款。请使用追踪码查询或联系客服。', ru: 'Пожалуйста, не повторяйте оплату. Проверьте код или обратитесь в поддержку.' }),
      icon: RefreshCcw, 
      color: 'bg-hotel text-surface', 
      pulseColor: 'bg-hotel/30',
      bgStyle: 'bg-hotel'
    },
    paid_pending: {
      title: lt(locale, { fa: 'پرداخت دریافت شد · در انتظار تایید نهایی', en: 'Payment Received · Confirmation Pending', ar: 'تم استلام الدفع · بانتظار التأكيد', zh: '已收到付款 · 待确认', ru: 'Платеж получен · Ожидает подтверждения' }),
      desc: lt(locale, { fa: 'وجه شما ثبت شده و تامین‌کننده در حال نهایی‌سازی واچر سفر است.', en: 'Payment recorded. Concierge is finalizing your travel voucher issuance.', ar: 'تم تسجيل المبلغ وجارٍ إصدار قسيمة الحجز النهائية.', zh: '已记录付款，供应商正在确认并出具行程单。', ru: 'Платеж зафиксирован, завершается выпуск ваучера.' }),
      icon: Wallet, 
      color: 'bg-flight text-surface', 
      pulseColor: 'bg-flight/30',
      bgStyle: 'bg-flight'
    },
    confirmed: {
      title: lt(locale, { fa: 'پرداخت با موفقیت انجام شد!', en: 'Payment Successful!', ar: 'تم الدفع بنجاح!', zh: '支付成功！', ru: 'Оплата прошла успешно!' }),
      desc: lt(locale, { fa: 'رزرو شما تایید شد و سند الکترونیک آن در بخش «سفرهای من» صادر گردید.', en: 'Your reservation is confirmed and electronic voucher is issued in My Trips.', ar: 'تم تأكيد حجزك وإصدار السند الإلكتروني في قسم رحلاتي.', zh: '预订已确认，电子凭证已在“我的旅行”中生成。', ru: 'Бронирование подтверждено, электронный ваучер доступен в «Моих поездках».' }),
      icon: CheckCircle2, 
      color: 'bg-success text-surface', 
      pulseColor: 'bg-success/30',
      bgStyle: 'bg-success'
    },
  };

  const s = statesConfig[state];
  const IconComponent = s.icon;

  // Read from query params (e.g. gateway callback / direct redirection)
  // or fall back to the most recent booking in the local store.
  const queryRef = searchParams.get('ref') || searchParams.get('trackingCode') || '';
  const queryAmountStr = searchParams.get('amount');
  const queryAmount = queryAmountStr ? Number(queryAmountStr) : null;
  const queryTitle = searchParams.get('title') || '';

  const trackingCode = queryRef || latestBooking?.reference || '';
  const displayAmount = queryAmount !== null && !Number.isNaN(queryAmount)
    ? queryAmount
    : (latestBooking?.amount ?? null);
  const displayCurrency = latestBooking?.currency || 'IRR';
  const displayTitle = queryTitle || latestBooking?.title || lt(locale, { fa: 'سفارش خدمات مسافرتی فیروز', en: 'Firuzo Travel Services Booking', ar: 'طلب خدمات سفر فيروز', zh: 'Firuzo 旅行服务订单', ru: 'Заказ туристических услуг Firuzo' });

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4" aria-busy="true" aria-live="polite">
        <div className="w-full max-w-[650px] h-80 rounded-3xl bg-soft animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-12 px-4">
      
      {/* Ambient Background Elements */}
      <div className="absolute top-0 start-0 w-full h-full pointer-events-none -z-10 opacity-30">
        <div className={`absolute -top-[10%] -start-[10%] w-[40%] h-[40%] rounded-full ${s.bgStyle} blur-[100px] opacity-40 mix-blend-multiply transition-colors duration-1000`}></div>
        <div className={`absolute -bottom-[10%] -end-[10%] w-[50%] h-[50%] rounded-full ${s.bgStyle} blur-[120px] opacity-30 mix-blend-multiply transition-colors duration-1000`}></div>
      </div>

      <div className="w-full px-4 md:px-8 max-w-[650px] z-10 flex flex-col">
        {/* Main Status Card */}
        <div className="bg-surface/95 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-elev-3 border border-line/80 relative overflow-hidden text-center flex flex-col items-center">
          
          {/* Status Icon */}
          <div className="relative mb-6">
            <div className={`w-20 h-20 rounded-full ${s.color} flex items-center justify-center relative z-10 shadow-md`}>
              <IconComponent size={40} className="stroke-[2.5]" />
            </div>
            <div className={`absolute inset-0 rounded-full ${s.pulseColor} animate-ping -z-0 opacity-75`}></div>
          </div>

          {/* Heading and Description */}
          <h1 className="text-2xl md:text-3xl font-black text-ink mb-3 leading-tight tracking-tight">
            {s.title}
          </h1>
          <p className="text-sub font-bold text-sm md:text-base max-w-[480px] leading-relaxed mb-8">
            {s.desc}
          </p>

          {/* Transaction Summary Box */}
          <div className="w-full bg-soft/60 rounded-2xl p-6 border border-line/60 flex flex-col gap-4 text-start mb-8">
            <div className="flex justify-between items-center pb-3 border-b border-line/50">
              <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'عنوان رزرو', en: 'Booking Item', ar: 'عنوان الحجز', zh: '预订项目', ru: 'Услуга' })}</span>
              <span className="text-sm font-black text-ink">{displayTitle}</span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-line/50">
              <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'کد پیگیری PNR', en: 'Tracking Ref / PNR', ar: 'رمز التتبع PNR', zh: '追踪码 PNR', ru: 'Код PNR' })}</span>
              <span className="text-sm font-black text-brand-dark font-mono bg-mint/50 px-3 py-0.5 rounded-lg border border-brand/20" dir="ltr">
                {trackingCode || '—'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'مبلغ پرداختی', en: 'Paid Amount', ar: 'المبلغ المدفوع', zh: '支付金额', ru: 'Сумма оплаты' })}</span>
              <span className="text-lg font-black text-price font-mono num">
                {displayAmount !== null ? (
                  <>
                    {num(displayAmount, locale)} <span className="text-xs font-bold text-sub">{displayCurrency}</span>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {state === 'confirmed' ? (
              <>
                <Button 
                  onClick={() => router.push('/my-trips')}
                  className="flex-1 h-13 bg-brand hover:bg-brand-2 text-surface font-black rounded-2xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <Ticket size={18} />
                  {lt(locale, { fa: 'مشاهده بلیط و واچر', en: 'View Ticket & Voucher', ar: 'عرض التذكرة والقسيمة', zh: '查看机票与凭证', ru: 'Посмотреть билет и ваучер' })}
                </Button>
                <Button 
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="h-13 border-line text-ink hover:bg-soft font-bold rounded-2xl px-6"
                >
                  {lt(locale, { fa: 'صفحه اصلی', en: 'Home', ar: 'الرئيسية', zh: '首页', ru: 'Главная' })}
                </Button>
              </>
            ) : state === 'failed' ? (
              <>
                <Button 
                  onClick={() => router.push('/checkout')}
                  className="flex-1 h-13 bg-brand hover:bg-brand-2 text-surface font-black rounded-2xl flex items-center justify-center gap-2"
                >
                  {lt(locale, { fa: 'تلاش مجدد برای پرداخت', en: 'Retry Payment', ar: 'إعادة محاولة الدفع', zh: '重新尝试支付', ru: 'Повторить оплату' })}
                </Button>
                <Button 
                  onClick={() => router.push('/support')}
                  variant="outline"
                  className="h-13 border-line text-ink hover:bg-soft font-bold rounded-2xl px-6"
                >
                  <Headset size={18} />
                  {lt(locale, { fa: 'پشتیبانی', en: 'Support', ar: 'الدعم', zh: '客服', ru: 'Поддержка' })}
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => router.push('/my-trips')}
                className="w-full h-13 bg-brand hover:bg-brand-2 text-surface font-black rounded-2xl"
              >
                {lt(locale, { fa: 'پیگیری در سفرهای من', en: 'Track in My Trips', ar: 'متابعة في رحلاتي', zh: '在我的旅行中追踪', ru: 'Отслеживать в поездках' })}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
