import { verifyVoucherToken, VoucherService } from '@/domains/booking/VoucherService';
import { lt } from '@/lib/lt';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Clock, Calendar, User, FileText, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

interface VerifyPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; ref?: string; pnr?: string }>;
}

export default async function VerifyPage({ params, searchParams }: VerifyPageProps) {
  const { locale } = await params;
  const { token, ref } = await searchParams;

  let verifiedPayload: { ref: string; bookingId: string; pnr?: string | null; exp: number } | null = null;
  let tokenError: string | null = null;

  if (token) {
    const res = verifyVoucherToken(token);
    if (res.valid && res.payload) {
      verifiedPayload = res.payload;
    } else {
      tokenError = res.error || 'invalid_token';
    }
  }

  const queryRef = verifiedPayload?.ref || ref;
  const queryId = verifiedPayload?.bookingId;

  const booking = await VoucherService.getBookingForVerification(queryRef, queryId);

  // Determine Invariant State (VOUCH-INV / §26, §29)
  type VoucherVerificationState = 'VALID' | 'REVOKED' | 'INVALID' | 'EXPIRED' | 'NOT_FOUND';

  let state: VoucherVerificationState = 'NOT_FOUND';
  let statusMessage = '';

  if (tokenError === 'expired') {
    state = 'EXPIRED';
    statusMessage = lt(locale, {
      fa: 'اعتبار این توکن استعلام دیجیتال به پایان رسیده است.',
      en: 'This digital verification token has expired.',
      ar: 'انتهت صلاحية رمز التحقق الرقمي هذا.',
      zh: '此电子验证令牌已过期。',
      ru: 'Срок действия цифрового токена проверки истек.',
    });
  } else if (tokenError) {
    state = 'INVALID';
    statusMessage = lt(locale, {
      fa: 'امضای دیجیتال واچر نامعتبر است یا توکن دستکاری شده است.',
      en: 'Voucher digital signature is invalid or tampered with.',
      ar: 'التوقيع الرقمي للقسيمة غير صالح أو تم التلاعب به.',
      zh: '凭证电子签名无效或已被篡改。',
      ru: 'Цифровая подпись ваучера недействительна.',
    });
  } else if (!booking) {
    state = 'NOT_FOUND';
    statusMessage = lt(locale, {
      fa: 'هیچ رکوردی برای این کد رهگیری در پایگاه داده ثبت نشده است.',
      en: 'No booking record found for this tracking code.',
      ar: 'لم يتم العثور على سجل حجز لهذا الرمز.',
      zh: '未找到此凭证编号对应的有效预订。',
      ru: 'Запись о бронировании не найдена.',
    });
  } else if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') {
    state = 'REVOKED';
    statusMessage = lt(locale, {
      fa: 'این رزرو لغو یا مسترد شده و واچر مربوطه از درجه اعتبار ساقط است.',
      en: 'This booking has been cancelled or refunded; voucher is revoked.',
      ar: 'تم إلغاء هذا الحجز أو استرداده، والقسيمة باطلة.',
      zh: '此订单已取消或退款，原凭证已撤销作废。',
      ru: 'Это бронирование отменено или возвращено; ваучер аннулирован.',
    });
  } else if (booking.status === 'FAILED') {
    state = 'INVALID';
    statusMessage = lt(locale, {
      fa: 'پرداخت یا صدور این رزرو ناموفق بوده و سند صادره معتبر نمی‌باشد.',
      en: 'Booking fulfillment failed; voucher is not valid.',
      ar: 'فشلت عملية الحجز، والقسيمة غير صالحة.',
      zh: '出票失败，所持凭证无效。',
      ru: 'Бронирование не удалось, ваучер недействителен.',
    });
  } else if (
    (booking.status === 'CONFIRMED' || booking.status === 'ISSUED' || booking.status === 'COMPLETED') &&
    booking.paymentStatus === 'PAID'
  ) {
    state = 'VALID';
    statusMessage = lt(locale, {
      fa: 'اصالت و اعتبار رسمی این واچر مسافرتی کاملاً تایید می‌شود.',
      en: 'Authenticity and official validity of this travel voucher is confirmed.',
      ar: 'تم تأكيد صحة وصلاحية هذه القسيمة الرسمية بنجاح.',
      zh: '此官方出行凭证真实有效，已获系统认证。',
      ru: 'Подлинность и официальный статус ваучера подтверждены.',
    });
  } else {
    state = 'INVALID';
    statusMessage = lt(locale, {
      fa: 'رزرو در انتظار تکمیل پرداخت یا تایید کارشناس است.',
      en: 'Booking is awaiting payment capture or supplier confirmation.',
      ar: 'الحجز بانتظار اكتمال الدفع أو تأكيد المورد.',
      zh: '订单待支付或待确认。',
      ru: 'Бронирование ожидает оплаты или подтверждения.',
    });
  }

  // Parse minimal display items without sensitive PII
  const firstItem = booking?.items[0];
  let itemTitle = firstItem?.type || 'سفر';
  if (firstItem?.details) {
    try {
      const parsed = JSON.parse(firstItem.details);
      if (parsed.title) itemTitle = parsed.title;
      else if (parsed.hotelName) itemTitle = parsed.hotelName;
      else if (parsed.airline) itemTitle = `${parsed.airline} ${parsed.flightNo || ''}`.trim();
    } catch {}
  }

  return (
    <div className="min-h-screen bg-soft/40 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-lg bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-elev-3 space-y-6">
        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center">
            {state === 'VALID' && (
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <CheckCircle2 size={36} />
              </div>
            )}
            {state === 'REVOKED' && (
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <AlertTriangle size={36} />
              </div>
            )}
            {(state === 'INVALID' || state === 'EXPIRED' || state === 'NOT_FOUND') && (
              <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center shadow-xs">
                <XCircle size={36} />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-ink">
              {state === 'VALID' && lt(locale, {
                fa: 'واچر معتبر و تایید شده',
                en: 'Verified Valid Voucher',
                ar: 'قسيمة مؤكدة وصالحة',
                zh: '已认证有效凭证',
                ru: 'Действительный подтвержденный ваучер',
              })}
              {state === 'REVOKED' && lt(locale, {
                fa: 'واچر باطل شده (لغو / استرداد)',
                en: 'Voucher Revoked',
                ar: 'قسيمة ملغاة (تم الإلغاء / الاسترداد)',
                zh: '凭证已作废（取消/退款）',
                ru: 'Ваучер аннулирован',
              })}
              {state === 'EXPIRED' && lt(locale, {
                fa: 'توکن استعلام منقضی شده',
                en: 'Verification Token Expired',
                ar: 'رمز التحقق منتهي الصلاحية',
                zh: '验证令牌已过期',
                ru: 'Токен проверки истек',
              })}
              {state === 'INVALID' && lt(locale, {
                fa: 'واچر نامعتبر',
                en: 'Invalid Voucher',
                ar: 'قسيمة غير صالحة',
                zh: '无效凭证',
                ru: 'Недействительный ваучер',
              })}
              {state === 'NOT_FOUND' && lt(locale, {
                fa: 'واچر یافت نشد',
                en: 'Voucher Not Found',
                ar: 'لم يتم العثور على القسيمة',
                zh: '未找到该凭证',
                ru: 'Ваучер не найден',
              })}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-sub mt-1 leading-relaxed">
              {statusMessage}
            </p>
          </div>
        </div>

        {/* Minimal Safe Verification Details (§25 Privacy Guard) */}
        {booking && (
          <div className="p-4 rounded-2xl bg-soft/70 border border-line/60 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-line/50 pb-2">
              <span className="text-sub font-bold flex items-center gap-1.5">
                <FileText size={14} />
                <span>{lt(locale, {
                  fa: 'شماره مرجع رزرو',
                  en: 'Booking Reference',
                  ar: 'رقم مرجع الحجز',
                  zh: '预订参考号',
                  ru: 'Номер бронирования',
                })}:</span>
              </span>
              <span className="font-mono font-black text-brand-dark">{booking.reference}</span>
            </div>

            <div className="flex items-center justify-between border-b border-line/50 pb-2">
              <span className="text-sub font-bold flex items-center gap-1.5">
                <ShieldCheck size={14} />
                <span>{lt(locale, {
                  fa: 'خدمت خریداری‌شده',
                  en: 'Service',
                  ar: 'الخدمة المشتراة',
                  zh: '已购出行服务',
                  ru: 'Услуга',
                })}:</span>
              </span>
              <span className="font-bold text-ink truncate max-w-[200px]">{itemTitle}</span>
            </div>

            {booking.travelDate && (
              <div className="flex items-center justify-between border-b border-line/50 pb-2">
                <span className="text-sub font-bold flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{lt(locale, {
                    fa: 'تاریخ سفر',
                    en: 'Travel Date',
                    ar: 'تاريخ السفر',
                    zh: '出行日期',
                    ru: 'Дата поездки',
                  })}:</span>
                </span>
                <span className="font-mono text-ink">{booking.travelDate}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-line/50 pb-2">
              <span className="text-sub font-bold flex items-center gap-1.5">
                <User size={14} />
                <span>{lt(locale, {
                  fa: 'مسافر / سرپرست',
                  en: 'Primary Traveler',
                  ar: 'المسافر الرئيسي',
                  zh: '主要旅客',
                  ru: 'Основной пассажир',
                })}:</span>
              </span>
              <span className="font-bold text-ink">{booking.customer?.name || 'مشتری فیروزو'}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sub font-bold flex items-center gap-1.5">
                <Clock size={14} />
                <span>{lt(locale, {
                  fa: 'تاریخ صدور نهایی',
                  en: 'Issued At',
                  ar: 'تاريخ الإصدار',
                  zh: '出票时间',
                  ru: 'Дата выдачи',
                })}:</span>
              </span>
              <span className="font-mono text-sub">
                {new Date(booking.updatedAt || booking.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="w-full min-h-[46px] rounded-2xl bg-brand hover:bg-brand-dark text-surface text-xs font-black flex items-center justify-center gap-2 transition shadow-xs"
          >
            <span>{lt(locale, {
              fa: 'بازگشت به صفحه اصلی فیروزو',
              en: 'Return to Firuzo Homepage',
              ar: 'العودة إلى الصفحة الرئيسية لفيروزو',
              zh: '返回 Firuzo 首页',
              ru: 'Вернуться на главную Firuzo',
            })}</span>
            <ArrowLeft size={16} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
