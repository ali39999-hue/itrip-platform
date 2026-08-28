'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, countryName } from '@/lib/countries';
import { shimmerDataUrl, DESTINATION_IMAGE_MAP } from '@/lib/image-utils';

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
    const img = DESTINATION_IMAGE_MAP[city.en] || DESTINATION_IMAGE_MAP[city.fa] || 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=600&q=80';
    const desc = locale === 'fa' 
      ? `کشف زیبایی‌ها، جاذبه‌های برتر و اقامتگاه‌های لوکس ${city.fa}`
      : `Discover top attractions, culture & luxury stays in ${city.en}`;

    return {
      name: cityName,
      nameFa: city.fa,
      nameEn: city.en,
      href: city.href || `/hotels/search?city=${encodeURIComponent(city.fa)}`,
      img,
      desc,
    };
  });

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        <div>
          <p className="mb-2 text-brand-dark font-black tracking-wide text-xs">{t('destKicker')}</p>
          <h2 className="text-2xl md:text-[32px] font-black text-ink m-0 tracking-tight">
            {t('destTitle', { country: countryName(country, locale) })}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cities.map((city) => (
            <Link
              key={city.nameEn}
              href={city.href}
              className="group relative h-72 rounded-3xl overflow-hidden shadow-elev-1 hover:shadow-elev-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
