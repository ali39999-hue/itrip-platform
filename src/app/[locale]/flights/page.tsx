'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { Plane, ShieldCheck, RefreshCcw, Clock, ArrowLeft } from 'lucide-react';
import { SearchWidget } from '@/components/search/SearchWidget';
import { shimmerDataUrl } from '@/lib/image-utils';
import { num } from '@/lib/format';

export default function FlightsLandingPage() {
  const locale = useLocale();

  const popularRoutes = [
    { from: 'THR', fromName: 'Tehran', fromFa: 'تهران', to: 'IST', toName: 'Istanbul', toFa: 'استانبول', price: 8500000, img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', duration: '۳ ساعت', durationEn: '3h' },
    { from: 'THR', fromName: 'Tehran', fromFa: 'تهران', to: 'DXB', toName: 'Dubai', toFa: 'دبی', price: 9800000, img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', duration: '۲ ساعت', durationEn: '2h' },
    { from: 'MHD', fromName: 'Mashhad', fromFa: 'مشهد', to: 'THR', toName: 'Tehran', toFa: 'تهران', price: 2350000, img: 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?auto=format&fit=crop&w=800&q=80', duration: '۱.۵ ساعت', durationEn: '1.5h' },
    { from: 'THR', fromName: 'Tehran', fromFa: 'تهران', to: 'TBS', toName: 'Tbilisi', toFa: 'تفلیس', price: 6500000, img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', duration: '۱.۸ ساعت', durationEn: '1.8h' },
    { from: 'SYZ', fromName: 'Shiraz', fromFa: 'شیراز', to: 'IST', toName: 'Istanbul', toFa: 'استانبول', price: 8200000, img: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80', duration: '۳.۵ ساعت', durationEn: '3.5h' },
    { from: 'KIH', fromName: 'Kish', fromFa: 'کیش', to: 'THR', toName: 'Tehran', toFa: 'تهران', price: 2800000, img: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&w=800&q=80', duration: '۱.۶ ساعت', durationEn: '1.6h' },
  ];

  return (
    <div className="min-h-screen bg-soft/30">
      {/* Hero Section with Search */}
      <section className="relative py-12 md:py-16 px-4 md:px-10 bg-gradient-to-b from-mint/40 via-surface to-soft/20">
        <div className="max-w-[1280px] mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 text-brand-dark text-xs font-bold mb-4">
            <Plane size={14} />
            <span>{lt(locale, { fa: 'سامانه یکپارچه پروازهای فیروزو', en: 'Firuzo Integrated Flight System', ar: 'نظام فيروزو المتكامل لرحلات الطيران', zh: 'Firuzo 综合航班系统', ru: 'Интегрированная система полетов Firuzo' })}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-ink tracking-tight mb-4">
            {lt(locale, { fa: 'خرید آنلاین بلیط هواپیما با', en: 'Buy flight tickets online with', ar: 'شراء تذاكر الطيران عبر الإنترنت مع', zh: '在线购买机票伴随', ru: 'Покупка авиабилетов онлайн с' })} <span className="text-brand-dark">{lt(locale, { fa: 'تضمین کمترین قیمت', en: 'Best Price Guarantee', ar: 'ضمان أقل سعر', zh: '最低价格保证', ru: 'Гарантия лучшей цены' })}</span>
          </h1>
          <p className="text-sm md:text-base text-sub font-bold max-w-2xl mx-auto leading-relaxed">
            {lt(locale, { fa: 'پروازهای داخلی و خارجی بیش از ۴۰۰ ایرلاین معتبر با تسویه آنی و صدور فوری بلیط', en: 'Domestic and international flights from over 400 reputable airlines with instant settlement and ticketing', ar: 'رحلات داخلية ودولية من أكثر من 400 شركة طيران ذات سمعة طيبة مع تسوية وإصدار تذاكر فورية', zh: '来自 400 多家知名航空公司的国内和国际航班，即时结算和出票', ru: 'Внутренние и международные рейсы от более чем 400 надежных авиакомпаний с мгновенным расчетом и оформлением билетов' })}
          </p>
        </div>

        <div className="max-w-[1280px] mx-auto">
          <SearchWidget initialTab="flights" />
        </div>
      </section>

      {/* Popular Routes Grid */}
      <section className="max-w-[1280px] mx-auto py-12 md:py-16 px-4 md:px-10">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-black text-brand-dark tracking-wider uppercase">{lt(locale, { fa: 'مسیرهای پرتردد', en: 'Popular Routes', ar: 'المسارات الشائعة', zh: '热门航线', ru: 'Популярные маршруты' })}</span>
            <h2 className="text-2xl md:text-3xl font-black text-ink m-0">{lt(locale, { fa: 'محبوب‌ترین پروازهای داخلی و خارجی', en: 'Most Popular Domestic & International Flights', ar: 'أشهر الرحلات الداخلية والدولية', zh: '最受欢迎的国内和国际航班', ru: 'Самые популярные внутренние и международные рейсы' })}</h2>
          </div>
          <Link
            href="/flights/search"
            className="text-xs font-bold text-brand-dark flex items-center gap-1.5 hover:underline"
          >
            <span>{lt(locale, { fa: 'جستجوی همه مسیرها', en: 'Search All Routes', ar: 'البحث عن جميع المسارات', zh: '搜索所有路线', ru: 'Искать все маршруты' })}</span>
            <ArrowLeft size={14} className="ltr:rotate-180" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {popularRoutes.map((route, idx) => (
            <Link
              key={idx}
              href={`/flights/search?from=${route.fromName}&to=${route.toName}`}
              className="group relative h-64 rounded-3xl overflow-hidden shadow-elev-1 hover:shadow-elev-3 transition-all"
            >
              <Image
                src={route.img}
                alt={`${route.fromName} to ${route.toName}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(300, 240)}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/30 to-transparent" />

              <div className="absolute bottom-4 start-4 end-4 text-surface">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black">
                    {lt(locale, { fa: route.fromFa, en: route.fromName, ar: route.fromFa, zh: route.fromName, ru: route.fromName })}
                    {' '}
                    <span className="text-mint-bright">←</span>{' '}
                    {lt(locale, { fa: route.toFa, en: route.toName, ar: route.toFa, zh: route.toName, ru: route.toName })}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-surface/20 backdrop-blur-sm text-xs font-bold">
                    {lt(locale, { fa: route.duration, en: route.durationEn, ar: route.duration, zh: route.durationEn, ru: route.durationEn })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface/80">{lt(locale, { fa: 'شروع از', en: 'From', ar: 'يبدأ من', zh: '起价', ru: 'от' })}</span>
                  <span className="text-base font-black font-mono">
                    {num(route.price, locale)} <span className="text-xs font-normal">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томан' })}</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Value Propositions */}
      <section className="max-w-[1280px] mx-auto py-12 px-4 md:px-10 border-t border-line/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl bg-surface border border-line shadow-elev-1 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-mint text-brand-dark grid place-items-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-black text-ink">{lt(locale, { fa: 'صدور آنی و کد رهگیری رسمی', en: 'Instant Ticketing & Official PNR', ar: 'إصدار فوري ورمز تتبع رسمي', zh: '即时出票与官方追踪码', ru: 'Мгновенное оформление и официальный PNR' })}</h3>
            <p className="text-xs text-sub font-bold leading-relaxed">
              {lt(locale, { fa: 'صدور مستقیم بلیط و ثبت PNR رسمی در شبکه ایرلاین‌ها بدون کوچکترین تاخیر', en: 'Direct ticket issuance with an official PNR registered across airline networks — zero delay.', ar: 'إصدار التذاكر مباشرة مع تسجيل PNR رسمي في شبكات شركات الطيران دون تأخير.', zh: '直接出票并在航空公司网络中登记官方 PNR，零延迟。', ru: 'Прямое оформление билета с официальным PNR в сетях авиакомпаний — без задержек.' })}
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-surface border border-line shadow-elev-1 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-soft text-price grid place-items-center">
              <RefreshCcw size={24} />
            </div>
            <h3 className="text-base font-black text-ink">{lt(locale, { fa: 'کنسلی و استرداد آنلاین', en: 'Online Cancellation & Refund', ar: 'إلغاء واسترداد عبر الإنترنت', zh: '在线取消与退款', ru: 'Онлайн-отмена и возврат' })}</h3>
            <p className="text-xs text-sub font-bold leading-relaxed">
              {lt(locale, { fa: 'امکان استرداد آنی وجه طبق قوانین کنسلی پرواز و شارژ مستقیم به حساب یا کیف پول', en: 'Instant refunds per the fare cancellation rules, credited straight to your account or wallet.', ar: 'استرداد فوري وفق قواعد إلغاء الرحلة، يُضاف مباشرة إلى حسابك أو محفظتك.', zh: '按退票规则即时退款，直接存入您的账户或钱包。', ru: 'Мгновенный возврат по правилам тарифа — прямо на счет или в кошелек.' })}
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-surface border border-line shadow-elev-1 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-mint text-brand-dark grid place-items-center">
              <Clock size={24} />
            </div>
            <h3 className="text-base font-black text-ink">{lt(locale, { fa: 'پشتیبانی ۲۴ ساعته فرودگاهی', en: '24/7 Airport Support', ar: 'دعم مطارئ على مدار الساعة', zh: '全天候机场支持', ru: 'Поддержка в аэропорту 24/7' })}</h3>
            <p className="text-xs text-sub font-bold leading-relaxed">
              {lt(locale, { fa: 'تیم پشتیبانی اختصاصی فیروزو در کلیه ساعات پرواز و ترانزیت همراه شماست', en: 'The dedicated Firuzo support team is with you throughout every flight and transit.', ar: 'فريق دعم فيروزو المخصص معك في جميع ساعات الطيران والترانزيت.', zh: 'Firuzo 专属支持团队在您所有航班和中转时段全程陪伴。', ru: 'Выделенная команда поддержки Firuzo с вами на протяжении всех рейсов и транзитов.' })}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
