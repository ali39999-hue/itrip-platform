'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Plane, Building2, Map, Car, ArrowLeft, ArrowRight, FileCheck2, ShieldCheck, Wifi, Wallet, UserRound, BookOpenText, CreditCard, TrainFront, Sparkles } from 'lucide-react';
import { lt } from '@/lib/lt';
import { shimmerDataUrl } from '@/lib/image-utils';

export default function BookPage() {
  const t = useTranslations('Book');
  const locale = useLocale();
  const router = useRouter();

  const TILES = [
    { label: t('flights'), icon: Plane, href: '/flights/search', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=75&w=800', tag: '۴۰۰+ ایرلاین' },
    { label: t('hotels'), icon: Building2, href: '/hotels/search', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=75&w=800', tag: 'تضمین کمترین نرخ' },
    { label: t('tours'), icon: Map, href: '/tours', image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=75&w=800', tag: 'گشت‌های اختصاصی' },
    { label: t('transfers'), icon: Car, href: '/transfers', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=75&w=800', tag: 'استقبال فرودگاهی VIP' },
  ];

  const QUICK = [
    { label: lt(locale, { fa: 'شارژ اسنپ', en: 'Snapp Rides', ar: 'شحن سناب', zh: 'Snapp 打车', ru: 'Snapp поездки' }), icon: Wallet, href: '/snapp' },
    { label: lt(locale, { fa: 'فیروز پاس شهری', en: 'City Pass', ar: 'بطاقة المدينة', zh: '城市通票', ru: 'Сити Пасс' }), icon: CreditCard, href: '/city-pass' },
    { label: lt(locale, { fa: 'قطار بین‌شهری', en: 'Trains', ar: 'القطارات', zh: '城际列车', ru: 'Поезда' }), icon: TrainFront, href: '/trains' },
    { label: lt(locale, { fa: 'ویزا مسافرتی', en: 'Visa', ar: 'تأشيرة', zh: '签证', ru: 'Виза' }), icon: FileCheck2, href: '/visa' },
    { label: lt(locale, { fa: 'بیمه مسافرتی', en: 'Travel Insurance', ar: 'تأمين السفر', zh: '旅行保险', ru: 'Страховка' }), icon: ShieldCheck, href: '/insurance' },
    { label: lt(locale, { fa: 'سیم‌کارت eSIM', en: 'eSIM', ar: 'شريحة eSIM', zh: 'eSIM 卡', ru: 'eSIM' }), icon: Wifi, href: '/esim' },
    { label: lt(locale, { fa: 'کیف پول و ارز', en: 'Wallet', ar: 'المحفظة والعملات', zh: '钱包与货币', ru: 'Кошелёк' }), icon: Wallet, href: '/wallet' },
    { label: lt(locale, { fa: 'سفرهای من', en: 'My Trips', ar: 'رحلاتي', zh: '我的旅行', ru: 'Мои поездки' }), icon: UserRound, href: '/my-trips' },
    { label: lt(locale, { fa: 'راهنمای سفر', en: 'Travel Guide', ar: 'دليل السفر', zh: '旅行指南', ru: 'Путеводитель' }), icon: BookOpenText, href: '/guide' },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-10 space-y-10">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-brand-dark text-xs font-black mb-2">
          <Sparkles size={14} />
          <span>رزرو یکپارچه خدمات هوشمند سفر</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-ink mb-2">{t('title')}</h1>
        <p className="text-xs sm:text-sm font-bold text-sub max-w-xl">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {TILES.map((tile) => {
          return (
            <button
              key={tile.label}
              onClick={() => router.push(tile.href)}
              className="relative rounded-3xl h-64 p-6 text-surface text-start overflow-hidden hover:shadow-elev-3 hover:-translate-y-1 transition-all group shadow-sm cursor-pointer border border-line flex flex-col justify-between"
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
                <p className="font-black text-2xl text-surface mb-2">{tile.label}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-mint-bright group-hover:text-surface transition-colors">
                  <span>{t('startSearch')}</span>
                  <ArrowLeft size={14} className="rtl:inline ltr:hidden group-hover:-translate-x-1 transition-transform" />
                  <ArrowRight size={14} className="ltr:inline rtl:hidden group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-black text-ink">{lt(locale, { fa: 'سایر خدمات مسافرتی', en: 'Complementary Travel Services', ar: 'خدمات سفر إضافية', zh: '其他旅行服务', ru: 'Дополнительные услуги' })}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.label}
                onClick={() => router.push(q.href)}
                className="bg-surface border border-line rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:border-brand/50 hover:shadow-xs transition group shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
              >
                <span className="w-11 h-11 bg-soft text-brand-dark rounded-xl grid place-items-center group-hover:bg-brand group-hover:text-surface transition-colors shadow-2xs">
                  <Icon size={20} />
                </span>
                <span className="font-black text-xs text-ink text-center leading-tight">{q.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
