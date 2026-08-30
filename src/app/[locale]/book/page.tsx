'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Plane, Building2, Map, Car, ArrowLeft, ArrowRight, FileCheck2, ShieldCheck, Wifi, Wallet, UserRound, BookOpenText } from 'lucide-react';
import { lt } from '@/lib/lt';

export default function BookPage() {
  const t = useTranslations('Book');
  const locale = useLocale();
  const router = useRouter();

  const TILES = [
    { label: t('flights'), icon: Plane, href: '/flights/search', gradient: 'from-flight/80 to-flight' },
    { label: t('hotels'), icon: Building2, href: '/hotels/search', gradient: 'from-hotel/80 to-hotel' },
    { label: t('tours'), icon: Map, href: '/tours', gradient: 'from-tour/80 to-tour' },
    { label: t('transfers'), icon: Car, href: '/transfers', gradient: 'from-brand to-brand-dark' },
  ];

  const QUICK = [
    { label: lt(locale, { fa: 'ویزا', en: 'Visa', ar: 'تأشيرة', zh: '签证', ru: 'Виза' }), icon: FileCheck2, href: '/visa' },
    { label: lt(locale, { fa: 'بیمه مسافرتی', en: 'Travel Insurance', ar: 'تأمين السفر', zh: '旅行保险', ru: 'Страховка для поездок' }), icon: ShieldCheck, href: '/insurance' },
    { label: lt(locale, { fa: 'سیم‌کارت eSIM', en: 'eSIM', ar: 'شريحة eSIM', zh: 'eSIM 卡', ru: 'eSIM' }), icon: Wifi, href: '/esim' },
    { label: lt(locale, { fa: 'کیف پول و ارز', en: 'Wallet', ar: 'المحفظة والعملات', zh: '钱包与货币', ru: 'Кошелёк и валюты' }), icon: Wallet, href: '/wallet' },
    { label: lt(locale, { fa: 'سفرهای من', en: 'My Trips', ar: 'رحلاتي', zh: '我的旅行', ru: 'Мои поездки' }), icon: UserRound, href: '/my-trips' },
    { label: lt(locale, { fa: 'راهنمای سفر', en: 'Travel Guide', ar: 'دليل السفر', zh: '旅行指南', ru: 'Путеводитель' }), icon: BookOpenText, href: '/guide' },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-12">
      <h1 className="text-3xl font-black text-ink mb-2">{t('title')}</h1>
      <p className="text-[13px] font-bold text-sub mb-10">{t('subtitle')}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.label}
              onClick={() => router.push(tile.href)}
              className={`bg-gradient-to-br ${tile.gradient} rounded-2xl p-8 text-surface text-end hover:opacity-90 hover:-translate-y-1 transition-all shadow-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm cursor-pointer`}
            >
              <Icon size={44} className="mb-6" />
              <p className="font-black text-xl mb-1">{tile.label}</p>
              <span className="inline-flex items-center gap-1 text-[12.5px] font-bold opacity-90">
                {t('startSearch')}
                <ArrowLeft size={16} className="rtl:inline ltr:hidden" />
                <ArrowRight size={16} className="ltr:inline rtl:hidden" />
              </span>
            </button>
          );
        })}
      </div>

      <h2 className="text-xl font-black text-ink mb-6">{lt(locale, { fa: 'خدمات تکمیلی', en: 'Additional Services', ar: 'خدمات إضافية', zh: '增值服务', ru: 'Дополнительные услуги' })}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {QUICK.map((q) => {
          const Icon = q.icon;
          return (
            <button
              key={q.label}
              onClick={() => router.push(q.href)}
              className="bg-surface border border-line rounded-xl p-5 flex flex-col items-center gap-3 hover:border-brand transition group shadow-sm card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
            >
              <span className="bg-brand/10 text-brand p-3 rounded-full group-hover:bg-brand group-hover:text-surface transition">
                <Icon size={22} />
              </span>
              <span className="font-bold text-xs text-ink">{q.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
