'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import {
  ShoppingCart,
  X,
  Trash2,
  Plane,
  BedDouble,
  Compass,
  CarTaxiFront,
  Wifi,
  ShieldCheck,
  Sparkles,
  Lock,
  ArrowLeft,
  ArrowRight,
  Clock,
  Building2,
} from 'lucide-react';

interface UnifiedCartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const ITEM_ICONS: Record<string, React.ElementType> = {
  FLIGHT: Plane,
  HOTEL: BedDouble,
  TOUR: Compass,
  TRANSFER: CarTaxiFront,
  ESIM: Wifi,
  INSURANCE: ShieldCheck,
};

export function UnifiedCartDrawer({ open, onClose }: UnifiedCartDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const isRtl = ['fa', 'ar'].includes(locale);

  const cart = useBookingStore((s) => s.cart);
  const removeFromCart = useBookingStore((s) => s.removeFromCart);
  const clearCart = useBookingStore((s) => s.clearCart);
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Esc key and backdrop body scroll lock
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  if (!mounted || typeof document === 'undefined') return null;

  // Cart calculations
  let grossAmount = 0;
  const hasFlight = cart.some((i) => i.type.toUpperCase() === 'FLIGHT');
  const hasHotel = cart.some((i) => i.type.toUpperCase() === 'HOTEL');
  const hasCombo = hasFlight && hasHotel;

  cart.forEach((item) => {
    const multiplier = item.type.toUpperCase() === 'HOTEL' ? (item.nights || 1) : 1;
    grossAmount += item.unitPrice * item.count * multiplier;
  });

  const bundleDiscountPercent = hasCombo ? 0.05 : 0;
  const bundleDiscountAmount = Math.round(grossAmount * bundleDiscountPercent);
  const netAmount = grossAmount - bundleDiscountAmount;
  const currency = cart[0]?.currency || 'IRR';

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;

    // Synthesize unified booking context for checkout
    const primaryItem = cart[0]!;
    const itemTitles = cart.map((i) => i.title).join(' + ');

    setBookingContext({
      id: `cart_${Date.now().toString(36)}`,
      type: (() => {
        const t = primaryItem.type.toLowerCase();
        if (t === 'flight') return 'flights' as const;
        if (t === 'hotel') return 'hotels' as const;
        if (t === 'tour') return 'tours' as const;
        if (t === 'transfer') return 'transfers' as const;
        if (t === 'visa') return 'visa' as const;
        if (t === 'esim') return 'esim' as const;
        if (t === 'insurance') return 'insurance' as const;
        return 'tours' as const;
      })(),
      title: cart.length === 1 ? primaryItem.title : `${lt(locale, { fa: 'پکیج ترکیبی:', en: 'Combo Package:', ar: 'حزمة مجمعة:', zh: '组合套票：', ru: 'Пакет:' })} ${itemTitles.length > 60 ? itemTitles.slice(0, 60) + '...' : itemTitles}`,
      subtitle: `${num(cart.length, locale)} ${lt(locale, { fa: 'آیتم در سبد خرید', en: 'items in cart', ar: 'عناصر في السلة', zh: '件商品', ru: 'товаров' })}`,
      amount: netAmount,
      currency: currency as 'IRR' | 'TOMAN' | 'USDT' | 'AED' | 'USD' | 'CNY',
      travelDate: primaryItem.travelDate,
      adults: primaryItem.count,
      children: 0,
      meta: {
        isUnifiedCart: 'true',
        itemCount: String(cart.length),
        bundleDiscount: String(bundleDiscountAmount),
      },
    });

    onClose();
    router.push('/checkout');
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className="fixed inset-0 z-[160] flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Drawer Surface: Bottom Sheet on Mobile (<768px), Slide-Over on Desktop (>=768px) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md bg-surface border-t md:border-t-0 md:border-s border-line shadow-2xl flex flex-col h-full max-h-[92vh] md:max-h-full rounded-t-3xl md:rounded-none mt-auto md:mt-0 transition-transform overflow-hidden"
      >
        {/* Mobile Drag Indicator */}
        <div className="md:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-soft/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand-dark flex items-center justify-center shrink-0">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 id="cart-drawer-title" className="text-sm sm:text-base font-black text-ink m-0">
                {lt(locale, {
                  fa: 'سبد رزرو هوشمند یکپارچه',
                  en: 'Unified Smart Travel Cart',
                  ar: 'سلة الحجز الذكية الموحدة',
                  zh: '智能一站式预订购物车',
                  ru: 'Единая корзина бронирования',
                })}
              </h2>
              <span className="text-[11px] text-sub font-bold block">
                {num(cart.length, locale)}{' '}
                {lt(locale, {
                  fa: 'خدمت منتخب آماده تسویه‌حساب',
                  en: 'selected services ready for checkout',
                  ar: 'خدمات جاهزة للدفع',
                  zh: '项已选服务',
                  ru: 'услуг выбрано',
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                aria-label={lt(locale, { fa: 'خالی کردن سبد', en: 'Clear Cart', ar: 'تفريغ السلة', zh: '清空购物车', ru: 'Очистить' })}
                className="min-w-[44px] min-h-[44px] px-2.5 text-[11px] font-bold text-rose-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer flex items-center justify-center"
              >
                {lt(locale, { fa: 'حذف همه', en: 'Clear', ar: 'حذف الكل', zh: '清空', ru: 'Удалить' })}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={lt(locale, { fa: 'بستن سبد خرید', en: 'Close Cart', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
              className="min-w-[44px] min-h-[44px] rounded-xl text-sub hover:text-ink flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-line/60">
          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-soft text-sub flex items-center justify-center mx-auto">
                <ShoppingCart size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-ink m-0">
                  {lt(locale, {
                    fa: 'سبد رزرو شما خالی است',
                    en: 'Your cart is empty',
                    ar: 'سلة الحجز فارغة',
                    zh: '您的购物车是空的',
                    ru: 'Ваша корзина пуста',
                  })}
                </h3>
                <p className="text-xs text-sub font-medium max-w-xs mx-auto">
                  {lt(locale, {
                    fa: 'پرواز، هتل، تور، ترانسفر یا خدمات بیمه و eSIM مورد نظر خود را اضافه نمایید.',
                    en: 'Add flights, hotels, tours, transfers, eSIM or insurance to bundle and save.',
                    ar: 'أضف رحلات الطيران أو الفنادق أو الجولات إلى سلتك.',
                    zh: '添加机票、酒店、旅游线路、接送机或保险一并结算享优惠。',
                    ru: 'Добавьте перелеты, отели, туры или трансферы для пакетной скидки.',
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push('/flights');
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand-dark font-black text-xs transition cursor-pointer"
                >
                  {lt(locale, { fa: 'جستجوی پرواز', en: 'Flights', ar: 'طيران', zh: '机票', ru: 'Рейсы' })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push('/hotels');
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand-dark font-black text-xs transition cursor-pointer"
                >
                  {lt(locale, { fa: 'جستجوی هتل', en: 'Hotels', ar: 'فنادق', zh: '酒店', ru: 'Отели' })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push('/tours');
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand-dark font-black text-xs transition cursor-pointer"
                >
                  {lt(locale, { fa: 'انواع تورها', en: 'Tours', ar: 'جولات', zh: '旅游', ru: 'Туры' })}
                </button>
              </div>
            </div>
          ) : (
            cart.map((item) => {
              const Icon = ITEM_ICONS[item.type.toUpperCase()] || Compass;
              const subtotal = item.unitPrice * item.count * (item.nights || 1);

              return (
                <div key={item.id} className="pt-3.5 first:pt-0 space-y-2 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-soft text-brand-dark flex items-center justify-center shrink-0 mt-0.5 border border-line">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-soft text-sub border border-line uppercase">
                            {item.type}
                          </span>
                          {item.supplier && (
                            <span className="text-[10.5px] font-bold text-sub flex items-center gap-1">
                              <Building2 size={11} /> {item.supplier}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-ink m-0 mt-1 leading-snug">
                          {item.title}
                        </h4>
                        {item.subtitle && (
                          <p className="text-[11px] text-sub font-medium mt-0.5 mb-0">
                            {item.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10.5px] text-sub font-medium mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>{item.travelDate}</span>
                          </span>
                          <span>•</span>
                          <span>
                            {num(item.count, locale)}{' '}
                            {item.type.toUpperCase() === 'HOTEL'
                              ? `${item.nights || 1} ${lt(locale, { fa: 'شب', en: 'nights', ar: 'ليلة', zh: '晚', ru: 'ноч.' })}`
                              : lt(locale, { fa: 'نفر', en: 'pax', ar: 'شخص', zh: '人', ru: 'чеل.' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={lt(locale, { fa: `حذف ${item.title}`, en: `Remove ${item.title}`, ar: `حذف ${item.title}`, zh: `移除 ${item.title}`, ru: `Удалить ${item.title}` })}
                      className="min-w-[44px] min-h-[44px] rounded-xl text-sub hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Price Row */}
                  <div className="flex items-baseline justify-between pt-1 ps-13">
                    <span className="text-[11px] text-sub font-mono">
                      {num(item.unitPrice, locale)} × {item.count}
                    </span>
                    <span className="font-mono font-black text-xs sm:text-sm text-ink">
                      {formatMoney(subtotal, item.currency, locale)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Combo Discount Banner */}
        {hasCombo && (
          <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border-y border-emerald-200 dark:border-emerald-900 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600" />
              <span>{lt(locale, { fa: 'تخفیف پکیج همزمان پرواز + هتل (۵٪)', en: 'Flight + Hotel Combo Discount (5%)', ar: 'خصم باقة طيران + فندق 5%', zh: '机酒合订套票95折', ru: 'Скидка на пакет перелет+отель (5%)' })}</span>
            </span>
            <span className="font-mono font-black text-emerald-700">
              -{formatMoney(bundleDiscountAmount, currency, locale)}
            </span>
          </div>
        )}

        {/* Footer & Checkout Action */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-line bg-surface space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-elev-2">
            {/* Price breakdown summary */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-sub font-bold">
                <span>{lt(locale, { fa: 'مجموع قیمت اقلام:', en: 'Subtotal:', ar: 'المجموع:', zh: '商品总价：', ru: 'Сумما:' })}</span>
                <span className="font-mono font-bold text-ink">{formatMoney(grossAmount, currency, locale)}</span>
              </div>
              {hasCombo && (
                <div className="flex items-center justify-between text-emerald-700 font-bold">
                  <span>{lt(locale, { fa: 'تخفیف بسته ترکیبی:', en: 'Bundle Discount:', ar: 'خصم الباقة:', zh: '套票优惠：', ru: 'Скидка:' })}</span>
                  <span className="font-mono font-bold">-{formatMoney(bundleDiscountAmount, currency, locale)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-2 border-t border-line text-sm sm:text-base font-black text-ink">
                <span>{lt(locale, { fa: 'مبلغ قابل پرداخت:', en: 'Total Payable:', ar: 'المبلغ الإجمالي:', zh: '应付总额：', ru: 'Итого к оплате:' })}</span>
                <span className="font-mono font-black text-price text-lg sm:text-xl">
                  {formatMoney(netAmount, currency, locale)}
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleProceedToCheckout}
              className="w-full min-h-[50px] rounded-2xl bg-action hover:bg-action-hover active:bg-action-active text-ink font-black text-xs sm:text-sm transition-all shadow-[0_6px_20px_rgba(240,166,42,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Lock size={16} />
              <span>
                {lt(locale, {
                  fa: 'ادامه به تسویه‌حساب و مشخصات مسافران',
                  en: 'Proceed to Checkout & Passengers',
                  ar: 'المتابعة للدفع وبيانات المسافرين',
                  zh: '去结算并填写乘机人信息',
                  ru: 'Перейти к оформлению и пассажирам',
                })}
              </span>
              {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
