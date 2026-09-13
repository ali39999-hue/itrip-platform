'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight, Landmark, BedDouble, UserRound, Gem, MapPin } from 'lucide-react';
import { shimmerDataUrl } from '@/lib/image-utils';
import { lt } from '@/lib/lt';
import type { PromoBannerOverride } from '@/domains/content/SiteContentService';

// fa/en snapshot of the shipped banners, used by the CMS editor as the
// prefill when an admin starts customizing (ar/zh/ru then follow lt()'s
// fallback chain instead of the inline five-locale defaults below).
export const DEFAULT_PROMO_BANNERS: PromoBannerOverride[] = [
  {
    id: 'b1',
    tag: { fa: 'تخفیف ویژه پرواز', en: 'Flight Deal' },
    title: { fa: 'پروازهای رفت‌وبرگشت استانبول و دبی', en: 'Roundtrip Flights: Istanbul & Dubai' },
    subtitle: {
      fa: 'با برترین ایرلاین‌ها و امکان رزرو بلیت سیستمی با استرداد بدون جریمه',
      en: 'Top airlines with systemic booking and fee-free refund guarantee',
    },
    cta: { fa: 'مشاهده پروازها', en: 'View Flights' },
    href: '/flights/search?from=Tehran&to=Istanbul',
    img: 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&q=75&w=800',
    gradient: 'from-[#033b3a] via-[#045956] to-[#00a9a5]',
    badgeBg: 'bg-mint text-brand-dark',
    icon: 'Plane',
  },
  {
    id: 'b2',
    tag: { fa: 'اقامت لوکس', en: 'Luxury Stay' },
    title: { fa: 'هتل‌های ۵ ستاره مشهد و کیش با صبحانه رایگان', en: '5-Star Hotels in Mashhad & Kish' },
    subtitle: {
      fa: 'اقامت خاطره‌انگیز با ترانسفر فرودگاهی اختصاصی و تضمین کمترین نرخ',
      en: 'Memorable stay with free airport transfers and lowest rate guarantee',
    },
    cta: { fa: 'رزرو آنلاین هتل', en: 'Book Hotel' },
    href: '/hotels/search?city=Mashhad',
    img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=75&w=800',
    gradient: 'from-[#7c3a00] via-[#b45309] to-[#f0a62a]',
    badgeBg: 'bg-gold-soft text-price',
    icon: 'Hotel',
  },
  {
    id: 'b3',
    tag: { fa: 'صدور فوری', en: 'Instant Cover' },
    title: { fa: 'بیمه مسافرتی سامان مورد تایید شنگن', en: 'Schengen-Approved Saman Travel Insurance' },
    subtitle: {
      fa: 'پوشش جامع حوادث پزشکی تا ۵۰ هزار یورو با صدور آنی کد بیمه‌نامه',
      en: 'Up to €50k medical coverage with instant official policy verification',
    },
    cta: { fa: 'صدور آنی بیمه', en: 'Get Insurance' },
    href: '/insurance',
    img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=75&w=800',
    gradient: 'from-[#1e3a8a] via-[#1d4ed8] to-[#0284c7]',
    badgeBg: 'bg-blue-100 text-blue-900',
    icon: 'ShieldCheck',
  },
];

export function PromotionalBanners({ override }: { override?: PromoBannerOverride[] }) {
  void override;
  const locale = useLocale();
  const isRtl = locale === 'fa' || locale === 'ar';

  const heading = lt(locale, {
    fa: 'تور اختصاصی فیروزو',
    en: 'Firuzo Exclusive Tour',
    ar: 'جولة فيروزو الحصرية',
    zh: 'Firuzo 专属之旅',
    ru: 'Эксклюзивный тур Firuzo',
  });

  const eyebrow = lt(locale, {
    fa: 'تور سه روزه اختصاصی',
    en: '3-Day Exclusive Tour',
    ar: 'جولة حصرية لثلاثة أيام',
    zh: '三日专属之旅',
    ru: 'Эксклюзивный 3-дневный тур',
  });

  const brand = lt(locale, {
    fa: 'فیروزو',
    en: 'Firuzo',
    ar: 'فيروزو',
    zh: 'Firuzo',
    ru: 'Фирузо',
  });

  const description = lt(locale, {
    fa: 'سفری سه روزه به قلب تاریخ و هنر ایران؛ بازدید از جاذبه‌های بی‌نظیر اصفهان، اقامت در هتل‌های لوکس، و تجربه‌ی یک سفر متفاوت و اختصاصی با فیروزو.',
    en: 'A three-day journey to the heart of Persian history and art — discover Isfahan’s timeless wonders, stay in luxury hotels, and experience a truly exclusive getaway with Firuzo.',
    ar: 'رحلة لثلاثة أيام إلى قلب التاريخ والفن الإيراني؛ اكتشف روائع أصفهان، وأقم في فنادق فاخرة مع تجربة سفر استثنائية برفقة فيروزو.',
    zh: '三日穿越波斯历史与艺术之心——探访伊斯法罕的传世胜景，入住奢华酒店，与 Firuzo 开启与众不同的专属旅程。',
    ru: 'Трёхдневное путешествие в сердце истории и искусства Ирана — откройте чудеса Исфахана, проживание в люкс-отелях и эксклюзивный отдых с Firuzo.',
  });

  const cta = lt(locale, {
    fa: 'رزرو تور',
    en: 'Book Tour',
    ar: 'احجز الجولة',
    zh: '立即预订',
    ru: 'Забронировать',
  });

  const cityBadge = lt(locale, {
    fa: 'تور اصفهان فیروزو',
    en: 'Isfahan Tour · Firuzo',
    ar: 'جولة أصفهان · فيروزو',
    zh: '伊斯法罕之旅 · Firuzo',
    ru: 'Тур в Исфахан · Firuzo',
  });

  const features = [
    {
      label: lt(locale, { fa: 'بازدید از', en: 'Historic', ar: 'زيارة', zh: '历史', ru: 'Исторические' }),
      label2: lt(locale, { fa: 'جاذبه‌های تاریخی', en: 'Landmarks', ar: 'المعالم التاريخية', zh: '地标探访', ru: 'достопримечательности' }),
      icon: Landmark,
    },
    {
      label: lt(locale, { fa: 'اقامت در هتل', en: 'Luxury', ar: 'إقامة في فندق', zh: '奢华', ru: 'Проживание' }),
      label2: lt(locale, { fa: 'لوکس', en: 'Hotel Stay', ar: 'فاخر', zh: '酒店入住', ru: 'в люкс-отеле' }),
      icon: BedDouble,
    },
    {
      label: lt(locale, { fa: 'راهنمای محلی', en: 'Local', ar: 'مرشد محلي', zh: '本地', ru: 'Местный' }),
      label2: lt(locale, { fa: 'حرفه‌ای', en: 'Expert Guide', ar: 'محترف', zh: '专业向导', ru: 'гид-эксперт' }),
      icon: UserRound,
    },
    {
      label: lt(locale, { fa: 'خدمات اختصاصی', en: 'Exclusive', ar: 'خدمات حصرية', zh: '专属', ru: 'Эксклюзивный' }),
      label2: lt(locale, { fa: 'و VIP', en: '& VIP Service', ar: 'و VIP', zh: '与 VIP 服务', ru: 'и VIP-сервис' }),
      icon: Gem,
    },
  ];

  const href = `/tours/search?city=${encodeURIComponent(locale === 'fa' ? 'اصفهان' : 'Isfahan')}`;

  return (
    <section aria-label="Firuzo Exclusive Tour" className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8">
      {/* Heading row — title (h2 semantic for a11y) + Isfahan badge beside it */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 md:mb-6">
        <h2 className="text-[20px] sm:text-[22px] md:text-[28px] font-black tracking-tight text-ink text-start leading-none">
          {heading}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0b3d3c] text-[#7af7f5] border border-[#0ea5a3]/30 px-3 py-1.5 text-[11px] sm:text-xs font-black tracking-wide shadow-sm whitespace-nowrap">
          <MapPin size={13} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />
          {cityBadge}
        </span>
      </div>

      {/* Turquoise Glass Card */}
      <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] md:rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#071e1e] via-[#0b3d3c] to-[#0f6b69] shadow-[0_20px_60px_rgba(3,40,38,0.35),0_8px_24px_rgba(0,0,0,0.18)]">
        {/* soft glow blobs — smaller on mobile */}
        <div className="pointer-events-none absolute -top-16 -end-16 sm:-top-24 sm:-end-24 w-[300px] h-[300px] sm:w-[520px] sm:h-[520px] rounded-full bg-[#1ee8e4]/15 blur-[50px] sm:blur-[70px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 -start-20 sm:-bottom-32 sm:-start-32 w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] rounded-full bg-[#0ea5a3]/20 blur-[45px] sm:blur-[60px]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/[0.06] via-transparent to-transparent" aria-hidden="true" />
        {/* inner highlight border */}
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-cyan-200/10" aria-hidden="true" />

        <div className="relative flex flex-col lg:flex-row">
          {/* Text side — DOM first => visual right in RTL */}
          <div className="flex-1 flex flex-col justify-center px-5 py-6 sm:p-7 md:p-8 lg:p-10 lg:pe-10 lg:ps-12 xl:p-12 order-1 min-w-0">
            {/* Title block */}
            <div className="text-start">
              <p className="text-white/90 text-[15px] sm:text-lg md:text-[22px] font-bold leading-none mb-1 sm:mb-1.5 tracking-tight">
                {eyebrow}
              </p>
              <p
                className="text-[34px] sm:text-[40px] md:text-[52px] lg:text-[56px] font-black leading-none tracking-tight pb-1"
                style={{
                  color: '#4af2f0',
                  textShadow: '0 0 28px rgba(74,242,240,0.55), 0 0 8px rgba(74,242,240,0.35)',
                  WebkitTextStroke: '0.5px rgba(255,255,255,0.08)',
                }}
              >
                {brand}
              </p>
            </div>

            <p className="mt-3.5 sm:mt-4 md:mt-5 text-white/80 text-[13px] sm:text-[13.5px] md:text-[14.5px] font-medium leading-[1.85] sm:leading-[1.9] text-start max-w-[560px]">
              {description}
            </p>

            {/* Features — 2×2 on mobile (thumb-friendly), 4-col on ≥640px */}
            <div className="mt-6 sm:mt-7 md:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-0 rounded-2xl sm:rounded-none border border-white/10 sm:border-0 overflow-hidden sm:overflow-visible divide-x divide-y divide-white/10 sm:divide-y-0 sm:divide-white/12 rtl:divide-x-reverse">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label + f.label2} className="flex flex-col items-center text-center px-3 py-4 sm:px-3 sm:py-0 gap-2 bg-white/[0.03] sm:bg-transparent">
                    <span className="inline-flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-white/8 border border-white/10 text-[#7af7f5] shrink-0">
                      <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className="text-[11.5px] sm:text-xs font-bold leading-4 text-white/85">
                      <span className="block">{f.label}</span>
                      <span className="block text-white/70 font-medium">{f.label2}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* CTA — full-width on mobile for thumb reach, auto on desktop */}
            <div className="mt-6 sm:mt-7 md:mt-8 flex justify-stretch sm:justify-start">
              <Link
                href={href}
                aria-label={cta}
                className="group inline-flex w-full sm:w-auto items-center justify-center sm:justify-start gap-3 rounded-full bg-[#7af7f5] hover:bg-[#9afaf8] active:bg-[#6ee7e5] text-[#052524] ps-6 pe-1.5 py-1.5 text-[15px] sm:text-sm font-black shadow-[0_8px_24px_rgba(74,242,240,0.35)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b3d3c] min-h-[48px] sm:min-h-0 touch-manipulation"
              >
                <span className="flex-1 sm:flex-none text-center sm:text-start">{cta}</span>
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#052524] text-white group-hover:bg-black group-active:bg-black transition-colors shrink-0">
                  {isRtl ? <ArrowLeft size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
                </span>
              </Link>
            </div>
          </div>

          {/* Image side — aspect-ratio on mobile so it never gets cropped cut-off */}
          <div className="relative w-full lg:w-[52%] xl:w-[54%] shrink-0 p-3 pt-0 sm:p-4 sm:pt-0 lg:p-3 lg:ps-0 order-2">
            <div className="relative aspect-[16/11] sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[400px] rounded-[1.25rem] sm:rounded-[1.5rem] lg:rounded-[1.75rem] overflow-hidden border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_40px_rgba(0,0,0,0.25)] bg-[#0a2e2d]">
              <Image
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Naghshe_Jahan_Square_Isfahan_modified.jpg/960px-Naghshe_Jahan_Square_Isfahan_modified.jpg"
                alt={lt(locale, { fa: 'میدان نقش جهان اصفهان', en: 'Naqsh-e Jahan Square, Isfahan', ar: 'ميدان نقش جهان، أصفهان', zh: '伊斯法罕 نقش جهان广场', ru: 'Площадь Накш-э Джахан, Исфахан' })}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(900, 600)}
                className="object-cover"
                priority={false}
              />
              {/* teal wash to match glass tone — subtle */}
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#0a4a49]/10 mix-blend-overlay" aria-hidden="true" />

              {/* Corner arabesque decorations */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 start-0 w-[72px] h-[72px] sm:w-[110px] sm:h-[110px] opacity-95"
                style={{
                  background: `url("data:image/svg+xml,${encodeURIComponent(
                    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 110 110' fill='none'><path d='M2 18 C2 6 8 2 20 2 L28 2 C28 14 34 20 46 20 L90 20 C102 20 108 26 108 38 L108 50 C96 50 90 44 90 32 L90 12 C90 8 88 6 84 6 L30 6 C18 6 12 12 12 24 L12 78 C12 82 14 84 18 84 L38 84 C50 84 56 90 56 102 L56 108 L38 108 C26 108 20 102 20 90 L20 46 C20 34 14 28 2 28 Z' stroke='%234af2f0' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' opacity='0.95'/><path d='M8 28 C14 28 18 24 18 18 C18 12 14 8 8 8' stroke='%234af2f0' stroke-width='1' fill='none' opacity='0.55'/><path d='M22 98 C22 92 26 88 32 88 C38 88 42 92 42 98' stroke='%234af2f0' stroke-width='1' fill='none' opacity='0.45'/><circle cx='18' cy='18' r='1.6' fill='%234af2f0' opacity='0.9'/><circle cx='36' cy='96' r='1.3' fill='%234af2f0' opacity='0.7'/></svg>`
                  )}") no-repeat top left / contain`,
                  filter: 'drop-shadow(0 0 10px rgba(74,242,240,0.6)) drop-shadow(0 0 2px rgba(74,242,240,0.9))',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 end-0 w-[72px] h-[72px] sm:w-[110px] sm:h-[110px] opacity-95 rotate-180"
                style={{
                  background: `url("data:image/svg+xml,${encodeURIComponent(
                    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 110 110' fill='none'><path d='M2 18 C2 6 8 2 20 2 L28 2 C28 14 34 20 46 20 L90 20 C102 20 108 26 108 38 L108 50 C96 50 90 44 90 32 L90 12 C90 8 88 6 84 6 L30 6 C18 6 12 12 12 24 L12 78 C12 82 14 84 18 84 L38 84 C50 84 56 90 56 102 L56 108 L38 108 C26 108 20 102 20 90 L20 46 C20 34 14 28 2 28 Z' stroke='%234af2f0' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' opacity='0.95'/><path d='M8 28 C14 28 18 24 18 18 C18 12 14 8 8 8' stroke='%234af2f0' stroke-width='1' fill='none' opacity='0.55'/><circle cx='18' cy='18' r='1.6' fill='%234af2f0' opacity='0.9'/></svg>`
                  )}") no-repeat top left / contain`,
                  filter: 'drop-shadow(0 0 10px rgba(74,242,240,0.6))',
                }}
              />

              <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-[3px] rounded-[1.1rem] sm:rounded-[1.3rem] lg:rounded-[1.5rem] border border-cyan-200/15" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
