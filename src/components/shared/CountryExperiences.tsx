'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import {
  COUNTRIES, experienceCategoryLabel, countryName,
  type CountryId, type ExperienceCategory, type SignatureExperience,
} from '@/lib/countries';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import {
  Sailboat, PartyPopper, Landmark, Trees, Sparkles, MoonStar, MountainSnow,
  Drama, Palette, ArrowLeft, MapPin, Languages, type LucideIcon,
} from 'lucide-react';

import { ExperienceDetailModal } from './ExperienceDetailModal';

export const CATEGORY_ICONS: Record<ExperienceCategory, LucideIcon> = {
  yacht: Sailboat,
  festival: PartyPopper,
  culture: Landmark,
  nature: Trees,
  wellness: Sparkles,
  nightlife: MoonStar,
  adventure: MountainSnow,
  theater: Drama,
  exhibition: Palette,
};

export function useExperiences() {
  const { country: storeCountry, setCountry } = useCountryStore();
  const searchParams = useSearchParams();
  const urlCountry = searchParams?.get('country') as CountryId | null;
  const country = urlCountry && COUNTRIES[urlCountry] ? urlCountry : storeCountry;

  useEffect(() => {
    if (urlCountry && COUNTRIES[urlCountry] && urlCountry !== storeCountry) {
      setCountry(urlCountry);
    }
  }, [urlCountry, storeCountry, setCountry]);

  const locale = useLocale();
  const c = COUNTRIES[country] || COUNTRIES.iran;
  const isEn = locale === 'en';
  const [dbExperiences, setDbExperiences] = useState<SignatureExperience[]>([]);

  useEffect(() => {
    fetch(`/api/experiences?country=${encodeURIComponent(country)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const formatted: SignatureExperience[] = json.data.map((exp: Record<string, unknown>) => ({
            title: String(exp.title || ''),
            titleEn: String(exp.titleEn || exp.title || ''),
            desc: String(exp.desc || ''),
            descEn: String(exp.descEn || exp.desc || ''),
            category: exp.category as SignatureExperience['category'],
            where: String(exp.where || ''),
            whereEn: String(exp.whereEn || exp.where || ''),
            when: String(exp.when || ''),
            whenEn: String(exp.whenEn || exp.when || ''),
            fromPrice: Number(exp.fromPrice),
          }));
          setDbExperiences(formatted);
        } else {
          setDbExperiences([]);
        }
      })
      .catch(() => {
        setDbExperiences([]);
      });
  }, [country]);

  const allExperiences = useMemo(() => {
    return [...dbExperiences, ...c.signatureExperiences];
  }, [dbExperiences, c.signatureExperiences]);

  return {
    c,
    isEn,
    experiences: allExperiences,
    titleOf: (e: SignatureExperience) => (locale === 'fa' ? e.title : e.titleEn),
    descOf: (e: SignatureExperience) => (locale === 'fa' ? e.desc : e.descEn),
    whereOf: (e: SignatureExperience) => (locale === 'fa' ? e.where : e.whereEn),
    whenOf: (e: SignatureExperience) => (locale === 'fa' ? e.when : e.whenEn),
    catOf: (cat: ExperienceCategory) => experienceCategoryLabel(cat, locale),
  };
}

export function bookExperience(
  router: ReturnType<typeof useRouter>,
  e: SignatureExperience,
  locale: string,
  countryId: CountryId
) {
  const title = locale === 'en' ? e.titleEn : e.title;
  router.push(`/tours?category=signature&country=${countryId}&city=${encodeURIComponent(title)}`);
}

export function ExperienceCard({
  e, title, desc, where, when, catLabel, fromLabel, tomanLabel, onBook,
}: {
  e: SignatureExperience;
  title: string;
  desc: string;
  where: string;
  when: string;
  catLabel: string;
  fromLabel: string;
  tomanLabel: string;
  onBook: () => void;
}) {
  const locale = useLocale();
  const Icon = CATEGORY_ICONS[e.category];
  return (
    <button
      onClick={onBook}
      className="w-full group flex flex-col text-start p-5 rounded-xl bg-surface border border-line shadow-sm hover:border-brand/40 hover:shadow-elev-1 transition-all duration-300 card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mint text-brand-dark text-[10.5px] font-black">
          <Icon size={13} /> {catLabel}
        </span>
        <span className="text-[10px] font-bold text-sub bg-soft px-2 py-1 rounded-full" dir="auto">
          {when}
        </span>
      </div>
      <h3 className="text-[15.5px] font-black text-ink mb-1.5 group-hover:text-brand-dark transition-colors leading-snug">
        {title}
      </h3>
      <p className="text-[12px] font-bold text-sub leading-relaxed line-clamp-2 mb-3">{desc}</p>
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sub mb-4">
        <MapPin size={12} className="text-brand-dark shrink-0" /> {where}
      </span>
      {(e.category === 'culture' || e.category === 'theater' || e.category === 'exhibition' || e.category === 'festival') && (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-gold-soft text-price mb-2">
          <Languages size={11} aria-hidden="true" />
          <span>
            {lt(locale, {
              fa: 'مترجم ساعتی دارد',
              en: 'Hourly interpreter available',
              ar: 'مترجم بالساعة متاح',
              zh: '可提供按小时翻译陪同',
              ru: 'Доступен почасовой переводчик',
            })}
          </span>
        </span>
      )}
      <div className="mt-auto flex items-center justify-between border-t border-line/70 pt-3">
        <span className="text-start">
          <span className="block text-[10px] font-bold text-sub">{fromLabel}</span>
          <b className="text-price text-[15px] font-black num">{num(e.fromPrice, locale)}</b>
          <span className="text-[10px] font-bold text-sub"> {tomanLabel}</span>
        </span>
        <span className="w-9 h-9 grid place-items-center rounded-full bg-soft text-brand-dark group-hover:bg-brand group-hover:text-surface transition-colors">
          <ArrowLeft size={15} className="ltr:-scale-x-100" />
        </span>
      </div>
    </button>
  );
}

/** بخش «تجربه‌های اصیل» — در خانه، خدمات و تورها استفاده می‌شود */
export function CountryExperiencesSection({
  variant = 'section',
  limit,
}: {
  variant?: 'section' | 'embedded';
  limit?: number;
}) {
  const { c, experiences, titleOf, descOf, whereOf, whenOf, catOf } = useExperiences();
  const locale = useLocale();
  const t = useTranslations('Experiences');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<'all' | ExperienceCategory>('all');
  const [selectedExp, setSelectedExp] = useState<SignatureExperience | null>(null);
  const lastHandledCityRef = useRef<string | null>(null);

  useEffect(() => {
    const cityOrTitle = searchParams?.get('city');
    if (!cityOrTitle) {
      lastHandledCityRef.current = null;
      return;
    }
    if (cityOrTitle && experiences.length > 0 && lastHandledCityRef.current !== cityOrTitle) {
      lastHandledCityRef.current = cityOrTitle;
      const needle = decodeURIComponent(cityOrTitle.replace(/\+/g, ' ')).trim().toLowerCase();
      const matched = experiences.find(
        (e) =>
          e.title.toLowerCase().includes(needle) ||
          (e.titleEn && e.titleEn.toLowerCase().includes(needle)) ||
          e.where.toLowerCase().includes(needle) ||
          (e.whereEn && e.whereEn.toLowerCase().includes(needle)) ||
          needle.includes(e.title.toLowerCase())
      );
      if (matched) {
        setSelectedExp(matched);
      }
    }
  }, [searchParams, experiences]);

  const handleClose = () => {
    setSelectedExp(null);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (params.has('city')) {
      params.delete('city');
      const newQuery = params.toString();
      router.replace(newQuery ? `${pathname}?${newQuery}` : pathname, { scroll: false });
    }
  };

  const cats = useMemo(() => {
    const set = new Set<ExperienceCategory>(experiences.map((e) => e.category));
    return [...set];
  }, [experiences]);

  const list = useMemo(() => {
    const f = filter === 'all' ? experiences : experiences.filter((e) => e.category === filter);
    return limit ? f.slice(0, limit) : f;
  }, [experiences, filter, limit]);

  return (
    <section className={variant === 'section' ? 'py-8 md:py-12' : ''}>
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <p className="mb-2 text-brand-dark font-black text-[11px]">
              {c.flag} {t('kicker', { country: countryName(c.id, locale) })}
            </p>
            <h2 className="m-0 text-2xl md:text-[30px] font-black">
              {t('title')}
            </h2>
            <p className="m-0 mt-2 text-sub text-xs max-w-xl">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* فیلتر دسته‌بندی */}
        <div className="flex gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`min-h-9 px-4 rounded-full text-[12.5px] font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              filter === 'all'
                ? 'bg-brand text-surface shadow-sm shadow-brand/25'
                : 'bg-soft/80 border border-line/70 text-sub hover:text-brand-dark'
            }`}
          >
            {t('all')} ({num(experiences.length, locale)})
          </button>
          {cats.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`inline-flex items-center gap-1.5 min-h-9 px-4 rounded-full text-[12.5px] font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                filter === cat
                  ? 'bg-brand text-surface shadow-sm shadow-brand/25'
                  : 'bg-soft/80 border border-line/70 text-sub hover:text-brand-dark'
              }`}
            >
              {(() => {
                const Icon = CATEGORY_ICONS[cat];
                return <Icon size={13} />;
              })()}
              {catOf(cat)}
            </button>
          ))}
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 hide-scrollbar">
          {list.map((e) => (
            <div key={e.titleEn} className="shrink-0 w-[280px] sm:w-[320px] md:w-auto snap-start flex">
              <ExperienceCard
                e={e}
                title={titleOf(e)}
                desc={descOf(e)}
                where={whereOf(e)}
                when={whenOf(e)}
                catLabel={catOf(e.category)}
                fromLabel={t('from')}
                tomanLabel={t('toman')}
                onBook={() => setSelectedExp(e)}
              />
            </div>
          ))}
        </div>
      </div>

      <ExperienceDetailModal
        experience={selectedExp}
        isOpen={Boolean(selectedExp)}
        onClose={handleClose}
      />
    </section>
  );
}
