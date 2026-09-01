'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
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

  if (is404) {
    notFound();
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

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-24 flex items-center justify-center text-brand">
        <Loader2 className="animate-spin" size={36} />
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

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1280px] mx-auto px-4 md:px-10 py-8 gap-8">
      <AccountSidebar activeSection="trips" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-8">
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-[34px] font-black text-ink mb-2 tracking-tight">
              {title}
            </h1>
            <p className="text-[14px] font-bold text-sub">
              {lt(locale, {
                fa: 'وضعیت رزرو:',
                en: 'Status:',
                ar: 'الحالة:',
                zh: '状态：',
                ru: 'Статус:',
              })}{' '}
              <span className="text-brand-dark font-black">{booking?.status}</span> •{' '}
              {lt(locale, {
                fa: 'کد پیگیری:',
                en: 'Reference:',
                ar: 'رمز الحجز:',
                zh: '参考号：',
                ru: 'Номер брони:',
              })}{' '}
              <span className="font-mono text-ink">#{booking?.reference || booking?.id.slice(0, 8)}</span>
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            className="bg-brand hover:bg-brand-2 text-surface px-6 h-12 rounded-2xl font-black shadow-sm shrink-0 flex items-center gap-2"
          >
            <FileText size={18} />{' '}
            {lt(locale, {
              fa: 'دریافت برگه واچر / PDF',
              en: 'Download Voucher PDF',
              ar: 'تحميل قسيمة الحجز PDF',
              zh: '下载行程单 PDF',
              ru: 'Скачать ваучер PDF',
            })}
          </Button>
        </div>

        {/* Bento Grid Itinerary Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Info Section */}
          <div className="lg:col-span-8 bg-surface/95 backdrop-blur-xl shadow-elev-1 rounded-3xl p-6 border border-line/80 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-6 border-b border-line/60 pb-4 relative z-10">
              <div className="bg-brand/10 text-brand-dark p-2.5 rounded-2xl">
                <Plane size={24} />
              </div>
              <h2 className="text-xl font-black text-brand-dark">
                {lt(locale, {
                  fa: 'مشخصات سفر و جزئیات صدور',
                  en: 'Booking & Passenger Details',
                  ar: 'تفاصيل الرحلة والمسافرين',
                  zh: '预订及旅客详情',
                  ru: 'Детали бронирования и пассажиров',
                })}
              </h2>
            </div>

            <div className="flex flex-col gap-6 relative z-10">
              <div className="bg-soft/40 p-5 rounded-2xl border border-line/60 flex flex-col md:flex-row justify-between gap-4">
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
          <div className="lg:col-span-4 bg-surface/95 backdrop-blur-xl shadow-elev-1 rounded-3xl border border-line/80 overflow-hidden flex flex-col p-6 text-center">
            <h3 className="text-lg font-black text-ink mb-2">
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
              AUTH-CODE: {booking?.reference || booking?.id.toUpperCase()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
