'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, countryName } from '@/lib/countries';
import { CountryExperiencesSection } from '@/components/shared/CountryExperiences';
import {
  Plane, Building2, Map, CarFront, FileCheck2, ShieldCheck, Wifi, Wallet,
  Luggage, Compass, Headset, UserRound, ArrowLeft, ArrowUpLeft, Sparkles, CreditCard
} from 'lucide-react';

const MAIN_SERVICES = [
  { title: 'شارژ اسنپ (Snapp)', desc: 'شارژ کیف پول با کارت بین‌المللی', icon: Wallet, href: '/snapp', bg: 'bg-action/15 text-price' },
  { title: 'فیروز پاس شهری', desc: 'کارت مترو و BRT با مسیریاب اختصاصی', icon: CreditCard, href: '/city-pass', bg: 'bg-brand/15 text-brand' },
  { title: 'پرواز داخلی و خارجی', desc: 'جستجو در بیش از ۴۰۰ ایرلاین', icon: Plane, href: '/flights/search', bg: 'bg-flight/15 text-flight' },
  { title: 'هتل و اقامتگاه', desc: 'از هتل ۵ ستاره تا بوتیک', icon: Building2, href: '/hotels/search', bg: 'bg-hotel/15 text-hotel' },
  { title: 'تور و فعالیت', desc: 'تورهای فرهنگی، درمانی و ماجراجویی', icon: Map, href: '/tours', bg: 'bg-tour/15 text-tour' },
  { title: 'ترانسفر فرودگاهی', desc: 'خودرو با راننده در ۶ کشور', icon: CarFront, href: '/transfers', bg: 'bg-brand/15 text-brand' },
  { title: 'خدمات ویزا', desc: 'اخذ ویزای توریستی با نرخ موفقیت بالا', icon: FileCheck2, href: '/visa', bg: 'bg-brand-dark/10 text-brand-dark' },
  { title: 'بیمه مسافرتی', desc: 'پوشش پزشکی تا ۱۰۰ هزار یورو', icon: ShieldCheck, href: '/insurance', bg: 'bg-success/15 text-success' },
  { title: 'سیم‌کارت و اینترنت', desc: 'eSIM فعال آنی در مقصد', icon: Wifi, href: '/esim', bg: 'bg-action/15 text-action' },
  { title: 'کیف پول چندارزی', desc: 'ریال، تتر و درهم + تبدیل لحظه‌ای', icon: Wallet, href: '/wallet', bg: 'bg-mint-bright/30 text-brand-dark' },
  { title: 'سفرهای من', desc: 'کارت سفر دیجیتال و استرداد', icon: Luggage, href: '/my-trips', bg: 'bg-rose-warm/10 text-rose-warm' },
  { title: 'راهنمای مقاصد', desc: 'تجربه مسافران و راهنمای شهرها', icon: Compass, href: '/destinations', bg: 'bg-flight/10 text-flight' },
  { title: 'ورود و احراز هویت', desc: 'ثبت‌نام با موبایل + KYC پاسپورت', icon: UserRound, href: '/auth', bg: 'bg-line/30 text-sub' },
  { title: 'پشتیبانی ۲۴/۷', desc: 'تیکت، تماس و چت آنلاین', icon: Headset, href: '/support', bg: 'bg-price/10 text-price' },
];

export default function ServicesPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Plan');
  const isEn = locale === 'en';
  const { country } = useCountryStore();
  const c = COUNTRIES[country];
  const cName = countryName(country, locale);

  return (
    <div className="flex flex-col min-h-screen bg-soft pb-16">
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-10">
        
        {/* Hero Section */}
        <section className="mb-12 text-center relative overflow-hidden rounded-xl bg-surface p-12 border border-line shadow-sm">
          <h1 className="font-black text-[32px] md:text-[40px] text-brand-dark mb-4 relative z-10">همه خدمات در یک نگاه</h1>
          <p className="font-bold text-[16px] md:text-[18px] text-sub max-w-2xl mx-auto relative z-10">
            از رزرو پرواز تا بیمه مسافرتی و پرداخت‌های ارزی، تمامی نیازهای سفر شما را در یک مکان یکپارچه کرده‌ایم.
          </p>
          <div className="absolute top-0 end-0 w-64 h-64 opacity-10 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Decorative bg" className="w-full h-full object-cover rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqOwyV0ZEvnSB4_GNWNDT-qIDU87aYxoZDIY3-arUXL7RszXr_rlQYOg5cNv24FUUuGHFH6dYl9ytavDYG66sKXaAdz-kwBim2IlvrxjyzQDadkmNwt3CHM7Q43HUwZCHTQA2-c-Dg4XlsWssyu-MBIPK_5yw47f0WCzKjDZq2GYFVf97MYBLrKuHjKkybNMCKyTeBsu0gvKUOAHDdb5SkZeo78ZD_M59azxBJfQnRwvQGbZkJVdcMXUbMP6BIeR23aQ" />
          </div>
          <div className="absolute bottom-0 start-0 w-64 h-64 opacity-10 transform -translate-x-1/4 translate-y-1/4 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Decorative bg 2" className="w-full h-full object-cover rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqOwyV0ZEvnSB4_GNWNDT-qIDU87aYxoZDIY3-arUXL7RszXr_rlQYOg5cNv24FUUuGHFH6dYl9ytavDYG66sKXaAdz-kwBim2IlvrxjyzQDadkmNwt3CHM7Q43HUwZCHTQA2-c-Dg4XlsWssyu-MBIPK_5yw47f0WCzKjDZq2GYFVf97MYBLrKuHjKkybNMCKyTeBsu0gvKUOAHDdb5SkZeo78ZD_M59azxBJfQnRwvQGbZkJVdcMXUbMP6BIeR23aQ" />
          </div>
        </section>

        {/* Local Services (User Laziness Strategy) */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row justify-between items-end mb-6">
            <div>
              <span className="inline-block bg-brand/10 text-brand font-black text-[11px] px-3 py-1 rounded-full mb-3">
                ویژه مقصد شما
              </span>
              <h2 className="font-black text-[24px] text-ink">
                {isEn ? `Travel package for ${cName}` : `پکیج اختصاصی سفر به ${cName}`} {c.flag}
              </h2>
              <p className="font-bold text-[14px] text-sub mt-2">
                {isEn
                  ? `Book every service you'll need in ${cName} in one place.`
                  : `تمام سرویس‌هایی که در ${cName} به آن‌ها نیاز پیدا خواهید کرد، یک‌جا رزرو کنید.`}
              </p>
            </div>
            <button className="hidden md:flex text-action font-black text-[13px] items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              {isEn ? `${cName} guide` : `مشاهده راهنمای ${cName}`} <ArrowLeft size={16} className="ltr:rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {c.services.slice(0, 4).map((s) => (
              <button 
                key={s.key} 
                onClick={() => router.push(s.href)} 
                className="bg-surface rounded-xl p-5 text-start border border-line shadow-sm hover:border-action/50 hover:shadow-md transition-all group card-lift flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <div>
                  <h3 className="font-black text-[16px] text-ink mb-1 group-hover:text-action transition-colors">{isEn ? s.titleEn : s.title}</h3>
                  <p className="font-bold text-[12.5px] text-sub">{isEn ? s.descEn : s.desc}</p>
                </div>
                <div className="mt-6 flex justify-end">
                  <span className="bg-soft text-brand-dark p-2 rounded-full group-hover:bg-action group-hover:text-[#14201f] transition-colors">
                    <ArrowUpLeft size={18} className="ltr:rotate-180" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Smart planner CTA */}
        <section className="mb-16">
          <button
            onClick={() => router.push('/plan')}
            className="w-full text-start rounded-2xl p-6 md:p-8 rtl:bg-gradient-to-l ltr:bg-gradient-to-r from-brand to-brand-dark text-surface relative overflow-hidden shadow-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <span className="absolute -start-16 -top-20 w-48 h-48 rounded-full border-[28px] border-white/10 pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 rounded-2xl bg-surface/20 backdrop-blur grid place-items-center shrink-0 group-hover:scale-110 transition-transform">
                  <Sparkles size={26} />
                </span>
                <div>
                  <p className="m-0 text-mint-bright text-[11px] font-black tracking-wide">{t('kicker')}</p>
                  <h2 className="m-0 text-xl md:text-2xl font-black mt-1">{t('plannerCtaDesc')}</h2>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 min-h-11 px-6 rounded-full bg-surface text-brand-dark font-black text-[13px] shrink-0">
                {t('generate')} <ArrowLeft size={15} className="ltr:rotate-180" />
              </span>
            </div>
          </button>
        </section>

        {/* Signature experiences of the selected country */}
        <CountryExperiencesSection variant="embedded" />

        {/* Main Services Grid */}
        <section>
          <h2 className="font-black text-[24px] text-ink mb-6">کاتالوگ کامل خدمات</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {MAIN_SERVICES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.title}
                  onClick={() => router.push(s.href)}
                  className="bg-surface rounded-xl border border-line p-6 text-start shadow-sm hover:border-brand hover:shadow-md transition-all group card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.bg} mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon size={28} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-black text-[17px] text-ink mb-2">{s.title}</h3>
                  <p className="font-bold text-[13px] text-sub leading-relaxed">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
