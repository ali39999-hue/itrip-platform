'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import type { CountryId } from '@/lib/countries';
import { SearchWidget } from '@/components/search/SearchWidget';
import { shimmerDataUrl } from '@/lib/image-utils';
import type { HeroOverride } from '@/domains/content/SiteContentService';

const HERO_IMAGES: Record<CountryId, string> = {
  iran: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=2560',
  turkey: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=80&w=2560',
  uae: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=2560',
  georgia: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=2560',
  russia: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&q=80&w=2560',
  oman: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=2560',
  china: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?auto=format&fit=crop&q=80&w=2560',
};

export function HeroSection({ override }: { override?: HeroOverride } = {}) {
  const { country } = useCountryStore();
  const locale = useLocale();
  const t = useTranslations('Hero');
  const [imgError, setImgError] = useState(false);

  const cmsTitle = override?.title?.[locale === 'fa' ? 'fa' : 'en']?.trim();
  const cmsSubtitle = override?.subtitle?.[locale === 'fa' ? 'fa' : 'en']?.trim();
  const currentHeroImg =
    (override?.imageUrl && override.imageUrl !== '' ? override.imageUrl : null) ||
    HERO_IMAGES[country] ||
    HERO_IMAGES['turkey'];

  return (
    <section className="relative w-full min-h-0 md:min-h-[600px] lg:min-h-[640px] flex items-center justify-center overflow-visible pt-2 pb-4 md:py-12">
      {/* Background image + overlays */}
      <div className="absolute inset-0 z-0 px-2 sm:px-6 md:px-8 pt-1 pb-1">
        <div className={`relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-elev-1 ${imgError ? 'bg-gradient-to-br from-brand-dark to-brand' : 'bg-surface'}`}>
          <Image
            src={currentHeroImg}
            alt="Firuzo Travel Hero"
            fill
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL={shimmerDataUrl(1920, 1080)}
            className={`object-cover transition-all duration-700 ${imgError ? 'hidden' : 'block'}`}
            onError={() => setImgError(true)}
          />
          {imgError && <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand" />}
          {/* Multi-layer gradient: dark bottom for readable search, soft top for header */}
          <div className="absolute inset-0 bg-gradient-to-b from-deep/60 via-deep/40 to-deep/80 pointer-events-none" />
        </div>
      </div>

      {/* Hero content + immediate search */}
      <div className="relative z-[70] w-full max-w-[1440px] px-2.5 sm:px-4 md:px-6 2xl:px-8 mx-auto flex flex-col items-center">
        {/* Concise Mobile Heading & Editorial Desktop Typography */}
        <h1 className="text-surface text-center mb-1.5 md:mb-2 max-w-4xl text-xl sm:text-3xl md:text-5xl lg:text-[48px] leading-[1.3] font-black drop-shadow-md">
          {cmsTitle ? (
            cmsTitle
          ) : (
            <>
              {t('titleA')} <span className="text-mint-bright">{t('titleB')}</span> {t('titleC')}
            </>
          )}
        </h1>
        <p className="hidden sm:block text-surface/90 text-center font-bold mb-4 md:mb-8 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed drop-shadow-sm">
          {cmsSubtitle || t('subtitle')}
        </p>

        <SearchWidget />
      </div>
    </section>
  );
}
