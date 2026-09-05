'use client';

import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { countryName } from '@/lib/countries';
import {
  Plane, BedDouble, Compass, CarTaxiFront, TrainFront, Wifi, Languages, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { lt } from '@/lib/lt';

interface ServiceCardData {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tag?: string;
  iconBg: string;
}

export function ServicesCatalog() {
  const locale = useLocale();
  const t = useTranslations('Home');
  const { country } = useCountryStore();

  const coreServices: ServiceCardData[] = [
    {
      href: '/flights/search',
      icon: Plane,
      title: t('srvFlights'),
      desc: t('srvFlightsDesc'),
      tag: lt(locale, { fa: 'چارتری و سیستمی', en: 'Charter & Scheduled', ar: 'عارضة ومنتظمة', zh: '包机和定期航班', ru: 'Чартерные рейсы' }),
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
    },
    {
      href: '/hotels/search',
      icon: BedDouble,
      title: t('srvHotels'),
      desc: t('srvHotelsDesc'),
      tag: lt(locale, { fa: 'تضمین کمترین نرخ', en: 'Best Rate Guarantee', ar: 'ضمان أقل سعر', zh: '最优价格保证', ru: 'Гарантия цены' }),
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      href: '/tours',
      icon: Compass,
      title: t('srvTours'),
      desc: t('srvToursDesc'),
      tag: lt(locale, { fa: 'گشت‌های اختصاصی', en: 'Exclusive Tours', ar: 'جولات خاصة', zh: '独家旅游', ru: 'Эксклюзивные туры' }),
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300',
    },
    {
      href: '/transfers',
      icon: CarTaxiFront,
      title: t('srvTransfers'),
      desc: t('srvTransfersDesc'),
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      href: '/trains',
      icon: TrainFront,
      title: t('srvTrains'),
      desc: t('srvTrainsDesc'),
      iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300',
    },
    {
      href: '/esim',
      icon: Wifi,
      title: t('srvEsim'),
      desc: t('srvEsimDesc'),
      tag: lt(locale, { fa: 'فعال‌سازی آنی', en: 'Instant Setup', ar: 'تفعيل فوري', zh: '即时激活', ru: 'Мгновенная активация' }),
      iconBg: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300',
    },
    {
      href: '/insurance',
      icon: ShieldCheck,
      title: lt(locale, { fa: 'بیمه مسافرتی سامان', en: 'Saman Travel Insurance', ar: 'تأمين السفر', zh: '旅行医疗保险', ru: 'Страхование путешествий' }),
      desc: lt(locale, { fa: 'پوشش جامع فوریت‌های پزشکی و بار مسافر با تأییدیه بین‌المللی', en: 'Comprehensive medical and luggage coverage with global valid voucher', ar: 'تغطية طبية شاملة ومعتمدة دولياً', zh: '全球认可的医疗急救和行李保障', ru: 'Полное покрытие медицинских расходов и багажа' }),
      tag: lt(locale, { fa: 'پوشش تا ۵۰,۰۰۰ یورو', en: 'Up to €50k Coverage', ar: 'تغطية حتى ٥٠ ألف يورو', zh: '保额最高5万欧元', ru: 'Покрытие до 50 000 €' }),
      iconBg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
    },
    {
      href: '/interpreter',
      icon: Languages,
      title: t('srvInterpreter'),
      desc: t('srvInterpreterDesc'),
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
    },
  ];

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        <div>
          <p className="mb-2 text-brand-dark font-black text-xs">{t('servicesKicker')}</p>
          <h2 className="text-2xl md:text-[32px] font-black text-ink m-0">
            {t('servicesTitle', { country: countryName(country, locale) })}
          </h2>
        </div>

        {/* Perfectly Balanced 8-Card Grid: 2 cols on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
          {coreServices.map((srv) => {
            const Icon = srv.icon;
            return (
              <Link
                key={srv.href}
                href={srv.href}
                className="p-4 sm:p-5 rounded-2xl bg-surface border border-line hover:border-brand/40 hover:shadow-elev-2 transition-all flex flex-col justify-between gap-3 sm:gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs"
              >
                <div>
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${srv.iconBg} grid place-items-center mb-3 group-hover:scale-105 transition-transform`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-ink mb-1 group-hover:text-brand-dark transition-colors leading-tight">
                    {srv.title}
                  </h3>
                  <p className="text-[11.5px] sm:text-xs text-sub leading-relaxed line-clamp-2">
                    {srv.desc}
                  </p>
                </div>
                {srv.tag && (
                  <span className="self-start px-2.5 py-0.5 rounded-full bg-soft text-brand-dark text-[10.5px] font-bold">
                    {srv.tag}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

