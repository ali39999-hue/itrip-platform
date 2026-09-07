'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { Sparkles, ArrowLeft, Plane, Hotel, ShieldCheck } from 'lucide-react';
import { shimmerDataUrl } from '@/lib/image-utils';
import { lt } from '@/lib/lt';

export function PromotionalBanners() {
  const locale = useLocale();

  const banners = [
    {
      id: 'b1',
      tag: lt(locale, { fa: 'تخفیف ویژه پرواز', en: 'Flight Deal', ar: 'خصم الطيران', zh: '机票特惠', ru: 'Скидка на рейс' }),
      title: lt(locale, {
        fa: 'پروازهای رفت‌وبرگشت استانبول و دبی',
        en: 'Roundtrip Flights: Istanbul & Dubai',
        ar: 'رحلات الذهاب والعودة إلى إسطنبول ودبي',
        zh: '伊斯坦布尔与迪拜往返特惠航班',
        ru: 'Рейсы в Стамбул и Дубай туда и обратно',
      }),
      subtitle: lt(locale, {
        fa: 'با برترین ایرلاین‌ها و امکان رزرو بلیت سیستمی با استرداد بدون جریمه',
        en: 'Top airlines with systemic booking and fee-free refund guarantee',
        ar: 'أفضل خطوط الطيران مع استرداد مجاني',
        zh: '精选航司正班出票，保障极速退改',
        ru: 'Лучшие авиакомпании и возврат без штрафа',
      }),
      cta: lt(locale, { fa: 'مشاهده پروازها', en: 'View Flights', ar: 'عرض الرحلات', zh: '查看航班', ru: 'Смотреть рейсы' }),
      href: '/flights/search?from=تهران&to=استانبول',
      gradient: 'from-[#033b3a] via-[#045956] to-[#00a9a5]',
      badgeBg: 'bg-mint text-brand-dark',
      icon: Plane,
      img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=75&w=800',
    },
    {
      id: 'b2',
      tag: lt(locale, { fa: 'اقامت لوکس', en: 'Luxury Stay', ar: 'إقامة فاخرة', zh: '豪华住宿', ru: 'Люкс отели' }),
      title: lt(locale, {
        fa: 'هتل‌های ۵ ستاره مشهد و کیش با صبحانه رایگان',
        en: '5-Star Hotels in Mashhad & Kish',
        ar: 'فنادق 5 نجوم في مشهد وكیش',
        zh: '马什哈德与基什岛五星豪华酒店',
        ru: '5-звездочные отели в Мешхеде и Кише',
      }),
      subtitle: lt(locale, {
        fa: 'اقامت خاطره‌انگیز با ترانسفر فرودگاهی اختصاصی و تضمین کمترین نرخ',
        en: 'Memorable stay with free airport transfers and lowest rate guarantee',
        ar: 'إقامة مميزة مع نقل المطار المجاني',
        zh: '免费机场接送与全网低价保障',
        ru: 'Бесплатный трансфер и гарантия лучшей цены',
      }),
      cta: lt(locale, { fa: 'رزرو آنلاین هتل', en: 'Book Hotel', ar: 'احجز الآن', zh: '立即预订', ru: 'Забронировать' }),
      href: '/hotels/search?city=مشهد',
      gradient: 'from-[#7c3a00] via-[#b45309] to-[#f0a62a]',
      badgeBg: 'bg-gold-soft text-price',
      icon: Hotel,
      img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=75&w=800',
    },
    {
      id: 'b3',
      tag: lt(locale, { fa: 'صدور فوری', en: 'Instant Cover', ar: 'إصدار فوري', zh: '秒级出函', ru: 'Мгновенно' }),
      title: lt(locale, {
        fa: 'بیمه مسافرتی سامان مورد تایید شنگن',
        en: 'Schengen-Approved Saman Travel Insurance',
        ar: 'تأمين سامان المعتمد لسفارات شنغن',
        zh: '申根签证使馆认可 Saman 医疗保险',
        ru: 'Страховка Saman, одобренная Шенгеном',
      }),
      subtitle: lt(locale, {
        fa: 'پوشش جامع حوادث پزشکی تا ۵۰ هزار یورو با صدور آنی کد بیمه‌نامه',
        en: 'Up to €50k medical coverage with instant official policy verification',
        ar: 'تغطية تصل إلى 50,000 يورو مع تأكيد فوري',
        zh: '保额最高5万欧元，极速出具电子保单',
        ru: 'Покрытие до 50 000 € с мгновенной выпиской',
      }),
      cta: lt(locale, { fa: 'صدور آنی بیمه', en: 'Get Insurance', ar: 'إصدار التأمين', zh: '立即投保', ru: 'Оформить' }),
      href: '/insurance',
      gradient: 'from-[#1e3a8a] via-[#1d4ed8] to-[#0284c7]',
      badgeBg: 'bg-blue-100 text-blue-900',
      icon: ShieldCheck,
      img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=75&w=800',
    },
  ];

  return (
    <section aria-label="Promotional Campaigns" className="w-full max-w-[1280px] mx-auto px-4 md:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {banners.map((b) => {
          const Icon = b.icon;
          return (
            <Link
              key={b.id}
              href={b.href}
              className="group relative rounded-3xl overflow-hidden shadow-elev-1 hover:shadow-elev-3 transition-all duration-300 min-h-[220px] p-6 flex flex-col justify-between text-surface"
            >
              {/* Background Image with Gradient Overlay */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={b.img}
                  alt={b.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  placeholder="blur"
                  blurDataURL={shimmerDataUrl(600, 300)}
                  className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-30"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${b.gradient} mix-blend-multiply opacity-95`} />
              </div>

              {/* Top Tag & Icon */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-xs ${b.badgeBg}`}>
                  <Icon size={13} aria-hidden="true" />
                  <span>{b.tag}</span>
                </span>
                <Sparkles size={16} className="text-surface/70" aria-hidden="true" />
              </div>

              {/* Title & Description */}
              <div className="relative z-10 my-3">
                <h3 className="text-base sm:text-lg font-black text-surface mb-1.5 leading-snug">
                  {b.title}
                </h3>
                <p className="text-xs text-surface/80 font-bold leading-relaxed line-clamp-2">
                  {b.subtitle}
                </p>
              </div>

              {/* Bottom CTA Button */}
              <div className="relative z-10 flex items-center justify-between pt-2 border-t border-surface/20">
                <span className="text-xs font-black text-surface group-hover:underline flex items-center gap-1.5">
                  <span>{b.cta}</span>
                  <ArrowLeft size={14} className="ltr:rotate-180 transition-transform group-hover:-translate-x-1 ltr:group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
