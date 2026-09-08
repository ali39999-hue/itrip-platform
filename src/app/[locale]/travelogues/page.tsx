'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { shimmerDataUrl } from '@/lib/image-utils';
import { BookOpen, MapPin, User, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { lt } from '@/lib/lt';

const MOCK_TRAVELOGUES = [
  {
    id: '1',
    country: 'turkey',
    titleFa: 'سفر سه روزه به استانبول و گشت در تنگه بسفر',
    titleEn: '3-Day Istanbul Journey & Bosphorus Cruise',
    destinationFa: 'استانبول، ترکیه',
    destinationEn: 'Istanbul, Turkey',
    userName: 'Ali Ahmadi',
    readTime: '۵ دقیقه مطالعه',
    readTimeEn: '5 min read',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '2',
    country: 'uae',
    titleFa: 'خاطرات سفر به دبی و سافاری در کویر',
    titleEn: 'Dubai Memories & Desert Safari Adventure',
    destinationFa: 'دبی، امارات',
    destinationEn: 'Dubai, UAE',
    userName: 'Sara Mohammadi',
    readTime: '۷ دقیقه مطالعه',
    readTimeEn: '7 min read',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '3',
    country: 'georgia',
    titleFa: 'پاییز در کوچه‌های تاریخی و چشمه‌های آب‌گرم تفلیس',
    titleEn: 'Autumn in Historic Tbilisi & Sulfur Baths',
    destinationFa: 'تفلیس، گرجستان',
    destinationEn: 'Tbilisi, Georgia',
    userName: 'Nima Karimi',
    readTime: '۶ دقیقه مطالعه',
    readTimeEn: '6 min read',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '4',
    country: 'iran',
    titleFa: 'سفر به نصف جهان؛ شکوه نقش جهان و آرامش هتل عباسی',
    titleEn: 'Journey to Half the World: Naqsh-e Jahan & Abbasi Garden',
    destinationFa: 'اصفهان، ایران',
    destinationEn: 'Isfahan, Iran',
    userName: 'Reza Tehrani',
    readTime: '۸ دقیقه مطالعه',
    readTimeEn: '8 min read',
    image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&auto=format&fit=crop&q=80'
  }
];

export default function TraveloguesPage() {
  const locale = useLocale();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [allStories, setAllStories] = useState(MOCK_TRAVELOGUES);

  useEffect(() => {
    import('@/actions/content').then(({ getPublicTraveloguesAction }) => {
      getPublicTraveloguesAction().then((res) => {
        if (res.success && res.travelogues && res.travelogues.length > 0) {
          const dbItems = res.travelogues.map((trv: {
            id: string;
            countryId?: string | null;
            titleFa: string;
            titleEn?: string | null;
            destFa: string;
            destEn?: string | null;
            userName: string;
            image?: string | null;
          }) => ({
            id: trv.id,
            country: trv.countryId || 'iran',
            titleFa: trv.titleFa,
            titleEn: trv.titleEn || trv.titleFa,
            destinationFa: trv.destFa,
            destinationEn: trv.destEn || trv.destFa,
            userName: trv.userName,
            readTime: '۵ دقیقه مطالعه',
            readTimeEn: '5 min read',
            image: trv.image || MOCK_TRAVELOGUES[0].image,
          }));
          setAllStories([...MOCK_TRAVELOGUES, ...dbItems]);
        }
      });
    }).catch(() => {});
  }, []);

  const filteredStories = useMemo(() => {
    if (activeFilter === 'all') return allStories;
    return allStories.filter((s) => s.country === activeFilter);
  }, [activeFilter, allStories]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-10 space-y-8">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black text-brand-dark bg-mint border border-brand/20 rounded-full mb-3 shadow-xs">
          <BookOpen size={14} />
          <span>{lt(locale, { fa: 'تجربه‌های واقعی مسافران فیروزو', en: 'Real Traveler Stories', ar: 'تجارب المسافرين الحقيقية', zh: '真实旅行者故事', ru: 'Реальные истории' })}</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight mb-2">
          {lt(locale, { fa: 'سفرنامه‌ها و روایت‌های سفر', en: 'Travelogues & Stories', ar: 'يوميات وتجارب السفر', zh: '旅行游记与体验', ru: 'Истории путешествий' })}
        </h1>
        <p className="text-xs sm:text-sm font-bold text-sub max-w-2xl leading-relaxed">
          {lt(locale, { fa: 'داستان‌ها، تجربیات بدون سانسور و نکات طلایی مسافران فیروزو از جاذبه‌ها و مقاصد گردشگری.', en: 'Unfiltered travel stories and genuine tips from Firuzo community.', ar: 'قصص وتجارب حقيقية من مجتمع مسافري فيروزو.', zh: '来自 Firuzo 旅行社区的真实经历与实用建议。', ru: 'Честные истории и советы от путешественников Firuzo.' })}
        </p>
      </div>

      {/* Destination Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-black">
        {[
          { id: 'all', label: lt(locale, { fa: 'همه مقاصد', en: 'All Destinations', ar: 'جميع الوجهات', zh: '全部目的地', ru: 'Все направления' }) },
          { id: 'turkey', label: lt(locale, { fa: 'ترکیه', en: 'Turkey', ar: 'تركيا', zh: '土耳其', ru: 'Турция' }) },
          { id: 'uae', label: lt(locale, { fa: 'امارات', en: 'UAE', ar: 'الإمارات', zh: '阿联酋', ru: 'ОАЭ' }) },
          { id: 'georgia', label: lt(locale, { fa: 'گرجستان', en: 'Georgia', ar: 'جورجيا', zh: '格鲁吉亚', ru: 'Грузия' }) },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap border ${
              activeFilter === f.id
                ? 'bg-brand text-surface border-brand shadow-xs'
                : 'bg-surface text-sub border-line hover:text-ink hover:bg-soft'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStories.map((t) => (
          <Link
            key={t.id}
            href={`/travelogues/${t.id}`}
            className="block border border-line rounded-3xl overflow-hidden hover:shadow-elev-2 hover:border-brand/40 transition-all bg-surface group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs flex flex-col justify-between"
          >
            <div>
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
                <div className="absolute top-3 start-3">
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-1 rounded-full bg-surface/90 text-brand-dark backdrop-blur-xs shadow-xs">
                    <Clock size={12} />
                    <span>{locale === 'fa' ? t.readTime : t.readTimeEn}</span>
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sub mb-2">
                  <MapPin size={13} className="text-brand-dark" />
                  <span>{locale === 'fa' ? t.destinationFa : t.destinationEn}</span>
                </div>
                <h2 className="text-base font-black mb-2 text-ink group-hover:text-brand-dark transition-colors line-clamp-2 leading-snug">
                  {locale === 'fa' ? t.titleFa : t.titleEn}
                </h2>
              </div>
            </div>

            <div className="p-5 pt-0 border-t border-line/60 mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sub">
                <User size={13} />
                <span>{t.userName}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-black text-brand-dark group-hover:underline">
                <span>مطالعه روایت</span>
                <ArrowLeft size={14} className="rtl:inline ltr:hidden group-hover:-translate-x-1 transition-transform" />
                <ArrowRight size={14} className="ltr:inline rtl:hidden group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
