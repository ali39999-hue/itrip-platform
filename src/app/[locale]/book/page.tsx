'use client';

import { useRouter } from '@/i18n/routing';
import { Plane, Building2, Map, Car, ArrowLeft, FileCheck2, ShieldCheck, Wifi, Wallet, UserRound, BookOpenText } from 'lucide-react';

const TILES = [
  { label: 'پرواز', icon: Plane, href: '/flights/search', gradient: 'from-flight/80 to-flight' },
  { label: 'اقامتگاه', icon: Building2, href: '/hotels/search', gradient: 'from-hotel/80 to-hotel' },
  { label: 'تور و فعالیت', icon: Map, href: '/tours', gradient: 'from-tour/80 to-tour' },
  { label: 'ترانسفر', icon: Car, href: '/transfers', gradient: 'from-brand to-brand-dark' },
];

const QUICK = [
  { label: 'ویزا', icon: FileCheck2, href: '/visa' },
  { label: 'بیمه مسافرتی', icon: ShieldCheck, href: '/insurance' },
  { label: 'سیم‌کارت eSIM', icon: Wifi, href: '/esim' },
  { label: 'کیف پول و ارز', icon: Wallet, href: '/wallet' },
  { label: 'سفرهای من', icon: UserRound, href: '/my-trips' },
  { label: 'راهنمای سفر', icon: BookOpenText, href: '/guide' },
];

export default function BookPage() {
  const router = useRouter();

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-12">
      <h1 className="text-3xl font-black text-ink mb-2">رزرو سریع سفر</h1>
      <p className="text-[13px] font-bold text-sub mb-10">سرویس مورد نظر خود را انتخاب کنید</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              onClick={() => router.push(t.href)}
              className={`bg-gradient-to-br ${t.gradient} rounded-2xl p-8 text-surface text-end hover:opacity-90 hover:-translate-y-1 transition-all shadow-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm`}
            >
              <Icon size={44} className="mb-6" />
              <p className="font-black text-xl mb-1">{t.label}</p>
              <span className="inline-flex items-center gap-1 text-[12.5px] font-bold opacity-90">
                شروع جستجو <ArrowLeft size={16} />
              </span>
            </button>
          );
        })}
      </div>

      <h2 className="text-xl font-black text-ink mb-6">خدمات تکمیلی</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {QUICK.map((q) => {
          const Icon = q.icon;
          return (
            <button
              key={q.label}
              onClick={() => router.push(q.href)}
              className="bg-surface border border-line rounded-xl p-5 flex flex-col items-center gap-3 hover:border-brand transition group shadow-sm card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="bg-brand/10 text-brand p-3 rounded-full group-hover:bg-brand group-hover:text-surface transition">
                <Icon size={22} />
              </span>
              <span className="text-[12.5px] font-black text-ink">{q.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
