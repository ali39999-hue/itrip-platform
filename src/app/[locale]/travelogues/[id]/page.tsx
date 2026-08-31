'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Heart, Share2, ArrowLeft, MapPin, User, Check } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { shimmerDataUrl } from '@/lib/image-utils';
import { lt } from '@/lib/lt';

interface TravelogueItem {
  id: string;
  titleFa: string;
  titleEn: string;
  destinationFa: string;
  destinationEn: string;
  userName: string;
  image: string;
  contentFa: string;
  contentEn: string;
}

const MOCK_TRAVELOGUES: Record<string, TravelogueItem> = {
  '1': {
    id: '1',
    titleFa: 'سفر سه روزه به استانبول',
    titleEn: '3-Day Istanbul Journey',
    destinationFa: 'استانبول، ترکیه',
    destinationEn: 'Istanbul, Turkey',
    userName: 'Ali Ahmadi',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&auto=format&fit=crop&q=80',
    contentFa: 'استانبول شهری است که نیمی از آن در آسیا و نیمی دیگر در اروپا قرار دارد. در این سفر سه روزه، از مسجد ایاصوفیه، بازار بزرگ و تنگه بسفر دیدن کردیم. تجربه‌ای بی‌نظیر از تقابل سنت و مدرنیته بود. غذاهای ترکی مانند کباب و باقلوا واقعاً خوشمزه بودند.',
    contentEn: 'Istanbul is a magical metropolis where Asia meets Europe. During this 3-day trip, we explored Hagia Sophia, Grand Bazaar, and the Bosphorus strait. The blend of ancient heritage and vibrant modern life was unforgettable.'
  },
  '2': {
    id: '2',
    titleFa: 'خاطرات سفر به دبی و برج خلیفه',
    titleEn: 'Dubai Memories & Burj Khalifa',
    destinationFa: 'دبی، امارات',
    destinationEn: 'Dubai, UAE',
    userName: 'Sara Mohammadi',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80',
    contentFa: 'دبی شهر آسمان‌خراش‌ها و تفریحات مدرن است. بازدید از برج خلیفه و سافاری در صحرا از بهترین بخش‌های این سفر بود. همچنین خرید در دبی مال و دیدن آب‌نمای دبی تجربه‌ای فراموش‌نشدنی بود.',
    contentEn: 'Dubai is the city of futuristic architecture and desert adventures. Visiting Burj Khalifa and the desert dune safari were the highlights of our journey.'
  },
  '3': {
    id: '3',
    titleFa: 'پاییز در کوچه‌های تاریخی تفلیس',
    titleEn: 'Autumn in Historic Tbilisi',
    destinationFa: 'تفلیس، گرجستان',
    destinationEn: 'Tbilisi, Georgia',
    userName: 'Nima Karimi',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&auto=format&fit=crop&q=80',
    contentFa: 'تفلیس در پاییز حال و هوای دلنشینی دارد. قدم زدن در بافت تاریخی شهر قدیم، تله‌کابین ناریکالا و چشمه‌های آب گرم گوگردی از زیباترین لحظات سفر من بود.',
    contentEn: 'Tbilisi during autumn is utterly charming. Walking through the Old Town, taking the Narikala cable car, and relaxing in sulfur baths made it an incredible experience.'
  }
};

export default function TravelogueDetailPage() {
  const params = useParams();
  const locale = useLocale();
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
          alt={locale === 'fa' ? t.titleFa : t.titleEn}
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
            {locale === 'fa' ? t.titleFa : t.titleEn}
          </h1>
          <div className="flex items-center gap-3 text-xs font-bold text-sub">
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} className="text-brand-dark" />
              {locale === 'fa' ? t.destinationFa : t.destinationEn}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-brand-dark bg-mint/40 px-2.5 py-1 rounded-lg">
              <User size={12} />
              {t.userName}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-start">
          <button 
            aria-label={liked ? 'Unlike' : 'Like'} 
            onClick={() => setLiked(!liked)} 
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
              liked 
                ? 'bg-rose-warm/10 border-rose-warm text-rose-warm shadow-sm' 
                : 'bg-surface border-line text-ink hover:text-rose-warm hover:border-rose-warm'
            }`}
          >
            <Heart size={18} className={liked ? 'fill-rose-warm' : ''} />
          </button>
          <button 
            aria-label="Share"
            onClick={handleShare} 
            className="w-11 h-11 rounded-2xl bg-surface border border-line flex items-center justify-center text-ink hover:text-brand-dark hover:border-brand transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer relative"
          >
            {copied ? <Check size={18} className="text-brand" /> : <Share2 size={18} />}
          </button>
        </div>
      </div>
      
      <div className="bg-surface/95 backdrop-blur-xl border border-line/80 rounded-3xl p-6 md:p-8 shadow-elev-1">
        <p className="text-base md:text-lg text-ink/90 leading-loose font-normal">
          {locale === 'fa' ? t.contentFa : t.contentEn}
        </p>
      </div>
    </div>
  );
}
