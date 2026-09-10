'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { findBookingByReference } from '@/actions/trips';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { Search, Loader2, CheckCircle2, AlertCircle, FileText, Calendar, CreditCard } from 'lucide-react';

export function GuestTripLookup() {
  const locale = useLocale();
  const [reference, setReference] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) return;

    setLoading(true);
    setError(null);
    setBooking(null);

    try {
      const res = await findBookingByReference(reference.trim(), contact.trim());
      if (!res.success) {
        if (res.error === 'NOT_FOUND') {
          setError(
            lt(locale, {
              fa: 'رزروی با این شماره پیگیری یافت نشد. لطفاً در درج کد دقت فرمایید.',
              en: 'No booking found with this reference. Please verify the code.',
              ar: 'لم يتم العثور على حجز بهذا الرقم المرجعي.',
              zh: '未找到此订单号的预订，请核对后重试。',
              ru: 'Бронирование с таким номером не найдено.',
            })
          );
        } else if (res.error === 'CONTACT_MISMATCH') {
          setError(
            lt(locale, {
              fa: 'اطلاعات تماس با اطلاعات ثبت‌شده برای این رزرو همخوانی ندارد.',
              en: 'Contact info does not match the customer record for this booking.',
              ar: 'معلومات الاتصال لا تتطابق مع الحجز.',
              zh: '联系方式与该订单的登记信息不一致。',
              ru: 'Контактные данные не совпадают с указанными при бронировании.',
            })
          );
        } else {
          setError(
            lt(locale, {
              fa: 'خطا در جستجو. لطفاً دقایقی دیگر مجدداً تلاش کنید.',
              en: 'Search error. Please try again in a few moments.',
              ar: 'خطأ في البحث. يُرجى المحاولة لاحقاً.',
              zh: '查询出错，请稍后重试。',
              ru: 'Ошибка поиска. Пожалуйста, повторите попытку.',
            })
          );
        }
      } else {
        setBooking(res.booking);
      }
    } catch {
      setError(
        lt(locale, {
          fa: 'خطای غیرمنتظره در ارتباط با سرور.',
          en: 'Unexpected communication error.',
          ar: 'خطأ غير متوقع في الاتصال.',
          zh: '网络连接异常。',
          ru: 'Непредвиденная ошибка связи.',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-6 p-6 rounded-2xl bg-surface border border-line shadow-xs text-start">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand-dark grid place-items-center">
          <Search size={16} />
        </div>
        <div>
          <h3 className="text-sm font-black text-ink m-0">
            {lt(locale, {
              fa: 'پیگیری سریع رزرو (بدون نیاز به ورود)',
              en: 'Quick Booking Lookup (Guest Mode)',
              ar: 'استعلام سريع عن الحجز',
              zh: '快速订单查询（免登录）',
              ru: 'Быстрый поиск бронирования',
            })}
          </h3>
          <p className="text-[11.5px] font-bold text-sub m-0">
            {lt(locale, {
              fa: 'با شماره پیگیری رزرو (ITR-XXXXXX) و شماره تماس/ایمیل وضعیت بلیت را بررسی کنید',
              en: 'Enter your booking reference (ITR-XXXXXX) and phone/email to check status',
              ar: 'أدخل الرقم المرجعي للحجز وهاتفك أو بريدك الإلكتروني',
              zh: '输入预订订单号及预留手机/邮箱查询',
              ru: 'Введите номер брони и телефон/email для проверки',
            })}
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-black text-ink mb-1">
              {lt(locale, { fa: 'شماره پیگیری رزرو', en: 'Booking Reference', ar: 'الرقم المرجعي', zh: '订单号', ru: 'Номер бронирования' })}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. ITR-A1B2C3"
              required
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-line bg-surface focus:border-brand focus:outline-none transition uppercase"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-ink mb-1">
              {lt(locale, { fa: 'شماره موبایل یا ایمیل', en: 'Phone or Email', ar: 'الهاتف أو البريد', zh: '手机号或邮箱', ru: 'Телефон или Email' })}
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. 0912... or user@example.com"
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-line bg-surface focus:border-brand focus:outline-none transition"
              dir="ltr"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !reference.trim()}
          className="w-full h-10 rounded-xl bg-brand hover:bg-brand-dark text-surface font-black text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>{lt(locale, { fa: 'در حال جستجو...', en: 'Searching...', ar: 'جاري البحث...', zh: '查询中...', ru: 'Поиск...' })}</span>
            </>
          ) : (
            <>
              <Search size={14} />
              <span>{lt(locale, { fa: 'پیگیری رزرو', en: 'Find Booking', ar: 'بحث عن الحجز', zh: '查询预订', ru: 'Найти бронирование' })}</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3.5 p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {booking && (
        <div className="mt-4 p-4 rounded-xl bg-soft/50 border border-line space-y-3">
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <div>
              <span className="text-[11px] font-bold text-sub block">
                {lt(locale, { fa: 'شناسه مرجع', en: 'Reference', ar: 'المرجع', zh: '订单号', ru: 'Номер' })}
              </span>
              <strong className="text-sm font-black text-ink font-mono" dir="ltr">
                {booking.reference}
              </strong>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                booking.status === 'CONFIRMED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : booking.status === 'PENDING_PAYMENT'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
              }`}
            >
              {booking.status === 'CONFIRMED'
                ? lt(locale, { fa: 'تایید شده', en: 'Confirmed', ar: 'مؤكد', zh: '已确认', ru: 'Подтверждено' })
                : booking.status === 'PENDING_PAYMENT'
                  ? lt(locale, { fa: 'در انتظار پرداخت', en: 'Pending Payment', ar: 'قيد الدفع', zh: '待付款', ru: 'Ожидает оплаты' })
                  : booking.status}
            </span>
          </div>

          <div className="space-y-2">
            {booking.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-line/30 last:border-0">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-brand-dark shrink-0" />
                  <span className="font-bold text-ink">{item.title}</span>
                </div>
                <span className="font-black text-ink num">
                  {num(item.unitPrice, locale)} {booking.currency === 'IRR' ? lt(locale, { fa: 'ریال', en: 'IRR', ar: 'ريال', zh: '里亚尔', ru: 'риал' }) : booking.currency}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-sub font-bold">
              {lt(locale, { fa: 'وضعیت پرداخت:', en: 'Payment Status:', ar: 'حالة الدفع:', zh: '支付状态：', ru: 'Статус оплаты:' })}
            </span>
            <span className="font-black text-ink">
              {booking.paymentStatus === 'CAPTURED'
                ? lt(locale, { fa: 'پرداخت شده', en: 'Paid / Captured', ar: 'تم الدفع', zh: '已支付', ru: 'Оплачено' })
                : booking.paymentStatus}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
