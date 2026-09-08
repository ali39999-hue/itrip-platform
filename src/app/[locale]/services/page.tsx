'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CountryExperiencesSection } from '@/components/shared/CountryExperiences';
import {
  Plane, Building2, Map, CarFront, FileCheck2, ShieldCheck, Wifi, Wallet,
  Compass, Headset, UserRound, ArrowLeft, ArrowRight, CreditCard,
  Search, X, Sparkles, TrainFront
} from 'lucide-react';
import { lt } from '@/lib/lt';

type ServiceCategory = 'all' | 'transit' | 'stay' | 'telecom' | 'finance';

export default function ServicesPage() {
  const t = useTranslations('Services');
  const locale = useLocale();
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredServices = useMemo(() => {
    const MAIN_SERVICES = [
      // Transit & Mobility
      {
        title: lt(locale, { fa: 'شارژ اسنپ (Snapp)', en: 'Snapp Ride Recharge', ar: 'شحن رحلات سناب (Snapp)', zh: 'Snapp 打车充值', ru: 'Пополнение Snapp' }),
        desc: lt(locale, { fa: 'شارژ آنلاین کیف پول اسنپ با ارزهای بین‌المللی و تسویه آنی', en: 'Top up rides with international cards & instant settlement', ar: 'اشحن رصيد الرحلات ببطاقة دولية', zh: '使用国际银行卡充值打车余额', ru: 'Пополнение поездок международной картой' }),
        icon: Wallet,
        href: '/snapp',
        bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
        category: 'transit' as const,
        tag: lt(locale, { fa: 'شارژ کمتر از ۶۰ ثانیه', en: 'Under 60s top-up', ar: 'شحن في ثوانٍ', zh: '60秒即时充值', ru: 'Меньше 60 сек' })
      },
      {
        title: lt(locale, { fa: 'فیروز پاس شهری', en: 'Firuzo City Pass', ar: 'فيروزو باس المدينة', zh: 'Firuzo 城市通卡', ru: 'Городской проездной Firuzo' }),
        desc: lt(locale, { fa: 'کارت مترو و BRT با مسیریاب اختصاصی و تخفیف اماکن تاریخی', en: 'Public transit pass & offline navigator with tourist discounts', ar: 'بطاقة المترو و BRT مع مخطط مسارات مخصص', zh: '地铁与 BRT 卡，附专属路线规划', ru: 'Проездной на метро и BRT с навигатором' }),
        icon: CreditCard,
        href: '/city-pass',
        bg: 'bg-brand/10 text-brand-dark dark:bg-brand/20 dark:text-mint-bright',
        category: 'transit' as const,
        tag: lt(locale, { fa: 'محبوب گردشگران', en: 'Most Popular', ar: 'الأكثر طلباً', zh: '最受欢迎', ru: 'Популярно' })
      },
      {
        title: lt(locale, { fa: 'ترانسفر فرودگاهی و تشریفات', en: 'Airport & CIP Transfers', ar: 'نقل المطار والتشريفات', zh: '机场接送与CIP贵宾', ru: 'Трансфер и CIP встречи' }),
        desc: lt(locale, { fa: 'استقبال در فرودگاه با تابلوی نام مسافر و خودروهای VIP با راننده مسلط', en: 'Meet & greet chauffeur cars in 7 regional countries', ar: 'سيارات مع سائق في 7 دول', zh: '7 国专车接送', ru: 'Авто с водителем в 7 странах' }),
        icon: CarFront,
        href: '/transfers',
        bg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
        category: 'transit' as const,
        tag: lt(locale, { fa: 'پایش تاخیر پرواز', en: 'Flight Delay Tracking', ar: 'تتبع الرحلات', zh: '航班延误追踪', ru: 'Отслеживание рейса' })
      },
      {
        title: lt(locale, { fa: 'قطارهای لوکس بین‌شهری', en: 'Intercity Trains', ar: 'القطارات الفاخرة', zh: '城际列车', ru: 'Поезда' }),
        desc: lt(locale, { fa: 'رزرو قطارهای ۵ ستاره فدک، رجا و قطارهای سریع‌السیر گردشگری', en: '5-star boutique & express sleeper trains', ar: 'قطارات فاخرة', zh: '五星级列车', ru: 'Поезда 5 звезд' }),
        icon: TrainFront,
        href: '/trains',
        bg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300',
        category: 'transit' as const,
        tag: lt(locale, { fa: 'کوپه‌های VIP', en: 'VIP Compartments', ar: 'مقصورات VIP', zh: 'VIP包厢', ru: 'VIP купе' })
      },

      // Stays & Flights
      {
        title: lt(locale, { fa: 'پروازهای داخلی و بین‌المللی', en: 'Flights (Domestic & Int)', ar: 'رحلات داخلية ودولية', zh: '国内与国际航班', ru: 'Внутренние и международные рейсы' }),
        desc: lt(locale, { fa: 'جستجو و مقایسه بلیط بیش از ۴۰۰ ایرلاین معتبر با صدور آنی', en: 'Search 400+ airlines worldwide with instant e-ticket issuance', ar: 'ابحث بين أكثر من 400 شركة طيران', zh: '搜索全球 400+ 家航空公司', ru: 'Поиск по 400+ авиакомпаниям мира' }),
        icon: Plane,
        href: '/flights/search',
        bg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
        category: 'stay' as const,
        tag: lt(locale, { fa: 'ارزان‌ترین نرخ‌ها', en: 'Best Fares', ar: 'أفضل الأسعار', zh: '超值票价', ru: 'Лучшие цены' })
      },
      {
        title: lt(locale, { fa: 'هتل و اقامتگاه‌های سنتی', en: 'Hotels & Heritage Stays', ar: 'الفنادق وأماكن الإقامة', zh: '酒店与住宿', ru: 'Отели и проживание' }),
        desc: lt(locale, { fa: 'از هتل‌های ۵ ستاره لوکس تا هتل‌بوتیک‌ها و کاروانسراهای تاریخی', en: '5-star to boutique hotels and heritage caravanserais', ar: 'من فنادق 5 نجوم إلى فنادق بووتيك', zh: '从五星酒店到精品旅馆', ru: 'От 5-звёздочных до бутик-отелей' }),
        icon: Building2,
        href: '/hotels/search',
        bg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
        category: 'stay' as const,
        tag: lt(locale, { fa: 'کنسلی رایگان', en: 'Free Cancellation', ar: 'إلغاء مجاني', zh: '免费取消', ru: 'Бесплатная отмена' })
      },
      {
        title: lt(locale, { fa: 'تور و تجارب اصیل فرهنگی', en: 'Tours & Signature Experiences', ar: 'الجولات والتجارب', zh: '观光与体验', ru: 'Туры и впечатления' }),
        desc: lt(locale, { fa: 'برنامه‌های دست‌چین طبیعت‌گردی، فرهنگی و ماجراجویی با راهنمای مجرب', en: 'Curated cultural, culinary and scenic regional adventures', ar: 'جولات ثقافية وعلاجية ومغامرات', zh: '文化、美食与自然探索', ru: 'Культурные и природные туры' }),
        icon: Map,
        href: '/tours',
        bg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300',
        category: 'stay' as const,
        tag: lt(locale, { fa: 'برنامه سفر جامع', en: 'Full Itinerary', ar: 'برنامج متكامل', zh: '全包行程', ru: 'Полный маршрут' })
      },
      {
        title: lt(locale, { fa: 'راهنمای مقاصد و شهرها', en: 'Destination Guides', ar: 'دليل الوجهات', zh: '目的地指南', ru: 'Гид по направлениям' }),
        desc: lt(locale, { fa: 'معرفی جاذبه‌ها، بهترین رستوران‌ها و نکات کاربردی سفر', en: 'Insider city guides, dining spots & local transit recommendations', ar: 'تجارب المسافرين وأدلة المدن', zh: '旅行者体验与城市指南', ru: 'Опыт путешественников и гиды' }),
        icon: Compass,
        href: '/destinations',
        bg: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
        category: 'stay' as const,
      },

      // Telecom & Assistance
      {
        title: lt(locale, { fa: 'سیم‌کارت الکترونیک (eSIM)', en: 'Travel eSIM & High-Speed Data', ar: 'الشريحة والإنترنت', zh: 'eSIM 与高速流量', ru: 'eSIM и интернет' }),
        desc: lt(locale, { fa: 'اتصال به اینترنت نسل ۵ بدون تعویض سیم‌کارت فیزیکی با فعال‌سازی آنی', en: 'Instant 5G international data packs delivered via QR code in 60s', ar: 'شريحة eSIM مفعّلة فوراً عند الوصول', zh: '抵达即用的 5G eSIM', ru: 'eSIM 5G, активная сразу по прибытии' }),
        icon: Wifi,
        href: '/esim',
        bg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
        category: 'telecom' as const,
        tag: lt(locale, { fa: 'بدون نیاز به سیم فیزیکی', en: 'No Physical SIM', ar: 'رقمية بالكامل', zh: '纯数字无实体卡', ru: 'Без физ. SIM' })
      },
      {
        title: lt(locale, { fa: 'مترجم و همراه محلی سفر', en: 'Interpreter & Local Host', ar: 'المترجم والمرافق المحلي', zh: '专业翻译与地接向导', ru: 'Переводчик и гид' }),
        desc: lt(locale, { fa: 'همراهی مترجمان مسلط به زبان‌های انگلیسی، چینی، روسی و عربی در جلسات و خرید', en: 'Dedicated multilingual interpreters for business and medical visits', ar: 'مرافقون ومترجمون محترفون', zh: '中/英/俄/阿多语种随行翻译', ru: 'Профессиональные переводчики' }),
        icon: UserRound,
        href: '/interpreter',
        bg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
        category: 'telecom' as const,
        tag: lt(locale, { fa: 'تخصصی و تجاری', en: 'Business & Medical', ar: 'تخصصي', zh: '商务与医疗', ru: 'Деловой и мед.' })
      },
      {
        title: lt(locale, { fa: 'مرکز پشتیبانی ۲۴/۷ فیروزو', en: '24/7 Concierge Support', ar: 'دعم كونسيرج على مدار الساعة', zh: '24/7 全天候管家客服', ru: 'Поддержка 24/7' }),
        desc: lt(locale, { fa: 'پاسخگویی آنی از طریق تماس مستقیم، چت آنلاین و پیام‌رسان‌ها در تمام طول سفر', en: 'Around-the-clock assistance via hotline, live chat & messengers', ar: 'دعم مستمر عبر الهاتف والدردشة', zh: '电话、在线工单与即时聊天全渠道支持', ru: 'Круглосуточная помощь' }),
        icon: Headset,
        href: '/support',
        bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        category: 'telecom' as const,
      },

      // Finance & Legal
      {
        title: lt(locale, { fa: 'کیف پول چندارزی مسافر', en: 'Multi-Currency Travel Wallet', ar: 'محفظة السفر متعددة العملات', zh: '多币种旅行钱包', ru: 'Мультивалютный кошелёк' }),
        desc: lt(locale, { fa: 'نگهداری و تبدیل آنی ریال، تتر (USDT) و درهم با استرداد فوری وجه کنسلی', en: 'Hold and swap IRR, USDT & AED with instant cancellation credit', ar: 'محفظة شاملة مع استرداد فوري', zh: '持有并即时兑换里亚尔、USDT与迪拉姆', ru: 'Хранение и обмен IRR, USDT и AED' }),
        icon: Wallet,
        href: '/wallet',
        bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
        category: 'finance' as const,
        tag: lt(locale, { fa: 'تسویه آنی', en: 'Instant Settlement', ar: 'تسوية فورية', zh: '即时结算', ru: 'Мгновенно' })
      },
      {
        title: lt(locale, { fa: 'بیمه مسافرتی سامان', en: 'Saman Travel Insurance', ar: 'تأمين السفر المعتمد', zh: '旅行医疗救援保险', ru: 'Туристическая страховка' }),
        desc: lt(locale, { fa: 'پوشش هزینه‌های فوریت‌های پزشکی تا ۵۰,۰۰۰ یورو با تاییدیه معتبر سفارتخانه‌ها', en: 'Up to €50k emergency medical & baggage loss cover with embassy compliance', ar: 'تغطية طبية معتمدة للسفارات', zh: '最高5万欧元医疗保障，满足签证使领馆要求', ru: 'Медицинское покрытие до 50 000 €' }),
        icon: ShieldCheck,
        href: '/insurance',
        bg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
        category: 'finance' as const,
        tag: lt(locale, { fa: 'مورد تایید شنگن', en: 'Schengen Approved', ar: 'معتمد لشنغن', zh: '申根签证可用', ru: 'Для Шенгена' })
      },
      {
        title: lt(locale, { fa: 'خدمات اخذ ویزای مسافرتی', en: 'Tourist Visa Facilitation', ar: 'تسهيل التأشيرات السياحية', zh: '旅游签证代办服务', ru: 'Визовая поддержка' }),
        desc: lt(locale, { fa: 'تسهیل و بررسی تخصصی پرونده‌های ویزا برای امارات، ترکیه، گرجستان و روسیه', en: 'Express visa filing and document pre-check with high approval rate', ar: 'تأشيرات سياحية سريعة', zh: '高通过率的签证预审与申请协助', ru: 'Оформление виз с высокой проходимостью' }),
        icon: FileCheck2,
        href: '/visa',
        bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
        category: 'finance' as const,
        tag: lt(locale, { fa: 'بررسی مدارک', en: 'Document Pre-Check', ar: 'فحص مسبق', zh: '材料预审', ru: 'Проверка документов' })
      },
    ];

    return MAIN_SERVICES.filter((s) => {
      const matchCat = activeCategory === 'all' || s.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [locale, activeCategory, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-soft pb-16">
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-10">
        
        {/* Editorial Hero Banner with Glassmorphism */}
        <section className="mb-10 text-center relative overflow-hidden rounded-3xl bg-gradient-to-br from-deep via-[#074746] to-[#04292a] text-surface p-8 sm:p-12 md:p-16 shadow-elev-3 border border-surface/10">
          <div className="absolute -start-16 -top-16 w-60 h-60 rounded-full border-[24px] border-mint-bright/10 pointer-events-none" />
          <div className="absolute -end-20 -bottom-20 w-80 h-80 rounded-full border-[32px] border-mint-bright/5 pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface/15 backdrop-blur-md text-mint-bright text-xs font-black border border-surface/20">
              <Sparkles size={14} />
              <span>{lt(locale, { fa: 'دروازه جامع خدمات گردشگری فیروزو', en: 'Firuzo Comprehensive Travel Concierge', ar: 'بوابة خدمات فيروزو الشاملة', zh: 'Firuzo 综合旅行管家服务门户', ru: 'Единый портал туристических услуг' })}</span>
            </span>
            <h1 className="font-black text-3xl sm:text-4xl md:text-5xl text-surface leading-tight tracking-tight">
              {t('title')}
            </h1>
            <p className="font-bold text-sm sm:text-base md:text-lg text-surface/90 leading-relaxed">
              {t('subtitle')}
            </p>

            {/* Quick Search in Hero */}
            <div className="pt-4 max-w-md mx-auto">
              <div className="relative flex items-center bg-surface/95 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-elev-2 border border-surface/30">
                <Search size={16} className="text-sub shrink-0 me-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lt(locale, { fa: 'جستجوی خدمت مورد نیاز (اسنپ، سیم‌کارت، پرواز، بیمه...)', en: 'Search any service (Snapp, eSIM, flights, insurance...)', ar: 'ابحث عن الخدمة المطلوبة...', zh: '搜索所需服务（打车、eSIM、机票、保险...）', ru: 'Поиск услуги (Snapp, eSIM, рейсы, страховка...)' })}
                  className="w-full bg-transparent border-0 outline-none p-0 text-xs sm:text-sm font-bold text-ink placeholder:text-sub"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="w-6 h-6 rounded-full bg-soft text-sub grid place-items-center"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Categorized Filter Tabs */}
        <section className="mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'all', label: lt(locale, { fa: 'همه خدمات سفر', en: 'All Services', ar: 'جميع الخدمات', zh: '全部服务', ru: 'Все услуги' }) },
              { id: 'transit', label: lt(locale, { fa: 'ترابری و ترنسفر شهری', en: 'Transit & Mobility', ar: 'المواصلات والنقل', zh: '交通与出行', ru: 'Транспорт и трансферы' }) },
              { id: 'stay', label: lt(locale, { fa: 'اقامت و پرواز', en: 'Stays & Flights', ar: 'الإقامة والطيران', zh: '住宿与航班', ru: 'Проживание и рейсы' }) },
              { id: 'telecom', label: lt(locale, { fa: 'ارتباطات و همراهی مسافر', en: 'Telecom & Assistance', ar: 'الاتصالات والمرافقة', zh: '通讯与随行协助', ru: 'Связь и сопровождение' }) },
              { id: 'finance', label: lt(locale, { fa: 'مالی و خدمات کنسولی', en: 'Fintech & Legal', ar: 'المالية والتأشيرات', zh: '金融与签证', ru: 'Финансы и визы' }) },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as ServiceCategory)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-brand-dark text-surface shadow-xs'
                    : 'bg-surface text-sub hover:bg-soft hover:text-ink border border-line'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Dynamic Categorized Services Grid */}
        <section className="mb-16">
          {filteredServices.length === 0 ? (
            <div className="py-16 text-center text-sub bg-surface rounded-3xl border border-line p-8">
              <Search size={36} className="mx-auto text-line mb-3" />
              <h3 className="font-black text-base text-ink mb-1">
                {lt(locale, { fa: 'خدمتی با این مشخصات یافت نشد', en: 'No services match your search', ar: 'لم يتم العثور على خدمات مطابقة', zh: '未找到匹配的服务', ru: 'Услуги не найдены' })}
              </h3>
              <p className="text-xs font-bold text-sub">
                {lt(locale, { fa: 'کلمات دیگری جستجو کنید یا دسته‌بندی دیگری را انتخاب نمایید.', en: 'Try another search term or reset the category filter.', ar: 'جرب كلمات بحث أخرى.', zh: '请尝试其他关键词。', ru: 'Попробуйте другой поисковый запрос.' })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredServices.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={idx}
                    href={s.href}
                    className="p-5 rounded-2xl bg-surface border border-line shadow-xs hover:shadow-elev-2 hover:border-brand/40 transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-12 h-12 rounded-xl grid place-items-center group-hover:scale-105 transition-transform bg-mint text-brand-dark border border-brand/20 shadow-2xs">
                          <Icon size={22} />
                        </div>
                        {s.tag && (
                          <span className="px-2 py-0.5 rounded-full bg-soft text-brand-dark font-black text-[10px] border border-line/60">
                            {s.tag}
                          </span>
                        )}
                      </div>
                      <h2 className="font-black text-base text-ink mb-1.5 group-hover:text-brand-dark transition-colors leading-snug">
                        {s.title}
                      </h2>
                      <p className="text-xs font-bold text-sub leading-relaxed line-clamp-3">
                        {s.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs font-black text-brand-dark">
                      <span>{lt(locale, { fa: 'مشاهده و سفارش خدمت', en: 'Explore & Book', ar: 'استكشف واحجز', zh: '查看并订购', ru: 'Смотреть и заказать' })}</span>
                      <ArrowLeft size={14} className="rtl:inline ltr:hidden group-hover:-translate-x-1 transition-transform" />
                      <ArrowRight size={14} className="ltr:inline rtl:hidden group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Signature Experiences Showcase */}
        <section className="mb-12">
          <CountryExperiencesSection />
        </section>
      </main>
    </div>
  );
}
