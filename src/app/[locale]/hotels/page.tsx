'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { BedDouble, Star, ShieldCheck, Sparkles, MapPin, ArrowLeft } from 'lucide-react';
import { SearchWidget } from '@/components/search/SearchWidget';
import { shimmerDataUrl } from '@/lib/image-utils';
import { num } from '@/lib/format';
import { lt, LText } from '@/lib/lt';

export default function HotelsLandingPage() {
  const locale = useLocale();

  const hotelCollections: { title: LText; city: LText; desc: LText; price: number; img: string; stars: number; query: string }[] = [
    {
      title: { fa: 'هتل‌های لوکس ۵ ستاره', en: 'Luxury 5-Star Hotels', ar: 'فنادق فاخرة 5 نجوم', zh: '豪华五星酒店', ru: 'Роскошные 5-звёздочные отели' },
      city: { fa: 'مشهد و تهران', en: 'Mashhad & Tehran', ar: 'مشهد وطهران', zh: '马什哈德与德黑兰', ru: 'Мешхед и Тегеран' },
      desc: { fa: 'اقامت شاهانه با بالاترین سطح خدمات VIP و دسترسی عالی', en: 'Royal stay with top-tier VIP service and prime access', ar: 'إقامة ملكية بأعلى مستوى من خدمات VIP وموقع ممتاز', zh: '尊贵入住，顶级 VIP 服务与优越位置', ru: 'Королевский отдых с VIP-сервисом и отличным расположением' },
      price: 4800000,
      img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      stars: 5,
      query: '5star',
    },
    {
      title: { fa: 'بوتیک‌هتل‌های سنتی', en: 'Traditional Boutique Hotels', ar: 'فنادق بووتيك تقليدية', zh: '传统精品酒店', ru: 'Традиционные бутик-отели' },
      city: { fa: 'اصفهان و شیراز', en: 'Isfahan & Shiraz', ar: 'أصفهان وشيراز', zh: '伊斯法罕与设拉子', ru: 'Исфахан и Шираз' },
      desc: { fa: 'خانه‌های قاجاری و صفوی بازسازی‌شده با حوض، شمعدانی و معماری اصیل', en: 'Restored Qajar & Safavid houses with courtyards and authentic architecture', ar: 'منازل قاجارية وصفوية مُرمَّمة بأفنية وشمعات ومعمارة أصيلة', zh: '修复的卡扎尔与萨法维老宅，庭院与原真建筑', ru: 'Отреставрированные дома эпох Каджаров и Сефевидов с двориками и аутентичной архитектурой' },
      price: 2600000,
      img: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&q=80',
      stars: 4,
      query: 'boutique',
    },
    {
      title: { fa: 'ریزورت‌ها و اقامتگاه‌های ساحلی', en: 'Beach Resorts & Stays', ar: 'منتجعات وإقامات شاطئية', zh: '海滨度假村与住宿', ru: 'Пляжные курорты и Residence' },
      city: { fa: 'کیش و قشم', en: 'Kish & Qeshm', ar: 'كیش وقشم', zh: '基什与格什姆', ru: 'Киш и Кешм' },
      desc: { fa: 'استراحت ساحلی با چشم‌انداز خلیج فارس، کلوپ دریایی و ترانسفر رایگان', en: 'Seaside relaxation with Persian Gulf views, marina club and free transfers', ar: 'استرخاء على الشاطئ بإطلالة على الخليج الفارسي ونادٍ بحري ونقل مجاني', zh: '波斯湾海景度假，游艇会与免费接送', ru: 'Отдых у моря с видом на Персидский залив, марина и бесплатный трансфер' },
      price: 3900000,
      img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80',
      stars: 5,
      query: 'resort',
    },
    {
      title: { fa: 'هتل‌های اقتصادی و نزدیک مرکز', en: 'Budget Hotels Near Center', ar: 'فنادق اقتصادية قريبة من المركز', zh: '市中心经济型酒店', ru: 'Бюджетные отели в центре' },
      city: { fa: 'تهران و تبریز', en: 'Tehran & Tabriz', ar: 'طهران وتبريز', zh: '德黑兰与大不里士', ru: 'Тегеран и Тебриз' },
      desc: { fa: 'کیفیت بالا، هزینه اقتصادی، دسترسی سریع به مترو و جاذبه‌های شهری', en: 'High quality at budget cost, quick access to metro and city sights', ar: 'جودة عادية بتكلفة اقتصادية ووصول سريع للمترو ومعالم المدينة', zh: '高性价比，快速通达地铁与城市景点', ru: 'Высокое качество за скромные деньги, быстрый доступ к метро и достопримечательностям' },
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
            <span>{lt(locale, { fa: 'رزرواسیون مستقیم هتل و اقامتگاه فیروزو', en: 'Firuzo Direct Hotel Booking', ar: 'حجز الفنادق المباشر من فيروزو', zh: 'Firuzo 酒店直订', ru: 'Прямое бронирование отелей Firuzo' })}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-ink tracking-tight mb-4">
            {lt(locale, { fa: 'رزرو هتل و اقامتگاه‌های سنتی با تضمین کمترین نرخ', en: 'Book Hotels & Traditional Stays at the Best-Rate Guarantee', ar: 'احجز الفنادق والإقامات التقليدية مع ضمان أفضل سعر', zh: '预订酒店与传统民宿，享最低价保证', ru: 'Бронируйте отели и традиционные гостиные с гарантией лучшей цены' })}
          </h1>
          <p className="text-sm md:text-base text-sub font-bold max-w-2xl mx-auto leading-relaxed">
            {lt(locale, { fa: 'بیش از ۲,۰۰۰ هتل ۵ ستاره، بوتیک‌هتل تاریخی و سوئیت اقامتی با واچر آنی و کنسلی رایگان', en: '2,000+ five-star hotels, historic boutique hotels and suites with instant vouchers and free cancellation', ar: 'أكثر من 2000 فندق 5 نجوم وفندق بووتيك تاريخي وجناح مع قسائم فورية وإلغاء مجاني', zh: '2000+ 五星酒店、历史精品酒店与套房，即时出票、免费取消', ru: 'Более 2000 пятизвёздочных отелей, бутик-отелей и апартаментов с мгновенными ваучерами и бесплатной отменой' })}
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
            <span className="text-xs font-black text-brand-dark tracking-wider uppercase">{lt(locale, { fa: 'دسته‌بندی‌های برگزیده', en: 'Featured Collections', ar: 'مجموعات مختارة', zh: '精选分类', ru: 'Избранные подборки' })}</span>
            <h2 className="text-2xl md:text-3xl font-black text-ink m-0">{lt(locale, { fa: 'بهترین اقامتگاه‌ها برای هر سلیقه و بودجه', en: 'The best stays for every taste and budget', ar: 'أفضل الإقامات لكل ذوق وميزانية', zh: '适合每种品味与预算的最佳住宿', ru: 'Лучшие варианты для любого вкуса и бюджета' })}</h2>
          </div>
          <Link
            href="/hotels/search"
            className="text-xs font-bold text-brand-dark flex items-center gap-1.5 hover:underline"
          >
            <span>{lt(locale, { fa: 'مشاهده همه اقامتگاه‌ها', en: 'View all stays', ar: 'عرض جميع الإقامات', zh: '查看全部住宿', ru: 'Все варианты' })}</span>
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
                alt={lt(locale, col.title)}
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
                  {lt(locale, col.city)}
                </span>
                <div className="flex text-gold">
                  {Array.from({ length: col.stars }).map((_, i) => (
                    <Star key={i} size={13} className="fill-gold" />
                  ))}
                </div>
              </div>

              <div className="relative z-10 text-surface space-y-1.5">
                <h3 className="text-lg font-black">{lt(locale, col.title)}</h3>
                <p className="text-xs text-surface/80 line-clamp-2 leading-relaxed">{lt(locale, col.desc)}</p>
                <div className="pt-2 border-t border-surface/20 flex items-center justify-between">
                  <span className="text-xs text-surface/70">{lt(locale, { fa: 'شروع از', en: 'From', ar: 'يبدأ من', zh: '价格起', ru: 'От' })}</span>
                  <span className="text-sm font-black font-mono">
                    {num(col.price, locale)} <span className="text-[11px] font-normal">{lt(locale, { fa: 'تومان/شب', en: 'Toman/night', ar: 'تومان/ليلة', zh: '图曼/晚', ru: 'Toman/ночь' })}</span>
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
            <h3 className="text-base font-black text-ink">{lt(locale, { fa: 'تضمین تمیزی و تطابق عکس‌ها', en: 'Cleanliness & Photo Accuracy Guarantee', ar: 'ضمان النظافة ومطابقة الصور', zh: '清洁与照片真实性保证', ru: 'Гарантия чистоты и достоверности фото' })}</h3>
            <p className="text-xs text-sub font-bold leading-relaxed">
              {lt(locale, { fa: 'تمامی اقامتگاه‌ها توسط تیم بازرسی فیروزو بررسی و استانداردهای بهداشتی آن‌ها تایید شده است', en: 'Every property is inspected by the Firuzo team and its hygiene standards are verified', ar: 'تخضع جميع الإقامات لفحص فريق فيروزو ويتم التحقق من معايير النظافة فيها', zh: '每家住宿均经 Firuzo 团队实地检查并认证卫生标准', ru: 'Каждый объект проверяется командой Firuzo на соответствие гигиеническим стандартам' })}
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-surface border border-line shadow-elev-1 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-mint text-brand-dark grid place-items-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-black text-ink">{lt(locale, { fa: 'واچر الکترونیکی آنی', en: 'Instant E-Voucher', ar: 'قسيمة إلكترونية فورية', zh: '即时电子凭证', ru: 'Мгновенный электронный ваучер' })}</h3>
            <p className="text-xs text-sub font-bold leading-relaxed">
              {lt(locale, { fa: 'صدور مستقیم برگه پذیرش رسمی هتل در لحظه پرداخت بدون معطلی و هماهنگی مجدد', en: 'Official hotel voucher issued at the moment of payment — no delays, no re-confirmation', ar: 'إصدار قسيمة الفندق الرسمية لحظة الدفع دون تأخير أو تأكيد إضافي', zh: '支付瞬间即出官方酒店凭证，无等待、无需二次确认', ru: 'Официальный ваучер отеля выдаётся в момент оплаты — без задержек и подтверждений' })}
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-surface border border-line shadow-elev-1 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-soft text-price grid place-items-center">
              <Star size={24} />
            </div>
            <h3 className="text-base font-black text-ink">{lt(locale, { fa: 'قوانین کنسلی کاملاً شفاف', en: 'Fully Transparent Cancellation', ar: 'سياسات إلغاء شفافة تماماً', zh: '完全透明的取消政策', ru: 'Полностью прозрачные правила отмены' })}</h3>
            <p className="text-xs text-sub font-bold leading-relaxed">
              {lt(locale, { fa: 'امکان لغو رایگان در اکثر اقامتگاه‌ها و استرداد مستقیم وجه بدون کسر کارمزد اضافی', en: 'Free cancellation at most properties and direct refunds with no extra fees', ar: 'إلغاء مجاني في معظم الإقامات واسترداد مباشر دون رسوم إضافية', zh: '多数住宿可免费取消，直接退款无额外手续费', ru: 'Бесплатная отмена в большинстве объектов и прямой возврат без лишних комиссий' })}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
