'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { ESIM_PACKAGES } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { shimmerDataUrl } from '@/lib/image-utils';
import { Search, ShoppingCart, QrCode, Wifi, Signal, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { lt } from '@/lib/lt';

export default function EsimPage() {
  const t = useTranslations('Esim');
  const locale = useLocale();
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const [query, setQuery] = useState('');

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
      <section className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center overflow-hidden mb-12 img-overlay-strong">
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
          <h1 className="text-[32px] md:text-[40px] font-black text-surface mb-4 tracking-tight drop-shadow-md">{t('title')}</h1>
          <p className="text-[16px] md:text-[18px] font-bold text-surface/90 mb-10 drop-shadow">
            {t('subtitle')}
          </p>
          
          <div className="relative w-full shadow-sm rounded-full overflow-hidden">
            <Search size={20} className="absolute end-5 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pe-14 ps-5 py-4 h-14 rounded-full border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand font-bold text-[15px] bg-surface text-ink shadow-sm" 
              placeholder={t('searchCountry')} 
              type="text" 
            />
          </div>
        </div>
      </section>

      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 pb-24">
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
                      <Signal size={12} className="text-brand-dark" /> 4G/5G
                    </span>
                  </div>

                  <h3 className="font-black text-[18px] text-ink mb-3">{pkg.country}</h3>

                  <div className="py-4 border-y border-line flex justify-between items-baseline mb-4">
                    <span className="font-black text-[24px] text-brand-dark">{pkg.dataGb} GB</span>
                    <span className="text-xs font-bold text-sub">
                      {pkg.validityDays} {lt(locale, { fa: 'روز اعتبار', en: 'Days Validity', ar: 'أيام الصلاحية', zh: '有效天数', ru: 'Дней действия' })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
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
                    aria-label={`خرید بسته ${pkg.country}`}
                    className="w-full py-3 rounded-xl bg-action hover:bg-action-hover text-[#14201f] font-black text-[13px] flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
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
              <h3 className="font-black text-[16px] text-ink">{lt(locale, { fa: '۳. اتصال بی‌درنگ', en: '3. Instant Connection', ar: '3. اتصال فوري', zh: '3. 即时连接', ru: '3. Мгновенное подключение' })}</h3>
              <p className="text-xs font-bold text-sub leading-relaxed">
                {lt(locale, { fa: 'به محض ورود به کشور مقصد، سیم‌کارت را روشن کرده و از اینترنت لذت ببرید.', en: 'Activate upon arrival at your destination and enjoy seamless high-speed internet.', ar: 'فور وصولك إلى وجهتك، فعّل الشريحة واستمتع بإنترنت فائق السرعة.', zh: '抵达目的地后即刻激活，畅享高速网络。', ru: 'По прибытии активируйте eSIM и наслаждайтесь скоростным интернетом.' })}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
