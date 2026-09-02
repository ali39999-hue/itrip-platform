'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import type { CountryId } from '@/lib/countries';
import { SearchWidget } from '@/components/search/SearchWidget';
import { shimmerDataUrl } from '@/lib/image-utils';

const HERO_IMAGES: Record<CountryId, string> = {
  iran: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=2560',
  turkey: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=80&w=2560',
  uae: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=2560',
  georgia: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=2560',
  russia: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&q=80&w=2560',
  oman: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&q=80&w=2560',
  china: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?auto=format&fit=crop&q=80&w=2560',
};

export function HeroSection() {
  const { country } = useCountryStore();
  const t = useTranslations('Hero');
  const [imgError, setImgError] = useState(false);
  
  const currentHeroImg = HERO_IMAGES[country] || HERO_IMAGES['turkey'];

  return (
    <section className="relative w-full min-h-[640px] md:h-[85vh] flex items-center justify-center overflow-visible">
      {/* Background image + overlays */}
      <div className="absolute inset-0 z-0 px-4 md:px-10 pt-4 pb-2">
        <div className={`relative w-full h-full rounded-3xl overflow-hidden shadow-elev-1 ${imgError ? 'bg-gradient-to-br from-brand-dark to-brand' : 'bg-surface'}`}>
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
          <div className="absolute inset-0 bg-deep/30 pointer-events-none" />
        </div>
      </div>

      {/* Hero content + glass search */}
      <div className="relative z-[70] w-full max-w-[1280px] px-4 md:px-10 mx-auto flex flex-col items-center pt-14 pb-16 md:pt-20 md:pb-24">
        <h1 className="text-surface text-center mb-4 max-w-3xl text-[32px] md:text-[40px] leading-[1.25] md:leading-[1.3] font-black tracking-tight drop-shadow-lg">
          {t('titleA')} <span className="text-mint-bright">{t('titleB')}</span> {t('titleC')}
        </h1>
        <p className="text-surface/90 text-center font-bold mb-10 max-w-xl text-[15px] md:text-lg leading-relaxed drop-shadow-md">
          {t('subtitle')}
        </p>

        <SearchWidget />
      </div>
    </section>
  );
}
