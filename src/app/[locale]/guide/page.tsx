'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Headset, ArrowLeft, ShieldCheck, PlaneTakeoff, X } from 'lucide-react';
import { lt } from '@/lib/lt';

import type { LText } from '@/lib/lt';

interface GuideArticle {
  id: string;
  category: LText;
  title: LText;
  readTime: LText;
  gradient?: string;
  excerpt: LText;
  body: LText;
  image?: string;
  icon?: typeof ShieldCheck;
}

const ARTICLES: GuideArticle[] = [
  {
    id: 'a1',
    category: { fa: 'ویزا', en: 'Visa', ar: 'تأشيرة', zh: '签证', ru: 'Виза' },
    title: { fa: 'چک‌لیست سفر به ترکیه', en: 'Turkey Travel Checklist', ar: 'قائمة التحقق للسفر إلى تركيا', zh: '土耳其旅行清单', ru: 'Чек-лист поездки в Турцию' },
    readTime: { fa: '۵ دقیقه', en: '5 min', ar: '٥ دقائق', zh: '5 分钟', ru: '5 мин' },
    gradient: 'from-rose-warm/80 to-rose-warm',
    excerpt: {
      fa: 'از بیمه مسافرتی اجباری تا رزرو هتل قابل استعلام — همه مدارکی که برای ورود به ترکیه لازم دارید.',
      en: 'From mandatory travel insurance to a verifiable hotel booking — every document you need to enter Turkey.',
      ar: 'من تأمين السفر الإلزامي إلى حجز فندق قابل للتحقق — كل المستندات التي تحتاجها للدخول إلى تركيا.',
      zh: '从强制旅行保险到可核验的酒店预订——进入土耳其所需的全部文件。',
      ru: 'От обязательной туристической страховки до подтвержденной брони отеля — все документы для въезда в Турцию.',
    },
    body: {
      fa: 'برای سفر به ترکیه علاوه بر پاسپورت با حداقل ۵ ماه اعتبار، توصیه می‌کنیم بیمه مسافرتی معتبر تهیه کنید. رزرو هتل و بلیت برگشت نیز ممکن است در گیت ورودی بررسی شود. پول نقد دلار یا یورو همراه داشته باشید؛ کارت‌های ایرانی در ترکیه کاربردی ندارند.',
      en: 'For travel to Turkey, besides a passport with at least 5 months of validity, we recommend holding valid travel insurance. Hotel reservations and a return ticket may also be checked at immigration. Carry US dollars or euros in cash; Iranian cards are not usable in Turkey.',
      ar: 'للسفر إلى تركيا، بالإضافة إلى جواز سفر صالح لمدة 5 أشهر على الأقل، نوصي بتأمين سفر ساري المفعول. قد يتم التحقق من حجز الفندق وتذكرة العودة عند الوصول. احمل دولارات أو يورو نقداً؛ البطاقات الإيرانية لا تعمل في تركيا.',
      zh: '前往土耳其时，除有效期至少 5 个月的护照外，建议持有有效的旅行保险。入境时可能核查酒店预订和回程机票。请携带美元或欧元现金；伊朗银行卡在土耳其无法使用。',
      ru: 'Для поездки в Турцию, помимо паспорта со сроком действия не менее 5 месяцев, рекомендуем оформить действующую туристическую страховку. Бронь отеля и обратный билет могут проверить на границе. Возьмите наличные доллары или евро; иранские карты в Турции не работают.',
    },
    image: '/images/guide-turkey.jpg'
  },
  {
    id: 'a2',
    category: { fa: 'مالی', en: 'Finance', ar: 'مالية', zh: '金融', ru: 'Финансы' },
    title: { fa: 'راهنمای کیف پول چندارزی فیروز', en: 'Firuzo Multi-Currency Wallet Guide', ar: 'دليل محفظة فيروز متعددة العملات', zh: 'Firuzo 多币种钱包指南', ru: 'Руководство по мультивалютному кошельку Firuzo' },
    readTime: { fa: '۷ دقیقه', en: '7 min', ar: '٧ دقائق', zh: '7 分钟', ru: '7 мин' },
    gradient: 'from-brand to-brand-dark',
    excerpt: {
      fa: 'شارژ ریالی با شتاب، نگهداری تتر و درهم، و تبدیل لحظه‌ای با قفل نرخ ۳۰ ثانیه‌ای چگونه کار می‌کند؟',
      en: 'How Shetab rial top-ups, USDT & AED balances, and instant exchange with a 30-second rate lock work.',
      ar: 'كيف تعمل الشحن بالريال عبر شتاب، والاحتفاظ بالتether والدرهم، والتحويل الفوري بتثبيت السعر 30 ثانية؟',
      zh: 'Shetab 里亚尔充值、USDT 与 AED 余额，以及 30 秒锁价的即时兑换如何运作？',
      ru: 'Как работают пополнение в риалах через Shetab, хранение USDT и дирхам и мгновенный обмен с фиксацией курса на 30 секунд.',
    },
    body: {
      fa: 'کیف پول فیروز از سه ارز ریال، تتر و درهم پشتیبانی می‌کند. شارژ ریالی از طریق درگاه شتاب انجام می‌شود و تبدیل بین ارزها با نرخ لحظه‌ای و قفل ۳۰ ثانیه‌ای صورت می‌گیرد. تمام تراکنش‌ها در دفتر کل (Ledger) ثبت و قابل دریافت است.',
      en: 'The Firuzo wallet supports three currencies: IRR, USDT and AED. Rial top-ups go through the Shetab gateway, and exchanges between currencies use live rates with a 30-second lock. Every transaction is recorded in the ledger and available for download.',
      ar: 'تدعم محفظة فيروز ثلاث عملات: الريال والتether والدرهم. يتم الشحن بالريال عبر بوابة شتاب، ويتم التحويل بين العملات بأسعار فورية مع تثبيت 30 ثانية. تُسجَّل جميع المعاملات في دفتر الأستاذ وتكون قابلة للاسترجاع.',
      zh: 'Firuzo 钱包支持 IRR、USDT 和 AED 三种货币。里亚尔充值通过 Shetab 网关完成，币种间兑换采用实时汇率并锁定 30 秒。所有交易均记录在账本中，可随时查询。',
      ru: 'Кошелек Firuzo поддерживает три валюты: IRR, USDT и AED. Пополнение в риалах проходит через шлюз Shetab, обмен между валютами — по живому курсу с фиксацией на 30 секунд. Все операции фиксируются в учетной книге и доступны для выгрузки.',
    },
    icon: ShieldCheck
  },
  {
    id: 'a3',
    category: { fa: 'درمانی', en: 'Medical', ar: 'علاجية', zh: '医疗', ru: 'Медицина' },
    title: { fa: 'سفر درمانی به استانبول', en: 'Medical Travel to Istanbul', ar: 'السفر العلاجي إلى إسطنبول', zh: '伊斯坦布尔医疗之旅', ru: 'Медицинская поездка в Стамбул' },
    readTime: { fa: '۹ دقیقه', en: '9 min', ar: '٩ دقائق', zh: '9 分钟', ru: '9 мин' },
    gradient: 'from-flight/80 to-flight',
    excerpt: {
      fa: 'چطور از ویزا تا بیمارستان و مترجم، یک سفر درمانی بی‌دغدغه بچینیم؟',
      en: 'How to arrange a hassle-free medical trip — from visa to hospital and interpreter.',
      ar: 'كيف ترتب رحلة علاجية بلا عناء — من التأشيرة إلى المستشفى والمترجم؟',
      zh: '如何安排一次无忧的医疗之旅——从签证到医院和翻译。',
      ru: 'Как организовать медицинскую поездку без хлопот — от визы до больницы и переводчика.',
    },
    body: {
      fa: 'استانبول یکی از قطب‌های گردشگری درمانی منطقه است. پیشنهاد ما ابتدا چکاپ کامل در بیمارستان‌های طرف قرارداد است. با بسته درمانی فیروز، ویزا، پرواز، اقامت نزدیک بیمارستان و مترجم فارسی‌زبان در قالب یک سفارش واحد ارائه می‌شود.',
      en: 'Istanbul is one of the region\'s leading medical tourism hubs. We recommend starting with a full check-up at partner hospitals. The Firuzo medical bundle covers visa, flights, accommodation near the hospital and a Persian-speaking interpreter in a single order.',
      ar: 'إسطنبول واحدة من أهم محطات السياحة العلاجية في المنطقة. نوصي بالبدء بفحص شامل في المستشفيات الشريكة. تشمل حزمة فيروز العلاجية التأشيرة والرحلات والإقامة قرب المستشفى ومترجماً فارسياً في طلب واحد.',
      zh: '伊斯坦布尔是该地区领先的医疗旅游中心。我们建议先在合作医院进行全面体检。Firuzo 医疗套餐将签证、机票、医院附近住宿和波斯语翻译整合为一笔订单。',
      ru: 'Стамбул — один из ведущих центров медицинского туризма региона. Мы рекомендуем начать с полного обследования в больницах-партнерах. Медицинский пакет Firuzo включает визу, перелеты, проживание рядом с больницей и переводчика в одном заказе.',
    },
    image: '/images/guide-medical.jpg'
  },
  {
    id: 'a4',
    category: { fa: 'نکات خرید', en: 'Booking Tips', ar: 'نصائح الحجز', zh: '购票技巧', ru: 'Советы по бронированию' },
    title: { fa: '۷ نکته خرید بلیت ارزان چارتری', en: '7 Tips for Cheap Charter Tickets', ar: '٧ نصائح لتذاكر شارتر رخيصة', zh: '购买廉价包机机票的 7 个技巧', ru: '7 советов по дешевым чартерным билетам' },
    readTime: { fa: '۴ دقیقه', en: '4 min', ar: '٤ دقائق', zh: '4 分钟', ru: '4 мин' },
    gradient: 'from-tour/80 to-tour',
    excerpt: {
      fa: 'بلیت چارتری بخریم یا سیستمی؟ کدام برای سفر من مناسب‌تر است؟',
      en: 'Charter or scheduled? Which one fits your trip better?',
      ar: 'شارتر أم نظامي؟ أيهما أنسب لرحلتك؟',
      zh: '包机还是定期航班？哪个更适合你的行程？',
      ru: 'Чартер или регулярный рейс? Что лучше подходит для вашей поездки?',
    },
    body: {
      fa: 'بلیت‌های چارتری معمولاً ۲۰ تا ۴۰ درصد ارزان‌ترند اما غیرقابل کنسلی هستند. اگر تاریخ سفر شما قطعی است، چارتری بخرید؛ در غیر این صورت سیستمی با جریمه کم انتخاب بهتری است. با ابزار مقایسه قیمت فیروز می‌توانید قیمت‌ها را در تقویم دوگانه شمسی/میلادی ببینید.',
      en: 'Charter tickets are usually 20–40% cheaper but non-refundable. If your travel dates are fixed, buy charter; otherwise a scheduled fare with low penalties is the safer choice. Use Firuzo\'s price comparison to see fares across a dual Jalali/Gregorian calendar.',
      ar: 'تذاكر الشارتر عادة أرخص بنسبة 20-40% لكنها غير قابلة للاسترداد. إذا كانت تواريخ سفرك ثابتة، اشترِ شارتر؛ وإلا فالتذاكر النظامية بغرامات أقل خيار أفضل. استخدم أداة مقارنة الأسعار من فيروز لعرض الأسعار في تقويم مزدوج هجري/ميلادي.',
      zh: '包机票通常便宜 20–40%，但不可退票。如果行程日期已确定，选包机票；否则选择罚金较低的定期航班更稳妥。使用 Firuzo 比价工具可在双历（波斯/公历）日历中查看票价。',
      ru: 'Чартерные билеты обычно на 20–40% дешевле, но невозвратные. Если даты поездки фиксированы — берите чартер; иначе надежнее регулярный рейс с низкими штрафами. Сравнивайте цены в Firuzo с календарем Джалали/Григорианскому.',
    },
    icon: PlaneTakeoff
  },
];

import { useTranslations } from 'next-intl';

export default function GuidePage() {
  const router = useRouter();
  const locale = useLocale();
  const ariaT = useTranslations('Common.aria');
  
  const [openId, setOpenId] = useState<string | null>(null);

  const selectedArticle = ARTICLES.find(a => a.id === openId);

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8">
      
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden mb-12 min-h-[400px] flex items-end p-8 shadow-elev-1 border border-line/80 bg-gradient-to-br from-deep via-brand-dark to-brand">
        <div
          className="absolute inset-0 z-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-deep/90 via-deep/40 to-transparent" />
        <div className="relative z-10 w-full max-w-2xl">
          <span className="inline-block px-4 py-1.5 bg-brand text-surface font-black text-[13px] rounded-full mb-4 shadow-sm backdrop-blur-md">
            {lt(locale, { fa: 'راهنمای سفر', en: 'Travel Guide', ar: 'دليل السفر', zh: '旅行指南', ru: 'Гид по путешествиям' })}
          </span>
          <h1 className="font-black text-[32px] md:text-[40px] text-surface mb-4 leading-tight">
            {lt(locale, { fa: 'کشف شگفتی‌های پنهان، سفر به قلب تاریخ', en: 'Discover Hidden Wonders, Journey into History', ar: 'اكتشف الروائع الخفية، وسافر إلى قلب التاريخ', zh: '探索隐秘奇观，漫游历史核心', ru: 'Откройте скрытые чудеса и отправьтесь в сердце истории' })}
          </h1>
          <p className="font-bold text-[16px] md:text-[18px] text-surface/90 mb-8 leading-relaxed">
            {lt(locale, { fa: 'از کوچه پس کوچه‌های باستانی تا مناظر طبیعی بکر، ما راهنمای شما در کشف بهترین مقاصد گردشگری هستیم.', en: 'From ancient alleys to pristine natural landscapes, we guide you to the finest destinations.', ar: 'من الأزقة القديمة إلى الطبيعة البكر، نحن دليلك لاكتشاف أفضل الوجهات.', zh: '从古老街巷到纯净自然，我们指引您探寻绝美胜地。', ru: 'От старинных улочек до первозданной природы — ваш надежный гид.' })}
          </p>
          <Button 
            onClick={() => router.push('/tours')}
            className="bg-action hover:bg-action-hover text-[#14201f] px-8 h-12 rounded-2xl font-black text-[15px] transition-all shadow-md"
          >
            {lt(locale, { fa: 'مشاهده تورهای ویژه', en: 'Explore Featured Tours', ar: 'استكشف الجولات المميزة', zh: '查看特色旅游', ru: 'Смотреть туры' })}
          </Button>
        </div>
      </section>

      {/* Bento Grid Tips & Articles */}
      <section className="mb-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-black text-[28px] text-ink mb-2">
              {lt(locale, { fa: 'نکات و مقالات کاربردی', en: 'Travel Insights & Guides', ar: 'نصائح ومقالات عملية', zh: '实用攻略与文章', ru: 'Полезные советы и статьи' })}
            </h2>
            <p className="font-bold text-[15px] text-sub">
              {lt(locale, { fa: 'برای تجربه‌ای بی‌نظیر، قبل از سفر بخوانید.', en: 'Essential knowledge to read before you travel.', ar: 'اقرأ قبل السفر لتجربة استثنائية.', zh: '出行前必读，尽享非凡体验。', ru: 'Прочтите перед поездкой для безупречного опыта.' })}
            </p>
          </div>
          <Link href="/travelogues" className="hidden md:flex text-brand-dark hover:underline transition-colors font-black text-[14px] items-center gap-1">
            {lt(locale, { fa: 'مشاهده همه', en: 'View All', ar: 'عرض الكل', zh: '查看全部', ru: 'Все статьи' })} <ArrowLeft size={16} className="ltr:rotate-180" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[250px]">
          
          {/* Article 1: Large Image (2x2) */}
          <div 
            onClick={() => setOpenId(ARTICLES[0].id)}
            className="md:col-span-2 md:row-span-2 rounded-3xl overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-elev-2 transition-all border border-line/80"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('${ARTICLES[0].image}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity group-hover:opacity-90" />
            <div className="absolute bottom-0 start-0 end-0 p-8">
              <span className="inline-block px-3 py-1.5 bg-surface/20 backdrop-blur-md text-surface font-bold text-[12px] rounded-lg mb-4">
                {lt(locale, ARTICLES[0].category)}
              </span>
              <h3 className="font-black text-[24px] md:text-[28px] text-surface mb-3 group-hover:text-brand transition-colors">
                {lt(locale, ARTICLES[0].title)}
              </h3>
              <p className="font-bold text-[14px] text-surface/80 line-clamp-2 leading-relaxed">
                {lt(locale, ARTICLES[0].excerpt)}
              </p>
            </div>
          </div>

          {/* Article 2: Wide Text Block (2x1) */}
          <div 
            onClick={() => setOpenId(ARTICLES[1].id)}
            className="md:col-span-2 rounded-3xl bg-surface/95 backdrop-blur-xl border border-line/80 shadow-sm p-8 flex flex-col justify-between hover:border-brand hover:shadow-elev-1 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {(() => { const Icon = ARTICLES[1].icon; return Icon && <Icon size={28} />; })()}
              </div>
              <span className="text-sub font-bold text-[12px] bg-soft px-3 py-1 rounded-full">
                {lt(locale, ARTICLES[1].readTime)}
              </span>
            </div>
            <div>
              <h3 className="font-black text-[20px] text-ink mb-2 group-hover:text-brand-dark transition-colors">
                {lt(locale, ARTICLES[1].title)}
              </h3>
              <p className="font-bold text-[14px] text-sub leading-7 line-clamp-2">
                {lt(locale, ARTICLES[1].excerpt)}
              </p>
            </div>
          </div>

          {/* Article 3: Small Image Block (1x1) — gradient fallback keeps the
              tile intact when the article has no photo asset. */}
          <div 
            onClick={() => setOpenId(ARTICLES[2].id)}
            className={`rounded-3xl overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-elev-1 transition-all border border-line/80 bg-gradient-to-br ${ARTICLES[2].gradient || 'from-brand to-brand-dark'}`}
          >
            {ARTICLES[2].image && (
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('${ARTICLES[2].image}')` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent group-hover:bg-black/60 transition-colors" />
            <div className="absolute inset-0 p-6 flex flex-col justify-end">
              <span className="inline-block px-2.5 py-1 bg-brand text-surface font-black text-[11px] rounded-lg mb-2 w-fit">
                {lt(locale, ARTICLES[2].category)}
              </span>
              <h4 className="font-black text-[16px] text-surface leading-tight">
                {lt(locale, ARTICLES[2].title)}
              </h4>
            </div>
          </div>

          {/* Article 4: Colored Block (1x1) */}
          <div 
            onClick={() => setOpenId(ARTICLES[3].id)}
            className="rounded-3xl bg-surface/95 backdrop-blur-xl border border-line/80 text-brand p-6 flex flex-col justify-center items-center text-center hover:bg-brand hover:text-surface transition-all shadow-sm cursor-pointer group"
          >
            {(() => { const Icon = ARTICLES[3].icon; return Icon && <Icon size={48} className="mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform" />; })()}
            <h4 className="font-black text-[18px] leading-tight">
              {lt(locale, ARTICLES[3].title)}
            </h4>
          </div>

        </div>
        
        <Link href="/travelogues" className="md:hidden mt-6 flex justify-center text-brand-dark font-black text-[14px] items-center gap-1">
          {lt(locale, { fa: 'مشاهده همه مقالات', en: 'View All Articles', ar: 'عرض جميع المقالات', zh: '查看所有攻略', ru: 'Все статьи' })} <ArrowLeft size={16} className="ltr:rotate-180" />
        </Link>
      </section>

      {/* Support Section */}
      <div className="bg-gradient-to-l from-brand-dark to-brand rounded-3xl p-8 md:p-10 text-surface flex flex-col md:flex-row items-center justify-between gap-6 shadow-elev-2 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 flex items-center gap-5 text-center md:text-start">
          <div className="w-16 h-16 rounded-full bg-surface/20 flex items-center justify-center backdrop-blur-sm shrink-0">
            <Headset size={32} />
          </div>
          <div>
            <p className="font-black text-[24px] mb-1">
              {lt(locale, { fa: 'هنوز سوال دارید؟', en: 'Still Have Questions?', ar: 'هل لديك أسئلة بعد؟', zh: '还有疑问？', ru: 'Остались вопросы?' })}
            </p>
            <p className="font-bold text-[15px] opacity-90">
              {lt(locale, { fa: 'کارشناسان فیروز ۲۴ ساعته پاسخگوی شما هستند', en: 'Firuzo concierges are available 24/7 to assist you', ar: 'خبراء فيروز في خدمتكم على مدار الساعة', zh: 'Firuzo 专家 24 小时随时为您答疑', ru: 'Специалисты Firuzo на связи 24/7' })}
            </p>
          </div>
        </div>
        <Link href="/support" className="relative z-10 w-full md:w-auto">
          <Button variant="outline" className="w-full md:w-auto border-white text-surface hover:bg-surface hover:text-brand-dark px-10 h-14 font-black text-[15px] rounded-2xl shadow-sm">
            {lt(locale, { fa: 'تماس با پشتیبانی', en: 'Contact Support', ar: 'الاتصال بالدعم', zh: '联系客服', ru: 'Связаться с поддержкой' })}
          </Button>
        </Link>
      </div>

      {/* Modal for Article Reading */}
      {openId && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpenId(null)}>
          <div 
            className="bg-surface rounded-3xl shadow-elev-3 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedArticle.image && (
              <div 
                className="h-48 w-full bg-cover bg-center relative"
                style={{ backgroundImage: `url('${selectedArticle.image}')` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button aria-label={ariaT('close')}
                  onClick={() => setOpenId(null)}
                  className="absolute top-4 end-4 w-8 h-8 bg-black/40 hover:bg-black/60 text-surface rounded-full flex items-center justify-center transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {!selectedArticle.image && (
              <div className="flex justify-between items-center p-4 border-b border-line">
                <span className="font-bold text-sub text-[12px] bg-soft px-3 py-1 rounded-full">{lt(locale, selectedArticle.category)}</span>
                <button aria-label={ariaT('close')}
                  onClick={() => setOpenId(null)}
                  className="w-8 h-8 bg-soft hover:bg-line/50 text-sub rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                {selectedArticle.image && (
                  <span className="font-bold text-surface bg-brand text-[11px] px-3 py-1 rounded-full shadow-sm">{lt(locale, selectedArticle.category)}</span>
                )}
                <span className="text-sub font-bold text-[12px] flex items-center gap-1">
                   {lt(locale, selectedArticle.readTime)}
                </span>
              </div>
              <h2 className="font-black text-[24px] text-ink mb-6 leading-tight">
                {lt(locale, selectedArticle.title)}
              </h2>
              <div className="font-bold text-[15px] text-sub leading-8 whitespace-pre-wrap">
                {lt(locale, selectedArticle.body)}
              </div>
              
              <div className="mt-8 pt-6 border-t border-line flex justify-end">
                <Button onClick={() => setOpenId(null)} className="bg-brand hover:bg-brand-dark text-surface font-black rounded-2xl px-8 h-12">
                  {lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
