'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CountryExperiencesSection } from '@/components/shared/CountryExperiences';
import {
  Plane, Building2, Map, CarFront, FileCheck2, ShieldCheck, Wifi, Wallet,
  Luggage, Compass, Headset, UserRound, ArrowLeft, ArrowRight, CreditCard
} from 'lucide-react';

export default function ServicesPage() {
  const t = useTranslations('Services');
  const locale = useLocale();

  const MAIN_SERVICES = [
    { title: locale === 'fa' ? 'شارژ اسنپ (Snapp)' : 'Snapp Ride Recharge', desc: locale === 'fa' ? 'شارژ کیف پول با کارت بین‌المللی' : 'Top up rides with international card', icon: Wallet, href: '/snapp', bg: 'bg-action/15 text-price' },
    { title: locale === 'fa' ? 'فیروز پاس شهری' : 'Firuzo City Pass', desc: locale === 'fa' ? 'کارت مترو و BRT با مسیریاب اختصاصی' : 'Public transit pass & offline navigator', icon: CreditCard, href: '/city-pass', bg: 'bg-brand/15 text-brand' },
    { title: locale === 'fa' ? 'پرواز داخلی و خارجی' : 'Flights (Domestic & Int)', desc: locale === 'fa' ? 'جستجو در بیش از ۴۰۰ ایرلاین' : 'Search 400+ airlines worldwide', icon: Plane, href: '/flights/search', bg: 'bg-flight/15 text-flight' },
    { title: locale === 'fa' ? 'هتل و اقامتگاه' : 'Hotels & Stays', desc: locale === 'fa' ? 'از هتل ۵ ستاره تا بوتیک' : '5-star to boutique hotels', icon: Building2, href: '/hotels/search', bg: 'bg-hotel/15 text-hotel' },
    { title: locale === 'fa' ? 'تور و فعالیت' : 'Tours & Experiences', desc: locale === 'fa' ? 'تورهای فرهنگی، درمانی و ماجراجویی' : 'Cultural, medical & adventure tours', icon: Map, href: '/tours', bg: 'bg-tour/15 text-tour' },
    { title: locale === 'fa' ? 'ترانسفر فرودگاهی' : 'Airport Transfers', desc: locale === 'fa' ? 'خودرو با راننده در ۶ کشور' : 'Chauffeured cars in 6 countries', icon: CarFront, href: '/transfers', bg: 'bg-brand/15 text-brand' },
    { title: locale === 'fa' ? 'خدمات ویزا' : 'Visa Services', desc: locale === 'fa' ? 'اخذ ویزای توریستی با نرخ موفقیت بالا' : 'Tourist visa with high approval rate', icon: FileCheck2, href: '/visa', bg: 'bg-brand-dark/10 text-brand-dark' },
    { title: locale === 'fa' ? 'بیمه مسافرتی' : 'Travel Insurance', desc: locale === 'fa' ? 'پوشش پزشکی تا ۱۰۰ هزار یورو' : 'Medical coverage up to €100k', icon: ShieldCheck, href: '/insurance', bg: 'bg-success/15 text-success' },
    { title: locale === 'fa' ? 'سیم‌کارت و اینترنت' : 'eSIM & Data', desc: locale === 'fa' ? 'eSIM فعال آنی در مقصد' : 'Instant active eSIM on arrival', icon: Wifi, href: '/esim', bg: 'bg-action/15 text-action' },
    { title: locale === 'fa' ? 'کیف پول چندارزی' : 'Multi-Currency Wallet', desc: locale === 'fa' ? 'ریال، تتر و درهم + تبدیل لحظه‌ای' : 'IRR, USDT, AED + instant swap', icon: Wallet, href: '/wallet', bg: 'bg-mint-bright/30 text-brand-dark' },
    { title: locale === 'fa' ? 'سفرهای من' : 'My Trips', desc: locale === 'fa' ? 'کارت سفر دیجیتال و استرداد' : 'Digital travel vouchers & refunds', icon: Luggage, href: '/my-trips', bg: 'bg-rose-warm/10 text-rose-warm' },
    { title: locale === 'fa' ? 'راهنمای مقاصد' : 'Destination Guide', desc: locale === 'fa' ? 'تجربه مسافران و راهنمای شهرها' : 'City guides & tourist itineraries', icon: Compass, href: '/destinations', bg: 'bg-flight/10 text-flight' },
    { title: locale === 'fa' ? 'ورود و احراز هویت' : 'Sign In & KYC', desc: locale === 'fa' ? 'ثبت‌نام با موبایل + KYC پاسپورت' : 'Mobile login + Passport verification', icon: UserRound, href: '/auth', bg: 'bg-line/30 text-sub' },
    { title: locale === 'fa' ? 'پشتیبانی ۲۴/۷' : '24/7 Support', desc: locale === 'fa' ? 'تیکت، تماس و چت آنلاین' : 'Live chat, tickets & call center', icon: Headset, href: '/support', bg: 'bg-price/10 text-price' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-soft pb-16">
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-10">
        {/* Hero Section */}
        <section className="mb-12 text-center relative overflow-hidden rounded-xl bg-surface p-12 border border-line shadow-sm">
          <h1 className="font-black text-[32px] md:text-[40px] text-brand-dark mb-4 relative z-10">{t('title')}</h1>
          <p className="font-bold text-[16px] md:text-[18px] text-sub max-w-2xl mx-auto relative z-10">
            {t('subtitle')}
          </p>
        </section>

        {/* Local Services Grid */}
        <section className="mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {MAIN_SERVICES.map((s, idx) => {
              const Icon = s.icon;
              return (
                <Link
                  key={idx}
                  href={s.href}
                  className="p-6 rounded-2xl bg-surface border border-line shadow-sm hover:shadow-md hover:border-brand/40 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className={`w-12 h-12 rounded-xl grid place-items-center mb-4 ${s.bg}`}>
                      <Icon size={24} />
                    </div>
                    <h2 className="font-black text-base text-ink mb-1 group-hover:text-brand transition-colors">{s.title}</h2>
                    <p className="text-xs font-bold text-sub leading-relaxed">{s.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs font-black text-brand-dark">
                    <span>{locale === 'fa' ? 'مشاهده و رزرو' : 'Explore'}</span>
                    <ArrowLeft size={14} className="rtl:inline ltr:hidden group-hover:-translate-x-1 transition-transform" />
                    <ArrowRight size={14} className="ltr:inline rtl:hidden group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Signature Experiences */}
        <section className="mb-12">
          <CountryExperiencesSection />
        </section>
      </main>
    </div>
  );
}
