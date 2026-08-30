'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { shimmerDataUrl } from '@/lib/image-utils';
import { BookOpen, MapPin, User } from 'lucide-react';
import { lt } from '@/lib/lt';

const MOCK_TRAVELOGUES = [
  {
    id: '1',
    titleFa: 'سفر سه روزه به استانبول',
    titleEn: '3-Day Istanbul Journey',
    destinationFa: 'استانبول، ترکیه',
    destinationEn: 'Istanbul, Turkey',
    userName: 'Ali Ahmadi',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '2',
    titleFa: 'خاطرات سفر به دبی و برج خلیفه',
    titleEn: 'Dubai Memories & Burj Khalifa',
    destinationFa: 'دبی، امارات',
    destinationEn: 'Dubai, UAE',
    userName: 'Sara Mohammadi',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '3',
    titleFa: 'پاییز در کوچه‌های تاریخی تفلیس',
    titleEn: 'Autumn in Historic Tbilisi',
    destinationFa: 'تفلیس، گرجستان',
    destinationEn: 'Tbilisi, Georgia',
    userName: 'Nima Karimi',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=600&auto=format&fit=crop&q=80'
  }
];

export default function TraveloguesPage() {
  const locale = useLocale();

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-10">
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 text-xs font-black text-brand-dark bg-mint/50 border border-brand/20 rounded-full mb-3 shadow-sm">
          <BookOpen size={14} /> {lt(locale, { fa: 'تجربه‌های واقعی مسافران', en: 'Real Traveler Stories', ar: 'تجارب المسافرين الحقيقية', zh: '真实旅行者故事', ru: 'Реальные истории путешественников' })}
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-ink tracking-tight">
          {lt(locale, { fa: 'سفرنامه‌ها و روایت‌های سفر', en: 'Travelogues & Stories', ar: 'يوميات وتجارب السفر', zh: '旅行游记与体验', ru: 'Истории путешествий' })}
        </h1>
        <p className="text-sm font-bold text-sub mt-2">
          {lt(locale, { fa: 'داستان‌ها و تجربیات بدون سانسور مسافران فیروز از مقاصد گردشگری.', en: 'Unfiltered travel stories and genuine tips from Firuzo community.', ar: 'قصص وتجارب حقيقية من مجتمع مسافري فيروز.', zh: '来自 Firuzo 旅行社区的真实经历与实用建议。', ru: 'Честные истории и советы от путешественников Firuzo.' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {MOCK_TRAVELOGUES.map((t) => (
          <Link key={t.id} href={`/travelogues/${t.id}`} className="block border border-line/80 rounded-3xl overflow-hidden hover:shadow-elev-2 transition-all bg-surface/95 backdrop-blur-xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <div className="relative w-full h-52 overflow-hidden bg-soft">
              <Image
                src={t.image}
                alt={locale === 'fa' ? t.titleFa : t.titleEn}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(600, 400)}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sub mb-2">
                <MapPin size={13} className="text-brand-dark" />
                <span>{locale === 'fa' ? t.destinationFa : t.destinationEn}</span>
              </div>
              <h2 className="text-base font-black mb-3 text-ink group-hover:text-brand-dark transition-colors line-clamp-2 leading-snug">
                {locale === 'fa' ? t.titleFa : t.titleEn}
              </h2>
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-dark bg-mint/40 px-3 py-1 rounded-xl w-fit">
                <User size={12} />
                <span>{t.userName}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
