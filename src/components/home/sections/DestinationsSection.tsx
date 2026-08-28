'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, countryName } from '@/lib/countries';
import { shimmerDataUrl } from '@/lib/image-utils';

export function DestinationsSection() {
  const locale = useLocale();
  const t = useTranslations('Home');
  const { country } = useCountryStore();
  const c = COUNTRIES[country];

  const cities = [
    { nameFa: 'تهران', nameEn: 'Tehran', img: 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=600&q=80', desc: 'پایتخت پرجنب‌وجوش با کافه‌ها و کاخ‌های تاریخی' },
    { nameFa: 'مشهد', nameEn: 'Mashhad', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80', desc: 'پایتخت معنوی و زیارتی با هتل‌های لوکس ۵ ستاره' },
    { nameFa: 'اصفهان', nameEn: 'Isfahan', img: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&q=80', desc: 'نصف جهان، پایتخت فرهنگ و معماری بی‌بدیل صفوی' },
    { nameFa: 'شیراز', nameEn: 'Shiraz', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80', desc: 'شهر شعر، ادب، باغ‌های دل‌انگیز و تخت جمشید' },
  ];

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        <div>
          <p className="mb-2 text-brand-dark font-black tracking-wide text-xs">{t('destinationsKicker')}</p>
          <h2 className="text-2xl md:text-[32px] font-black text-ink m-0 tracking-tight">
            {t('destinationsTitle', { country: countryName(country, locale) })}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cities.map((city) => (
            <Link
              key={city.nameEn}
              href={`/hotels/search?city=${encodeURIComponent(city.nameFa)}`}
              className="group relative h-72 rounded-3xl overflow-hidden shadow-elev-1 hover:shadow-elev-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Image
                src={city.img}
                alt={city.nameFa}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(300, 400)}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/30 to-transparent" />
              <div className="absolute bottom-4 start-4 end-4 text-surface">
                <h3 className="text-lg font-bold mb-1">{city.nameFa}</h3>
                <p className="text-xs text-surface/80 line-clamp-2 leading-relaxed">{city.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
