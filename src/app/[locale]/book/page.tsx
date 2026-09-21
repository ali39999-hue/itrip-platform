'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  Map, ArrowLeft, ArrowRight, FileCheck2, ShieldCheck,
  Wifi, BookOpenText, CreditCard, TrainFront, Sparkles, Languages, Wallet,
} from 'lucide-react';
import { SearchWidget } from '@/components/search/SearchWidget';
import { shimmerDataUrl } from '@/lib/image-utils';

export default function BookPage() {
  const t = useTranslations('Book');
  const nt = useTranslations('Nav');

  const TILES = [
    { label: t('flights'), href: '/flights/search', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=75&w=800', tag: t('tagFlights') },
    { label: t('hotels'), href: '/hotels/search', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=75&w=800', tag: t('tagHotels') },
    { label: t('tours'), href: '/tours', image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=75&w=800', tag: t('tagTours') },
    { label: t('transfers'), href: '/transfers', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=75&w=800', tag: t('tagTransfers') },
  ];

  const QUICK = [
    { label: nt('visa'), icon: FileCheck2, href: '/visa' },
    { label: nt('insurance'), icon: ShieldCheck, href: '/insurance' },
    { label: nt('esim'), icon: Wifi, href: '/esim' },
    { label: nt('trains'), icon: TrainFront, href: '/trains' },
    { label: nt('cityPass'), icon: CreditCard, href: '/city-pass' },
    { label: nt('snapp'), icon: Wallet, href: '/snapp' },
    { label: nt('interpreter'), icon: Languages, href: '/interpreter' },
    { label: nt('guide'), icon: BookOpenText, href: '/guide' },
    { label: nt('destinations'), icon: Map, href: '/destinations' },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8 py-6 md:py-8 space-y-8 pb-24 lg:pb-8">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-brand-dark text-xs font-black mb-2">
          <Sparkles size={14} />
          <span>{t('hubBadge')}</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-ink mb-2">{t('title')}</h1>
        <p className="text-xs sm:text-sm font-bold text-sub max-w-xl leading-relaxed">{t('subtitle')}</p>
      </div>

      <SearchWidget />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="relative rounded-3xl h-64 p-6 text-surface text-start overflow-hidden hover:shadow-elev-3 active:scale-[0.98] transition-all group shadow-sm border border-line flex flex-col justify-between"
          >
            <Image
              src={tile.image}
              alt={tile.label}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              placeholder="blur"
              blurDataURL={shimmerDataUrl(400, 300)}
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep/95 via-deep/40 to-transparent" />

            <div className="relative z-10">
              <span className="inline-flex px-2.5 py-0.5 rounded-full bg-surface/20 backdrop-blur-md text-[11px] font-black text-mint-bright border border-surface/20">
                {tile.tag}
              </span>
            </div>

            <div className="relative z-10 w-full">
              <p className="font-black text-2xl text-white mb-2">{tile.label}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-mint-bright group-hover:text-white transition-colors">
                <span>{t('startSearch')}</span>
                <ArrowLeft size={14} className="rtl:inline ltr:hidden group-hover:-translate-x-1 transition-transform" />
                <ArrowRight size={14} className="ltr:inline rtl:hidden group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-black text-ink">{t('moreServices')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                className="bg-surface border border-line rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:border-brand/50 hover:shadow-xs transition group shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-[88px]"
              >
                <span className="w-11 h-11 bg-mint text-brand-dark rounded-xl grid place-items-center group-hover:bg-brand group-hover:text-surface transition-colors shadow-2xs">
                  <Icon size={20} />
                </span>
                <span className="font-black text-xs text-ink text-center leading-tight">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
