'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CityAutocomplete } from '../CityAutocomplete';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import { TravelerPicker } from '../TravelerPicker';

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

  return (
    <>
      {/* City */}
      <div className="md:col-span-3">
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

      {/* Date */}
      <div className="md:col-span-2">
        <JalaliDatePicker
          value={date1}
          onChange={(d) => setDate1(d || '')}
          label={t('dateCheckIn')}
          id="search-date-checkin"
        />
      </div>

      <div className="md:col-span-2">
        <JalaliDatePicker
          value={date2}
          onChange={(d) => setDate2(d || '')}
          label={t('dateCheckOut')}
          id="search-date-checkout"
        />
      </div>

      {/* Guests */}
      <div className="md:col-span-3 relative">
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
        className="md:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-action-hover text-[#14201f] text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Search size={18} />
        <span>{t('btnHotels')}</span>
      </button>
    </>
  );
}
