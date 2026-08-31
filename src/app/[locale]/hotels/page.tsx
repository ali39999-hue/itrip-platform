'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { BedDouble, Star, ShieldCheck, Sparkles, MapPin, ArrowLeft } from 'lucide-react';
import { SearchWidget } from '@/components/search/SearchWidget';
import { shimmerDataUrl } from '@/lib/image-utils';
import { num } from '@/lib/format';

export default function HotelsLandingPage() {
  const locale = useLocale();

  const hotelCollections = [
    {
      title: 'هتل‌های لوکس ۵ ستاره',
      city: 'مشهد و تهران',
      desc: 'اقامت شاهانه با بالاترین سطح خدمات VIP و دسترسی عالی',
      price: 4800000,
      img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      stars: 5,
      query: '5star',
    },
    {
      title: 'بوتیک‌هتل‌های سنتی',
      city: 'اصفهان و شیراز',
      desc: 'خانه‌های قاجاری و صفوی بازسازی‌شده با حوض، شمعدانی و معماری اصیل',
      price: 2600000,
      img: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&q=80',
      stars: 4,
      query: 'boutique',
    },
    {
      title: 'ریزورت‌ها و اقامتگاه‌های ساحلی',
      city: 'کیش و قشم',
      desc: 'استراحت ساحلی با چشم‌انداز خلیج فارس، کلوپ دریایی و ترانسفر رایگان',
      price: 3900000,
      img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80',
      stars: 5,
      query: 'resort',
    },
    {
      title: 'هتل‌های اقتصادی و نزدیک مرکز',
      city: 'تهران و تبریز',
      desc: 'کیفیت بالا، هزینه اقتصادی، دسترسی سریع به مترو و جاذبه‌های شهری',
      price: 1500000,
      img: 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=600&q=80',
      stars: 3,
      query: 'budget',
    },
  ];

  return (
    <div className="min-h-screen bg-soft/30">
      {/* Hero Section with Search */}
      <section className="relative py-12 md:py-16 px-4 md:px-10 bg-gradient-to-b from-mint/40 via-surface to-soft/20">
        <div className="max-w-[1280px] mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 text-brand-dark text-xs font-bold mb-4">
            <BedDouble size={14} />
            <span>رزرواسیون مستقیم هتل و اقامتگاه فیروزو</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-ink tracking-tight mb-4">
            رزرو هتل و اقامتگاه‌های سنتی با <span className="text-brand-dark">تضمین کمترین نرخ</span>
          </h1>
          <p className="text-sm md:text-base text-sub font-bold max-w-2xl mx-auto leading-relaxed">
            بیش از ۲,۰۰۰ هتل ۵ ستاره، بوتیک‌هتل تاریخی و سوئیت اقامتی با واچر آنی و کنسلی رایگان
          </p>
        </div>

        <div className="max-w-[1280px] mx-auto">
          <SearchWidget initialTab="hotels" />
        </div>
      </section>

      {/* Featured Hotel Collections */}
      <section className="max-w-[1280px] mx-auto py-12 md:py-16 px-4 md:px-10">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-black text-brand-dark tracking-wider uppercase">دسته‌بندی‌های برگزیده</span>
            <h2 className="text-2xl md:text-3xl font-black text-ink m-0">بهترین اقامتگاه‌ها برای هر سلیقه و بودجه</h2>
          </div>
          <Link
            href="/hotels/search"
            className="text-xs font-bold text-brand-dark flex items-center gap-1.5 hover:underline"
          >
            <span>مشاهده همه اقامتگاه‌ها</span>
            <ArrowLeft size={14} className="ltr:rotate-180" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {hotelCollections.map((col, idx) => (
            <Link
              key={idx}
              href={`/hotels/search?type=${col.query}`}
              className="group relative h-80 rounded-3xl overflow-hidden shadow-elev-1 hover:shadow-elev-3 transition-all flex flex-col justify-between p-5"
            >
              <Image
                src={col.img}
                alt={col.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(250, 320)}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep/95 via-deep/40 to-transparent" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-surface/80 backdrop-blur-sm text-ink text-xs font-bold flex items-center gap-1">
                  <MapPin size={12} className="text-brand" />
                  {col.city}
                </span>
                <div className="flex text-gold">
                  {Array.from({ length: col.stars }).map((_, i) => (
                    <Star key={i} size={13} className="fill-gold" />
                  ))}
                </div>
              </div>

              <div className="relative z-10 text-surface space-y-1.5">
                <h3 className="text-lg font-black">{col.title}</h3>
                <p className="text-xs text-surface/80 line-clamp-2 leading-relaxed">{col.desc}</p>
                <div className="pt-2 border-t border-surface/20 flex items-center justify-between">
                  <span className="text-xs text-surface/70">شروع از</span>
                  <span className="text-sm font-black font-mono">
                    {num(col.price, locale)} <span className="text-[11px] font-normal">تومان/شب</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hotel Highlights */}
      <section className="max-w-[1280px] mx-auto py-12 px-4 md:px-10 border-t border-line/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl bg-surface border border-line shadow-elev-1 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-mint text-brand-dark grid place-items-center">
              <Sparkles size={24} />
            </div>
            <h3 className="text-base font-black text-ink">تضمین تمیزی و تطابق عکس‌ها</h3>
            <p className="text-xs text-sub font-bold leading-relaxed">
              تمامی اقامتگاه‌ها توسط تیم بازرسی فیروزو بررسی و استانداردهای بهداشتی آن‌ها تایید شده است
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-surface border border-line shadow-elev-1 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-mint text-brand-dark grid place-items-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-black text-ink">واچر الکترونیکی آنی</h3>
            <p className="text-xs text-sub font-bold leading-relaxed">
              صدور مستقیم برگه پذیرش رسمی هتل در لحظه پرداخت بدون معطلی و هماهنگی مجدد
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-surface border border-line shadow-elev-1 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-soft text-price grid place-items-center">
              <Star size={24} />
            </div>
            <h3 className="text-base font-black text-ink">قوانین کنسلی کاملاً شفاف</h3>
            <p className="text-xs text-sub font-bold leading-relaxed">
              امکان لغو رایگان در اکثر اقامتگاه‌ها و استرداد مستقیم وجه بدون کسر کارمزد اضافی
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

