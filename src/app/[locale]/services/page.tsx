'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CountryExperiencesSection } from '@/components/shared/CountryExperiences';
import {
  Plane, Building2, Map, CarFront, FileCheck2, ShieldCheck, Wifi, Wallet,
  Luggage, Compass, Headset, UserRound, ArrowLeft, ArrowRight, CreditCard
} from 'lucide-react';
import { lt } from '@/lib/lt';

export default function ServicesPage() {
  const t = useTranslations('Services');
  const locale = useLocale();

  const MAIN_SERVICES = [
    { title: lt(locale, { fa: 'شارژ اسنپ (Snapp)', en: 'Snapp Ride Recharge', ar: 'شحن رحلات سناب (Snapp)', zh: 'Snapp 打车充值', ru: 'Пополнение Snapp' }), desc: lt(locale, { fa: 'شارژ کیف پول با کارت بین‌المللی', en: 'Top up rides with international card', ar: 'اشحن رصيد الرحلات ببطاقة دولية', zh: '使用国际银行卡充值打车余额', ru: 'Пополнение поездок международной картой' }), icon: Wallet, href: '/snapp', bg: 'bg-action/15 text-price' },
    { title: lt(locale, { fa: 'فیروز پاس شهری', en: 'Firuzo City Pass', ar: 'فيروزو باس المدينة', zh: 'Firuzo 城市通卡', ru: 'Городской проездной Firuzo' }), desc: lt(locale, { fa: 'کارت مترو و BRT با مسیریاب اختصاصی', en: 'Public transit pass & offline navigator', ar: 'بطاقة المترو و BRT مع مخطط مسارات مخصص', zh: '地铁与 BRT 卡，附专属路线规划', ru: 'Проездной на метро и BRT с навигатором' }), icon: CreditCard, href: '/city-pass', bg: 'bg-brand/15 text-brand' },
    { title: lt(locale, { fa: 'پرواز داخلی و خارجی', en: 'Flights (Domestic & Int)', ar: 'رحلات داخلية ودولية', zh: '国内与国际航班', ru: 'Внутренние и международные рейсы' }), desc: lt(locale, { fa: 'جستجو در بیش از ۴۰۰ ایرلاین', en: 'Search 400+ airlines worldwide', ar: 'ابحث بين أكثر من 400 شركة طيران', zh: '搜索全球 400+ 家航空公司', ru: 'Поиск по 400+ авиакомпаниям мира' }), icon: Plane, href: '/flights/search', bg: 'bg-flight/15 text-flight' },
    { title: lt(locale, { fa: 'هتل و اقامتگاه', en: 'Hotels & Stays', ar: 'الفنادق وأماكن الإقامة', zh: '酒店与住宿', ru: 'Отели и проживание' }), desc: lt(locale, { fa: 'از هتل ۵ ستاره تا بوتیک', en: '5-star to boutique hotels', ar: 'من فنادق 5 نجوم إلى فنادق بووتيك', zh: '从五星酒店到精品旅馆', ru: 'От 5-звёздочных до бутик-отелей' }), icon: Building2, href: '/hotels/search', bg: 'bg-hotel/15 text-hotel' },
    { title: lt(locale, { fa: 'تور و فعالیت', en: 'Tours & Experiences', ar: 'الجولات والتجارب', zh: '观光与体验', ru: 'Туры и впечатления' }), desc: lt(locale, { fa: 'تورهای فرهنگی، درمانی و ماجراجویی', en: 'Cultural, medical & adventure tours', ar: 'جولات ثقافية وعلاجية ومغامرات', zh: '文化、医疗与探险之旅', ru: 'Культурные, медицинские и приключенческие туры' }), icon: Map, href: '/tours', bg: 'bg-tour/15 text-tour' },
    { title: lt(locale, { fa: 'ترانسفر فرودگاهی', en: 'Airport Transfers', ar: 'نقل المطار', zh: '机场接送', ru: 'Трансфер из аэропорта' }), desc: lt(locale, { fa: 'خودرو با راننده در ۷ کشور', en: 'Chauffeured cars in 7 countries', ar: 'سيارات مع سائق في 7 دول', zh: '7 国专车接送', ru: 'Авто с водителем в 7 странах' }), icon: CarFront, href: '/transfers', bg: 'bg-brand/15 text-brand' },
    { title: lt(locale, { fa: 'خدمات ویزا', en: 'Visa Services', ar: 'خدمات التأشيرات', zh: '签证服务', ru: 'Визовые услуги' }), desc: lt(locale, { fa: 'اخذ ویزای توریستی با نرخ موفقیت بالا', en: 'Tourist visa with high approval rate', ar: 'تأشيرة سياحية بنسبة موافقة عالية', zh: '高成功率的旅游签证', ru: 'Туристическая виза с высоким процентом одобрения' }), icon: FileCheck2, href: '/visa', bg: 'bg-brand-dark/10 text-brand-dark' },
    { title: lt(locale, { fa: 'بیمه مسافرتی', en: 'Travel Insurance', ar: 'تأمين السفر', zh: '旅行保险', ru: 'Страховка для поездок' }), desc: lt(locale, { fa: 'پوشش پزشکی تا ۱۰۰ هزار یورو', en: 'Medical coverage up to €100k', ar: 'تغطية طبية تصل إلى 100 ألف يورو', zh: '最高 10 万欧元医疗保障', ru: 'Медицинское покрытие до 100 000 €' }), icon: ShieldCheck, href: '/insurance', bg: 'bg-success/15 text-success' },
    { title: lt(locale, { fa: 'سیم‌کارت و اینترنت', en: 'eSIM & Data', ar: 'الشريحة والإنترنت', zh: 'eSIM 与流量', ru: 'eSIM и интернет' }), desc: lt(locale, { fa: 'eSIM فعال آنی در مقصد', en: 'Instant active eSIM on arrival', ar: 'شريحة eSIM مفعّلة فوراً عند الوصول', zh: '抵达即用的 eSIM', ru: 'eSIM, активная сразу по прибытии' }), icon: Wifi, href: '/esim', bg: 'bg-action/15 text-action' },
    { title: lt(locale, { fa: 'کیف پول چندارزی', en: 'Multi-Currency Wallet', ar: 'محفظة متعددة العملات', zh: '多币种钱包', ru: 'Мультивалютный кошелёк' }), desc: lt(locale, { fa: 'ریال، تتر و درهم + تبدیل لحظه‌ای', en: 'IRR, USDT, AED + instant swap', ar: 'ريال وتيثر ودرهم + تحويل فوري', zh: '里亚尔、USDT、迪拉姆 + 即时兑换', ru: 'Риал, USDT, дирхам + мгновенный обмен' }), icon: Wallet, href: '/wallet', bg: 'bg-mint-bright/30 text-brand-dark' },
    { title: lt(locale, { fa: 'سفرهای من', en: 'My Trips', ar: 'رحلاتي', zh: '我的旅行', ru: 'Мои поездки' }), desc: lt(locale, { fa: 'کارت سفر دیجیتال و استرداد', en: 'Digital travel vouchers & refunds', ar: 'قسائم سفر رقمية واسترداد', zh: '数字旅行凭证与退款', ru: 'Цифровые ваучеры и возвраты' }), icon: Luggage, href: '/my-trips', bg: 'bg-rose-warm/10 text-rose-warm' },
    { title: lt(locale, { fa: 'راهنمای مقاصد', en: 'Destination Guide', ar: 'دليل الوجهات', zh: '目的地指南', ru: 'Гид по направлениям' }), desc: lt(locale, { fa: 'تجربه مسافران و راهنمای شهرها', en: 'City guides & tourist itineraries', ar: 'تجارب المسافرين وأدلة المدن', zh: '旅行者体验与城市指南', ru: 'Опыт путешественников и гиды по городам' }), icon: Compass, href: '/destinations', bg: 'bg-flight/10 text-flight' },
    { title: lt(locale, { fa: 'ورود و احراز هویت', en: 'Sign In & KYC', ar: 'تسجيل الدخول والتحقق من الهوية', zh: '登录与实名认证', ru: 'Вход и верификация' }), desc: lt(locale, { fa: 'ثبت‌نام با موبایل + KYC پاسپورت', en: 'Mobile login + Passport verification', ar: 'تسجيل بالجوال + تحقق بجواز السفر', zh: '手机注册 + 护照认证', ru: 'Регистрация по телефону + проверка паспорта' }), icon: UserRound, href: '/auth', bg: 'bg-line/30 text-sub' },
    { title: lt(locale, { fa: 'پشتیبانی ۲۴/۷', en: '24/7 Support', ar: 'دعم على مدار الساعة', zh: '24/7 客服', ru: 'Поддержка 24/7' }), desc: lt(locale, { fa: 'تیکت، تماس و چت آنلاین', en: 'Live chat, tickets & call center', ar: 'تذاكر واتصال ودردشة مباشرة', zh: '工单、电话与在线客服', ru: 'Тикеты, звонки и онлайн-чат' }), icon: Headset, href: '/support', bg: 'bg-price/10 text-price' },
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
                    <span>{lt(locale, { fa: 'مشاهده و رزرو', en: 'Explore', ar: 'استكشف واحجز', zh: '浏览并预订', ru: 'Смотреть и бронировать' })}</span>
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
