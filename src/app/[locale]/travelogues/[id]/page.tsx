'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Heart, Share2, ArrowLeft, MapPin, User, Check, Clock, Sparkles, Building2, Plane } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { shimmerDataUrl } from '@/lib/image-utils';
import { lt } from '@/lib/lt';

interface LocalizedTextMap {
  fa: string;
  en: string;
  ar: string;
  zh: string;
  ru: string;
}

interface TravelogueItem {
  id: string;
  title: LocalizedTextMap;
  destination: LocalizedTextMap;
  userName: string;
  image: string;
  content: LocalizedTextMap;
}

const MOCK_TRAVELOGUES: Record<string, TravelogueItem> = {
  '1': {
    id: '1',
    title: {
      fa: 'سفر سه روزه به استانبول',
      en: '3-Day Istanbul Journey',
      ar: 'رحلة ٣ أيام إلى إسطنبول',
      zh: '伊斯坦布尔三日游',
      ru: '3 дня в Стамбуле',
    },
    destination: {
      fa: 'استانبول، ترکیه',
      en: 'Istanbul, Turkey',
      ar: 'إسطنبول، تركيا',
      zh: '土耳其伊斯坦布尔',
      ru: 'Стамбул, Турция',
    },
    userName: 'Ali Ahmadi',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&auto=format&fit=crop&q=80',
    content: {
      fa: 'استانبول شهری است که نیمی از آن در آسیا و نیمی دیگر در اروپا قرار دارد. در این سفر سه روزه، از مسجد ایاصوفیه، بازار بزرگ و تنگه بسفر دیدن کردیم. تجربه‌ای بی‌نظیر از تقابل سنت و مدرنیته بود. غذاهای ترکی مانند کباب و باقلوا واقعاً خوشمزه بودند.',
      en: 'Istanbul is a magical metropolis where Asia meets Europe. During this 3-day trip, we explored Hagia Sophia, Grand Bazaar, and the Bosphorus strait. The blend of ancient heritage and vibrant modern life was unforgettable.',
      ar: 'إسطنبول مدينة ساحرة تلتقي فيها آسيا بأوروبا. خلال هذه الرحلة التي استغرقت 3 أيام، قمنا بزيارة آيا صوفيا والبازار الكبير ومضيق البوسفور.',
      zh: '伊斯坦布尔是一座连接亚欧大陆的传奇城市。在这三天的旅程中，我们游览了圣索菲亚大教堂、大巴扎和博斯普鲁斯海峡。',
      ru: 'Стамбул — удивительный мегаполис, соединяющий Азию и Европу. За эти три дня мы посетили собор Святой Софии, Гранд-базар и пролив Босфор.',
    },
  },
  '2': {
    id: '2',
    title: {
      fa: 'خاطرات سفر به دبی و برج خلیفه',
      en: 'Dubai Memories & Burj Khalifa',
      ar: 'ذكريات دبي وبرج خليفة',
      zh: '迪拜与哈利法塔回忆',
      ru: 'Воспоминания о Дубае и Бурдж-Халифа',
    },
    destination: {
      fa: 'دبی، امارات',
      en: 'Dubai, UAE',
      ar: 'دبي، الإمارات',
      zh: '阿联酋迪拜',
      ru: 'Дубай, ОАЭ',
    },
    userName: 'Sara Mohammadi',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80',
    content: {
      fa: 'دبی شهر آسمان‌خراش‌ها و تفریحات مدرن است. بازدید از برج خلیفه و سافاری در صحرا از بهترین بخش‌های این سفر بود. همچنین خرید در دبی مال و دیدن آب‌نمای دبی تجربه‌ای فراموش‌نشدنی بود.',
      en: 'Dubai is the city of futuristic architecture and desert adventures. Visiting Burj Khalifa and the desert dune safari were the highlights of our journey.',
      ar: 'دبي هي مدينة ناطحات السحاب والمغامرات الصحراوية المبهرة. زيارة برج خليفة والسفاري في الكثبان الرملية كانت من أروع المحطات.',
      zh: '迪拜是未来摩天大楼与沙漠探险的魅力之都。登上哈利法塔并在沙漠冲沙是最难忘的时刻。',
      ru: 'Дубай — город футуристических небоскрёбов и пустынных приключений. Подъём на Бурдж-Халифа и сафари по дюнам стали ярчайшими моментами.',
    },
  },
  '3': {
    id: '3',
    title: {
      fa: 'پاییز در کوچه‌های تاریخی تفلیس',
      en: 'Autumn in Historic Tbilisi',
      ar: 'الخريف في أزقة تبليسي التاريخية',
      zh: '秋游第比利斯老城',
      ru: 'Осень на улочках Тбилиси',
    },
    destination: {
      fa: 'تفلیس، گرجستان',
      en: 'Tbilisi, Georgia',
      ar: 'تبليسي، جورجيا',
      zh: '格鲁吉亚第比利斯',
      ru: 'Тбилиси, Грузия',
    },
    userName: 'Nima Karimi',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&auto=format&fit=crop&q=80',
    content: {
      fa: 'تفلیس در پاییز حال و هوای دلنشینی دارد. قدم زدن در بافت تاریخی شهر قدیم، تله‌کابین ناریکالا و چشمه‌های آب گرم گوگردی از زیباترین لحظات سفر من بود.',
      en: 'Tbilisi during autumn is utterly charming. Walking through the Old Town, taking the Narikala cable car, and relaxing in sulfur baths made it an incredible experience.',
      ar: 'تبليسي في الخريف تتمتع بأجواء ساحرة. المشي في شوارع المدينة القديمة والتلفريك إلى ناريكالا والحمامات الكبريتية كانت تجربة رائعة.',
      zh: '秋天的第比利斯散发着迷人的魅力。漫步在老城区，乘坐缆车登上纳里卡拉要塞，享受硫磺温泉，令人心旷神怡。',
      ru: 'Тбилиси осенью невероятно уютен. Прогулки по старому городу, канатная дорога к крепости Нарикала и серные бани оставили незабываемые впечатления.',
    },
  },
  '4': {
    id: '4',
    title: {
      fa: 'سفر به نصف جهان؛ شکوه نقش جهان و آرامش هتل عباسی',
      en: 'Journey to Half the World: Naqsh-e Jahan & Abbasi Garden',
      ar: 'رحلة إلى نصف العالم: نقش جهان وحديقة عباسي',
      zh: '半个世界之旅：伊玛目广场与阿巴西花园',
      ru: 'Путешествие в Исфахан: Накш-э Джахан и отель Аббаси',
    },
    destination: {
      fa: 'اصفهان، ایران',
      en: 'Isfahan, Iran',
      ar: 'أصفهان، إيران',
      zh: '伊朗伊斯法罕',
      ru: 'Исфахан, Иран',
    },
    userName: 'Reza Tehrani',
    image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80',
    content: {
      fa: 'اصفهان شاهکار هنر و فرهنگ صفوی است. گنبد فیروزه‌ای شیخ لطف‌الله، کاشی‌کاری‌های مسجد امام و صرف چای سنتی در حیاط باصفای هتل عباسی لحظاتی ماندگار را در دفترچه خاطرات این سفر رقم زد.',
      en: 'Isfahan is a crowning triumph of Safavid heritage. The turquoise dome of Sheikh Lotfollah, Imam Mosque tilework, and evening Persian tea in the courtyard of Abbasi Hotel made this journey truly unforgettable.',
      ar: 'أصفهان هي تحفة الفن والعمارة الصفوية. قبة الشيخ لطف الله الفيروزية والشاي التقليدي في باحة فندق عباسي من أجمل الذكريات.',
      zh: '伊斯法罕是萨法维王朝艺术与文化的巅峰。希克斯罗图福拉清真寺的绿松石穹顶与阿巴西酒店庭院的下午茶令人流连忘返。',
      ru: 'Исфахан — шедевр сефевидской архитектуры. Бирюзовый купол мечети шейха Лютфуллы и традиционный чай в саду отеля Аббаси оставили глубокий след.',
    },
  },
};

export default function TravelogueDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const commonT = useTranslations('Common.aria');
  const id = (params?.id as string) || '1';
  const t = MOCK_TRAVELOGUES[id];

  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!t) {
    return (
      <div className="max-w-[800px] mx-auto p-16 text-center">
        <h1 className="text-xl font-black text-ink mb-4">{lt(locale, { fa: 'سفرنامه یافت نشد', en: 'Travelogue Not Found', ar: 'لم يتم العثور على اليومية', zh: '未找到该游记', ru: 'История не найдена' })}</h1>
        <Link href="/travelogues" className="text-brand-dark font-extrabold hover:underline">
          {lt(locale, { fa: 'بازگشت به سفرنامه‌ها', en: 'Back to Travelogues', ar: 'العودة إلى اليوميات', zh: '返回游记列表', ru: 'Назад к историям' })}
        </Link>
      </div>
    );
  }

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-10 py-10">
      <Link 
        href="/travelogues" 
        className="inline-flex items-center gap-2 text-brand-dark hover:underline font-extrabold text-sm mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ArrowLeft size={16} className="rtl:rotate-0 ltr:rotate-180" />
        <span>{lt(locale, { fa: 'بازگشت به سفرنامه‌ها', en: 'Back to Travelogues', ar: 'العودة إلى اليوميات', zh: '返回游记列表', ru: 'Назад к историям' })}</span>
      </Link>
      
      <div className="relative w-full h-[380px] md:h-[460px] rounded-3xl overflow-hidden mb-8 shadow-elev-2 border border-line/80">
        <Image
          src={t.image}
          alt={lt(locale, t.title)}
          fill
          sizes="(max-width: 860px) 100vw, 860px"
          placeholder="blur"
          blurDataURL={shimmerDataUrl(860, 460)}
          className="object-cover"
          priority
        />
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 pb-6 border-b border-line">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-brand-dark bg-mint px-2.5 py-0.5 rounded-full">
              <Clock size={12} />
              <span>{lt(locale, { fa: '۵ دقیقه زمان مطالعه', en: '5 min read', ar: 'قراءة في 5 دقائق', zh: '5 分钟阅读', ru: '5 мин чтения' })}</span>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-ink mb-3 leading-tight">
            {lt(locale, t.title)}
          </h1>
          <div className="flex items-center gap-3 text-xs font-bold text-sub">
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} className="text-brand-dark" />
              <span>{lt(locale, t.destination)}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <User size={14} />
              <span>{t.userName}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLiked(!liked)}
            aria-label={liked ? commonT('unlike') : commonT('like')}
            className={`h-11 px-4 rounded-xl border flex items-center gap-2 font-bold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              liked ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-surface border-line text-sub hover:text-ink'
            }`}
          >
            <Heart size={16} className={liked ? 'fill-rose-600 text-rose-600' : ''} />
            <span>{liked ? (locale === 'fa' ? 'پسندیده شد' : 'Liked') : (locale === 'fa' ? 'پسندیدن' : 'Like')}</span>
          </button>
          
          <button
            onClick={handleShare}
            aria-label={commonT('share')}
            className="h-11 px-4 rounded-xl border border-line bg-surface hover:bg-soft text-sub hover:text-ink flex items-center gap-2 font-bold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {copied ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
            <span>{copied ? (locale === 'fa' ? 'کپی شد!' : 'Copied!') : (locale === 'fa' ? 'اشتراک' : 'Share')}</span>
          </button>
        </div>
      </div>

      {/* Main Story Content with Editorial Touch */}
      <div className="space-y-6 text-ink leading-relaxed text-sm sm:text-base font-medium">
        <p className="first-letter:text-4xl first-letter:font-black first-letter:text-brand-dark first-letter:float-start first-letter:me-2">
          {lt(locale, t.content)}
        </p>

        {/* Highlighted Traveler Insider Tip Callout */}
        <div className="p-5 rounded-2xl bg-mint/40 border border-brand/20 my-6 flex items-start gap-3">
          <Sparkles size={20} className="text-brand-dark shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <strong className="text-brand-dark font-black block mb-1">
              {lt(locale, { fa: 'نکته اختصاصی این سفر:', en: "Traveler's Insider Tip:", ar: 'نصيحة ذهبية للمسافرين:', zh: '旅行者私藏贴士：', ru: 'Совет путешественника:' })}
            </strong>
            <p className="text-sub font-bold leading-relaxed m-0">
              {lt(locale, {
                fa: 'برای استفاده بهینه از زمان و حمل‌ونقل عمومی، تهیه فیروز پاس شهری و سیم‌کارت eSIM قبل از پرواز، هزینه‌ها را تا ۴۰٪ کاهش داده و شما را از ایستادن در صف‌های صرافی فرودگاه بی‌نیاز می‌کند.',
                en: 'Purchasing an eSIM and City Pass before landing saves up to 40% on airport transit and skips exchange counter queues.',
                ar: 'شراء بطاقة المدينة وشريحة eSIM قبل السفر يوفر حتى 40% من تكاليف التنقل في المطار.',
                zh: '出行前提前购买城市通票和eSIM可节省高达40%的市内交通费用，免去机场排队换汇烦恼。',
                ru: 'Покупка eSIM и City Pass заранее экономит до 40% на транспорте и избавляет от очередей в аэропорту.'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Shop The Story / Related Services */}
      <div className="mt-12 pt-8 border-t border-line">
        <h3 className="font-black text-lg text-ink mb-4">
          {lt(locale, { fa: 'خدمات پیشنهادی مرتبط با این سفر', en: 'Recommended Services for This Journey', ar: 'خدمات موصى بها لهذه الوجهة', zh: '本行程相关推荐服务', ru: 'Рекомендуемые услуги для этой поездки' })}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/hotels/search"
            className="p-4 rounded-2xl bg-surface border border-line hover:border-brand/40 hover:shadow-xs transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 grid place-items-center">
                <Building2 size={20} />
              </div>
              <div>
                <strong className="text-sm font-black text-ink block group-hover:text-brand-dark transition-colors">
                  {lt(locale, { fa: 'رزرو هتل‌های محبوب این مقصد', en: 'Explore Hotels in This Destination', ar: 'فنادق مميزة في هذه الوجهة', zh: '查看目的地热门酒店', ru: 'Отели в этом направлении' })}
                </strong>
                <span className="text-[11px] text-sub font-bold">با تضمین کمترین نرخ و پرداخت شتاب/تتر</span>
              </div>
            </div>
            <ArrowLeft size={16} className="text-sub group-hover:-translate-x-1 transition-transform rtl:inline ltr:hidden" />
          </Link>

          <Link
            href="/flights/search"
            className="p-4 rounded-2xl bg-surface border border-line hover:border-brand/40 hover:shadow-xs transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
                <Plane size={20} />
              </div>
              <div>
                <strong className="text-sm font-black text-ink block group-hover:text-brand-dark transition-colors">
                  {lt(locale, { fa: 'پروازهای مستقیم به این مقصد', en: 'Flights to This Destination', ar: 'رحلات مباشرة إلى هذه الوجهة', zh: '直飞该目的地的航班', ru: 'Прямые рейсы в это направление' })}
                </strong>
                <span className="text-[11px] text-sub font-bold">بیش از ۴۰۰ ایرلاین داخلی و بین‌المللی</span>
              </div>
            </div>
            <ArrowLeft size={16} className="text-sub group-hover:-translate-x-1 transition-transform rtl:inline ltr:hidden" />
          </Link>
        </div>
      </div>
    </div>
  );
}
