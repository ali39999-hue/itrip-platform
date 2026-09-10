'use client';

import { Search } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { CityAutocomplete } from '../CityAutocomplete';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import { TravelerPicker } from '../TravelerPicker';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';

interface HotelSearchFormProps {
  dest: string;
  setDest: (val: string) => void;
  date1: string;
  setDate1: (val: string) => void;
  date2: string;
  setDate2: (val: string) => void;
  adults: number;
  setAdults: React.Dispatch<React.SetStateAction<number>>;
  childrenCount: number;
  setChildrenCount: React.Dispatch<React.SetStateAction<number>>;
  rooms: number;
  setRooms: React.Dispatch<React.SetStateAction<number>>;
  guestOpen: boolean;
  setGuestOpen: (val: boolean) => void;
  onErrorClear?: () => void;
}

const POPULAR_HOTEL_CITIES = [
  { fa: 'مشهد', en: 'Mashhad', ar: 'مشهد', zh: '马什哈德', ru: 'Мешхед' },
  { fa: 'تهران', en: 'Tehran', ar: 'طهران', zh: '德黑兰', ru: 'Тегеران' },
  { fa: 'اصفهان', en: 'Isfahan', ar: 'أصفهان', zh: '伊斯法罕', ru: 'Исфахан' },
  { fa: 'شیراز', en: 'Shiraz', ar: 'شيراز', zh: '设拉子', ru: 'Шираз' },
  { fa: 'کیش', en: 'Kish', ar: 'كيش', zh: '基什', ru: 'Киш' },
  { fa: 'استانبول', en: 'Istanbul', ar: 'إسطنبول', zh: '伊斯坦布尔', ru: 'Стамбул' },
  { fa: 'دبی', en: 'Dubai', ar: 'دبي', zh: '迪拜', ru: 'Дубай' },
  { fa: 'پکن', en: 'Beijing', ar: 'بكين', zh: '北京', ru: 'Пекин' },
];

export function HotelSearchForm({
  dest,
  setDest,
  date1,
  setDate1,
  date2,
  setDate2,
  adults,
  setAdults,
  childrenCount,
  setChildrenCount,
  rooms,
  setRooms,
  guestOpen,
  setGuestOpen,
  onErrorClear,
}: HotelSearchFormProps) {
  const t = useTranslations('Search');
  const locale = useLocale();

  const isFa = locale === 'fa';
  const dateFormat = isFa ? 'D MMMM (dddd)' : 'D MMM (ddd)';

  const nights = date1 && date2 && !Number.isNaN(new Date(date2).getTime()) && !Number.isNaN(new Date(date1).getTime())
    ? Math.max(1, Math.round((new Date(date2).getTime() - new Date(date1).getTime()) / 86400000))
    : 0;

  return (
    <>
      {/* 1. Destination / Hotel Name (Aligned with screenshot & Iranian OTA standards) */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-3">
        <CityAutocomplete
          value={dest}
          onChange={(val) => {
            setDest(val);
            onErrorClear?.();
          }}
          label={lt(locale, {
            fa: 'مقصد یا نام هتل',
            en: 'Destination or Hotel Name',
            ar: 'الوجهة أو اسم الفندق',
            zh: '目的地或酒店名称',
            ru: 'Направление или отель',
          })}
          placeholder={lt(locale, {
            fa: 'کجا اقامت دارید؟ (مثال: مشهد، تهران)',
            en: 'Where are you staying? (e.g. Mashhad)',
            ar: 'أين تقيم؟ (مثال: مشهد، طهران)',
            zh: '您计划住在哪里？（例如：马什哈德）',
            ru: 'Где вы остановитесь? (напр. Мешхед)',
          })}
          id="search-dest-input"
        />
      </div>

      {/* 2. Check-in Date */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-2">
        <JalaliDatePicker
          value={date1}
          onChange={(d) => setDate1(d || '')}
          label={t('dateCheckIn')}
          id="search-date-checkin"
          format={dateFormat}
        />
      </div>

      {/* 3. Check-out Date with Duration Badge */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-2 relative">
        <JalaliDatePicker
          value={date2}
          onChange={(d) => setDate2(d || '')}
          label={t('dateCheckOut')}
          id="search-date-checkout"
          format={dateFormat}
          className={nights > 0 ? 'pe-14 sm:pe-16' : ''}
        />
        {nights > 0 && (
          <div className="absolute end-2.5 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-mint/90 border border-brand/30 text-brand-dark text-xs font-black shadow-xs">
              {lt(locale, {
                fa: `${num(nights, locale)} شب`,
                en: `${num(nights, locale)} nights`,
                ar: `${num(nights, locale)} ليالٍ`,
                zh: `${num(nights, locale)} 晚`,
                ru: `${num(nights, locale)} ноч.`,
              })}
            </span>
          </div>
        )}
      </div>

      {/* 4. Travelers and Rooms */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-3 relative">
        <TravelerPicker
          open={guestOpen}
          setOpen={setGuestOpen}
          adults={adults}
          setAdults={setAdults}
          childrenCount={childrenCount}
          setChildrenCount={setChildrenCount}
          rooms={rooms}
          setRooms={setRooms}
        />
      </div>

      {/* 5. Submit Button (Amber/Golden style as in screenshot) */}
      <button
        type="submit"
        className="col-span-1 sm:col-span-12 lg:col-span-2 min-h-[58px] px-6 rounded-2xl md:rounded-full bg-amber-500 hover:bg-amber-600 text-ink text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Search size={18} className="stroke-[2.5]" />
        <span>{t('btnHotels')}</span>
      </button>

      {/* 6. Popular Hotel Destinations Bar (Underneath search inputs row) */}
      <div className="col-span-1 sm:col-span-12 pt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-black text-ink select-none ms-1">
          {lt(locale, {
            fa: 'شهرهای پرطرفدار:',
            en: 'Popular destinations:',
            ar: 'الوجهات الشائعة:',
            zh: '热门城市：',
            ru: 'Популярные города:',
          })}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {POPULAR_HOTEL_CITIES.map((city) => {
            const isSelected = dest === city.fa || dest.includes(city.fa);
            return (
              <button
                key={city.fa}
                type="button"
                onClick={() => {
                  setDest(city.fa);
                  onErrorClear?.();
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand text-surface shadow-xs font-black'
                    : 'bg-soft/80 hover:bg-line text-ink/90 hover:text-brand-dark'
                }`}
              >
                {lt(locale, city)}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
