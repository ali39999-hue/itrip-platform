'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { getAllTours } from '@/services/tours-service';
import { TourImage } from './TourImage';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  Sparkles,
  X,
  Compass,
  Star,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Plane,
  Building2,
  ShieldCheck,
  Bot,
} from 'lucide-react';

const STORAGE_KEY = 'firuzo_tours_popup_dismissed_until';

export function ToursPromoModal() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const tours = getAllTours();

  // Never crowd transactional flows: search/result/detail/checkout screens need
  // every pixel for filters, sticky pills and reservation CTAs.
  const isRestrictedRoute =
    pathname?.includes('/admin') ||
    pathname?.includes('/checkout') ||
    pathname?.includes('/book') ||
    pathname?.includes('/payment-status') ||
    pathname?.includes('/flights') ||
    pathname?.includes('/hotels') ||
    /\/tours\/.+/.test(pathname ?? '');

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTourIndex, setSelectedTourIndex] = useState(0);
  const [dontShowToday, setDontShowToday] = useState(false);
  const [mounted, setMounted] = useState(false);
  // User-dismissed floating trigger (declutters mobile; persists for the session)
  const [triggerHidden, setTriggerHidden] = useState(false);

  const selectedTour = tours[selectedTourIndex] || tours[0];

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    // Check if dismissed previously
    const dismissedUntil = localStorage.getItem(STORAGE_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    if (isRestrictedRoute) return;

    // Never auto-interrupt automated tests or headless browsers
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      return;
    }

    // Check if seen in this session
    if (sessionStorage.getItem('firuzo_tours_promo_session_seen')) {
      setTriggerHidden(true);
      return;
    }

    // Auto open gently once per session
    const timer = setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem('firuzo_tours_promo_session_seen', 'true');
    }, 6000);

    return () => clearTimeout(timer);
  }, [isRestrictedRoute]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (dontShowToday && typeof window !== 'undefined') {
      // Dismiss for 24 hours
      localStorage.setItem(STORAGE_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    }
  }, [dontShowToday]);

  // Keyboard navigation (Escape to close, Left/Right arrow to switch tours)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') {
        setSelectedTourIndex((prev) => (prev + 1) % tours.length);
      }
      if (e.key === 'ArrowLeft') {
        setSelectedTourIndex((prev) => (prev - 1 + tours.length) % tours.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, tours.length, handleClose]);

  function handleExploreTour(tourId: string) {
    handleClose();
    router.push(`/tours/${tourId}`);
  }

  function handleViewAllTours() {
    handleClose();
    router.push('/tours');
  }

  if (!mounted || isRestrictedRoute) return null;

  return (
    <>
      {/* Discreet Floating Trigger Badge when popup is closed */}
      {!isOpen && !triggerHidden && (
        <div className="fixed start-4 bottom-20 lg:bottom-6 z-40 flex items-center">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={lt(locale, { fa: 'مشاهده تورهای منتخب فیروزو', en: 'Explore Curated Tours', ar: 'استكشف الجولات المختارة', zh: '精选旅游特惠', ru: 'Особые туры Firuzo' })}
            className="bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand text-surface text-xs font-black px-3.5 py-2 max-lg:px-0 max-lg:size-11 max-lg:justify-center rounded-2xl shadow-elev-3 flex items-center gap-2 border border-surface/20 transition-all hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom-3 cursor-pointer"
            title={lt(locale, { fa: 'مشاهده تورهای منتخب فیروزو', en: 'Explore Curated Tours', ar: 'استكشف الجولات المختارة', zh: '精选旅游特惠', ru: 'Особые туры Firuzo' })}
          >
            <span className="w-2 h-2 rounded-full bg-mint-bright animate-ping" />
            <Compass size={16} className="text-mint-bright" />
            <span className="max-lg:hidden">{lt(locale, { fa: 'تورهای دست‌چین فیروزو', en: 'Curated Tours', ar: 'جولات فيروزو', zh: '精选旅游', ru: 'Особые туры' })}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTriggerHidden(true);
              try { sessionStorage.setItem('firuzo_tours_promo_session_seen', 'true'); } catch { /* noop */ }
            }}
            aria-label={lt(locale, { fa: 'بستن', en: 'Dismiss', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
            className="-ms-4 -mt-5 min-w-[44px] min-h-[44px] grid place-items-center shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-ink/80 hover:bg-ink text-surface grid place-items-center shadow">
              <X size={11} />
            </div>
          </button>
        </div>
      )}

      {/* Main Promo Popup Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[260] bg-ink/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in duration-200 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={lt(locale, { fa: 'پاپ‌آپ معرفی تورهای فیروزو', en: 'Firuzo Curated Tours Promo', ar: 'جولات فيروزو', zh: 'Firuzo 旅游推介', ru: 'Туры Firuzo' })}
        >
          <div className="relative w-full max-w-2xl bg-surface rounded-t-3xl sm:rounded-3xl overflow-hidden border-t sm:border border-line shadow-2xl flex flex-col max-h-[90vh] my-0 sm:my-6 pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom sm:slide-in-from-none sm:zoom-in-95 duration-250">
            <div className="sm:hidden w-12 h-1.5 rounded-full bg-line/80 mx-auto mt-2.5 mb-1" />
            {/* Header / Top banner with glowing badge */}
            <div className="relative p-5 sm:p-6 bg-gradient-to-r from-deep via-brand-dark to-deep text-surface overflow-hidden">
              <div className="absolute -top-12 -end-12 w-48 h-48 bg-mint/15 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/15 backdrop-blur-md text-surface text-[11px] font-black border border-surface/20 mb-2">
                    <Sparkles size={13} className="text-mint-bright" />
                    <span>{lt(locale, { fa: 'پیشنهاد ویژه مسافران فیروزو', en: 'Special Curated Experiences', ar: 'عروض حصرية لمسافري فيروزو', zh: 'Firuzo 贵宾专享精选', ru: 'Эксклюзивные впечатления' })}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-surface tracking-tight leading-snug">
                    {lt(locale, { fa: 'سفرهای اختصاصی، هتل‌های ۵ ستاره و خاطرات ماندگار', en: 'Curated Itineraries, 5-Star Luxury & Lifelong Memories', ar: 'رحلات حصرية وفنادق فاخرة', zh: '深度定制、五星级礼遇与难忘旅程', ru: 'Особые маршруты и 5-звёздочный комфорт' })}
                  </h2>
                  <p className="text-surface/80 text-xs sm:text-[13px] font-medium mt-1 leading-relaxed max-w-xl">
                    {lt(locale, { fa: 'برنامه‌ریزی دقیق روز به روز، پروازهای تاییدشده، راهنمای محلی و امکان خرید خودکار با ربات هوشمند.', en: 'Day-by-day itineraries, confirmed flight seats, expert local guides, and smart auto-buy bot.', ar: 'برامج يومية مفصلة مع طيران مؤكد وإمكانية الشراء التلقائي.', zh: '每日详细行程、即时出票、专业司导及一键智能自动订票。', ru: 'Полноценные маршруты, авиаперелёт и умная автопокупка.' })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label={lt(locale, { fa: 'بستن پنجره', en: 'Close modal', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
                  className="min-w-[44px] min-h-[44px] rounded-full bg-surface/10 hover:bg-surface/25 text-surface grid place-items-center transition cursor-pointer shrink-0 active:scale-95"
                >
                  <div className="w-8 h-8 rounded-full bg-surface/20 grid place-items-center">
                    <X size={18} />
                  </div>
                </button>
              </div>

              {/* Destination Switcher Pills inside popup */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-4 pb-1 scrollbar-none">
                {tours.map((t, idx) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTourIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedTourIndex === idx
                        ? 'bg-surface text-brand-dark shadow-sm'
                        : 'bg-surface/10 hover:bg-surface/20 text-surface/90 border border-surface/10'
                    }`}
                  >
                    <MapPin size={11} className={selectedTourIndex === idx ? 'text-brand-dark' : 'text-surface/70'} />
                    <span>{t.city}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Tour Preview Box */}
            <div className="p-4 sm:p-6 space-y-4 bg-surface">
              <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-center">
                {/* Tour Photo with Badges */}
                <div className="relative aspect-[16/10] sm:aspect-square rounded-2xl overflow-hidden bg-soft border border-line">
                  <TourImage
                    src={selectedTour.heroImage || selectedTour.gallery?.[0] || 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=800'}
                    alt={locale === 'fa' ? selectedTour.title : selectedTour.titleEn}
                    sizes="(max-width: 640px) 100vw, 250px"
                    className="object-cover"
                  />
                  <div className="absolute top-2.5 start-2.5 bg-deep/85 backdrop-blur-md text-surface text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={12} className="text-gold fill-gold" />
                    <span>{num(selectedTour.rating, locale)}</span>
                  </div>
                  <div className="absolute bottom-2.5 start-2.5 bg-mint/95 backdrop-blur-md text-brand-dark text-[10.5px] font-black px-2.5 py-0.5 rounded-full">
                    {num(selectedTour.durationDays, locale)} {lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })}
                  </div>
                </div>

                {/* Tour Details */}
                <div className="space-y-2.5 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-sub">
                    <span className="text-brand-dark font-black">{selectedTour.city}</span>
                    <span>•</span>
                    <span>{selectedTour.hotelName || 'هتل ۵ ستاره لوکس'}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-ink leading-snug line-clamp-2">
                    {locale === 'fa' ? selectedTour.title : selectedTour.titleEn}
                  </h3>

                  <p className="text-xs font-medium text-sub leading-relaxed line-clamp-2">
                    {locale === 'fa' ? selectedTour.summary : selectedTour.summaryEn}
                  </p>

                  {/* Highlight badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedTour.includes?.slice(0, 3).map((inc, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-dark bg-mint/60 px-2.5 py-0.5 rounded-lg">
                        <CheckCircle2 size={11} /> {inc}
                      </span>
                    ))}
                  </div>

                  {/* Price */}
                  <div className="pt-2 border-t border-line/60 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-bold text-sub">
                      {lt(locale, { fa: 'شروع قیمت پکیج کامل:', en: 'Starting package rate:', ar: 'يبدأ من:', zh: '全包参考价：', ru: 'Цена от:' })}
                    </span>
                    <div className="text-end">
                      <span className="text-base sm:text-xl font-black text-price font-mono">
                        {num(selectedTour.price, locale)}
                      </span>
                      <span className="text-xs font-bold text-sub ms-1">
                        {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Value Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line text-[11px] font-bold text-sub">
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-soft">
                  <Plane size={14} className="text-brand-dark shrink-0" />
                  <span className="truncate">{lt(locale, { fa: 'پرواز رفت و برگشت', en: 'Return flight', ar: 'طيران ذهاب وعودة', zh: '往返机票', ru: 'Авиабилеты' })}</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-soft">
                  <Building2 size={14} className="text-brand-dark shrink-0" />
                  <span className="truncate">{lt(locale, { fa: 'اقامت ۵ ستاره', en: '5-star stay', ar: 'إقامة ٥ نجوم', zh: '五星级酒店', ru: 'Отель 5*' })}</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-soft">
                  <ShieldCheck size={14} className="text-brand-dark shrink-0" />
                  <span className="truncate">{lt(locale, { fa: 'بیمه و ترانسفر', en: 'Insurance & transfer', ar: 'تأمين ونقل', zh: '保险与接送', ru: 'Страховка' })}</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-soft">
                  <Bot size={14} className="text-brand-dark shrink-0" />
                  <span className="truncate">{lt(locale, { fa: 'ربات خرید خودکار', en: 'Auto-Buy bot', ar: 'شراء تلقائي', zh: '自动订票助理', ru: 'Автопокупка' })}</span>
                </div>
              </div>

              {/* Action Buttons & "Don't show today" toggle */}
              <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Remember preference checkbox */}
                <label className="flex items-center gap-2 text-xs font-bold text-sub cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dontShowToday}
                    onChange={(e) => setDontShowToday(e.target.checked)}
                    className="w-4 h-4 rounded border-line text-brand focus:ring-brand accent-brand cursor-pointer"
                  />
                  <span>{lt(locale, { fa: 'امروز دیگر این پیام را نمایش نده', en: 'Do not show again today', ar: 'لا تظهر هذا مجدداً اليوم', zh: '今日不再弹出', ru: 'Не показывать сегодня' })}</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleViewAllTours}
                    className="h-11 px-4 rounded-xl border border-line bg-soft hover:bg-line/40 text-ink font-bold text-xs transition cursor-pointer"
                  >
                    {lt(locale, { fa: 'همه تورها', en: 'All Tours', ar: 'جميع الجولات', zh: '查看全部', ru: 'Все туры' })}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExploreTour(selectedTour.id)}
                    className="h-11 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-action/25 cursor-pointer"
                  >
                    <span>{lt(locale, { fa: 'مشاهده و رزرو این تور', en: 'Explore & Book Tour', ar: 'عرض وحجز هذه الجولة', zh: '查看并预订本线路', ru: 'Подробнее и бронь' })}</span>
                    <ArrowRight size={13} className="ltr:inline rtl:hidden" />
                    <ArrowLeft size={13} className="rtl:inline ltr:hidden" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
