'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations, useLocale } from 'next-intl';
import { MapPin, Coffee, Wallet, Headset, BarChart3, ShieldCheck, Waves, Users, KeyRound, Check, X, ThumbsUp, Ban, ChevronDown, BedDouble, TrainFront, Building2, type LucideIcon } from 'lucide-react';
import { fa1, gShort } from '@/lib/hotel-format';
import { getDistsForLocale, getCatsForLocale, getReviewsForLocale, getFaqsForLocale } from '@/lib/hotel-mock';
import type { Hotel } from '@/lib/types';
import { FREE_CANCEL_HOURS } from '@/hooks/useHotelBooking';
import { lt } from '@/lib/lt';

const distIconMap: Record<string, LucideIcon> = {
  metro: TrainFront,
  tower: Building2,
  square: MapPin,
  bazaar: MapPin,
  hotel: Building2,
};

const HotelMap = dynamic(() => import('./HotelMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-soft animate-pulse rounded-xl" />
});

export function HotelOverview({ hotel }: { hotel: Hotel }) {
  const t = useTranslations('HotelDetail');
  const locale = useLocale();
  const [descOpen, setDescOpen] = useState(false);

  const city = locale === 'fa' ? hotel.city : (hotel.cityEn || hotel.city);

  const highlights: [LucideIcon, string, string][] = [
    [
      MapPin,
      lt(locale, { fa: 'قلب شهر قدیم', en: 'Heart of Old Town', ar: 'قلب المدينة القديمة', zh: '老城中心', ru: 'Сердце старого города' }),
      lt(locale, { fa: 'پیاده تا ایاصوفیه و بازار بزرگ', en: 'Walking distance to Hagia Sophia & Grand Bazaar', ar: 'مسافة قصيرة سيراً إلى آيا صوفيا والبازار الكبير', zh: '步行可达圣索菲亚大教堂与大巴扎', ru: 'В пешей доступности от собора Святой Софии' }),
    ],
    [
      Coffee,
      lt(locale, { fa: 'صبحانه بوفه ترکی', en: 'Turkish Buffet Breakfast', ar: 'إفطار بوفيه تركي', zh: '土耳其式自助早餐', ru: 'Турецкий завтрак «шведский стол»' }),
      lt(locale, { fa: 'در تراس رو به بسفر', en: 'Served on terrace overlooking Bosphorus', ar: 'يُقدم على التراس المطل على البوسفور', zh: '在露台享用，饱览博斯普鲁斯海景', ru: 'На террасе с панорамой Босфора' }),
    ],
    [
      Wallet,
      lt(locale, { fa: 'تسویه ریالی / چندارزی', en: 'Multi-Currency Settlement', ar: 'تسوية متعددة العملات', zh: '支持多币种灵活结算', ru: 'Мультивалютная оплата' }),
      lt(locale, { fa: 'بدون نیاز به کارت بین‌المللی', en: 'No foreign card required', ar: 'دون الحاجة لبطاقة دولية', zh: '无需国际信用卡', ru: 'Без иностранной карты' }),
    ],
    [
      Headset,
      lt(locale, { fa: 'پشتیبانی شبانه‌روزی', en: '24/7 Concierge Support', ar: 'دعم على مدار الساعة', zh: '24/7 全天候管家服务', ru: 'Круглосуточная поддержка 24/7' }),
      lt(locale, { fa: 'پاسخگویی سریع در طول اقامت', en: 'Dedicated assistance throughout your stay', ar: 'مساعدة مخصصة طوال إقامتك', zh: '入住全程贴心协助', ru: 'Помощь на протяжении всего визита' }),
    ],
  ];

  return (
    <section id="overview" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">{t('whyThisHotel')}</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">{t('summaryAdvantages')}</p>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-4">
        {highlights.map(([Icon, title, sub]) => (
          <div key={title} className="flex flex-col items-center gap-2 text-center group">
            <span className="w-16 h-16 rounded-full bg-soft grid place-items-center text-brand-dark group-hover:bg-mint group-hover:scale-110 transition-all">
              <Icon size={26} />
            </span>
            <b className="block text-[12.5px] font-black leading-snug">{title}</b>
            <span className="block text-[11px] font-semibold text-sub leading-relaxed">{sub}</span>
          </div>
        ))}
      </div>
      <div className={`relative text-ink/80 text-[13.5px] leading-8 ${descOpen ? '' : 'max-h-[88px] overflow-hidden'}`}>
        <p className="mt-0">
          {lt(locale, {
            fa: `این اقامتگاه در بهترین موقعیت ${city} قرار دارد و دسترسی پیاده به اصلی‌ترین جاذبه‌ها را ممکن می‌کند. اتاق‌های رو به حیاط آرام و بدون صدای خیابان هستند و تراس روف‌گاردن صبحانه بوفه سرو می‌کند.`,
            en: `Ideally situated in prime ${city}, this property puts top attractions within an easy walk. Courtyard-facing rooms offer a quiet retreat from city sounds, while the rooftop terrace serves daily buffet breakfast.`,
            ar: `يقع هذا المكان في موقع متميز في ${city}، مما يتيح الوصول السهل سيراً إلى أهم المعالم. الغرف المطلة على الفناء هادئة، بينما يقدم تراس السطح بوفيه الإفطار اليومي.`,
            zh: `酒店位于${city}核心位置，轻松步行即可打卡地标景点。庭院景观房安静私密，顶楼露台每日供应丰盛自助早餐。`,
            ru: `Отель расположен в центре ${city}, в нескольких минутах ходьбы от главных достопримечательностей. Номера с видом на тихий внутренний двор, а на террасе подают завтрак.`,
          })}
        </p>
        <p className="mb-0">
          {lt(locale, {
            fa: 'پذیرش ۲۴ ساعته با پشتیبانی شبانه‌روزی، ترانسفر فرودگاهی با نرخ ثابت و امکان افزودن خدمات تکمیلی فیروز (ترانسفر، eSIM و بیمه) در مرحله پرداخت.',
            en: '24-hour reception, fixed-rate airport transfer, and optional travel ancillaries (transfer, eSIM, and comprehensive insurance) available at checkout.',
            ar: 'استقبال على مدار 24 ساعة، ونقل من المطار بسعر ثابت، مع إمكانية إضافة خدمات السفر التكميلية (نقل، شريحة eSIM، وتأمين) عند الدفع.',
            zh: '24 小时前台服务，一口价机场接送，并可在结账时随心选购 eSIM 与旅行保险等出行保障。',
            ru: 'Круглосуточная стойка регистрации, трансфер из аэропорта по фиксированному тарифу и возможность добавить eSIM или страховку при бронировании.',
          })}
        </p>
        {!descOpen && <span className="absolute inset-x-0 bottom-0 h-[34px] bg-gradient-to-t from-surface to-transparent" />}
      </div>
      <button onClick={() => setDescOpen(!descOpen)} className="mt-2 border-0 bg-transparent text-brand-dark text-[12.5px] font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded cursor-pointer">
        {descOpen ? t('closeDesc') : t('readMore')}
      </button>
      <div className="flex items-center gap-3 mt-4 p-3 border border-mint-bright/60 rounded-xl bg-gradient-to-l from-surface to-mint/40 text-[12.5px] font-bold text-brand-dark">
        <BarChart3 size={16} className="text-success shrink-0" />
        <span>{t('priceLowerNotice')}</span>
        <span className="me-auto hidden md:flex items-end gap-[3px] h-[30px]" dir="ltr">
          {[80, 76, 72, 66, 58, 78, 84].map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} className={`w-[7px] rounded-sm ${i === 4 ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </span>
      </div>
    </section>
  );
}

export function HotelLocation({ hotel }: { hotel: Hotel }) {
  const t = useTranslations('HotelDetail');
  const locale = useLocale();

  return (
    <section id="location" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">{t('location')}</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">{t('walkingDistances')}</p>
      <div className="grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-3.5">
        <div className="relative min-h-[240px] rounded-xl overflow-hidden border border-line bg-soft z-0" dir="ltr">
          <HotelMap hotelId={hotel.id} hotelName={hotel.name} />
        </div>

        <div className="flex flex-col gap-2">
          {getDistsForLocale(locale).map(([p, iconName, distanceTime]) => {
            const IconComponent = distIconMap[iconName] ?? MapPin;
            return (
            <div key={p} className="flex items-center justify-between p-2.5 rounded-lg border border-line/60 bg-soft/50 text-xs">
              <span className="font-bold text-ink flex items-center gap-1.5">
                <IconComponent size={14} className="text-brand-dark" />
                {p}
              </span>
              <span className="text-[11px] font-bold text-sub font-mono">{distanceTime}</span>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HotelAmenities() {
  const t = useTranslations('HotelDetail');

  const locale = useLocale();
  const L = (tObj: { fa: string; en: string }) => lt(locale, tObj);

  const sections: [string, LucideIcon, [string, number][]][] = [
    [L({ fa: 'امکانات اقامت', en: 'Room Comforts' }), BedDouble, [[L({ fa: 'وای‌فای رایگان', en: 'Free Wi-Fi' }), 1], [L({ fa: 'تهویه مطبوع', en: 'Air Conditioning' }), 1], [L({ fa: 'اتاق ضدصدا', en: 'Soundproof Rooms' }), 1], [L({ fa: 'اتاق سیگار', en: 'Smoking Room' }), 0]]],
    [L({ fa: 'غذا و نوشیدنی', en: 'Food & Dining' }), Coffee, [[L({ fa: 'صبحانه بوفه ترکی', en: 'Buffet Breakfast' }), 1], [L({ fa: 'رستوران تراس', en: 'Terrace Restaurant' }), 1], [L({ fa: 'روم‌سرویس ۲۴ ساعته', en: '24/7 Room Service' }), 1], [L({ fa: 'کافه لابی', en: 'Lobby Cafe' }), 1]]],
    [L({ fa: 'خدمات و رفاه', en: 'Services & Comfort' }), ShieldCheck, [[L({ fa: 'پذیرش ۲۴ ساعته', en: '24h Front Desk' }), 1], [L({ fa: 'ترانسفر فرودگاه', en: 'Airport Transfer' }), 1], [L({ fa: 'نگهداری چمدان', en: 'Luggage Storage' }), 1], [L({ fa: 'پارکینگ اختصاصی', en: 'On-site Parking' }), 0]]],
    [L({ fa: 'تندرستی و آبگرم', en: 'Wellness & Spa' }), Waves, [[L({ fa: 'استخر سرپوشیده', en: 'Indoor Pool' }), 1], [L({ fa: 'حمام ترکی و سونا', en: 'Turkish Bath & Sauna' }), 1], [L({ fa: 'باشگاه بدنسازی', en: 'Fitness Center' }), 1], [L({ fa: 'استخر روباز', en: 'Outdoor Pool' }), 0]]],
    [L({ fa: 'امکانات خانواده', en: 'Family Amenities' }), Users, [[L({ fa: 'تخت کودک زیر ۶ سال رایگان', en: 'Free Crib for Under 6' }), 1], [L({ fa: 'منوی ویژه کودک', en: 'Kids Menu' }), 1], [L({ fa: 'اتاق‌های متصل', en: 'Connecting Rooms' }), 1], [L({ fa: 'زمین بازی اختصاصی', en: 'Play Area' }), 0]]],
    [L({ fa: 'دسترسی‌پذیری', en: 'Accessibility' }), KeyRound, [[L({ fa: 'آسانسور', en: 'Elevator' }), 1], [L({ fa: 'اتاق مناسب ویلچر', en: 'Wheelchair Accessible' }), 1], [L({ fa: 'ورودی هم‌سطح', en: 'Step-free Entrance' }), 1], [L({ fa: 'ویلچر رایگان', en: 'Complimentary Wheelchair' }), 0]]],
  ];

  return (
    <section id="amenities" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">{t('amenities')}</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">{t('amenitiesNotice')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sections.map(([title, Icon, items]) => (
          <div key={title}>
            <h4 className="m-0 mb-2 flex items-center gap-1.5 text-[12.5px] font-black"><Icon size={15} className="text-brand" /> {title}</h4>
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
              {items.map(([name, ok]) => (
                <li key={name} className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${ok ? 'text-sub' : 'text-sub/70'}`}>
                  {ok ? <Check size={13} className="text-success" /> : <X size={13} className="text-line" />} {name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HotelReviews({ hotel }: { hotel: Hotel }) {
  const t = useTranslations('HotelDetail');
  const locale = useLocale();
  const cats = getCatsForLocale(locale);
  const allReviews = getReviewsForLocale(locale);
  const [revType, setRevType] = useState('all');
  const revList = revType === 'all' ? allReviews : allReviews.filter((r) => r.t === revType || (revType === 'family' && (r.t === 'خانواده' || r.t === 'Family')) || (revType === 'couple' && (r.t === 'زوج' || r.t === 'Couple')) || (revType === 'business' && (r.t === 'کاری' || r.t === 'Business')) || (revType === 'solo' && (r.t === 'تنها' || r.t === 'Solo')));
  const overall = cats.reduce((s, c) => s + c[1], 0) / cats.length;

  const filters = [
    { key: 'all', label: t('reviewFilterAll') },
    { key: 'family', label: t('reviewFilterFamily') },
    { key: 'couple', label: t('reviewFilterCouple') },
    { key: 'business', label: t('reviewFilterBusiness') },
    { key: 'solo', label: t('reviewFilterSolo') },
  ];

  return (
    <section id="reviews" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">{t('guestReviews')}</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">{t('reviewsWeighted')}</p>
      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] gap-4 pb-4 border-b border-line/70 mb-4">
        <div className="p-4 rounded-xl bg-mint text-center">
          <div className="text-[38px] font-black text-brand-dark leading-none">{fa1(overall.toFixed(1))}</div>
          <b className="block mt-1 text-[13px] font-black">{t('superb')}</b>
          <span className="block text-[11.5px] font-bold text-sub">
            {hotel.reviewsCount.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} {t('verifiedReviews')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 content-center">
          {cats.map(([n, v]) => (
            <div key={n} className="grid grid-cols-[74px_1fr_34px] items-center gap-2 text-xs font-extrabold text-sub">
              <span>{n}</span>
              <span className="h-[7px] rounded-full bg-line overflow-hidden block">
                <i className="block h-full rounded-full bg-brand" style={{ width: `${v * 10}%` }} />
              </span>
              <em className="not-italic text-end text-ink">{fa1(v)}</em>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setRevType(f.key)}
            className={`min-h-8 px-3 rounded-full border text-[11.5px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
              revType === f.key ? 'border-brand text-surface bg-brand' : 'border-line text-sub bg-surface'
            }`}
          >
            {f.label}{f.key !== 'all' && ` (${allReviews.length.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))})`}
          </button>
        ))}
      </div>
      {revList.length === 0 ? (
        <div className="p-5 text-center text-sub text-[12.5px] font-bold border border-dashed border-line rounded-xl">{t('emptyReviews')}</div>
      ) : (
        revList.map((r) => (
          <div key={r.n} className="py-3.5 border-b border-dashed border-line/70 last:border-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-[34px] h-[34px] grid place-items-center rounded-full bg-brand-2 text-surface text-xs font-black">{r.n[0]}</span>
              <div>
                <b className="block text-[12.5px] font-black leading-snug">{r.n}</b>
                <span className="block text-[11px] font-bold text-sub">{r.t} · {r.c} · {r.d}</span>
              </div>
              <span className="me-auto min-w-[38px] h-7 grid place-items-center rounded-lg rounded-bl-sm text-surface bg-brand text-xs font-black">{fa1(r.s)}</span>
            </div>
            <div className="text-[12.5px] leading-loose text-ink/80">
              <div className="flex gap-2 mt-1"><ThumbsUp size={13} className="text-success shrink-0 mt-1" /><span>{r.good}</span></div>
              <div className="flex gap-2 mt-1"><Ban size={13} className="text-rose-warm shrink-0 mt-1" /><span>{r.bad}</span></div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export function HotelPolicies({ checkinDate }: { checkinDate: string }) {
  const t = useTranslations('HotelDetail');
  const locale = useLocale();
  const dl = new Date(new Date(checkinDate + 'T14:00:00').getTime() - FREE_CANCEL_HOURS * 36e5);

  const policyItems: [LucideIcon, string, string][] = [
    [KeyRound, t('checkinOut'), t('checkinOutDesc')],
    [Users, t('childrenExtraBed'), t('childrenExtraBedDesc')],
  ];

  return (
    <section id="policies" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">{t('policies')}</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">
        {lt(locale, {
          fa: 'شرایط لغو بر اساس نرخ انتخابی متفاوت است.',
          en: 'Cancellation conditions vary depending on the chosen rate plan.',
          ar: 'تختلف شروط الإلغاء حسب خطة السعر المختارة.',
          zh: '退订条件取决于所选的价格计划。',
          ru: 'Условия отмены зависят от выбранного тарифа.',
        })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {policyItems.map(([Icon, title, desc]) => (
          <div key={title} className="p-3.5 border border-line rounded-xl bg-soft/50">
            <b className="flex items-center gap-1.5 text-[12.5px] font-black mb-1.5"><Icon size={15} className="text-brand" /> {title}</b>
            <p className="m-0 text-xs font-semibold text-sub leading-loose">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 border border-mint-bright/60 rounded-xl bg-mint/30">
        <h4 className="m-0 mb-3 text-[12.5px] font-black">خط زمانی لغو برای نرخ «لغو رایگان»</h4>
        <div className="relative grid grid-cols-3 gap-2">
          <span className="absolute top-[9px] inset-x-2 h-[3px] rounded-full bg-gradient-to-l from-success/40 via-gold/50 to-rose-warm/40" />
          {[
            [`از امروز تا ${gShort.format(dl)}`, 'بازگشت کامل وجه', 'bg-success'],
            ['', 'کسر یک شب، مابقی بازگردانده می‌شود', 'bg-gold'],
            ['پس از ورود یا عدم حضور', 'بدون بازگشت وجه', 'bg-rose-warm'],
          ].map(([l1, l2, dot], i) => (
            <div key={i} className="relative pt-6 text-center text-[11.5px] font-bold text-sub">
              <span className={`absolute top-0.5 end-1/2 translate-x-1/2 w-[15px] h-[15px] rounded-full border-[3px] border-surface shadow-[0_0_0_1px_rgba(5,63,62,.15)] ${dot}`} />
              {l1 && <b className="block text-xs font-black text-ink">{l1}</b>}
              {l2}
            </div>
          ))}
        </div>
      </div>

      <h3 className="mt-5 mb-1 text-[15px] font-black">{t('faq')}</h3>
      {getFaqsForLocale(locale).map(([qq, aa]: [string, string]) => (
        <details key={qq} className="group border-b border-line/70 last:border-0">
          <summary className="flex items-center gap-2.5 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-[13px] font-extrabold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
            {qq}
            <ChevronDown size={16} className="me-auto text-brand-dark group-open:-rotate-90 transition-transform" />
          </summary>
          <p className="mt-0 mb-3 text-xs leading-loose text-sub">{aa}</p>
        </details>
      ))}
    </section>
  );
}
