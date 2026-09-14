'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight, Landmark, BedDouble, UserRound, Gem, MapPin } from 'lucide-react';
import { shimmerDataUrl } from '@/lib/image-utils';
import { lt } from '@/lib/lt';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, countryName, type CountryId } from '@/lib/countries';
import type { PromoBannerOverride } from '@/domains/content/SiteContentService';

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

interface CountryExclusiveDeal {
  cityBadge: { fa: string; en: string };
  eyebrow: { fa: string; en: string };
  brand: { fa: string; en: string };
  description: { fa: string; en: string };
  img: string;
  href: string;
}

const COUNTRY_EXCLUSIVES: Record<CountryId, CountryExclusiveDeal> = {
  iran: {
    cityBadge: { fa: 'تور اصفهان فیروزو', en: 'Isfahan Tour · Firuzo' },
    eyebrow: { fa: 'تور ۳ روزه اختصاصی', en: '3-Day Exclusive Tour' },
    brand: { fa: 'اصفهان نصف جهان', en: 'Isfahan Legacy' },
    description: {
      fa: 'سفری سه روزه به قلب تاریخ و هنر ایران؛ بازدید از جاذبه‌های بی‌نظیر میدان نقش جهان، کاخ عالی‌قاپو و اقامت در هتل ۵ ستاره عباسی با پذیرایی VIP.',
      en: 'A three-day journey to the heart of Persian history and art — discover Naqsh-e Jahan Square, Ali Qapu Palace, and stay at the historic 5-star Abbasi Hotel.',
    },
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Naghshe_Jahan_Square_Isfahan_modified.jpg/960px-Naghshe_Jahan_Square_Isfahan_modified.jpg',
    href: '/tours/t1',
  },
  turkey: {
    cityBadge: { fa: 'تور VIP استانبول و بسفر', en: 'Istanbul VIP & Bosphorus' },
    eyebrow: { fa: 'پکیج ۵ روزه لوکس', en: '5-Day Luxury Package' },
    brand: { fa: 'استانبول افسانه‌ای', en: 'Mythic Istanbul' },
    description: {
      fa: 'ترکیب بی‌نظیر تفریح و آرامش؛ گشت اختصاصی با یات روی تنگه بسفر، اقامت در هتل ۵ ستاره شیشلی، خرید از مراکز لوکس و ترانسفر تشریفاتی مرسدس بنز.',
      en: 'Curated 5-star Istanbul experience: private Bosphorus yacht cruise, luxury accommodation in Sisli, premier mall shopping, and VIP Mercedes transfers.',
    },
    img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=75&w=960',
    href: '/tours/t3',
  },
  uae: {
    cityBadge: { fa: 'پکیج لوکس دبی', en: 'Luxury Dubai Escape' },
    eyebrow: { fa: 'اقامت ۴ روزه اختصاصی', en: '4-Day Premium Getaway' },
    brand: { fa: 'دبی شهر فردا', en: 'Futuristic Dubai' },
    description: {
      fa: 'سفری رویایی به پایتخت تفریحات مدرن خاورمیانه؛ بلیت‌های اختصاصی برج خلیفه، تفریحات ساحلی جمیرا، پارک‌های آبی و اقامت در بهترین هتل‌های ۵ ستاره مارینا.',
      en: 'Experience the pinnacle of luxury: Burj Khalifa priority passes, Jumeirah beachside leisure, desert safari, and 5-star Dubai Marina hospitality.',
    },
    img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=75&w=960',
    href: '/tours?country=uae',
  },
  georgia: {
    cityBadge: { fa: 'ماجراجویی قفقاز', en: 'Caucasus Adventure' },
    eyebrow: { fa: 'اکسپدیشن ۶ روزه گرجستان', en: '6-Day Kazbegi Expedition' },
    brand: { fa: 'طبیعت قازبگی', en: 'Alpine Georgia' },
    description: {
      fa: 'هیجان صعود آفرود به پای کوه قازبک، رفتینگ در رودخانه خروشان آراگوی، اقامت در هتل ۵ ستاره رومز قازبگی و چشیدن طعم اصیل غذاهای سنتی گرجستان.',
      en: 'Thrilling off-road 4x4 ascent to Gergeti Trinity church, white-water rafting on Aragvi, and stay at iconic 5-star Rooms Hotel Kazbegi.',
    },
    img: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=75&w=960',
    href: '/tours/t4',
  },
  oman: {
    cityBadge: { fa: 'تور آرامش مسقط', en: 'Oman Coastal Serenity' },
    eyebrow: { fa: 'اقامت ۵ روزه ساحلی', en: '5-Day Coastal Retreat' },
    brand: { fa: 'عمان اصیل', en: 'Authentic Oman' },
    description: {
      fa: 'استراحت در سواحل بکر دریای عمان، تماشای دلفین‌ها، گشت مسجد جامع سلطان قابوس و اقامت در لوکس‌ترین هتل‌های ریزورت ساحلی با آرامشی کم‌نظیر.',
      en: 'Unwind along untouched Arabian Sea waters, dolphin-watching cruises, grand Sultan Qaboos architecture, and premier 5-star beachfront resorts.',
    },
    img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=75&w=960',
    href: '/tours?country=oman',
  },
  russia: {
    cityBadge: { fa: 'تور مسکو و سن‌پترزبورگ', en: 'Moscow & Saint Petersburg' },
    eyebrow: { fa: 'سفر ۷ روزه کلاسیک', en: '7-Day Imperial Russia' },
    brand: { fa: 'شکوه کاخ‌های تزار', en: 'Imperial Wonders' },
    description: {
      fa: 'تماشای میدان سرخ مسکو، ابهت کاخ کرملین، گشت شبانه در موزه جهانی ارمیتاژ و تماشای رژه فواره‌های طلایی در کاخ پترهوف سن‌پترزبورگ.',
      en: 'Iconic Red Square and Kremlin tours, white nights along the Neva river, Hermitage Museum masterpieces, and Peterhof Palace golden fountains.',
    },
    img: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&q=75&w=960',
    href: '/tours?country=russia',
  },
  china: {
    cityBadge: { fa: 'تور شگفتی‌های پکن', en: 'Wonders of Beijing' },
    eyebrow: { fa: 'سفر ۸ روزه تاریخی و مدرن', en: '8-Day China Explorer' },
    brand: { fa: 'دیوار بزرگ چین', en: 'The Great Wall' },
    description: {
      fa: 'قدم زدن بر دیوار بزرگ چین، کشف رازهای شهر ممنوعه، گشت کاخ تابستانی پکن و تجربه هیجان‌انگیز سفر با قطارهای مگلو و سریع‌السیر آسیا.',
      en: 'Walk upon the Great Wall of China, uncover Forbidden City mysteries, wander the Summer Palace, and travel aboard Asia’s high-speed maglev.',
    },
    img: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?auto=format&fit=crop&q=75&w=960',
    href: '/tours?country=china',
  },
};

export function PromotionalBanners({ override: _override }: { override?: PromoBannerOverride[] } = {}) {
  void _override;
  const locale = useLocale();
  const isRtl = locale === 'fa' || locale === 'ar';
  const { country } = useCountryStore();

  const deal = COUNTRY_EXCLUSIVES[country] || COUNTRY_EXCLUSIVES.iran;

  const heading = lt(locale, {
    fa: `پیشنهاد ویژه سفر به ${countryName(country, locale)}`,
    en: `Exclusive Travel Deal: ${countryName(country, locale)}`,
    ar: `العرض الحصري للسفر إلى ${countryName(country, locale)}`,
    zh: `${countryName(country, locale)} 专属出行特惠`,
    ru: `Специальное предложение: ${countryName(country, locale)}`,
  });

  const eyebrow = locale === 'fa' ? deal.eyebrow.fa : deal.eyebrow.en;
  const brand = locale === 'fa' ? deal.brand.fa : deal.brand.en;
  const description = locale === 'fa' ? deal.description.fa : deal.description.en;
  const cityBadge = locale === 'fa' ? deal.cityBadge.fa : deal.cityBadge.en;

  const cta = lt(locale, {
    fa: 'مشاهده و رزرو پکیج',
    en: 'Book Package',
    ar: 'احجز الباقة',
    zh: '立即预订',
    ru: 'Забронировать',
  });

  const features = [
    {
      label: lt(locale, { fa: 'بازدید از', en: 'Historic', ar: 'زيارة', zh: '历史', ru: 'Исторические' }),
      label2: lt(locale, { fa: 'جاذبه‌های برتر', en: 'Landmarks', ar: 'المعالم التاريخية', zh: '胜景探访', ru: 'достопримечательности' }),
      icon: Landmark,
    },
    {
      label: lt(locale, { fa: 'اقامت در هتل', en: 'Luxury', ar: 'إقامة في فندق', zh: '奢华', ru: 'Проживание' }),
      label2: lt(locale, { fa: '۵ ستاره لوکس', en: '5-Star Stay', ar: 'فاخر 5 نجوم', zh: '五星级入住', ru: 'в 5* отеле' }),
      icon: BedDouble,
    },
    {
      label: lt(locale, { fa: 'راهنمای محلی', en: 'Local', ar: 'مرشد محلي', zh: '本地', ru: 'Местный' }),
      label2: lt(locale, { fa: 'فارسی‌زبان', en: 'Expert Guide', ar: 'محترف', zh: '专业向导', ru: 'гид-эксперт' }),
      icon: UserRound,
    },
    {
      label: lt(locale, { fa: 'خدمات اختصاصی', en: 'Exclusive', ar: 'خدمات حصرية', zh: '专属', ru: 'Эксклюзивный' }),
      label2: lt(locale, { fa: 'ترانسفر VIP', en: '& VIP Service', ar: 'و VIP', zh: '与 VIP 服务', ru: 'и VIP-сервис' }),
      icon: Gem,
    },
  ];

  return (
    <section aria-label="Firuzo Exclusive Tour" className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8">
      {/* Heading row */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 md:mb-6">
        <h2 className="text-[20px] sm:text-[22px] md:text-[28px] font-black tracking-tight text-ink text-start leading-none">
          {heading}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0b3d3c] text-[#7af7f5] border border-[#0ea5a3]/30 px-3 py-1.5 text-[11px] sm:text-xs font-black tracking-wide shadow-sm whitespace-nowrap">
          <MapPin size={13} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />
          <span>{COUNTRIES[country]?.flag}</span>
          <span>{cityBadge}</span>
        </span>
      </div>

      {/* Turquoise Glass Card */}
      <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] md:rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#071e1e] via-[#0b3d3c] to-[#0f6b69] shadow-[0_20px_60px_rgba(3,40,38,0.35),0_8px_24px_rgba(0,0,0,0.18)]">
        {/* soft glow blobs */}
        <div className="pointer-events-none absolute -top-16 -end-16 sm:-top-24 sm:-end-24 w-[300px] h-[300px] sm:w-[520px] sm:h-[520px] rounded-full bg-[#1ee8e4]/15 blur-[50px] sm:blur-[70px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 -start-20 sm:-bottom-32 sm:-start-32 w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] rounded-full bg-[#0ea5a3]/20 blur-[45px] sm:blur-[60px]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/[0.06] via-transparent to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-cyan-200/10" aria-hidden="true" />

        <div className="relative flex flex-col lg:flex-row">
          {/* Text side */}
          <div className="flex-1 flex flex-col justify-center px-5 py-6 sm:p-7 md:p-8 lg:p-10 lg:pe-10 lg:ps-12 xl:p-12 order-1 min-w-0">
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

            {/* Features */}
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

            {/* CTA */}
            <div className="mt-6 sm:mt-7 md:mt-8 flex justify-stretch sm:justify-start">
              <Link
                href={deal.href}
                aria-label={cta}
                className="group inline-flex w-full sm:w-auto items-center justify-center sm:justify-start gap-3 rounded-full bg-[#7af7f5] hover:bg-[#9afaf8] active:bg-[#6ee7e5] text-[#052524] ps-6 pe-1.5 py-1.5 text-[15px] sm:text-sm font-black shadow-[0_8px_24px_rgba(74,242,240,0.35)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b3d3c] min-h-[48px] sm:min-h-0 touch-manipulation cursor-pointer"
              >
                <span className="flex-1 sm:flex-none text-center sm:text-start">{cta}</span>
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#052524] text-white group-hover:bg-black group-active:bg-black transition-colors shrink-0">
                  {isRtl ? <ArrowLeft size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
                </span>
              </Link>
            </div>
          </div>

          {/* Image side */}
          <div className="relative w-full lg:w-[52%] xl:w-[54%] shrink-0 p-3 pt-0 sm:p-4 sm:pt-0 lg:p-3 lg:ps-0 order-2">
            <div className="relative aspect-[16/11] sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[400px] rounded-[1.25rem] sm:rounded-[1.5rem] lg:rounded-[1.75rem] overflow-hidden border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_40px_rgba(0,0,0,0.25)] bg-[#0a2e2d]">
              <Image
                src={deal.img}
                alt={cityBadge}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(900, 600)}
                className="object-cover"
                priority={false}
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#0a4a49]/10 mix-blend-overlay" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-[3px] rounded-[1.1rem] sm:rounded-[1.3rem] lg:rounded-[1.5rem] border border-cyan-200/15" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
