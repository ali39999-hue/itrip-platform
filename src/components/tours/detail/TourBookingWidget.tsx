'use client';

import { useState, useMemo } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import type { Tour } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  Calendar,
  Plus,
  Minus,
  ShieldCheck,
  Zap,
  Lock,
  ArrowLeft,
  ArrowRight,
  X,
  SlidersHorizontal,
  Bot,
} from 'lucide-react';
import { CreateAutoBuyModal } from '@/components/autobuy/CreateAutoBuyModal';

interface TourBookingWidgetProps {
  tour: Tour;
  selectedDateId: string;
  onSelectDateId: (id: string) => void;
}

export function TourBookingWidget({
  tour,
  selectedDateId,
  onSelectDateId,
}: TourBookingWidgetProps) {
  const router = useRouter();
  const locale = useLocale();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  const dates = tour.departureDates || [];
  const activeDate = dates.find((d) => d.id === selectedDateId) || dates[0];

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const [autoBuyOpen, setAutoBuyOpen] = useState(false);

  const adultPrice = activeDate ? activeDate.price : tour.price;
  const childPrice = activeDate?.childPrice || tour.childPrice || Math.round(tour.price * 0.7);

  const totalPrice = useMemo(() => {
    return adults * adultPrice + children * childPrice;
  }, [adults, children, adultPrice, childPrice]);

  function handleBook() {
    const tourTitle = locale === 'fa' ? tour.title : (tour.titleEn || tour.title);
    const passengerSummary = `${num(adults, locale)} ${lt(locale, { fa: 'بزرگسال', en: 'adults', ar: 'بالغ', zh: '成人', ru: 'взрослых' })}${children > 0 ? ` + ${num(children, locale)} ${lt(locale, { fa: 'کودک', en: 'children', ar: 'أطفال', zh: '儿童', ru: 'детей' })}` : ''}`;

    setBookingContext({
      type: 'tours',
      id: tour.id,
      title: tourTitle,
      subtitle: `${tour.durationDays} ${lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })} • ${tour.city} • ${passengerSummary}`,
      amount: totalPrice,
      travelDate: activeDate?.startDate || new Date().toISOString().slice(0, 10),
      meta: {
        adults: String(adults),
        children: String(children),
        departureDate: activeDate?.startDate || '',
        returnDate: activeDate?.endDate || '',
        city: tour.city,
      },
    });

    router.push('/checkout');
  }

  const maxAvailable = activeDate ? activeDate.availableSeats : 0;
  const isSoldOut = activeDate ? (activeDate.availableSeats <= 0) : false;

  return (
    <>
      {/* Desktop Sticky Booking Card */}
      <aside className="hidden lg:flex flex-col border border-line rounded-3xl bg-surface shadow-elev-2 overflow-hidden gap-4 p-5 sm:p-6">
        {/* Price Header */}
        <div className="pb-4 border-b border-line bg-gradient-to-b from-mint/20 to-transparent -mx-5 -mt-5 p-5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-extrabold text-sub">
              {lt(locale, { fa: 'قیمت هر نفر از:', en: 'Price per person from:', ar: 'السعر للشخص يبدأ من:', zh: '起步参考价（每人）：', ru: 'Цена за человека от:' })}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-brand-dark bg-mint border border-brand/20 px-2 py-0.5 rounded-full">
              <Zap size={11} /> {lt(locale, { fa: 'نرخ رسمی و مصوب', en: 'Official Direct Rate', ar: 'سعر رسمي معتمد', zh: '官方认证价格', ru: 'Официальный тариф' })}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <b className="text-2xl sm:text-3xl font-black text-price font-mono num">
              {num(adultPrice, locale)}
            </b>
            <span className="text-xs font-bold text-sub">
              {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
            </span>
          </div>
        </div>

        {/* Departure Date Selector */}
        {dates.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-black text-ink flex items-center gap-1.5">
              <Calendar size={14} className="text-brand-dark" />
              <span>{lt(locale, { fa: 'انتخاب تاریخ رفت و برگشت:', en: 'Select Departure Date:', ar: 'اختر تاريخ المغادرة:', zh: '选择出行班期：', ru: 'Выберите дату отправления:' })}</span>
            </label>
            <select
              value={selectedDateId}
              onChange={(e) => onSelectDateId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-soft border border-line text-xs font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer shadow-xs"
            >
              {dates.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.startDate} {lt(locale, { fa: 'تا', en: 'to', ar: 'إلى', zh: '至', ru: 'до' })} {d.endDate} — {num(d.price, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })} ({num(d.availableSeats, locale)} {lt(locale, { fa: 'صندلی', en: 'seats', ar: 'مقاعد', zh: '余位', ru: 'мест' })})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Passenger Counters */}
        <div className="p-3.5 rounded-2xl bg-soft border border-line/80 space-y-3">
          {/* Adults */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-ink block">
                {lt(locale, { fa: 'بزرگسال (۱۲ سال به بالا)', en: 'Adults (12+ years)', ar: 'البالغين (١٢+ سنة)', zh: '成人（12岁及以上）', ru: 'Взрослые (12+)' })}
              </span>
              <span className="text-[11px] font-bold text-sub">
                {num(adultPrice, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={adults <= 1}
                onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                className="w-8 h-8 rounded-lg bg-surface border border-line text-ink grid place-items-center hover:bg-soft transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-mono font-black text-sm text-ink">
                {num(adults, locale)}
              </span>
              <button
                type="button"
                disabled={isSoldOut || (adults + children) >= maxAvailable}
                onClick={() => setAdults((prev) => prev + 1)}
                className="w-8 h-8 rounded-lg bg-surface border border-line text-ink grid place-items-center hover:bg-soft transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Children */}
          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-line/60">
            <div>
              <span className="text-xs font-black text-ink block">
                {lt(locale, { fa: 'کودک (۲ تا ۱۱ سال)', en: 'Children (2-11 years)', ar: 'الأطفال (٢-١١ سنة)', zh: '儿童（2-11岁）', ru: 'Дети (2-11 лет)' })}
              </span>
              <span className="text-[11px] font-bold text-sub">
                {num(childPrice, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={children <= 0}
                onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                className="w-8 h-8 rounded-lg bg-surface border border-line text-ink grid place-items-center hover:bg-soft transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-mono font-black text-sm text-ink">
                {num(children, locale)}
              </span>
              <button
                type="button"
                disabled={isSoldOut || (adults + children) >= maxAvailable}
                onClick={() => setChildren((prev) => prev + 1)}
                className="w-8 h-8 rounded-lg bg-surface border border-line text-ink grid place-items-center hover:bg-soft transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 pt-2 border-t border-line text-xs font-bold">
          <div className="flex justify-between text-sub">
            <span>{num(adults, locale)} × {lt(locale, { fa: 'بزرگسال', en: 'Adult', ar: 'بالغ', zh: '成人', ru: 'взрослый' })}:</span>
            <span className="font-mono text-ink">{num(adults * adultPrice, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
          </div>
          {children > 0 && (
            <div className="flex justify-between text-sub">
              <span>{num(children, locale)} × {lt(locale, { fa: 'کودک', en: 'Child', ar: 'طفل', zh: '儿童', ru: 'ребёнок' })}:</span>
              <span className="font-mono text-ink">{num(children * childPrice, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
            </div>
          )}
          <div className="flex justify-between text-sub">
            <span>{lt(locale, { fa: 'بیمه مسافرتی و خدمات:', en: 'Insurance & Service:', ar: 'التأمين والخدمات:', zh: '旅行险与服务：', ru: 'Страховка и сервис:' })}</span>
            <span className="text-brand-dark font-black">{lt(locale, { fa: 'رایگان (پکیج)', en: 'Included (Free)', ar: 'مشمول مجاناً', zh: '已包含', ru: 'Включено' })}</span>
          </div>

          <div className="flex justify-between items-baseline pt-2.5 border-t border-line text-sm font-black text-ink">
            <span>{lt(locale, { fa: 'مبلغ قابل پرداخت:', en: 'Total Amount:', ar: 'المجموع الكلي:', zh: '应付总金额：', ru: 'Итого к оплате:' })}</span>
            <div className="text-end">
              <span className="text-xl font-black text-price font-mono">
                {num(totalPrice, locale)}
              </span>
              <span className="text-xs font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={isSoldOut}
          onClick={handleBook}
          className={`w-full h-12 rounded-2xl ${isSoldOut ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-action hover:bg-action-hover text-ink cursor-pointer'} font-black text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-action/25 mt-1`}
        >
          <span>{isSoldOut ? lt(locale, { fa: 'تکمیل ظرفیت این تاریخ', en: 'Sold Out for Selected Date', ar: 'المقاعد مكتملة لهذا التاريخ', zh: '该班期已满员', ru: 'Места распроданы' }) : lt(locale, { fa: 'رزرو تور و ادامه پرداخت', en: 'Book Tour & Proceed to Pay', ar: 'حجز الجولة ومتابعة الدفع', zh: '立即预订并结算', ru: 'Забронировать тур' })}</span>
          {!isSoldOut && (
            <>
              <ArrowRight size={16} className="ltr:inline rtl:hidden" />
              <ArrowLeft size={16} className="rtl:inline ltr:hidden" />
            </>
          )}
        </button>

        {/* Auto-Buy Bot Button */}
        <button
          type="button"
          onClick={() => setAutoBuyOpen(true)}
          className="w-full h-11 rounded-2xl border border-brand/30 bg-mint/40 hover:bg-mint text-brand-dark font-black text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
        >
          <Bot size={16} />
          <span>{lt(locale, { fa: 'تنظیم خرید خودکار این تور (ربات هوشمند)', en: 'Set Up Auto-Buy Bot for This Tour', ar: 'الشراء التلقائي لهذه الجولة', zh: '为本线路开启自动订票', ru: 'Автопокупка этого тура (бот)' })}</span>
        </button>

        {/* Security / Trust guarantees */}
        <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-bold text-sub">
          <div className="flex items-center gap-1.5">
            <Lock size={13} className="text-brand-dark shrink-0" />
            <span>{lt(locale, { fa: 'پرداخت امن Saga', en: 'Secure Saga Escrow', ar: 'دفع آمن ومحمي', zh: 'Saga 资金安全托管', ru: 'Безопасная оплата' })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-brand-dark shrink-0" />
            <span>{lt(locale, { fa: 'استرداد آنی وجه', en: 'Instant Refund', ar: 'استرداد فوري', zh: '急速退款至钱包', ru: 'Быстрый возврат' })}</span>
          </div>
        </div>
      </aside>

      {/* Mobile Sticky Reservation Bottom Bar (docks at bottom-0 on detail view) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-[86] bg-surface/98 backdrop-blur-xl border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
        {/* Price & Quick Config Button */}
        <button
          type="button"
          onClick={() => setMobileConfigOpen(true)}
          className="text-start flex flex-col min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-1 text-[10.5px] font-extrabold text-sub">
            <span className="truncate">
              {num(adults + children, locale)} {lt(locale, { fa: 'نفر', en: 'travelers', ar: 'أشخاص', zh: '人', ru: 'чел.' })}
            </span>
            <span>•</span>
            <span className="truncate font-mono">{activeDate?.startDate ? activeDate.startDate.slice(5) : ''}</span>
            <SlidersHorizontal size={11} className="text-brand-dark ms-0.5" />
          </div>
          <div className="text-base font-black text-price font-mono flex items-baseline gap-1">
            <span>{num(totalPrice, locale)}</span>
            <span className="text-[10px] font-bold text-sub">
              {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
            </span>
          </div>
        </button>

        {/* Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAutoBuyOpen(true)}
            className="h-10 px-2.5 rounded-xl border border-brand/30 bg-mint text-brand-dark flex items-center justify-center gap-1 text-xs font-black cursor-pointer shadow-xs"
            title={lt(locale, { fa: 'ربات خرید خودکار', en: 'Auto-Buy', ar: 'شراء تلقائي', zh: '自动订票', ru: 'Автопокупка' })}
          >
            <Bot size={15} />
            <span className="hidden sm:inline">{lt(locale, { fa: 'ربات خرید', en: 'Auto-Buy', ar: 'روبوت', zh: '自动', ru: 'Бот' })}</span>
          </button>

          <button
            type="button"
            disabled={isSoldOut}
            onClick={handleBook}
            className={`h-10 px-4 sm:px-5 rounded-xl ${isSoldOut ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-action hover:bg-action-hover text-ink cursor-pointer'} font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-action/25 shrink-0`}
          >
            <span>{isSoldOut ? lt(locale, { fa: 'تکمیل ظرفیت', en: 'Sold Out', ar: 'مكتمل', zh: '已满', ru: 'Мест нет' }) : lt(locale, { fa: 'رزرو و پرداخت', en: 'Book & Pay', ar: 'حجز ودفع', zh: '立即预订', ru: 'Оплатить' })}</span>
            {!isSoldOut && (
              <>
                <ArrowRight size={13} className="ltr:inline rtl:hidden" />
                <ArrowLeft size={13} className="rtl:inline ltr:hidden" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Passenger & Date Selector Modal Sheet */}
      {mobileConfigOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lt(locale, { fa: 'تنظیم تاریخ و تعداد مسافران', en: 'Customize Date & Passengers', ar: 'تحديد الموعد والمسافرين', zh: '选择出行班期与人数', ru: 'Настройка даты и участников' })}
          className="lg:hidden fixed inset-0 z-[200] bg-ink/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-5 border border-line shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-black text-sm text-ink">
                {lt(locale, { fa: 'تنظیم تاریخ و تعداد مسافران', en: 'Customize Date & Passengers', ar: 'تحديد الموعد والمسافرين', zh: '选择出行班期与人数', ru: 'Настройка даты и участников' })}
              </h3>
              <button
                type="button"
                onClick={() => setMobileConfigOpen(false)}
                aria-label={lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
                className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Date Selection */}
            {dates.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-black text-ink block">
                  {lt(locale, { fa: 'تاریخ حرکت:', en: 'Departure date:', ar: 'تاريخ الرحلة:', zh: '发团日期：', ru: 'Дата выезда:' })}
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {dates.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => onSelectDateId(d.id)}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition ${
                        selectedDateId === d.id ? 'bg-mint/30 border-brand text-brand-dark' : 'bg-soft border-line text-ink'
                      }`}
                    >
                      <span className="font-mono">{d.startDate} تا {d.endDate}</span>
                      <span className="font-mono text-price">{num(d.price, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Passenger counters in mobile modal */}
            <div className="space-y-3 pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-ink block">
                    {lt(locale, { fa: 'بزرگسال', en: 'Adult', ar: 'بالغ', zh: '成人', ru: 'Взрослый' })}
                  </span>
                  <span className="text-[11px] font-bold text-sub">
                    {num(adultPrice, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={adults <= 1}
                    onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-mono font-black text-sm">{num(adults, locale)}</span>
                  <button
                    type="button"
                    disabled={isSoldOut || (adults + children) >= maxAvailable}
                    onClick={() => setAdults((prev) => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-line/60">
                <div>
                  <span className="text-xs font-black text-ink block">
                    {lt(locale, { fa: 'کودک (۲ تا ۱۱ سال)', en: 'Children (2-11 years)', ar: 'الأطفال (٢-١١ سنة)', zh: '儿童（2-11岁）', ru: 'Дети (2-11 лет)' })}
                  </span>
                  <span className="text-[11px] font-bold text-sub">
                    {num(childPrice, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={children <= 0}
                    onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-mono font-black text-sm">{num(children, locale)}</span>
                  <button
                    type="button"
                    disabled={isSoldOut || (adults + children) >= maxAvailable}
                    onClick={() => setChildren((prev) => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Total and confirm button */}
            <div className="pt-3 border-t border-line flex items-center justify-between gap-3">
              <div>
                <span className="text-[10.5px] font-bold text-sub block">
                  {lt(locale, { fa: 'جمع کل:', en: 'Total:', ar: 'المجموع:', zh: '总计：', ru: 'Всего:' })}
                </span>
                <span className="text-base font-black text-price font-mono">
                  {num(totalPrice, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileConfigOpen(false)}
                className="h-10 px-5 rounded-xl bg-brand hover:bg-brand-dark text-surface font-black text-xs cursor-pointer shadow-sm transition active:scale-95"
              >
                {lt(locale, { fa: 'تایید و بستن', en: 'Confirm & Close', ar: 'تأكيد وإغلاق', zh: '确认并关闭', ru: 'Подтвердить' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Buy Modal */}
      <CreateAutoBuyModal
        isOpen={autoBuyOpen}
        onClose={() => setAutoBuyOpen(false)}
        prefill={{
          serviceType: 'TOURS',
          targetId: tour.id,
          title: tour.title,
          destination: tour.city,
          targetDate: activeDate?.startDate,
          maxPrice: totalPrice,
        }}
      />
    </>
  );
}
