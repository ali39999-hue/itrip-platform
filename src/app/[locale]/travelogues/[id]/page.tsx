'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Heart, Share2, ArrowLeft, MapPin, User, Check } from 'lucide-react';
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
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80',
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

      <div className="prose max-w-none text-ink font-medium leading-relaxed text-base">
        <p>{lt(locale, t.content)}</p>
      </div>
    </div>
  );
}
