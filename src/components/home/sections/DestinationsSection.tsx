'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES } from '@/lib/countries';
import { countryNameL } from './countryNames';
import { shimmerDataUrl, DESTINATION_IMAGE_MAP } from '@/lib/image-utils';
import { lt } from '@/lib/lt';

export function DestinationsSection() {
  const locale = useLocale();
  const t = useTranslations('Home');
  const { country } = useCountryStore();
  const c = COUNTRIES[country] || COUNTRIES.iran;

  const cities = (c.cities && c.cities.length > 0 ? c.cities.slice(0, 4) : [
    { fa: 'تهران', en: 'Tehran', href: '/hotels/search?city=تهران', gradient: 'from-teal-500 to-emerald-700' },
    { fa: 'مشهد', en: 'Mashhad', href: '/hotels/search?city=مشهد', gradient: 'from-amber-500 to-orange-700' },
    { fa: 'اصفهان', en: 'Isfahan', href: '/hotels/search?city=اصفهان', gradient: 'from-cyan-500 to-blue-700' },
    { fa: 'شیراز', en: 'Shiraz', href: '/hotels/search?city=شیراز', gradient: 'from-emerald-500 to-teal-800' },
  ]).map((city) => {
    const cityName = locale === 'fa' ? city.fa : city.en;
    const img = DESTINATION_IMAGE_MAP[city.en] || DESTINATION_IMAGE_MAP[city.fa] || '/images/isfahan/sheikh-lotfollah.jpg';
    const desc = lt(locale, {
      fa: `کشف جاذبه‌های برتر، فرهنگ غنی و اقامتگاه‌های لوکس ${city.fa}`,
      en: `Discover top attractions, culture & luxury stays in ${city.en}`,
      ar: `اكتشف أفضل المعالم والثقافة والإقامة الفاخرة في ${city.en}`,
      zh: `探索 ${city.en} 的热门景点、丰富文化与特色住宿`,
      ru: `Откройте для себя достопримечательности и отели в ${city.en}`,
    });

    return {
      name: cityName,
      nameFa: city.fa,
      nameEn: city.en,
      href: city.href || `/hotels/search?city=${encodeURIComponent(locale === 'fa' ? city.fa : city.en)}`,
      img,
      desc,
    };
  });

  return (
    <section className="w-full py-6 md:py-10 px-3 sm:px-4 md:px-6 2xl:px-8">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
        <div>
          <p className="mb-2 text-brand-dark font-black text-xs">{t('destKicker')}</p>
          <h2 className="text-2xl md:text-[32px] font-black text-ink m-0">
            {t('destTitle', { country: countryNameL(country, locale) })}
          </h2>
        </div>

        <div className="flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pb-3 sm:pb-0 scrollbar-none touch-pan-x">
          {cities.map((city) => (
            <Link
              key={city.nameEn}
              href={city.href}
              className="shrink-0 w-[84vw] sm:w-auto snap-start group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-elev-1 hover:shadow-elev-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Image
                src={city.img}
                alt={city.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(300, 400)}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/30 to-transparent" />
              <div className="absolute bottom-4 start-4 end-4 text-surface">
                <h3 className="text-lg font-bold mb-1">{city.name}</h3>
                <p className="text-xs text-surface/80 line-clamp-2 leading-relaxed">{city.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
