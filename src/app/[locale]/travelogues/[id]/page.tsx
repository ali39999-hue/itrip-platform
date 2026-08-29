'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Heart, Share2 } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface TravelogueItem {
  id: string;
  title: string;
  destination: string;
  userName: string;
  image: string;
  content: string;
}

const MOCK_TRAVELOGUES: Record<string, TravelogueItem> = {
  '1': {
    id: '1',
    title: 'سفر سه روزه به استانبول',
    destination: 'استانبول، ترکیه',
    userName: 'علی احمدی',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&auto=format&fit=crop&q=80',
    content: 'استانبول شهری است که نیمی از آن در آسیا و نیمی دیگر در اروپا قرار دارد. در این سفر سه روزه، از مسجد ایاصوفیه، بازار بزرگ و تنگه بسفر دیدن کردیم. تجربه‌ای بی‌نظیر از تقابل سنت و مدرنیته بود. غذاهای ترکی مانند کباب و باقلوا واقعاً خوشمزه بودند.'
  },
  '2': {
    id: '2',
    title: 'خاطرات دبی',
    destination: 'دبی، امارات',
    userName: 'سارا محمدی',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80',
    content: 'دبی شهر آسمان‌خراش‌ها و تفریحات مدرن است. بازدید از برج خلیفه و سافاری در صحرا از بهترین بخش‌های این سفر بود. همچنین خرید در دبی مال و دیدن آب‌نمای دبی تجربه‌ای فراموش‌نشدنی بود.'
  },
  '3': {
    id: '3',
    title: 'پاییز در تفلیس',
    destination: 'تفلیس، گرجستان',
    userName: 'نیما کریمی',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&auto=format&fit=crop&q=80',
    content: 'تفلیس در پاییز حال و هوای دلنشینی دارد. قدم زدن در بافت تاریخی شهر قدیم، تله‌کابین ناریکالا و چشمه‌های آب گرم گوگردی از زیباترین لحظات سفر من بود.'
  }
};

export default function TravelogueDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '1';
  const t = MOCK_TRAVELOGUES[id];

  if (!t) {
    return <div className="p-10 text-center">سفرنامه یافت نشد</div>;
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-10 py-10">
      <Link href="/travelogues" className="text-brand font-bold text-sm mb-6 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        ← بازگشت به سفرنامه‌ها
      </Link>
      
      <div className="relative w-full h-[400px] rounded-2xl overflow-hidden mb-6 shadow-sm">
        <Image
          src={t.image}
          alt={t.title}
          fill
          sizes="(max-width: 800px) 100vw, 800px"
          className="object-cover"
          priority
        />
      </div>
      
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black mb-2">{t.title}</h1>
          <div className="flex items-center gap-3 text-sm text-sub">
            <span>{t.destination}</span>
            <span>•</span>
            <span className="text-brand-dark bg-mint px-2 py-1 rounded-md">{t.userName}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button aria-label="پسندیدن" onClick={() => alert('پسندیده شد!')} className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center text-ink hover:text-rose-500 hover:border-rose-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <Heart size={18} />
          </button>
          <button aria-label="اشتراک گذاری" onClick={() => alert('لینک کپی شد!')} className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center text-ink hover:text-brand hover:border-brand transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <Share2 size={18} />
          </button>
        </div>
      </div>
      
      <div className="prose prose-lg max-w-none text-ink leading-relaxed">
        <p>{t.content}</p>
      </div>
    </div>
  );
}
