'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Plane, Building2, Map, Car, ArrowLeft, ArrowRight, FileCheck2, ShieldCheck, Wifi, Wallet, UserRound, BookOpenText } from 'lucide-react';

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
    { label: locale === 'fa' ? 'ویزا' : 'Visa', icon: FileCheck2, href: '/visa' },
    { label: locale === 'fa' ? 'بیمه مسافرتی' : 'Insurance', icon: ShieldCheck, href: '/insurance' },
    { label: locale === 'fa' ? 'سیم‌کارت eSIM' : 'eSIM', icon: Wifi, href: '/esim' },
    { label: locale === 'fa' ? 'کیف پول و ارز' : 'Wallet', icon: Wallet, href: '/wallet' },
    { label: locale === 'fa' ? 'سفرهای من' : 'My Trips', icon: UserRound, href: '/my-trips' },
    { label: locale === 'fa' ? 'راهنمای سفر' : 'Travel Guide', icon: BookOpenText, href: '/guide' },
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

      <h2 className="text-xl font-black text-ink mb-6">{locale === 'fa' ? 'خدمات تکمیلی' : 'Additional Services'}</h2>
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
