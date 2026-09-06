'use client';

import { useLocale } from 'next-intl';
import type { Tour } from '@/lib/types';
import { lt } from '@/lib/lt';
import {
  Building2,
  Plane,
  Star,
  Wifi,
  Coffee,
  Car,
  Briefcase,
  Check,
} from 'lucide-react';

interface TourAccommodationProps {
  tour: Tour;
}

export function TourAccommodation({ tour }: TourAccommodationProps) {
  const locale = useLocale();

  const hotelName = tour.hotelName || lt(locale, { fa: 'هتل ۵ ستاره لوکس', en: '5-star Luxury Hotel', ar: 'فندق ٥ نجوم فاخر', zh: '五星级豪华酒店', ru: '5-звёздочный отель' });
  const stars = tour.hotelStars || 5;
  const transport = locale === 'fa' ? (tour.transportType || 'پرواز رفت و برگشت + ترانسفر اختصاصی') : (tour.transportTypeEn || 'Return flight + VIP transfers');

  return (
    <section id="accommodation" className="scroll-mt-32 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-xs flex flex-col gap-4 sm:gap-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-1.5 text-brand-dark font-black text-xs sm:text-sm mb-1">
          <Building2 size={16} />
          <span>{lt(locale, { fa: 'استاندارد اقامت و حمل‌ونقل', en: 'Stay & Transportation Standards', ar: 'الإقامة والمواصلات', zh: '住宿与航班标准', ru: 'Проживание и транспорт' })}</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-ink">
          {lt(locale, { fa: 'مشخصات هتل منتخب و جزئیات پرواز و ترانسفر', en: 'Selected Hotel, Flights & Transfer Details', ar: 'تفاصيل الفندق والطيران والمواصلات', zh: '精选酒店、航班及专车接送详情', ru: 'Отель, авиаперелёт и трансфер' })}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Hotel Card */}
        <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-soft border border-line flex flex-col justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-brand-dark bg-surface px-2.5 py-0.5 sm:py-1 rounded-full border border-line">
                <Building2 size={12} /> {lt(locale, { fa: 'اقامتگاه تور', en: 'Tour Hotel', ar: 'فندق الإقامة', zh: '下榻酒店', ru: 'Отель тура' })}
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} size={13} className="fill-gold text-gold" />
                ))}
              </div>
            </div>

            <h3 className="text-sm sm:text-lg font-black text-ink mb-1 leading-snug">
              {hotelName}
            </h3>
            <p className="text-[11.5px] sm:text-xs font-bold text-sub mb-3 leading-relaxed">
              {lt(locale, { fa: 'اتاق استاندارد دبل / توئین با چشم‌انداز، تهویه مطبوع و صبحانه بوفه کامل', en: 'Standard Double/Twin room with scenic view, air conditioning, and buffet breakfast', ar: 'غرفة مزدوجة بإطلالة مع تكييف وإفطار بوفيه', zh: '豪华标准双床/大床房，含每日自助早餐', ru: 'Стандартный номер с видом и завтраком' })}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-ink">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-surface border border-line/60">
                <Wifi size={13} className="text-brand-dark shrink-0" />
                <span className="truncate">{lt(locale, { fa: 'وای‌فای پرسرعت', en: 'High-speed Wi-Fi', ar: 'واي فاي مجاني', zh: '高速无线网络', ru: 'Wi-Fi' })}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-surface border border-line/60">
                <Coffee size={13} className="text-brand-dark shrink-0" />
                <span className="truncate">{lt(locale, { fa: 'صبحانه بوفه سلف', en: 'Buffet Breakfast', ar: 'إفطار بوفيه مفتوح', zh: '精致自助早餐', ru: 'Шведский стол' })}</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px] sm:text-xs font-bold text-sub">
            <span>{lt(locale, { fa: 'تحویل اتاق:', en: 'Check-in:', ar: 'تسجيل الوصول:', zh: '入住：', ru: 'Заезд:' })} <b className="text-ink font-mono">14:00</b></span>
            <span>{lt(locale, { fa: 'تخلیه اتاق:', en: 'Check-out:', ar: 'تسجيل المغادرة:', zh: '退房：', ru: 'Выезд:' })} <b className="text-ink font-mono">12:00</b></span>
          </div>
        </div>

        {/* Transport & Flight Card */}
        <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-soft border border-line flex flex-col justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-brand-dark bg-surface px-2.5 py-0.5 sm:py-1 rounded-full border border-line">
                <Plane size={12} /> {lt(locale, { fa: 'ناوگان حمل و نقل', en: 'Flights & Fleet', ar: 'الطيران والمواصلات', zh: '交通与车队', ru: 'Авиалинии и авто' })}
              </span>
              <span className="text-[10.5px] sm:text-[11px] font-black text-mint-bright bg-mint px-2 py-0.5 rounded-full">
                {lt(locale, { fa: 'تضمین صندلی', en: 'Confirmed', ar: 'مؤكد', zh: '即时确认位', ru: 'Подтверждено' })}
              </span>
            </div>

            <h3 className="text-sm sm:text-lg font-black text-ink mb-1 leading-snug">
              {transport}
            </h3>
            <p className="text-[11.5px] sm:text-xs font-bold text-sub mb-3 leading-relaxed">
              {lt(locale, { fa: 'بلیط رفت و برگشت، ترانسفر فرودگاهی و خودروهای توریستی با بیمه کامل', en: 'Roundtrip air tickets, airport meet-and-greet, and tourist vehicles with full insurance', ar: 'تذاكر طيران ذهاب وعودة مع استقبال خاص وسيارات سياحية مؤمنة', zh: '往返机票、专属接机及全程高保额旅游车队', ru: 'Авиабилеты, трансфер и комфортный транспорт' })}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-ink">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-surface border border-line/60">
                <Briefcase size={13} className="text-brand-dark shrink-0" />
                <span className="truncate">{lt(locale, { fa: 'بار مجاز: ۲۰-۳۰ کیلو', en: 'Baggage: 20-30 kg', ar: 'أمتعة ٢٠-٣٠ كجم', zh: '托运 20-30kg', ru: 'Багаж 20-30 кг' })}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-surface border border-line/60">
                <Car size={13} className="text-brand-dark shrink-0" />
                <span className="truncate">{lt(locale, { fa: 'ترانسفر اختصاصی', en: 'Private Transfer', ar: 'نقل خاص', zh: '专车接送', ru: 'Трансфер' })}</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-line/60 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-brand-dark">
            <Check size={13} className="shrink-0" />
            <span className="truncate">{lt(locale, { fa: 'استقبال با تابلوی نام مسافر در سالن پروازها', en: 'Personalized airport greeting in arrivals hall', ar: 'استقبال بلافتة تحمل اسم المسافر', zh: '机场接机大厅持专属名牌接机', ru: 'Встреча с табличкой в аэропорту' })}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
