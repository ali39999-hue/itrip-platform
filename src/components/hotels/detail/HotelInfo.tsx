'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MapPin, Coffee, Wallet, Headset, BarChart3, ShieldCheck, Waves, Users, KeyRound, Check, X, ThumbsUp, Ban, ChevronDown, BedDouble, type LucideIcon } from 'lucide-react';
import { fa1, gShort } from '@/lib/hotel-format';
import { DISTS, CATS, REVIEWS, FAQS } from '@/lib/hotel-mock';
import type { Hotel } from '@/lib/types';
import { FREE_CANCEL_HOURS } from '@/hooks/useHotelBooking';

export function HotelOverview({ hotel }: { hotel: Hotel }) {
  const t = useTranslations('HotelDetail');
  const [descOpen, setDescOpen] = useState(false);

  const highlights: [LucideIcon, string, string][] = [
    [MapPin, 'قلب شهر قدیم', 'پیاده تا ایاصوفیه و بازار بزرگ'],
    [Coffee, 'صبحانه بوفه ترکی', 'در تراس رو به بسفر'],
    [Wallet, 'تسویه ریالی', 'بدون نیاز به کارت بین‌المللی'],
    [Headset, 'پشتیبانی فارسی', '۲۴ ساعته در طول اقامت'],
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
        <p className="mt-0">این اقامتگاه در بهترین موقعیت {hotel.city} قرار دارد و دسترسی پیاده به اصلی‌ترین جاذبه‌ها را ممکن می‌کند. اتاق‌های رو به حیاط آرام و بدون صدای خیابان هستند و تراس روف‌گاردن صبحانه بوفه سرو می‌کند.</p>
        <p className="mb-0">پذیرش ۲۴ ساعته با پشتیبانی فارسی، ترانسفر فرودگاهی با نرخ ثابت و امکان افزودن خدمات تکمیلی فیروز (ترانسفر، eSIM و بیمه) در مرحله پرداخت.</p>
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

  return (
    <section id="location" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">{t('location')}</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">{t('walkingDistances')}</p>
      <div className="grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-3.5">
        <div className="relative min-h-[240px] rounded-xl overflow-hidden border border-line bg-soft">
          <div className="absolute inset-0 bg-[radial-gradient(#00a9a522_1px,transparent_1px)] bg-[size:14px_14px]" />
          <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
            <span className="w-8 h-8 rounded-full bg-brand text-surface grid place-items-center shadow-lg shadow-brand/40 animate-pulse">
              <MapPin size={18} />
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface text-ink text-[11px] font-black shadow-sm border border-line">
              {hotel.name}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {DISTS.map(([p, IconComponent, distanceTime]) => (
            <div key={p} className="flex items-center justify-between p-2.5 rounded-lg border border-line/60 bg-soft/50 text-xs">
              <span className="font-bold text-ink flex items-center gap-1.5">
                <IconComponent size={14} className="text-brand-dark" />
                {p}
              </span>
              <span className="text-[11px] font-bold text-sub font-mono">{distanceTime}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HotelAmenities() {
  const t = useTranslations('HotelDetail');

  const sections: [string, LucideIcon, [string, number][]][] = [
    ['امکانات اقامت', BedDouble, [['وای‌فای رایگان', 1], ['تهویه مطبوع', 1], ['اتاق ضدصدا', 1], ['اتاق سیگار', 0]]],
    ['غذا و نوشیدنی', Coffee, [['صبحانه بوفه ترکی', 1], ['رستوران تراس', 1], ['روم‌سرویس ۲۴ ساعته', 1], ['کافه لابی', 1]]],
    ['خدمات و رفاه', ShieldCheck, [['پذیرش ۲۴ ساعته', 1], ['ترانسفر فرودگاه', 1], ['نگهداری چمدان', 1], ['پارکینگ', 0]]],
    ['سرگرمی', Waves, [['استخر سرپوشیده', 1], ['حمام ترکی و سونا', 1], ['باشگاه بدنسازی', 1], ['استخر روباز', 0]]],
    ['خانواده', Users, [['تخت کودک زیر ۶ سال رایگان', 1], ['منوی کودک', 1], ['اتاق به‌هم‌پیوسته', 1], ['زمین بازی', 0]]],
    ['دسترسی', KeyRound, [['آسانسور', 1], ['اتاق مناسب ویلچر', 1], ['ورودی بدون پله', 1], ['ویلچر رایگان', 0]]],
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
  const [revType, setRevType] = useState('همه');
  const revList = revType === 'همه' ? REVIEWS : REVIEWS.filter((r) => r.t === revType);
  const overall = CATS.reduce((s, c) => s + c[1], 0) / CATS.length;

  const filters = [
    { key: 'همه', label: t('reviewFilterAll') },
    { key: 'خانواده', label: t('reviewFilterFamily') },
    { key: 'زوج', label: t('reviewFilterCouple') },
    { key: 'کاری', label: t('reviewFilterBusiness') },
    { key: 'تنها', label: t('reviewFilterSolo') },
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
            {hotel.reviewsCount.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')} {t('verifiedReviews')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 content-center">
          {CATS.map(([n, v]) => (
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
            {f.label}{f.key !== 'همه' && ` (${REVIEWS.filter((r) => r.t === f.key).length.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')})`}
          </button>
        ))}
      </div>
      {revList.length === 0 ? (
        <div className="p-5 text-center text-sub text-[12.5px] font-bold border border-dashed border-line rounded-xl">هنوز نظری برای این دسته ثبت نشده است.</div>
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
  const dl = new Date(new Date(checkinDate + 'T14:00:00').getTime() - FREE_CANCEL_HOURS * 36e5);

  const policyItems: [LucideIcon, string, string][] = [
    [KeyRound, 'ورود و خروج', 'ورود از ۱۴:۰۰ · خروج تا ۱۲:۰۰. ورود زودهنگام در صورت خالی بودن اتاق رایگان است.'],
    [Users, 'کودک و تخت اضافه', 'افراد بالای ۱۲ سال بزرگسال محسوب می‌شوند. درخواست تخت اضافه باید پیش از ورود تأیید شود.'],
  ];

  return (
    <section id="policies" className="p-5 border border-line rounded-xl bg-surface shadow-sm scroll-mt-32">
      <h2 className="m-0 mb-1 text-lg font-black">{t('policies')}</h2>
      <p className="m-0 mb-4 text-[12.5px] font-semibold text-sub">شرایط لغو بر اساس نرخ انتخابی متفاوت است.</p>
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
      {FAQS.map(([qq, aa]) => (
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
