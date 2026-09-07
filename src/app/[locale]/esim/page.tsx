'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { ESIM_PACKAGES } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { shimmerDataUrl } from '@/lib/image-utils';
import { Search, ShoppingCart, QrCode, Wifi, Signal, Globe, CheckCircle2, Smartphone, HelpCircle, X, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { lt } from '@/lib/lt';

const POPULAR_DESTINATIONS = [
  { id: 'turkey', label: { fa: 'ترکیه', en: 'Turkey', ar: 'تركيا', zh: '土耳其', ru: 'Турция' }, key: 'ترکیه' },
  { id: 'uae', label: { fa: 'امارات', en: 'UAE', ar: 'الإمارات', zh: '阿联酋', ru: 'ОАЭ' }, key: 'امارات' },
  { id: 'georgia', label: { fa: 'گرجستان', en: 'Georgia', ar: 'جورجيا', zh: '格鲁吉亚', ru: 'Грузия' }, key: 'گرجستان' },
  { id: 'russia', label: { fa: 'روسیه', en: 'Russia', ar: 'روسيا', zh: '俄罗斯', ru: 'Россия' }, key: 'روسیه' },
  { id: 'oman', label: { fa: 'عمان', en: 'Oman', ar: 'عمان', zh: '阿曼', ru: 'Оман' }, key: 'عمان' },
  { id: 'europe', label: { fa: 'اروپا', en: 'Europe', ar: 'أوروبا', zh: '欧洲', ru: 'Европа' }, key: 'اروپا' },
];

export default function EsimPage() {
  const t = useTranslations('Esim');
  const locale = useLocale();
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const [query, setQuery] = useState('');
  const [compatibilityModal, setCompatibilityModal] = useState(false);

  const filteredPackages = ESIM_PACKAGES.filter((p) =>
    p.country.toLowerCase().includes(query.toLowerCase())
  );

  function buy(pkg: (typeof ESIM_PACKAGES)[number]) {
    setBookingContext({
      type: 'esim',
      title: `eSIM ${pkg.country}`,
      subtitle: `${pkg.dataGb} GB • ${pkg.validityDays} ${lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })}`,
      amount: pkg.price,
      travelDate: daysFromNow(3),
    });
    router.push('/checkout');
  }

  return (
    <div className="flex flex-col min-h-screen bg-soft">
      {/* Hero Section */}
      <section className="relative w-full h-[440px] md:h-[500px] flex items-center justify-center overflow-hidden mb-12 img-overlay-strong">
        <Image
          src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=75&w=1800"
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

          {/* Quick Filter Chips for Popular Destinations */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-xs text-surface/80 font-bold">{lt(locale, { fa: 'مقاصد محبوب:', en: 'Popular:', ar: 'شائع:', zh: '热门：', ru: 'Популярные:' })}</span>
            {POPULAR_DESTINATIONS.map((dest) => (
              <button
                key={dest.id}
                type="button"
                onClick={() => setQuery(dest.key)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  query === dest.key
                    ? 'bg-action text-ink font-black shadow-xs'
                    : 'bg-surface/20 hover:bg-surface/30 text-surface'
                }`}
              >
                {lt(locale, dest.label)}
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
        <section className="mb-20">
          <h2 className="font-black text-[24px] text-ink mb-6">{t('popularPackages')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg, i) => (
              <div 
                key={i} 
                className="bg-surface rounded-2xl p-6 border border-line flex flex-col justify-between hover:shadow-md transition-all hover:border-brand/40 group relative overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-10 h-10 rounded-xl bg-mint grid place-items-center text-brand-dark">
                      <Globe size={22} />
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-soft text-sub flex items-center gap-1">
                      <Signal size={12} className="text-brand-dark" /> 4G/5G Hotspot
                    </span>
                  </div>

                  <h3 className="font-black text-[18px] text-ink mb-3">{pkg.country}</h3>

                  <div className="py-4 border-y border-line flex justify-between items-baseline mb-4">
                    <span className="font-black text-[24px] text-brand-dark">{pkg.dataGb} GB</span>
                    <span className="text-xs font-bold text-sub">
                      {pkg.validityDays} {lt(locale, { fa: 'روز اعتبار', en: 'Days Validity', ar: 'أيام الصلاحية', zh: '有效天数', ru: 'Дней действия' })}
                    </span>
                  </div>

                  <ul className="space-y-1.5 text-xs text-sub font-bold mb-4">
                    <li className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={13} />
                      <span>{lt(locale, { fa: 'فعال‌سازی خودکار پس از اسکن QR', en: 'Auto-activates upon QR scan', ar: 'تفعيل تلقائي', zh: '扫码即刻自动激活', ru: 'Автоактивация после сканирования' })}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-brand-dark" />
                      <span>{lt(locale, { fa: 'پشتیبانی از اشتراک اینترنت (Hotspot)', en: 'Hotspot / Tethering supported', ar: 'دعم نقطة الاتصال', zh: '支持个人热点分享', ru: 'Поддержка раздачи интернета' })}</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'قیمت:', en: 'Price:', ar: 'السعر:', zh: '价格：', ru: 'Цена:' })}</span>
                    <div className="text-end">
                      <span className="font-black text-[20px] text-price font-mono num">
                        {pkg.price.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                      </span>
                      <span className="text-xs font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => buy(pkg)}
                    aria-label={lt(locale, { fa: `خرید بسته ${pkg.country}`, en: `Buy ${pkg.country} package`, ar: `شراء باقة ${pkg.country}`, zh: `购买${pkg.country}套餐`, ru: `Купить пакет ${pkg.country}` })}
                    className="w-full py-3 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-[13px] flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
                  >
                    <ShoppingCart size={16} />
                    <span>{t('buyEsim')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

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
