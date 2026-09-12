'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { ESIM_PACKAGES } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName } from '@/lib/countries';
import { daysFromNow } from '@/lib/utils';
import { shimmerDataUrl } from '@/lib/image-utils';
import {
  Search,
  ShoppingCart,
  QrCode,
  Wifi,
  Signal,
  CheckCircle2,
  Smartphone,
  HelpCircle,
  X,
  Zap,
  Plane,
  Building,
  CreditCard,
  Radio,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { lt } from '@/lib/lt';
import { getSimCatalogAction } from '@/actions/sim';
import type { SimPackageItem, SimCatalogResult } from '@/services/sim-service';

export default function EsimPage() {
  const t = useTranslations('Esim');
  const locale = useLocale();
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const { country, setCountry } = useCountryStore();
  const c = COUNTRIES[country] || COUNTRIES.iran;

  const [query, setQuery] = useState('');
  const [compatibilityModal, setCompatibilityModal] = useState(false);
  const [simTypeTab, setSimTypeTab] = useState<'all' | 'esim' | 'physical'>('all');
  const [catalog, setCatalog] = useState<SimCatalogResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSimCatalogAction()
      .then((res) => {
        if (!active) return;
        if (res.success) {
          setCatalog(res.data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rawPackages: SimPackageItem[] = useMemo(() => {
    if (catalog?.packages && catalog.packages.length > 0) {
      return catalog.packages;
    }
    return ESIM_PACKAGES.map((p) => ({
      id: p.id,
      productId: p.id,
      name: `${p.countryFa || p.country} - ${p.dataGb}GB`,
      dataGb: p.dataGb,
      durationDays: p.validityDays,
      voiceMinutes: null,
      priceUsd: Math.round((p.price / 55000) * 100) / 100,
      priceToman: p.price,
      countryCode: 'GLO',
      countryName: p.countryFa || p.country,
      isEsim: true,
      type: 'data',
      features: ['فعال‌سازی آنی با QR کد', 'سرعت 4G/5G'],
    }));
  }, [catalog]);

  const filteredPackages = useMemo(() => {
    let list = rawPackages;

    // Filter by type tab
    if (simTypeTab === 'esim') {
      list = list.filter((p) => p.isEsim);
    } else if (simTypeTab === 'physical') {
      list = list.filter((p) => !p.isEsim);
    }

    const q = query.toLowerCase().trim();
    if (q) {
      list = list.filter((p) => {
        const cName = p.countryName.toLowerCase();
        const pName = p.name.toLowerCase();
        return cName.includes(q) || pName.includes(q);
      });
    } else if (country && country !== 'iran') {
      const cFa = c.nameFa.toLowerCase();
      const cEn = c.nameEn.toLowerCase();
      list = [...list].sort((a, b) => {
        const aMatch = a.countryName.toLowerCase().includes(cFa) || a.countryName.toLowerCase().includes(cEn);
        const bMatch = b.countryName.toLowerCase().includes(cFa) || b.countryName.toLowerCase().includes(cEn);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }
    return list;
  }, [rawPackages, simTypeTab, query, country, c]);

  function buy(pkg: SimPackageItem) {
    setBookingContext({
      type: 'esim',
      title: pkg.name,
      subtitle: `${pkg.dataGb} GB • ${pkg.durationDays} ${lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })} · ${pkg.isEsim ? 'eSIM (QR)' : 'سیم‌کارت فیزیکی'}`,
      amount: pkg.priceToman,
      travelDate: daysFromNow(3),
    });
    router.push('/checkout');
  }

  return (
    <div className="flex flex-col min-h-screen bg-soft">
      {/* Hero Section */}
      <section className="relative w-full h-[440px] md:h-[500px] flex items-center justify-center overflow-hidden mb-12 img-overlay-strong">
        <Image
          src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=75&w=1800"
          alt={t('title')}
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={shimmerDataUrl(1800, 500)}
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-soft via-brand-dark/50 to-transparent mix-blend-multiply" />
        
        <div className="relative z-10 w-full max-w-2xl px-4 flex flex-col items-center text-center pt-8">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface/20 backdrop-blur-md text-mint-bright text-xs font-black mb-3 border border-surface/20">
            <Zap size={14} />
            <span>{lt(locale, { fa: 'تحویل و صدور آنی بارکد فعال‌سازی در کمتر از ۶۰ ثانیه', en: 'Instant QR code delivery in under 60 seconds', ar: 'تسليم فوري لرمز التفعيل في أقل من 60 ثانية', zh: '60秒内极速生成激活二维码', ru: 'Мгновенная доставка QR-кода' })}</span>
          </span>

          <h1 className="text-[32px] md:text-[44px] font-black text-surface mb-3 tracking-tight drop-shadow-md">{t('title')}</h1>
          <p className="text-sm sm:text-base md:text-lg font-bold text-surface/90 mb-6 max-w-lg leading-relaxed">
            {t('subtitle')}
          </p>
          
          <div className="relative w-full shadow-elev-2 rounded-full overflow-hidden mb-3">
            <Search size={18} className="absolute end-5 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pe-14 ps-5 py-4 h-14 rounded-full border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand font-bold text-xs sm:text-sm bg-surface text-ink shadow-sm" 
              placeholder={t('searchCountry')} 
              type="text" 
            />
          </div>

          {/* Quick Filter Chips for Destinations */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-xs text-surface/80 font-bold">{lt(locale, { fa: 'مقاصد سفر:', en: 'Destinations:', ar: 'الوجهات:', zh: '目的地：', ru: 'Направления:' })}</span>
            {COUNTRY_ORDER.map((id) => (
              <button
                key={`esim-c-${id}`}
                type="button"
                onClick={() => {
                  setCountry(id);
                  const name = countryName(id, locale);
                  setQuery(name);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  country === id
                    ? 'bg-action text-ink font-black shadow-xs'
                    : 'bg-surface/20 hover:bg-surface/30 text-surface'
                }`}
              >
                <span className="me-1">{COUNTRIES[id].flag}</span>
                <span>{countryName(id, locale)}</span>
              </button>
            ))}
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-mint-bright font-black underline underline-offset-4 ms-2"
              >
                {lt(locale, { fa: 'پاک کردن فیلتر', en: 'Clear filter', ar: 'إزالة التصفية', zh: '清除', ru: 'Сбросить' })}
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 pb-24">
        {/* Device Compatibility Banner */}
        <section className="mb-10 bg-surface rounded-2xl p-4 sm:p-5 border border-line shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint text-brand-dark grid place-items-center shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-ink">
                {lt(locale, { fa: 'آیا گوشی شما از سیم‌کارت الکترونیک (eSIM) پشتیبانی می‌کند؟', en: 'Does your device support eSIM?', ar: 'هل يدعم هاتفك شريحة eSIM؟', zh: '您的手机支持 eSIM 吗？', ru: 'Поддерживает ли ваш телефон eSIM?' })}
              </h3>
              <p className="text-xs text-sub font-bold mt-0.5">
                {lt(locale, { fa: 'پیش از خرید، لیست مدل‌های پشتیبانی‌شده آیفون و اندروید را بررسی کنید.', en: 'Check supported iPhone and Android models before purchasing.', ar: 'تحقق من الأجهزة المدعومة قبل الشراء.', zh: '购买前请查看支持的机型列表。', ru: 'Проверьте список поддерживаемых устройств.' })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCompatibilityModal(true)}
            className="h-10 px-4 rounded-xl bg-soft hover:bg-line/60 text-brand-dark font-black text-xs transition shrink-0 flex items-center gap-1.5"
          >
            <HelpCircle size={15} />
            <span>{lt(locale, { fa: 'بررسی مدل گوشی', en: 'Check Device List', ar: 'قائمة الأجهزة', zh: '查看支持机型', ru: 'Проверить модель' })}</span>
          </button>
        </section>

        {/* Packages Section */}
        <section className="mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-[24px] text-ink">{t('popularPackages')}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Radio size={11} className="animate-pulse text-emerald-600" aria-hidden="true" />
                  eCardo Travel Live
                </span>
              </div>
              <p className="text-xs font-bold text-sub mt-1">
                {lt(locale, {
                  fa: 'بسته‌های اینترنت همراه و سیم‌کارت‌های بین‌المللی با پوشش بیش از ۸۵ کشور',
                  en: 'Mobile data packages & international SIMs covering 85+ countries',
                  ar: 'باقات بيانات الجوال وشريح الاتصال الدولية',
                  zh: '覆盖85+国家的国际移动数据与SIM套餐',
                  ru: 'Пакеты мобильного интернета и международные SIM в 85+ странах',
                })}
              </p>
            </div>

            {/* SIM Type Filter Tabs */}
            <div className="inline-flex p-1 rounded-2xl bg-surface border border-line shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSimTypeTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  simTypeTab === 'all'
                    ? 'bg-brand text-surface shadow-xs'
                    : 'text-sub hover:text-ink'
                }`}
              >
                {lt(locale, { fa: 'همه بسته‌ها', en: 'All Plans', ar: 'جميع الباقات', zh: '全部套餐', ru: 'Все пакеты' })}
              </button>
              <button
                type="button"
                onClick={() => setSimTypeTab('esim')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  simTypeTab === 'esim'
                    ? 'bg-brand text-surface shadow-xs'
                    : 'text-sub hover:text-ink'
                }`}
              >
                <QrCode size={13} aria-hidden="true" />
                <span>{lt(locale, { fa: 'دیجیتال (eSIM)', en: 'eSIM (QR)', ar: 'إلكترونية (eSIM)', zh: 'eSIM (扫码)', ru: 'eSIM (QR)' })}</span>
              </button>
              <button
                type="button"
                onClick={() => setSimTypeTab('physical')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  simTypeTab === 'physical'
                    ? 'bg-brand text-surface shadow-xs'
                    : 'text-sub hover:text-ink'
                }`}
              >
                <CreditCard size={13} aria-hidden="true" />
                <span>{lt(locale, { fa: 'سیم‌کارت فیزیکی مسافر', en: 'Physical SIM', ar: 'شريحة فعلية', zh: '实体SIM卡', ru: 'Физическая SIM' })}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 flex items-center justify-center text-brand">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="bg-surface rounded-2xl p-10 text-center border border-line">
              <p className="text-sm font-black text-ink mb-1">
                {lt(locale, { fa: 'بسته‌ای مطابق جستجوی شما یافت نشد', en: 'No matching packages found' })}
              </p>
              <button
                type="button"
                onClick={() => { setQuery(''); setSimTypeTab('all'); }}
                className="text-xs font-black text-brand hover:underline mt-2 inline-block cursor-pointer"
              >
                {lt(locale, { fa: 'مشاهده همه بسته‌ها', en: 'View all plans' })}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-surface rounded-2xl p-6 border border-line flex flex-col justify-between hover:shadow-md transition-all hover:border-brand/40 group relative overflow-hidden"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="w-10 h-10 rounded-xl bg-mint grid place-items-center text-brand-dark">
                        {pkg.isEsim ? <QrCode size={22} /> : <CreditCard size={22} />}
                      </div>
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-soft text-brand-dark flex items-center gap-1">
                        <Signal size={12} className="text-brand-dark" />
                        {pkg.isEsim ? 'eSIM · 4G/5G' : 'Physical · تحویل حضوری'}
                      </span>
                    </div>

                    <h3 className="font-black text-[18px] text-ink mb-3">{pkg.name}</h3>

                    <div className="py-4 border-y border-line flex justify-between items-baseline mb-4">
                      <span className="font-black text-[24px] text-brand-dark">{pkg.dataGb} GB</span>
                      <span className="text-xs font-bold text-sub">
                        {pkg.durationDays}{' '}
                        {lt(locale, { fa: 'روز اعتبار', en: 'Days Validity', ar: 'أيام الصلاحية', zh: '有效天数', ru: 'Дней действия' })}
                      </span>
                    </div>

                    <ul className="space-y-1.5 text-xs text-sub font-bold mb-4">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-ink">
                          <CheckCircle2 size={13} className="text-brand-dark shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-sub">
                        {lt(locale, { fa: 'قیمت:', en: 'Price:', ar: 'السعر:', zh: '价格：', ru: 'Цена:' })}
                      </span>
                      <div className="text-end">
                        <span className="font-black text-[18px] text-price font-mono num">
                          {pkg.priceToman.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                        </span>
                        <span className="text-xs font-bold text-sub ms-1">
                          {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                        </span>
                        <span className="block text-[11px] font-mono text-sub">
                          ≈ ${pkg.priceUsd.toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => buy(pkg)}
                      aria-label={lt(locale, {
                        fa: `خرید بسته ${pkg.name}`,
                        en: `Buy ${pkg.name}`,
                        ar: `شراء ${pkg.name}`,
                        zh: `购买${pkg.name}`,
                        ru: `Купить ${pkg.name}`,
                      })}
                      className="w-full min-h-[44px] py-3 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-[13px] flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
                    >
                      <ShoppingCart size={16} />
                      <span>{pkg.isEsim ? t('buyEsim') : lt(locale, { fa: 'سفارش سیم‌کارت فیزیکی', en: 'Order Physical SIM' })}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Airport & Hotel Delivery Counters Section (eCardo Pickup Network) */}
        {catalog && catalog.airports && catalog.airports.length > 0 && (
          <section className="bg-surface rounded-2xl border border-line p-6 md:p-8 mb-16 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-mint grid place-items-center text-brand-dark">
                <Plane size={18} />
              </div>
              <h3 className="font-black text-lg text-ink">
                {lt(locale, {
                  fa: 'شبکه باجه‌های تحویل حضوری سیم‌کارت در فرودگاه‌ها و هتل‌ها',
                  en: 'SIM Airport & Hotel Pickup Desks Network',
                  ar: 'مكاتب استلام الشرائح في المطارات والفنادق',
                  zh: '机场及酒店线下SIM领取网点',
                  ru: 'Пункты выдачи SIM в аэропортах и отелях',
                })}
              </h3>
            </div>
            <p className="text-xs font-bold text-sub mb-6 leading-relaxed">
              {lt(locale, {
                fa: 'سیم‌کارت‌های فیزیکی پس از ثبت سفارش، در بدو ورود به فرودگاه یا لابی هتل مقصد با ارائه پاسپورت و کد پیگیری تحویل می‌شوند.',
                en: 'Physical SIM orders can be picked up at major airport counters or hotel lobbies upon arrival with passport and tracking code.',
                ar: 'يمكن استلام الشرائح الفعلية في صالات الوصول بالمطارات أو الفنادق.',
                zh: '实体SIM卡可在到达目的地机场柜台或指定酒店前台凭护照领取。',
                ru: 'Физические SIM-карты можно получить на стойках в аэропорту или на ресепшн отеля.',
              })}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-black text-brand-dark block mb-2.5 flex items-center gap-1.5">
                  <Plane size={14} />
                  {lt(locale, { fa: 'باجه‌های فرودگاهی تحویل سیم‌کارت:', en: 'Airport Pickup Desks:' })}
                </span>
                <div className="space-y-2">
                  {catalog.airports.map((ap) => (
                    <div key={ap.id} className="p-3 rounded-xl bg-soft border border-line/70 flex items-center justify-between text-xs font-bold">
                      <span className="text-ink">{ap.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-surface border border-line text-sub font-mono">{ap.city}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-black text-brand-dark block mb-2.5 flex items-center gap-1.5">
                  <Building size={14} />
                  {lt(locale, { fa: 'باجه‌های هتل و لابی:', en: 'Hotel Lobby Desks:' })}
                </span>
                <div className="space-y-2">
                  {catalog.hotels.map((ht) => (
                    <div key={ht.id} className="p-3 rounded-xl bg-soft border border-line/70 flex items-center justify-between text-xs font-bold">
                      <span className="text-ink">{ht.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-surface border border-line text-sub font-mono">{ht.city}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* How It Works - Steps Section */}
        <section className="bg-surface rounded-2xl border border-line p-8 md:p-12 mb-16 shadow-sm">
          <h2 className="font-black text-[24px] text-ink text-center mb-10">{t('activationGuide')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-mint grid place-items-center text-brand-dark shadow-sm">
                <ShoppingCart size={28} />
              </div>
              <h3 className="font-black text-[16px] text-ink">{lt(locale, { fa: '۱. انتخاب و خرید بسته', en: '1. Choose & Buy Package', ar: '1. اختيار وشراء الباقة', zh: '1. 选择并购买套餐', ru: '1. Выбор и покупка пакета' })}</h3>
              <p className="text-xs font-bold text-sub leading-relaxed">
                {lt(locale, { fa: 'کشور مقصد و حجم اینترنت مورد نیاز را مشخص و پرداخت را با درگاه شتاب انجام دهید.', en: 'Select your destination and data package, then complete instant payment.', ar: 'حدد وجهتك وحجم البيانات المطلوب ثم أكمل الدفع الفوري عبر بوابة شتاب.', zh: '选择目的地和所需流量套餐，然后通过 Shetab 网关即时支付。', ru: 'Выберите направление и нужный объём данных, затем оплатите через шлюз Shetab.' })}
              </p>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-mint grid place-items-center text-brand-dark shadow-sm">
                <QrCode size={28} />
              </div>
              <h3 className="font-black text-[16px] text-ink">{lt(locale, { fa: '۲. اسکن بارکد QR', en: '2. Scan QR Code', ar: '2. مسح رمز QR', zh: '2. 扫描二维码', ru: '2. Сканирование QR-кода' })}</h3>
              <p className="text-xs font-bold text-sub leading-relaxed">
                {lt(locale, { fa: 'کد فعال‌سازی به صورت آنی به ایمیل و پنل شما ارسال می‌شود؛ آن را با گوشی اسکن کنید.', en: 'Instant QR activation code is delivered to your email and dashboard.', ar: 'يُرسل رمز التفعيل فوراً إلى بريدك الإلكتروني ولوحة حسابك؛ امسحه بهاتفك.', zh: '激活二维码将即时发送至您的邮箱和用户面板；请用手机扫描。', ru: 'QR-код активации мгновенно приходит на вашу почту и в личный кабинет; отсканируйте его телефоном.' })}
              </p>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-mint grid place-items-center text-brand-dark shadow-sm">
                <Wifi size={28} />
              </div>
              <h3 className="font-black text-[16px] text-ink">{lt(locale, { fa: '۳. اتصال خودکار به اینترنت', en: '3. Instant Connectivity', ar: '3. اتصال فوري', zh: '3. 畅享全球网络', ru: '3. Мгновенный интернет' })}</h3>
              <p className="text-xs font-bold text-sub leading-relaxed">
                {lt(locale, { fa: 'به محض فرود در فرودگاه مقصد، رومینگ داده را روشن کرده و از اینترنت پرسرعت لذت ببرید.', en: 'As soon as you land, switch on Data Roaming and enjoy high-speed 5G.', ar: 'بمجرد وصولك، شغّل تجوال البيانات وتمتع بإنترنت عالي السرعة.', zh: '降落目的地后打开数据漫游，即可畅享高速5G。', ru: 'Включите роуминг данных по прибытии и наслаждайтесь интернетом.' })}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Device Compatibility Modal */}
      {compatibilityModal && (
        <div className="fixed inset-0 z-[200] bg-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface rounded-3xl p-6 border border-line shadow-elev-3 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Smartphone size={20} className="text-brand-dark" />
                <h3 className="font-black text-base text-ink">دستگاه‌های پشتیبانی‌کننده از eSIM</h3>
              </div>
              <button
                type="button"
                onClick={() => setCompatibilityModal(false)}
                className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-sub leading-relaxed">
              <div className="p-3 rounded-2xl bg-soft border border-line">
                <strong className="text-ink text-sm block mb-1">گوشی‌های اپل (Apple iPhone):</strong>
                <p>تمامی مدل‌های iPhone XR, XS, XS Max و خانواده‌های iPhone 11, 12, 13, 14, 15, 16 (به استثنای نسخه‌های دو سیم فیزیکی چین و هنگ‌کنگ).</p>
              </div>

              <div className="p-3 rounded-2xl bg-soft border border-line">
                <strong className="text-ink text-sm block mb-1">گوشی‌های سامسونگ (Samsung):</strong>
                <p>خانواده Galaxy S20, S21, S22, S23, S24 و گوشی‌های تاشو Galaxy Z Flip و Z Fold.</p>
              </div>

              <div className="p-3 rounded-2xl bg-soft border border-line">
                <strong className="text-ink text-sm block mb-1">گوگل و شیائومی (Google & Xiaomi):</strong>
                <p>خانواده Google Pixel 3 به بعد، Xiaomi 12T Pro, 13, 13 Pro, 14 Pro.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCompatibilityModal(false)}
              className="w-full h-11 rounded-xl bg-brand text-surface font-black text-xs transition"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
