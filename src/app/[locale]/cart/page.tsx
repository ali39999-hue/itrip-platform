'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { lt } from '@/lib/lt';
import type { ServiceType } from '@/lib/types';
import {
  ShoppingCart,
  Trash2,
  Plane,
  BedDouble,
  Compass,
  CarTaxiFront,
  Crown,
  ShieldCheck,
  Wifi,
  CreditCard,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Calendar,
} from 'lucide-react';

const ITEM_ICONS: Record<string, React.ElementType> = {
  FLIGHT: Plane,
  HOTEL: BedDouble,
  TOUR: Compass,
  TRANSFER: CarTaxiFront,
  CIP: Crown,
  INSURANCE: ShieldCheck,
  ESIM: Wifi,
  VISA: CreditCard,
};

export default function CartPage() {
  const locale = useLocale();
  const router = useRouter();
  const isRtl = ['fa', 'ar'].includes(locale);

  const cart = useBookingStore((s) => s.cart);
  const removeFromCart = useBookingStore((s) => s.removeFromCart);
  const clearCart = useBookingStore((s) => s.clearCart);
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // Calculations
  const hasFlight = cart.some((i) => i.type.toUpperCase() === 'FLIGHT');
  const hasHotel = cart.some((i) => i.type.toUpperCase() === 'HOTEL');
  const hasCombo = hasFlight && hasHotel;

  let grossAmount = 0;
  cart.forEach((item) => {
    const mult = item.type.toUpperCase() === 'HOTEL' ? (item.nights || 1) : 1;
    grossAmount += item.unitPrice * item.count * mult;
  });

  const comboDiscount = hasCombo ? Math.round(grossAmount * 0.05) : 0;
  const finalAmount = Math.max(0, grossAmount - comboDiscount);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(isRtl ? 'fa-IR' : 'en-US').format(Math.round(amount / 10)); // in Toman
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;

    // Set lead item as booking context for single-service flows
    const lead = cart[0];
    const serviceType = lead.type.toLowerCase() as ServiceType;
    setBookingContext({
      type: serviceType,
      title: lead.title,
      subtitle: lead.subtitle || '',
      amount: finalAmount,
      currency: 'IRR',
      travelDate: lead.travelDate,
      adults: lead.count,
    });

    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 md:pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ─── Breadcrumb & Top Bar ──────────────────────────────────── */}
      <div className="bg-white border-b border-border/80 px-4 md:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-sub">
            <Link href="/" className="hover:text-brand transition-colors">
              {lt(locale, { fa: 'صفحه اصلی', en: 'Home', ar: 'الرئيسية', zh: '首页', ru: 'Главная' })}
            </Link>
            <span>/</span>
            <span className="text-ink font-bold">
              {lt(locale, { fa: 'سبد خرید یکپارچه', en: 'Unified Shopping Cart', ar: 'سلة المشتريات', zh: '统一购物车', ru: 'Корзина' })}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 transition-colors min-h-[44px] min-w-[44px] touch-target"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lt(locale, { fa: 'پاکسازی سبد', en: 'Clear Cart', ar: 'إفراغ السلة', zh: '清空购物车', ru: 'Очистить' })}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6">
        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-border/80 shadow-sm text-center space-y-4 max-w-lg mx-auto mt-8">
            <div className="w-20 h-20 rounded-full bg-brand-light/15 text-brand flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="w-10 h-10 text-brand" />
            </div>
            <h2 className="text-xl font-extrabold text-ink">
              {lt(locale, { fa: 'سبد خرید شما خالی است', en: 'Your cart is empty', ar: 'سلة المشتريات فارغة', zh: '您的购物车是空的', ru: 'Ваша корзина пуста' })}
            </h2>
            <p className="text-xs md:text-sm text-sub leading-relaxed">
              {lt(locale, {
                fa: 'هیچ پرواز، هتل، تور، تشریفات یا بیمه‌ای به سبد افزوده نشده است. از خدمات سفر ما دیدن کنید:',
                en: 'You have not added any flights, hotels, tours, or services yet. Explore our travel offerings:',
                ar: 'لم تقم بإضافة أي خدمات بعد. استكشف خدمات السفر:',
                zh: '您尚未添加任何机票、酒店或旅行服务。欢迎浏览：',
                ru: 'Вы еще не добавили билеты или отели. Ознакомьтесь с услугами:',
              })}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
              <Link
                href="/flights/search"
                className="p-3 rounded-2xl border border-border hover:border-brand/40 bg-surface-subtle hover:bg-surface text-center transition-all flex flex-col items-center gap-1.5 min-h-[44px]"
              >
                <Plane className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold text-ink">{lt(locale, { fa: 'پروازها', en: 'Flights', ar: 'الطيران', zh: '机票', ru: 'Рейсы' })}</span>
              </Link>
              <Link
                href="/hotels/search"
                className="p-3 rounded-2xl border border-border hover:border-brand/40 bg-surface-subtle hover:bg-surface text-center transition-all flex flex-col items-center gap-1.5 min-h-[44px]"
              >
                <BedDouble className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-bold text-ink">{lt(locale, { fa: 'هتل‌ها', en: 'Hotels', ar: 'الفنادق', zh: '酒店', ru: 'Отели' })}</span>
              </Link>
              <Link
                href="/cip"
                className="p-3 rounded-2xl border border-border hover:border-brand/40 bg-surface-subtle hover:bg-surface text-center transition-all flex flex-col items-center gap-1.5 min-h-[44px]"
              >
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold text-ink">{lt(locale, { fa: 'تشریفات CIP', en: 'CIP Lounge', ar: 'تشريفات CIP', zh: 'CIP贵宾', ru: 'CIP залы' })}</span>
              </Link>
              <Link
                href="/insurance"
                className="p-3 rounded-2xl border border-border hover:border-brand/40 bg-surface-subtle hover:bg-surface text-center transition-all flex flex-col items-center gap-1.5 min-h-[44px]"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-ink">{lt(locale, { fa: 'بیمه مسافرتی', en: 'Insurance', ar: 'تأمين', zh: '旅行保险', ru: 'Страховка' })}</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Active Cart Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Item Lines */}
            <div className="lg:col-span-2 space-y-3.5">
              {hasCombo && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      {lt(locale, {
                        fa: 'تخفیف پکیج طلایی: ۵٪ تخفیف ترکیب پرواز و هتل روی فاکتور شما اعمال شد!',
                        en: 'Golden Combo Bonus: 5% package discount applied to flight + hotel!',
                        ar: 'خصم الباقة الذهبية: ٥٪ خصم حزمة الطيران والفندق معاً!',
                        zh: '机酒特惠礼遇：已为您立减 5% 套餐优惠！',
                        ru: 'Скидка на пакет 5% на перелет + отель активирована!',
                      })}
                    </span>
                  </div>
                  <span className="text-xs font-black font-price bg-white/20 px-2 py-0.5 rounded-md">
                    -۵٪
                  </span>
                </div>
              )}

              {cart.map((item) => {
                const Icon = ITEM_ICONS[item.type.toUpperCase()] || ShoppingCart;
                const mult = item.type.toUpperCase() === 'HOTEL' ? (item.nights || 1) : 1;
                const itemTotal = item.unitPrice * item.count * mult;

                return (
                  <div
                    key={item.id}
                    className="p-4 md:p-5 rounded-2xl bg-white border border-border/80 shadow-xs flex items-start justify-between gap-4 hover:border-brand/40 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-brand-light/15 text-brand flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="font-extrabold text-sm text-ink">{item.title}</div>
                        {item.subtitle && <div className="text-xs text-sub leading-relaxed">{item.subtitle}</div>}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted pt-1">
                          {item.travelDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-brand" />
                              <span>{item.travelDate}</span>
                            </span>
                          )}
                          <span>
                            {item.count}{' '}
                            {item.type.toUpperCase() === 'HOTEL'
                              ? `${item.nights || 1} ${lt(locale, { fa: 'شب', en: 'nights', ar: 'ليلات', zh: '晚', ru: 'ночей' })}`
                              : lt(locale, { fa: 'مسافر / پکیج', en: 'traveler / package', ar: 'مسافر / باقة', zh: '乘客 / 套餐', ru: 'пасс. / пакет' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] touch-target"
                        aria-label={lt(locale, {
                          fa: `حذف ${item.title} از سبد خرید`,
                          en: `Remove ${item.title} from cart`,
                          ar: `إزالة ${item.title} من السلة`,
                          zh: `从购物车移除${item.title}`,
                          ru: `Убрать «${item.title}» из корзины`,
                        })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="text-end font-price font-extrabold text-sm md:text-base text-ink">
                        {formatPrice(itemTotal)} <span className="text-xs font-normal text-muted">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 1 Col: Summary & Proceed */}
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-5 md:p-6 border border-border/80 shadow-sm sticky top-20 space-y-4">
                <h3 className="font-extrabold text-base text-ink border-b border-border/80 pb-3">
                  {lt(locale, { fa: 'خلاصه صورت‌حساب', en: 'Order Summary', ar: 'ملخص الفاتورة', zh: '订单费用明细', ru: 'Итого к оплате' })}
                </h3>

                <div className="space-y-2.5 text-xs text-sub">
                  <div className="flex items-center justify-between">
                    <span>{lt(locale, { fa: 'مجموع اقلام سبد خرید', en: 'Cart Items Subtotal', ar: 'مجموع البنود', zh: '商品总计', ru: 'Сумма' })}:</span>
                    <span className="font-bold text-ink font-price">
                      {formatPrice(grossAmount)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}
                    </span>
                  </div>

                  {comboDiscount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 font-bold">
                      <span>{lt(locale, { fa: 'تخفیف پکیج پرواز و هتل (۵٪)', en: 'Package Combo Discount (5%)', ar: 'خصم الباقة (٥٪)', zh: '机酒立减 (5%)', ru: 'Скидка на пакет (5%)' })}:</span>
                      <span className="font-price">
                        -{formatPrice(comboDiscount)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-border/80 pt-3 mt-3 flex items-center justify-between text-sm font-extrabold text-ink">
                    <span>{lt(locale, { fa: 'مبلغ کل نهایی', en: 'Total Payable', ar: 'المجموع الإجمالي', zh: '应付总额', ru: 'Итого' })}:</span>
                    <span className="text-lg text-brand-dark font-price font-black">
                      {formatPrice(finalAmount)} <span className="text-xs font-normal text-muted">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleProceedToCheckout}
                  className="w-full h-12 rounded-xl bg-[#F0A62A] hover:bg-[#DC9018] text-[#3D2504] font-bold text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 touch-target"
                >
                  <span>{lt(locale, { fa: 'ادامه و ثبت مشخصات مسافران', en: 'Proceed to Checkout', ar: 'متابعة وإدخال المسافرين', zh: '前往填写旅客信息', ru: 'Перейти к оформлению' })}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Mobile Sticky Bottom Bar (when cart has items) ─────────── */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border z-40 shadow-elev-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-muted">
                {lt(locale, { fa: 'مبلغ نهایی سبد', en: 'Cart Total', ar: 'المجموع', zh: '总额', ru: 'Итого' })}
              </div>
              <div className="text-base font-extrabold text-brand-dark font-price">
                {formatPrice(finalAmount)} <span className="text-xs font-normal text-muted">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Тоمان' })}</span>
              </div>
            </div>

            <button
              onClick={handleProceedToCheckout}
              className="flex-1 h-12 rounded-xl bg-[#F0A62A] hover:bg-[#DC9018] text-[#3D2504] font-bold text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 touch-target"
            >
              <span>{lt(locale, { fa: 'ادامه خرید', en: 'Checkout', ar: 'متابعة', zh: '去结算', ru: 'Оформить' })}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
