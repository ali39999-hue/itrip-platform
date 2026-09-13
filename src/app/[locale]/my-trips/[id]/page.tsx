'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { useHydration } from '@/hooks/useHydration';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { getBookingById, cancelBookingAction } from '@/actions/booking';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { notFound } from 'next/navigation';
import {
  UserRound,
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  X,
  Sparkles,
  ReceiptText,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { TripCountdown } from '@/components/trips/TripCountdown';
import { BoardingPassCard } from '@/components/trips/BoardingPassCard';
import { EmergencySosCard } from '@/components/trips/EmergencySosCard';
import { TripExpenseSplitter } from '@/components/trips/TripExpenseSplitter';
import { saveVoucherOffline } from '@/lib/offline-voucher';

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
  externalPnr?: string | null;
  pnr?: string | null;
  supplierRef?: string | null;
  status: string;
  travelDate?: string | null;
  totalAmount: unknown;
  currency: string;
  createdAt: Date;
  items: BookingItemData[];
  invoice?: { id: string; invoiceNumber: string; status: string } | null;
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
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (id === 'demo-trip' || id === 'demo') {
        const demoDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        setBooking({
          id: 'demo-trip',
          reference: 'ITR-DEMO-2026',
          externalPnr: 'W5-94812',
          status: 'CONFIRMED',
          travelDate: demoDate,
          totalAmount: 28500000,
          currency: 'IRR',
          createdAt: new Date(),
          items: [
            {
              id: 'item_demo_1',
              type: 'FLIGHT',
              netCost: 25000000,
              markup: 3500000,
              sellPrice: 28500000,
              details: JSON.stringify({
                itemTitle: 'پرواز تهران به استانبول — هواپیمایی ماهان',
                airline: 'هواپیمایی ماهان',
                flightNo: 'W5-1152',
                origin: 'THR',
                originCity: 'تهران',
                destination: 'IST',
                destinationCity: 'استانبول',
                departureTime: '08:30',
                arrivalTime: '11:45',
                terminal: 'T1',
                gate: 'B14',
                seat: '14A',
                cabinClass: 'Economy Flex',
                baggage: '30kg',
                passengers: [
                  { firstName: 'علی', lastName: 'رضایی', nationalId: '0012345678', passportNo: 'A12345678' },
                  { firstName: 'سارا', lastName: 'احمدی', nationalId: '0087654321', passportNo: 'A87654321' },
                ],
              }),
            },
          ],
        });
        setLoading(false);
        return;
      }

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

  if (!user && id !== 'demo-trip' && id !== 'demo') {
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
    } catch {
      detailsObj = {};
    }
  }

  const title =
    (detailsObj.itemTitle as string) || (detailsObj.title as string) || `${firstItem?.type || 'Travel'} Booking`;
  const totalAmt = Number(booking?.totalAmount || 0);
  const passengers = Array.isArray(detailsObj.passengers)
    ? (detailsObj.passengers as Array<{ firstName?: string; lastName?: string; nationalId?: string; passportNo?: string }>)
    : [];
  const refCode = booking?.reference || booking?.id.slice(0, 8) || '';
  const effectivePnr = booking?.externalPnr || booking?.pnr || booking?.supplierRef || null;
  const effectiveTravelDate = (booking?.travelDate as string) || (detailsObj.travelDate as string) || '2026-09-20';
  const effectiveDepartureTime = (detailsObj.departureTime as string) || '08:30';

  const copyReference = () => {
    if (!refCode) return;
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmCancel = async () => {
    if (!booking) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      const res = await cancelBookingAction(booking.id, 'درخواست کنسلی و استرداد مسافر');
      if (res.success) {
        setCancelSuccess(true);
        setTimeout(() => {
          setCancelModal(false);
          setBooking((prev) => (prev ? { ...prev, status: 'CANCEL_REQUESTED' } : null));
        }, 1600);
      } else {
        setCancelError(('error' in res ? (res.error as string) : undefined) || 'خطا در ثبت درخواست لغو');
      }
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'خطای ارتباط با سرور');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSaveOffline = () => {
    if (!booking) return;
    const ok = saveVoucherOffline({
      id: booking.id,
      reference: refCode,
      externalPnr: effectivePnr,
      status: booking.status,
      serviceType: firstItem?.type || 'FLIGHT',
      title,
      travelDate: effectiveTravelDate,
      departureTime: effectiveDepartureTime,
      arrivalTime: (detailsObj.arrivalTime as string) || '11:45',
      origin: (detailsObj.origin as string) || 'THR',
      destination: (detailsObj.destination as string) || 'IST',
      airline: (detailsObj.airline as string) || 'هواپیمایی ماهان',
      flightNo: (detailsObj.flightNo as string) || 'W5-1152',
      hotelName: (detailsObj.hotelName as string) || title,
      roomType: (detailsObj.roomType as string) || 'اتاق دابل لوکس',
      passengers,
      totalAmount: totalAmt,
      currency: booking.currency || 'IRR',
    });

    if (ok) {
      setOfflineSaved(true);
      setTimeout(() => setOfflineSaved(false), 3000);
    }
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
            {effectivePnr && (
              <span className="font-mono text-sm font-black block">PNR: {effectivePnr}</span>
            )}
          </div>
        </div>

        {/* Offline Saved Banner Toast */}
        {offlineSaved && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs font-bold animate-in fade-in duration-200">
            <Sparkles size={16} className="text-emerald-600" />
            <span>
              {lt(locale, {
                fa: 'واچر با موفقیت در حافظه مرورگر ذخیره شد. در فرودگاه بدون اتصال اینترنت در دسترس است.',
                en: 'Voucher saved to offline memory. Available at airport gates with zero internet connectivity.',
                ar: 'تم حفظ القسيمة بنجاح في الذاكرة غير المتصلة. متاح في المطار بدون إنترنت.',
                zh: '行程单已离线保存。在无网络环境下可在机场登机口直接出示。',
                ru: 'Ваучер сохранен офлайн. Доступен в аэропорту без подключения к интернету.',
              })}
            </span>
          </div>
        )}

        {/* Live Trip Countdown Banner */}
        <TripCountdown
          targetDate={effectiveTravelDate}
          targetTime={effectiveDepartureTime}
          locale={locale}
          variant="banner"
          className="print:hidden"
        />

        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-2xl md:text-[32px] font-black text-ink mb-2 tracking-tight">
              {title}
            </h1>
            <div className="flex items-center gap-4 flex-wrap text-sm text-sub font-bold">
              <div className="flex items-center gap-2">
                <span>
                  {lt(locale, {
                    fa: 'کد رهگیری فیروزو:',
                    en: 'Firuzo Reference:',
                    ar: 'رمز فيروزو:',
                    zh: 'Firuzo 参考号：',
                    ru: 'Номер Firuzo:',
                  })}
                </span>
                <span className="font-mono text-ink bg-soft px-2.5 py-0.5 rounded-lg border border-line">
                  #{refCode}
                </span>
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
                <span>
                  {lt(locale, {
                    fa: 'کد تایید تامین‌کننده (PNR):',
                    en: 'Supplier PNR:',
                    ar: 'رمز PNR المورد:',
                    zh: '供应商 PNR：',
                    ru: 'PNR поставщика:',
                  })}
                </span>
                <span className="font-mono text-ink bg-mint/50 text-brand-dark px-2.5 py-0.5 rounded-lg border border-brand/20">
                  {effectivePnr ||
                    lt(locale, {
                      fa: 'در انتظار تایید تامین‌کننده',
                      en: 'Pending Supplier Confirmation',
                      ar: 'قيد تأكيد المورد',
                      zh: '待供应商确认',
                      ru: 'Ожидает подтверждения',
                    })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {booking?.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={() => setCancelModal(true)}
                className="h-11 px-4 rounded-xl border border-rose-300 text-rose-600 bg-rose-50/60 hover:bg-rose-100/80 font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>
                  {lt(locale, {
                    fa: 'درخواست لغو و استرداد',
                    en: 'Cancel & Refund',
                    ar: 'إلغاء واسترداد',
                    zh: '申请退订退款',
                    ru: 'Запрос на отмену',
                  })}
                </span>
              </button>
            )}
            {booking?.invoice && (
              <Link
                href={`/invoices/${booking.invoice.id}`}
                target="_blank"
                className="h-11 px-4 rounded-xl border border-line bg-surface hover:bg-mint/40 text-brand-dark font-black text-xs transition flex items-center gap-2 shadow-xs shrink-0"
              >
                <ReceiptText size={15} />
                <span>
                  {lt(locale, {
                    fa: 'فاکتور رسمی',
                    en: 'Official Tax Invoice',
                    ar: 'الفاتورة الرسمية',
                    zh: '正规税务发票',
                    ru: 'Официальный счет',
                  })}
                </span>
              </Link>
            )}
            <Button
              onClick={() => window.print()}
              className="bg-brand hover:bg-brand-2 text-surface px-5 h-11 rounded-xl font-black shadow-sm shrink-0 flex items-center gap-2 text-xs"
            >
              <FileText size={16} />
              <span>
                {lt(locale, {
                  fa: 'چاپ واچر / PDF',
                  en: 'Print Voucher PDF',
                  ar: 'طباعة القسيمة PDF',
                  zh: '打印行程单 PDF',
                  ru: 'Печать ваучера',
                })}
              </span>
            </Button>
          </div>
        </div>

        {/* Lifecycle Timeline Stepper */}
        <div className="bg-surface rounded-2xl p-5 border border-line shadow-xs print:hidden">
          <div className="text-xs font-black text-sub mb-4">
            {lt(locale, {
              fa: 'مراحل وضعیت رزرو',
              en: 'Booking Lifecycle',
              ar: 'مراحل الحجز',
              zh: '预订生命周期',
              ru: 'Этапы бронирования',
            })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {/* Step 1: Created */}
            <div className="p-3 rounded-xl bg-mint/40 border border-brand/20 flex flex-col items-center gap-1.5">
              <CheckCircle2 size={18} className="text-brand-dark" />
              <span className="text-xs font-black text-ink">
                {lt(locale, { fa: 'ثبت سفارش', en: 'Order Placed', ar: 'تم الطلب', zh: '已下单', ru: 'Заказ создан' })}
              </span>
              <span className="text-[10px] text-sub">انجام شد</span>
            </div>

            {/* Step 2: Payment */}
            <div className="p-3 rounded-xl bg-mint/40 border border-brand/20 flex flex-col items-center gap-1.5">
              <CheckCircle2 size={18} className="text-brand-dark" />
              <span className="text-xs font-black text-ink">
                {lt(locale, { fa: 'پرداخت موفق', en: 'Payment Confirmed', ar: 'تم الدفع', zh: '支付成功', ru: 'Оплата подтверждена' })}
              </span>
              {booking?.invoice ? (
                <Link
                  href={`/invoices/${booking.invoice.id}`}
                  target="_blank"
                  className="text-[10px] text-brand-dark hover:underline font-bold"
                >
                  {lt(locale, { fa: 'مشاهده فاکتور رسمی', en: 'View Invoice', ar: 'عرض الفاتورة الرسمية', zh: '查看正式发票', ru: 'Посмотреть официальный счёт'})}
                </Link>
              ) : (
                <span className="text-[10px] text-sub">تایید شد</span>
              )}
            </div>

            {/* Step 3: Supplier Issuance */}
            <div
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${
                ['CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED'].includes(booking?.status || '')
                  ? 'bg-mint/40 border-brand/20 text-brand-dark'
                  : 'bg-soft border-line text-sub'
              }`}
            >
              {['CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED'].includes(booking?.status || '') ? (
                <CheckCircle2 size={18} className="text-brand-dark" />
              ) : (
                <Clock size={18} className="text-sub" />
              )}
              <span className="text-xs font-black text-ink">
                {lt(locale, { fa: 'صدور توسط تأمین‌کننده', en: 'Supplier Issued', ar: 'إصدار المورد', zh: '供应商出票', ru: 'Выпущено поставщиком' })}
              </span>
              <span className="text-[10px] text-sub">قطعی</span>
            </div>

            {/* Step 4: Ready / Cancelled */}
            <div
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${
                booking?.status === 'CANCELLED' || booking?.status === 'CANCEL_REQUESTED'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : booking?.status === 'CONFIRMED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-soft border-line text-sub'
              }`}
            >
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

        {/* Roamarr / TREK Notched Boarding Pass & Official Voucher */}
        <BoardingPassCard
          serviceType={firstItem?.type || 'FLIGHT'}
          reference={refCode}
          externalPnr={effectivePnr}
          status={booking?.status || 'CONFIRMED'}
          travelDate={effectiveTravelDate}
          title={title}
          airline={(detailsObj.airline as string) || 'هواپیمایی ماهان'}
          flightNo={(detailsObj.flightNo as string) || 'W5-1152'}
          origin={(detailsObj.origin as string) || 'THR'}
          originCity={(detailsObj.originCity as string) || 'تهران'}
          destination={(detailsObj.destination as string) || 'IST'}
          destinationCity={(detailsObj.destinationCity as string) || 'استانبول'}
          departureTime={effectiveDepartureTime}
          arrivalTime={(detailsObj.arrivalTime as string) || '11:45'}
          terminal={(detailsObj.terminal as string) || 'T1'}
          gate={(detailsObj.gate as string) || 'B14'}
          seat={(detailsObj.seat as string) || 'Auto'}
          cabinClass={(detailsObj.cabinClass as string) || 'Economy'}
          baggage={(detailsObj.baggage as string) || '30kg'}
          hotelName={(detailsObj.hotelName as string) || title}
          city={(detailsObj.city as string) || 'تهران'}
          nights={Number(detailsObj.nights || 1)}
          roomType={(detailsObj.roomType as string) || 'اتاق دابل لوکس'}
          checkIn={(detailsObj.checkIn as string) || '14:00'}
          checkOut={(detailsObj.checkOut as string) || '12:00'}
          passengers={passengers}
          totalAmount={totalAmt}
          currency={booking?.currency || 'IRR'}
          locale={locale}
          onSaveOffline={handleSaveOffline}
        />

        {/* Passenger Manifest and Breakdown Table */}
        <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs print:border-black">
          <h3 className="text-base sm:text-lg font-black text-ink mb-4">
            {lt(locale, {
              fa: 'مشخصات مسافران و اطلاعات شناسایی ثبت‌شده',
              en: 'Passenger Manifest & Identity Details',
              ar: 'بيانات المسافرين ووثائق الهوية المسجلة',
              zh: '旅客名单及已登记身份信息',
              ru: 'Список пассажиров и идентификационные данные',
            })}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-line text-sub font-bold">
                  <th className="py-2.5 ps-2 text-start">#</th>
                  <th className="py-2.5 px-3 text-start">
                    {lt(locale, { fa: 'نام و نام‌خانوادگی', en: 'Full Name', ar: 'الاسم الكامل', zh: '姓名', ru: 'ФИО' })}
                  </th>
                  <th className="py-2.5 px-3 text-start">
                    {lt(locale, { fa: 'کدملی / گذرنامه', en: 'National ID / Passport', ar: 'الرقم الوطني / جواز السفر', zh: '身份证 / 护照', ru: 'Паспорт / ID' })}
                  </th>
                  <th className="py-2.5 px-3 text-start">
                    {lt(locale, { fa: 'وضعیت پذیرش', en: 'Status', ar: 'الحالة', zh: '状态', ru: 'Статус' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 font-bold">
                {passengers.length > 0 ? (
                  passengers.map((p, idx) => (
                    <tr key={idx} className="hover:bg-soft/40 transition">
                      <td className="py-3 ps-2 font-mono text-sub">{idx + 1}</td>
                      <td className="py-3 px-3 text-ink">
                        {p.firstName} {p.lastName}
                      </td>
                      <td className="py-3 px-3 font-mono text-sub">
                        {p.nationalId || p.passportNo || 'Verified'}
                      </td>
                      <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>تایید هویت</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-sub">
                      اطلاعات مسافر ثبت شده به صورت مهمان
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Emergency In-Trip SOS Card (travel-management / Roamarr pattern) */}
        <EmergencySosCard
          countryName={(detailsObj.destinationCity as string) || (detailsObj.city as string) || 'کشور مقصد'}
          reference={refCode}
          locale={locale}
          className="print:hidden"
        />

        {/* Group Expense Splitting & Debt Settlement (TREK / JourniPlan pattern) */}
        <TripExpenseSplitter locale={locale} className="print:hidden" />

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
                  <p className="text-xs text-sub font-bold">
                    وجه پس از تایید جریمه طبق قوانین کنسلی به کیف پول شما مسترد می‌گردد.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-sub leading-relaxed font-bold">
                    آیا از لغو رزرو شماره <strong className="font-mono text-ink">#{refCode}</strong> اطمینان دارید؟
                    طبق قوانین کنسلی، جریمه استرداد بر اساس ساعت باقی‌مانده تا پرواز/اقامت محاسبه شده و مانده وجه در کمتر از چند دقیقه به کیف پول فیروزو شما بازمی‌گردد.
                  </p>

                  {cancelError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                      {cancelError}
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-soft border border-line text-xs font-bold space-y-1">
                    <span className="text-sub block">مقصد استرداد وجه:</span>
                    <span className="text-brand-dark font-black block">
                      کیف پول فیروزو (تسویه آنی و بدون کارمزد بانکی)
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={() => setCancelModal(false)}
                      className="flex-1 h-11 rounded-xl bg-soft hover:bg-line/60 text-sub font-bold text-xs transition"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={handleConfirmCancel}
                      className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-surface font-black text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {cancelLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        'تایید و استرداد وجه'
                      )}
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
