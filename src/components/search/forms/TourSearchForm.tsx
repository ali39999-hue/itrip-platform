'use client';

import { Search, Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CityAutocomplete } from '../CityAutocomplete';

interface TourSearchFormProps {
  dest: string;
  setDest: (val: string) => void;
  tourType: string;
  setTourType: (val: string) => void;
  onErrorClear?: () => void;
}

export function TourSearchForm({
  dest,
  setDest,
  tourType,
  setTourType,
  onErrorClear,
}: TourSearchFormProps) {
  const t = useTranslations('Search');

  return (
    <>
      {/* City */}
      <div className="md:col-span-5">
        <CityAutocomplete
          value={dest}
          onChange={(val) => {
            setDest(val);
            onErrorClear?.();
          }}
          label={t('dest')}
          placeholder={t('destPlaceholder')}
          id="search-tour-dest-input"
        />
      </div>

      {/* Tour Type Selection */}
      <div className="md:col-span-5 relative flex flex-col justify-center px-4 py-2 min-h-[58px] rounded-2xl bg-surface border border-line focus-within:border-brand shadow-sm transition">
        <label className="text-[10.5px] font-black text-sub uppercase tracking-wider mb-0.5 flex items-center gap-1">
          <Compass size={12} className="text-brand" />
          <span>{t('tourTypeLabel')}</span>
        </label>
        <select
          value={tourType}
          onChange={(e) => setTourType(e.target.value)}
          className="w-full border-0 outline-0 p-0 text-[13px] font-bold text-ink bg-transparent cursor-pointer"
        >
          <option value="recreational">{t('tourTypeRecreational')}</option>
          <option value="medical">{t('tourTypeMedical')}</option>
          <option value="commercial">{t('tourTypeCommercial')}</option>
        </select>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="md:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-action-hover text-[#14201f] text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Search size={18} />
        <span>{t('btnTours')}</span>
      </button>
    </>
  );
}
