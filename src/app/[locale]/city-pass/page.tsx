'use client';

import { useLocale } from 'next-intl';
import { CreditCard, Info, Check } from 'lucide-react';
import { CityPassWidget } from '@/components/city-pass/CityPassWidget';
import { RoutePlannerPreview } from '@/components/city-pass/RoutePlannerPreview';
import { TrustBar } from '@/components/shared/TrustBar';
import { ProcessSteps } from '@/components/shared/ProcessSteps';
import { lt } from '@/lib/lt';

export default function CityPassPage() {
  const locale = useLocale();

  return (
    <div className="bg-paper min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mint/40 via-soft to-paper pt-16 md:pt-20 pb-16">
        <div className="max-w-[1180px] mx-auto px-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 text-[13px] font-bold text-brand-dark bg-surface border border-brand/20 rounded-full mb-6 shadow-sm">
            <CreditCard size={16} /> {lt(locale, { fa: 'فیروز پاس · Firuzo Pass', en: 'Firuzo City Pass', ar: 'بطاقة فيروز للمدن', zh: 'Firuzo 城市一卡通', ru: 'Карта Firuzo City Pass' })}
          </span>
          <h1 className="text-[32px] md:text-[48px] font-black leading-tight tracking-tight mb-4 max-w-[20ch] text-ink">
            {lt(locale, {
              fa: 'مترو و اتوبوس شهری، با یک کارت هوشمند',
              en: 'Metro & City Buses with a Single Smart Card',
              ar: 'المترو وحافلات المدينة ببطاقة ذكية واحدة',
              zh: '一张智能卡畅行地铁与市内巴士',
              ru: 'Метро и городские автобусы по одной смарт-карте',
            })}
          </h1>
          <p className="text-[16px] md:text-[18px] text-sub max-w-[54ch] leading-relaxed mb-8">
            {lt(locale, {
              fa: 'بدون صف بلیت، بدون پول خرد، بدون تابلوهای فارسیِ نامفهوم. کارت را در هتل تحویل می‌گیرید و پنل مسیریاب انگلیسی‌زبان ما قدم‌به‌قدم تا مقصد همراهتان است.',
              en: 'No ticket lines, no loose change, no confusing signs. Delivered directly to your hotel with an English-language navigation dashboard guiding you step-by-step.',
              ar: 'بلا طوابير، بلا نقود معدنية، وبلا لافتات غير مفهومة. استلم بطاقتك في الفندق مع لوحة ملاحة وإرشاد خطوة بخطوة.',
              zh: '免排队购票、无需零钱。卡片直达您入住的酒店，并提供多语言导航面板一路伴您抵达目的地。',
              ru: 'Без очередей и мелочи. Получите карту прямо в отеле вместе с удобной навигацией на понятном языке.',
            })}
          </p>

          <CityPassWidget locale={locale} />
        </div>
      </section>

      {/* Scope / Manual Ops */}
      <section className="py-12 max-w-[1180px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex gap-4 items-start p-6 bg-gold-soft/50 border border-gold/30 rounded-3xl">
          <span className="flex-shrink-0 w-10 h-10 grid place-items-center rounded-full bg-action text-[#14201f] shadow-sm">
            <Check size={21} />
          </span>
          <div>
            <h3 className="m-0 mb-2 text-[18px] font-bold text-ink">
              {lt(locale, { fa: 'تحویل اختصاصی درب هتل', en: 'Personal Hotel Delivery', ar: 'تسليم خاص في الفندق', zh: '专人送达酒店前台', ru: 'Персональная доставка в отель' })}
            </h3>
            <p className="m-0 text-[14px] text-price leading-[1.7]">
              {lt(locale, {
                fa: 'هر کارت توسط کارشناس محلی فیروز تهیه، شارژ و به پذیرش هتل تحویل داده می‌شود. دست‌کم ۲۴ ساعت قبل از ورود سفارش دهید.',
                en: 'Each card is procured, pre-loaded, and hand-delivered to your hotel front desk. Please order at least 24 hours prior to arrival.',
                ar: 'يتم شراء كل بطاقة وشحنها وتسليمها إلى استقبال فندقك من قبل فريقنا المحلي. يُرجى الطلب قبل 24 ساعة على الأقل.',
                zh: '每张卡片均由 Firuzo 当地专员购买、预充值并送达您酒店的前台。请至少提前 24 小时预订。',
                ru: 'Каждая карта оформляется, пополняется и доставляется на стойку регистрации вашего отеля. Заказывайте минимум за 24 часа.',
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-start p-6 bg-surface/90 border border-line/80 rounded-3xl">
          <span className="flex-shrink-0 w-10 h-10 grid place-items-center rounded-2xl bg-soft text-sub">
            <Info size={21} />
          </span>
          <div>
            <h3 className="m-0 mb-2 text-[18px] font-bold text-ink">
              {lt(locale, { fa: 'محدوده و شهرهای پشتیبانی‌شده', en: 'Supported Coverage', ar: 'نطاق التغطية والمدن', zh: '支持城市与覆盖范围', ru: 'Зона действия и города' })}
            </h3>
            <p className="m-0 text-[14px] text-sub leading-[1.7]">
              {lt(locale, {
                fa: 'شبکه‌های حمل‌ونقل شهری در تمام خطوط مترو و اتوبوس‌های تندرو (BRT) پشتیبانی می‌شوند. برای هر شهر کارت مجزا صادر می‌گردد.',
                en: 'Supported across all city metro and BRT bus networks. Separate cards are issued for different metropolitan regions.',
                ar: 'مدعومة في جميع خطوط المترو والحافلات السريعة (BRT). تصدر بطاقة مستقلة لكل مدينة.',
                zh: '支持所有市内地铁和快速公交（BRT）线路。不同大都市区域分别发卡。',
                ru: 'Действует во всех ветках метро и скоростных автобусах (BRT). Для каждого города выдается отдельная карта.',
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-16 bg-brand-dark text-surface relative overflow-hidden">
        <div className="absolute top-0 end-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(0,169,165,0.15),transparent_70%)] pointer-events-none" />
        <div className="max-w-[1020px] mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-[28px] font-black mb-3">
              {lt(locale, { fa: 'پنل مسیریاب هوشمند — بدون نیاز به نصب اپلیکیشن', en: 'Smart Route Finder — No App Install Needed', ar: 'لوحة الملاحة الذكية — دون الحاجة لتثبيت تطبيقات', zh: '智能路线助手 — 无需安装 App', ru: 'Умный навигатор — без установки приложений' })}
            </h2>
            <p className="text-[18px] text-mint-bright max-w-[60ch] mx-auto leading-relaxed">
              {lt(locale, {
                fa: 'لینک اختصاصی شما در مرورگر باز می‌شود و خط دقیق، تعداد ایستگاه‌ها و جاذبه‌های مسیر را نشان می‌دهد.',
                en: 'Your unique link opens instantly in any browser to show the exact transit line, station stops, and route attractions.',
                ar: 'يفتح رابطك المخصص في المتصفح مباشرة ليوضح لك الخط وعدد المحطات والمعالم في الطريق.',
                zh: '专属链接可在任何浏览器中即点即用，清晰提示乘车线路、站点数及沿途景点。',
                ru: 'Ваша персональная ссылка открывается в любом браузере и показывает нужную линию, остановки и достопримечательности.',
              })}
            </p>
          </div>

          <RoutePlannerPreview />
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-surface">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-[62ch] mb-12">
            <h2 className="text-[28px] font-black mb-3 text-ink">
              {lt(locale, { fa: 'مراحل سفارش و استفاده', en: 'How It Works', ar: 'كيفية الاستخدام', zh: '使用流程', ru: 'Как это работает' })}
            </h2>
            <p className="text-[16px] text-sub leading-[1.8]">
              {lt(locale, {
                fa: 'فرآیندی یکپارچه و دقیق تا تجربه سفر شما در نهایت آرامش و آسودگی رقم بخورد.',
                en: 'A streamlined end-to-end process so your transit experience is completely effortless.',
                ar: 'خطوات مبسطة وسلسة لتجربة تنقل مريحة بدون أي عناء.',
                zh: '极简无缝的流程设计，让您的城市出行轻松无忧。',
                ru: 'Простой и понятный процесс для максимального комфорта в поездках.',
              })}
            </p>
          </div>

          <ProcessSteps 
            steps={[
              { title: lt(locale, { fa: 'سفارش پیش از سفر', en: 'Pre-order Online', ar: 'الطلب المسبق', zh: '行前线上预订', ru: 'Предзаказ онлайн' }), description: lt(locale, { fa: 'شهر، نوع کارت و نام هتل را وارد کنید. پرداخت با کارت بین‌المللی خودتان.', en: 'Select city, pass type, and hotel. Pay securely with your international card.', ar: 'اختر المدينة ونوع البطاقة واسم الفندق. الدفع ببطاقتك الدولية.', zh: '选择城市、卡片类型及酒店，支持境外信用卡安全支付。', ru: 'Выберите город, тип карты и отель. Оплата международной картой.' }), eta: lt(locale, { fa: '۲۴ ساعت قبل', en: '24h before', ar: 'قبل 24 ساعة', zh: '提前24小时', ru: 'за 24ч' }) },
              { title: lt(locale, { fa: 'تهیه و شارژ', en: 'Fulfillment & Topup', ar: 'التجهيز والشحن', zh: '专员制卡充值', ru: 'Оформление и баланс' }), description: lt(locale, { fa: 'همکار ما کارت را می‌خرد، شارژ می‌کند و به پذیرش هتل شما تحویل می‌دهد.', en: 'Our team prepares, tops up, and delivers the pass directly to your hotel front desk.', ar: 'يقوم فريقنا بشراء البطاقة وشحنها وتسليمها لاستقبال الفندق.', zh: '专员准备实体卡、预存额度并配送至酒店前台。', ru: 'Специалист оформит карту, пополнит баланс и доставит в отель.' }), eta: lt(locale, { fa: 'تأیید پیامکی', en: 'Instant Confirm', ar: 'تأكيد فوري', zh: '即时确认', ru: 'Подтверждение' }) },
              { title: lt(locale, { fa: 'گیت مترو و BRT', en: 'Tap & Go Transit', ar: 'بوابات المترو والحافلات', zh: '刷卡进站乘车', ru: 'Вход в метро и BRT' }), description: lt(locale, { fa: 'کارت را روی دستگاه گیت بگذارید. برای اتوبوس‌های تندرو هم همین کارت کافی است.', en: 'Tap the smart card at transit gates for seamless entry across metro and express buses.', ar: 'مرر البطاقة على أجهزة البوابات للمرور السريع في المترو والحافلات.', zh: '在地铁和快速公交闸机直接刷卡即可畅行。', ru: 'Приложите карту к турникету для быстрого прохода.' }), eta: 'Tap & Go' },
              { title: lt(locale, { fa: 'مسیریابی هوشمند', en: 'Live Navigation', ar: 'ملاحة ذكية', zh: '实时路线指引', ru: 'Умная навигация' }), description: lt(locale, { fa: 'بدون نصب اپلیکیشن با لینک اختصاصی. نمایش ایستگاه‌ها و ترانسفرها.', en: 'Access your instant browser-based route guide for real-time station advice.', ar: 'دليل مسارات تفاعلي في المتصفح دون الحاجة لتحميل تطبيقات.', zh: '通过专属网页端实时查看站点换乘与周边指引。', ru: 'Интерактивный маршрут в браузере без скачивания приложений.' }), eta: lt(locale, { fa: 'در مرورگر', en: 'Browser link', ar: 'عبر الرابط', zh: '网页端', ru: 'В браузере' }) }
            ]} 
          />
        </div>
      </section>

      {/* Trust */}
      <section className="py-12 mb-16 max-w-[1180px] mx-auto px-6">
        <TrustBar 
          items={[
            { icon: <CreditCard size={22} className="text-brand flex-shrink-0 mt-0.5" />, title: lt(locale, { fa: 'مترو و BRT شهر شما', en: 'Complete Metro & BRT Coverage', ar: 'تغطية كاملة للمترو و BRT', zh: '覆盖全部地铁与 BRT 线路', ru: 'Полный охват метро и BRT' }), description: lt(locale, { fa: 'همان کارتی که شهروندان استفاده می‌کنند، در تمام خطوط مترو و اتوبوس تندرو.', en: 'Standard local transit pass valid across all lines and express buses.', ar: 'نفس البطاقة المعتمدة محلياً في كافة شبكات النقل.', zh: '本地通用标准乘车卡，全线路均可通行。', ru: 'Единая транспортная карта для всех линий.' }) },
          ]} 
        />
      </section>
    </div>
  );
}
