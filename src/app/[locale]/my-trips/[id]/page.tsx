'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { useHydration } from '@/hooks/useHydration';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { getBookingById } from '@/actions/booking';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { notFound } from 'next/navigation';
import {
  UserRound,
  Plane,
  FileText,
  QrCode,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  X,
} from 'lucide-react';
import { lt } from '@/lib/lt';

interface BookingItemData {
  id: string;
  type: string;
  netCost: unknown;
  markup: unknown;
  sellPrice: unknown;
  details: string;
}

interface BookingRecord {
  id: string;
  reference: string;
  pnr?: string | null;
  supplierRef?: string | null;
  status: string;
  totalAmount: unknown;
  currency: string;
  createdAt: Date;
  items: BookingItemData[];
}

export default function TripDetailsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuthStore();

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [is404, setIs404] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await getBookingById(id);
        if (!active) return;
        if (!res.success || !res.booking) {
          setIs404(true);
        } else {
          setBooking(res.booking as unknown as BookingRecord);
        }
      } catch {
        if (active) setIs404(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [id]);

  const isHydrated = useHydration();

  if (is404) {
    notFound();
  }

  if (loading || !isHydrated) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-24 flex items-center justify-center text-brand">
        <Loader2 className="animate-spin" size={36} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-16 text-center">
        <UserRound size={52} className="mx-auto text-line mb-4" />
        <h1 className="text-[20px] font-black text-ink mb-2">
          {lt(locale, {
            fa: 'وارد نشده‌اید',
            en: 'Not Signed In',
            ar: 'لم تقم بتسجيل الدخول',
            zh: '未登录',
            ru: 'Вы не вошли в систему',
          })}
        </h1>
        <p className="text-[13px] font-bold text-sub mb-6">
          {lt(locale, {
            fa: 'برای مشاهده این صفحه ابتدا وارد شوید',
            en: 'Please sign in to view your itinerary voucher',
            ar: 'يرجى تسجيل الدخول لعرض تفاصيل الرحلة',
            zh: '请登录以查看行程单',
            ru: 'Войдите, чтобы увидеть ваучер поездки',
          })}
        </p>
        <Button
          onClick={() => router.push('/auth')}
          className="bg-brand hover:bg-brand-2 text-surface h-11 px-10 font-black rounded-xl"
        >
          {lt(locale, {
            fa: 'ورود / ثبت‌نام',
            en: 'Sign In / Register',
            ar: 'تسجيل الدخول / إنشاء حساب',
            zh: '登录 / 注册',
            ru: 'Вход / Регистрация',
          })}
        </Button>
      </div>
    );
  }

  const firstItem = booking?.items?.[0];
  let detailsObj: Record<string, unknown> = {};
  if (firstItem?.details) {
    try {
      detailsObj = JSON.parse(firstItem.details);
    } catch {}
  }

  const title =
    (detailsObj.itemTitle as string) || (detailsObj.title as string) || `${firstItem?.type || 'Travel'} Booking`;
  const totalAmt = Number(booking?.totalAmount || 0);
  const passengers = Array.isArray(detailsObj.passengers) ? (detailsObj.passengers as Array<{ firstName?: string; lastName?: string; nationalId?: string; passportNo?: string }>) : [];
  const refCode = booking?.reference || booking?.id.slice(0, 8) || '';

  const copyReference = () => {
    if (!refCode) return;
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmCancel = () => {
    setCancelSuccess(true);
    setTimeout(() => {
      setCancelModal(false);
      if (booking) {
        setBooking({ ...booking, status: 'CANCEL_REQUESTED' });
      }
    }, 1800);
  };

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1280px] mx-auto px-4 md:px-10 py-8 gap-8">
      {/* Sidebar hidden in Print */}
      <div className="print:hidden">
        <AccountSidebar activeSection="trips" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 print:w-full">
        {/* Printable Official Header */}
        <div className="hidden print:flex items-center justify-between pb-4 border-b border-line mb-4">
          <div>
            <h1 className="text-2xl font-black text-ink">فیروزو · واچر رسمی مسافرتی</h1>
            <p className="text-xs text-sub">Firuzo Smart Travel Platform · Official Itinerary Voucher</p>
          </div>
          <div className="text-end">
            <span className="font-mono text-sm font-black">REF: #{refCode}</span>
          </div>
        </div>

        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-2xl md:text-[32px] font-black text-ink mb-2 tracking-tight">
              {title}
            </h1>
            <div className="flex items-center gap-4 flex-wrap text-sm text-sub font-bold">
              <div className="flex items-center gap-2">
                <span>{lt(locale, { fa: 'کد رهگیری فیروزو:', en: 'Firuzo Reference:', ar: 'رمز فيروزو:', zh: 'Firuzo 参考号：', ru: 'Номер Firuzo:' })}</span>
                <span className="font-mono text-ink bg-soft px-2.5 py-0.5 rounded-lg border border-line">#{refCode}</span>
                <button
                  type="button"
                  onClick={copyReference}
                  className="w-7 h-7 rounded-lg bg-soft border border-line text-sub hover:text-brand-dark grid place-items-center transition active:scale-95"
                  title="کپی کد رهگیری"
                >
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span>{lt(locale, { fa: 'کد تایید تامین‌کننده (PNR):', en: 'Supplier PNR:', ar: 'رمز PNR المورد:', zh: '供应商 PNR：', ru: 'PNR поставщика:' })}</span>
                <span className="font-mono text-ink bg-mint/50 text-brand-dark px-2.5 py-0.5 rounded-lg border border-brand/20">
                  {booking?.pnr || booking?.supplierRef || lt(locale, { fa: 'در انتظار تایید تامین‌کننده', en: 'Pending Supplier Confirmation', ar: 'قيد تأكيد المورد', zh: '待供应商确认', ru: 'Ожидает подтверждения' })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {booking?.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={() => setCancelModal(true)}
                className="h-11 px-4 rounded-xl border border-rose-300 text-rose-600 bg-rose-50/60 hover:bg-rose-100/80 font-black text-xs transition flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>{lt(locale, { fa: 'درخواست لغو و استرداد', en: 'Cancel & Refund', ar: 'إلغاء واسترداد', zh: '申请退订退款', ru: 'Запрос на отмену' })}</span>
              </button>
            )}
            <Button
              onClick={() => window.print()}
              className="bg-brand hover:bg-brand-2 text-surface px-5 h-11 rounded-xl font-black shadow-sm shrink-0 flex items-center gap-2 text-xs"
            >
              <FileText size={16} />
              <span>{lt(locale, { fa: 'چاپ واچر / PDF', en: 'Print Voucher PDF', ar: 'طباعة القسيمة PDF', zh: '打印行程单 PDF', ru: 'Печать ваучера' })}</span>
            </Button>
          </div>
        </div>

        {/* Lifecycle Timeline Stepper */}
        <div className="bg-surface rounded-2xl p-5 border border-line shadow-xs">
          <div className="text-xs font-black text-sub mb-4">
            {lt(locale, { fa: 'مراحل وضعیت رزرو', en: 'Booking Lifecycle', ar: 'مراحل الحجز', zh: '预订生命周期', ru: 'Этапы бронирования' })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {/* Step 1: Created */}
            <div className="p-3 rounded-xl bg-mint/40 border border-brand/20 flex flex-col items-center gap-1.5">
              <CheckCircle2 size={18} className="text-brand-dark" />
              <span className="text-xs font-black text-ink">{lt(locale, { fa: 'ثبت سفارش', en: 'Order Placed', ar: 'تم الطلب', zh: '已下单', ru: 'Заказ создан' })}</span>
              <span className="text-[10px] text-sub">انجام شد</span>
            </div>

            {/* Step 2: Payment */}
            <div className="p-3 rounded-xl bg-mint/40 border border-brand/20 flex flex-col items-center gap-1.5">
              <CheckCircle2 size={18} className="text-brand-dark" />
              <span className="text-xs font-black text-ink">{lt(locale, { fa: 'پرداخت موفق', en: 'Payment Confirmed', ar: 'تم الدفع', zh: '支付成功', ru: 'Оплата подтверждена' })}</span>
              <span className="text-[10px] text-sub">تایید شد</span>
            </div>

            {/* Step 3: Supplier Issuance */}
            <div className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${
              ['CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED'].includes(booking?.status || '')
                ? 'bg-mint/40 border-brand/20 text-brand-dark'
                : 'bg-soft border-line text-sub'
            }`}>
              {['CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED'].includes(booking?.status || '') ? (
                <CheckCircle2 size={18} className="text-brand-dark" />
              ) : (
                <Clock size={18} className="text-sub" />
              )}
              <span className="text-xs font-black text-ink">{lt(locale, { fa: 'صدور توسط تأمین‌کننده', en: 'Supplier Issued', ar: 'إصدار المورد', zh: '供应商出票', ru: 'Выпущено поставщиком' })}</span>
              <span className="text-[10px] text-sub">قطعی</span>
            </div>

            {/* Step 4: Ready / Cancelled */}
            <div className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${
              booking?.status === 'CANCELLED' || booking?.status === 'CANCEL_REQUESTED'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : booking?.status === 'CONFIRMED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-soft border-line text-sub'
            }`}>
              <ShieldCheck size={18} />
              <span className="text-xs font-black">
                {booking?.status === 'CANCEL_REQUESTED'
                  ? lt(locale, { fa: 'در انتظار لغو', en: 'Cancel Pending', ar: 'قيد الإلغاء', zh: '等待退订', ru: 'Отмена в обработке' })
                  : booking?.status === 'CANCELLED'
                    ? lt(locale, { fa: 'سفر لغو شده', en: 'Cancelled', ar: 'ملغى', zh: '已取消', ru: 'Отменено' })
                    : lt(locale, { fa: 'آماده سفر', en: 'Ready to Travel', ar: 'جاهز للسفر', zh: '出行就绪', ru: 'Готово к поездке' })}
              </span>
              <span className="text-[10px] opacity-75">
                {booking?.status === 'CONFIRMED' ? 'واچر فعال' : booking?.status}
              </span>
            </div>
          </div>
        </div>

        {/* Bento Grid Itinerary Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Info Section */}
          <div className="lg:col-span-8 bg-surface rounded-3xl p-6 border border-line/80 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 border-b border-line/60 pb-4">
              <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand-dark grid place-items-center">
                <Plane size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-brand-dark">
                  {lt(locale, {
                    fa: 'مشخصات سفر و جزئیات صدور',
                    en: 'Booking & Passenger Details',
                    ar: 'تفاصيل الرحلة والمسافرين',
                    zh: '预订及旅客详情',
                    ru: 'Детали бронирования и пассажиров',
                  })}
                </h2>
                <span className="text-xs text-sub font-bold">اطلاعات مسافران و واچر رسمی</span>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-soft/50 p-5 rounded-2xl border border-line/60 flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-sub block mb-1">
                    {lt(locale, { fa: 'نوع خدمت', en: 'Service Type', ar: 'نوع الخدمة', zh: '服务类型', ru: 'Тип услуги' })}
                  </span>
                  <p className="font-black text-ink text-base">{firstItem?.type || 'HOTEL'}</p>
                </div>

                <div>
                  <span className="text-xs font-bold text-sub block mb-1">
                    {lt(locale, { fa: 'تاریخ ثبت', en: 'Booked On', ar: 'تاريخ الإنشاء', zh: '预订日期', ru: 'Дата оформления' })}
                  </span>
                  <p className="font-bold text-ink font-mono text-base">
                    {booking ? new Date(booking.createdAt).toISOString().slice(0, 10) : ''}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-sub block mb-1">
                    {lt(locale, { fa: 'مبلغ پرداختی', en: 'Total Paid', ar: 'الإجمالي المدفوع', zh: '支付总额', ru: 'Всего оплачено' })}
                  </span>
                  <p className="font-black text-price font-mono text-base">
                    {totalAmt.toLocaleString(
                      lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                    )}{' '}
                    {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                  </p>
                </div>
              </div>

              {passengers.length > 0 && (
                <div>
                  <h3 className="font-black text-ink text-sm mb-3">
                    {lt(locale, { fa: 'لیست مسافران', en: 'Passengers List', ar: 'قائمة المسافرين', zh: '旅客名单', ru: 'Список пассажиров' })}
                  </h3>
                  <div className="space-y-2">
                    {passengers.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-line bg-surface flex justify-between items-center text-xs font-bold"
                      >
                        <span className="text-ink">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="text-sub font-mono">
                          {p.nationalId || p.passportNo || 'ID Verified'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QR / Verification Card */}
          <div className="lg:col-span-4 bg-surface rounded-3xl border border-line/80 overflow-hidden flex flex-col p-6 text-center shadow-xs">
            <h3 className="text-base sm:text-lg font-black text-ink mb-1.5">
              {lt(locale, { fa: 'بارکد تایید اصالت واچر', en: 'Voucher Verification Barcode', ar: 'باركود التحقق من القسيمة', zh: '凭证验证条码', ru: 'Штрих-код верификации ваучера' })}
            </h3>
            <p className="text-xs font-bold text-sub mb-6">
              {lt(locale, {
                fa: 'این کد را هنگام پذیرش به متصدی مربوطه نشان دهید.',
                en: 'Present this QR code during check-in or airport boarding.',
                ar: 'أظهر رمز الاستجابة السريعة هذا عند تسجيل الوصول.',
                zh: '在办理登机或入住手续时出示此二维码。',
                ru: 'Покажите этот QR-код при регистрации.',
              })}
            </p>

            <div className="w-36 h-36 mx-auto bg-mint/30 border-2 border-brand/40 rounded-2xl grid place-items-center mb-6 text-brand-dark">
              <QrCode size={80} />
            </div>

            <div className="bg-soft p-3 rounded-xl border border-line text-[11px] font-mono text-sub font-bold">
              AUTH-CODE: #{refCode}
            </div>
          </div>
        </div>

        {/* Cancel / Refund Modal */}
        {cancelModal && (
          <div className="fixed inset-0 z-[200] bg-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface rounded-3xl p-6 border border-line shadow-elev-3 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle size={20} />
                  <h3 className="font-black text-base text-ink">درخواست لغو رزرو و استرداد وجه</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelModal(false)}
                  className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center"
                >
                  <X size={16} />
                </button>
              </div>

              {cancelSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 size={42} className="text-success mx-auto" />
                  <h4 className="text-base font-black text-ink">درخواست استرداد با موفقیت ثبت شد</h4>
                  <p className="text-xs text-sub font-bold">وجه پس از تایید جریمه طبق قوانین کنسلی به کیف پول شما مسترد می‌گردد.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-sub leading-relaxed font-bold">
                    آیا از لغو رزرو شماره <strong className="font-mono text-ink">#{refCode}</strong> اطمینان دارید؟
                    طبق قوانین کنسلی، جریمه استرداد بر اساس ساعت باقی‌مانده تا پرواز/اقامت محاسبه شده و مانده وجه در کمتر از چند دقیقه به کیف پول فیروزو شما بازمی‌گردد.
                  </p>

                  <div className="p-3.5 rounded-xl bg-soft border border-line text-xs font-bold space-y-1">
                    <span className="text-sub block">مقصد استرداد وجه:</span>
                    <span className="text-brand-dark font-black block">کیف پول فیروزو (تسویه آنی و بدون کارمزد بانکی)</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCancelModal(false)}
                      className="flex-1 h-11 rounded-xl bg-soft hover:bg-line/60 text-sub font-bold text-xs transition"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCancel}
                      className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-surface font-black text-xs transition shadow-sm"
                    >
                      تایید و استرداد وجه
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
