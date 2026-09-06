'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { Tour } from '@/lib/types';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { TourImage } from '../TourImage';
import {
  Star,
  MapPin,
  Calendar,
  Share2,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
  Check,
  Compass,
} from 'lucide-react';

interface TourHeroProps {
  tour: Tour;
}

export function TourHero({ tour }: TourHeroProps) {
  const locale = useLocale();
  const isRtl = ['fa', 'ar'].includes(locale);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mobileSlideIndex, setMobileSlideIndex] = useState(0);

  const title = locale === 'fa' ? tour.title : (tour.titleEn || tour.title);
  const city = locale === 'fa' ? tour.city : (tour.cityEn || tour.city);
  const country = locale === 'fa' ? (tour.country || 'ایران') : (tour.countryEn || 'Iran');
  const summary = locale === 'fa' ? tour.summary : (tour.summaryEn || tour.summary);

  const images = tour.gallery && tour.gallery.length > 0
    ? tour.gallery
    : [tour.heroImage || 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=1200'];

  const categoryLabels: Record<string, { fa: string; en: string; ar: string; zh: string; ru: string }> = {
    cultural: { fa: 'فرهنگی و تاریخی', en: 'Cultural & Heritage', ar: 'ثقافي وتاريخي', zh: '文化与遗产', ru: 'Культурный' },
    nature: { fa: 'طبیعت‌گردی و بوم‌گردی', en: 'Nature & Eco', ar: 'سياحة بيئية', zh: '自然与生态', ru: 'Природный' },
    medical: { fa: 'سلامت و درمانی', en: 'Medical & Wellness', ar: 'علاجي وصحي', zh: '医疗与康养', ru: 'Оздоровительный' },
    adventure: { fa: 'ماجراجویی و ورزشی', en: 'Adventure & Sport', ar: 'مغامرات ورياضة', zh: '探险与运动', ru: 'Приключенческий' },
  };

  const catLabel = lt(locale, categoryLabels[tour.category] || { fa: 'تور ویژه', en: 'Special Tour', ar: 'جولة خاصة', zh: '特别旅游', ru: 'Специальный тур' });

  function handleShare() {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, images.length]);

  return (
    <>
      {/* Breadcrumb strip - mobile scrollable */}
      <div className="border-b border-line bg-surface">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-2.5 py-2.5 sm:py-3 text-xs font-bold text-sub overflow-x-auto whitespace-nowrap scrollbar-none">
          <Link
            href="/tours"
            className="inline-flex items-center gap-1 text-brand-dark hover:text-brand transition font-black shrink-0"
          >
            {isRtl ? '→ ' : '← '} {lt(locale, { fa: 'تورها', en: 'Tours', ar: 'الجولات', zh: '旅游', ru: 'Туры' })}
          </Link>
          <ChevronLeft size={11} className="text-line ltr:rotate-180 shrink-0" />
          <Link href="/" className="hover:text-brand shrink-0">
            {lt(locale, { fa: 'خانه', en: 'Home', ar: 'الرئيسية', zh: '首页', ru: 'Главная' })}
          </Link>
          <ChevronLeft size={11} className="text-line ltr:rotate-180 shrink-0" />
          <span className="shrink-0">{city}</span>
          <ChevronLeft size={11} className="text-line ltr:rotate-180 shrink-0" />
          <span className="font-extrabold text-ink shrink-0 max-w-[200px] sm:max-w-none truncate">{title}</span>
        </div>
      </div>

      {/* Header Info & Actions */}
      <header className="max-w-[1280px] mx-auto px-4 md:px-10 pt-4 sm:pt-6 pb-3">
        <div className="flex flex-col gap-3">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full bg-mint text-brand-dark text-[11px] sm:text-xs font-black">
              <Compass size={12} /> {catLabel}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-full bg-deep/5 text-ink text-[11px] sm:text-xs font-black">
              <MapPin size={12} className="text-brand" /> {city}، {country}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-full bg-deep/5 text-ink text-[11px] sm:text-xs font-black">
              <Calendar size={12} className="text-brand" />
              <span>
                {num(tour.durationDays, locale)} {lt(locale, { fa: 'روز', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })}
                {tour.durationNights ? ` و ${num(tour.durationNights, locale)} ${lt(locale, { fa: 'شب', en: 'Nights', ar: 'ليالٍ', zh: '晚', ru: 'ноч.' })}` : ''}
              </span>
            </span>
            <div className="flex items-center gap-1 bg-gold-soft text-price px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-black">
              <Star size={12} className="fill-gold text-gold" />
              <span>{num(tour.rating, locale)}</span>
              {tour.reviewsCount && (
                <span className="text-[10px] sm:text-[11px] text-sub font-bold">
                  ({num(tour.reviewsCount, locale)})
                </span>
              )}
            </div>
          </div>

          {/* Title and Share Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-ink tracking-tight leading-snug sm:leading-tight">
              {title}
            </h1>

            <div className="flex items-center gap-2 self-start shrink-0">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-line text-xs font-bold text-ink hover:bg-soft transition shadow-xs cursor-pointer"
                title={lt(locale, { fa: 'اشتراک‌گذاری تور', en: 'Share tour', ar: 'مشاركة الجولة', zh: '分享旅游', ru: 'Поделиться туром' })}
              >
                {copied ? <Check size={14} className="text-mint-bright" /> : <Share2 size={14} />}
                <span>{copied ? lt(locale, { fa: 'کپی شد!', en: 'Copied!', ar: 'تم النسخ!', zh: '已复制', ru: 'Скопировано!' }) : lt(locale, { fa: 'اشتراک‌گذاری', en: 'Share', ar: 'مشاركة', zh: '分享', ru: 'Поделиться' })}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSaved(!isSaved)}
                className={`p-1.5 rounded-xl border transition shadow-xs cursor-pointer ${
                  isSaved
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-surface border-line text-sub hover:text-ink hover:bg-soft'
                }`}
                title={lt(locale, { fa: 'افزودن به نشان‌شده‌ها', en: 'Save tour', ar: 'حفظ الجولة', zh: '收藏旅游', ru: 'Сохранить тур' })}
              >
                <Heart size={16} className={isSaved ? 'fill-rose-600' : ''} />
              </button>
            </div>
          </div>

          {summary && (
            <p className="text-sub text-xs sm:text-sm md:text-base leading-relaxed max-w-3xl">
              {summary}
            </p>
          )}
        </div>

        {/* Gallery Grid - Responsive for Mobile & Desktop */}
        <div className="mt-4 sm:mt-6 relative rounded-2xl sm:rounded-3xl overflow-hidden bg-soft border border-line">
          {/* Desktop Multi-photo Grid (hidden on mobile < md) */}
          <div className="hidden md:grid md:grid-cols-4 md:grid-rows-2 gap-2 h-[380px] lg:h-[440px]">
            {/* Main Featured Photo */}
            <div
              className="relative md:col-span-2 md:row-span-2 overflow-hidden cursor-pointer group"
              onClick={() => setLightboxIndex(0)}
            >
              <TourImage
                src={images[0]}
                alt={`${title} - 1`}
                priority
                sizes="(max-width: 1024px) 50vw, 600px"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            </div>

            {/* Sub photos */}
            {images.slice(1, 5).map((img, i) => (
              <div
                key={i}
                className="relative overflow-hidden cursor-pointer group"
                onClick={() => setLightboxIndex(i + 1)}
              >
                <TourImage
                  src={img}
                  alt={`${title} - ${i + 2}`}
                  sizes="300px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              </div>
            ))}
          </div>

          {/* Mobile Swipeable Gallery (< md) */}
          <div className="md:hidden relative aspect-[16/10] w-full overflow-hidden">
            <div
              className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
              onScroll={(e) => {
                const target = e.currentTarget;
                const index = Math.round(target.scrollLeft / (target.clientWidth || 1));
                setMobileSlideIndex(Math.abs(index));
              }}
            >
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative w-full h-full shrink-0 snap-center cursor-pointer"
                  onClick={() => setLightboxIndex(i)}
                >
                  <TourImage
                    src={img}
                    alt={`${title} - ${i + 1}`}
                    priority={i === 0}
                    loading="eager"
                    sizes="(max-width: 640px) 100vw, 600px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Mobile Slide Indicator Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-3 start-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-full">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      mobileSlideIndex === i ? 'bg-surface w-3' : 'bg-surface/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* View All Photos Floating Button */}
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="absolute bottom-3 end-3 sm:bottom-4 sm:end-4 z-10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-surface/95 hover:bg-surface text-ink text-[11px] sm:text-xs font-black shadow-elev-2 flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 border border-line cursor-pointer"
          >
            <Camera size={14} className="text-brand-dark" />
            <span>
              {lt(locale, { fa: 'تمام عکس‌ها', en: 'All photos', ar: 'جميع الصور', zh: '所有照片', ru: 'Все фото' })} ({num(images.length, locale)})
            </span>
          </button>
        </div>
      </header>

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-surface z-10">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black truncate max-w-[80%]">
              <span className="truncate">{title}</span>
              <span className="text-surface/50 font-normal shrink-0">•</span>
              <span className="text-surface/80 font-mono shrink-0">
                {num(lightboxIndex + 1, locale)} / {num(images.length, locale)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface/10 hover:bg-surface/20 text-surface grid place-items-center transition cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main Photo View with Next/Prev Controls */}
          <div className="relative flex-1 my-2 sm:my-4 flex items-center justify-center">
            <div className="relative w-full h-full max-h-[70vh]">
              <TourImage
                src={images[lightboxIndex]}
                alt={`${title} - ${lightboxIndex + 1}`}
                sizes="100vw"
                priority
                className="object-contain"
              />
            </div>

            {/* Prev button */}
            <button
              type="button"
              onClick={() => setLightboxIndex((lightboxIndex - 1 + images.length) % images.length)}
              className="absolute start-2 sm:start-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface/20 hover:bg-surface/30 text-surface grid place-items-center transition backdrop-blur-md cursor-pointer"
            >
              <ChevronLeft size={22} className="ltr:inline rtl:hidden" />
              <ChevronRight size={22} className="rtl:inline ltr:hidden" />
            </button>

            {/* Next button */}
            <button
              type="button"
              onClick={() => setLightboxIndex((lightboxIndex + 1) % images.length)}
              className="absolute end-2 sm:end-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface/20 hover:bg-surface/30 text-surface grid place-items-center transition backdrop-blur-md cursor-pointer"
            >
              <ChevronRight size={22} className="ltr:inline rtl:hidden" />
              <ChevronLeft size={22} className="rtl:inline ltr:hidden" />
            </button>
          </div>

          {/* Thumbnails Strip */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className={`relative w-14 sm:w-16 h-10 sm:h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  lightboxIndex === i ? 'border-brand scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <TourImage src={img} alt={`Thumb ${i + 1}`} sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
