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

  const nights = date1 && date2 && !Number.isNaN(new Date(date2).getTime()) && !Number.isNaN(new Date(date1).getTime())
    ? Math.max(1, Math.round((new Date(date2).getTime() - new Date(date1).getTime()) / 86400000))
    : 0;

  return (
    <>
      {/* City */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-3">
        <CityAutocomplete
          value={dest}
          onChange={(val) => {
            setDest(val);
            onErrorClear?.();
          }}
          label={t('dest')}
          placeholder={t('destPlaceholder')}
          id="search-dest-input"
        />
      </div>

      {/* Date In */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-2">
        <JalaliDatePicker
          value={date1}
          onChange={(d) => setDate1(d || '')}
          label={t('dateCheckIn')}
          id="search-date-checkin"
        />
      </div>

      {/* Date Out with Nights Badge */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-2 relative">
        <JalaliDatePicker
          value={date2}
          onChange={(d) => setDate2(d || '')}
          label={t('dateCheckOut')}
          id="search-date-checkout"
        />
        {nights > 0 && (
          <span className="hidden sm:inline-flex absolute -top-2.5 end-3 px-2 py-0.5 rounded-full bg-brand text-surface text-[10px] font-black z-20 shadow-xs pointer-events-none">
            {lt(locale, {
              fa: `${num(nights, locale)} شب اقامت`,
              en: `${num(nights, locale)} nights stay`,
              ar: `إقامة ${num(nights, locale)} ليالٍ`,
              zh: `入住 ${num(nights, locale)} 晚`,
              ru: `Проживание ${num(nights, locale)} ноч.`,
            })}
          </span>
        )}
      </div>

      {/* Guests */}
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

      {/* Submit Button */}
      <button
        type="submit"
        className="col-span-1 sm:col-span-12 lg:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Search size={18} />
        <span>{t('btnHotels')}</span>
      </button>
    </>
  );
}
