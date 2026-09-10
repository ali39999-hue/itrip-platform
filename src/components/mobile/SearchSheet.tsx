'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import {
  Search,
  Plane,
  Building2,
  Calendar,
  Users,
  ArrowUpDown,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { CITIES, type CityOption } from '@/lib/data';
import { daysFromNow } from '@/lib/utils';
import { dualDate } from '@/lib/jalali';
import { DatePickerSheet } from './DatePickerSheet';
import { PassengerPicker, type PassengerCount } from './PassengerPicker';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface SearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'flights' | 'hotels';
}

const POPULAR_DESTS = ['mhd', 'ist', 'dxb', 'kih', 'syz', 'ifn', 'tbs', 'mct'];

export function SearchSheet({
  open,
  onOpenChange,
  defaultTab = 'flights',
}: SearchSheetProps) {
  const router = useRouter();
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<'flights' | 'hotels'>(defaultTab);
  const [fromCity, setFromCity] = useState<CityOption | undefined>(
    CITIES.find((c) => c.id === 'thr')
  );
  const [toCity, setToCity] = useState<CityOption | undefined>(
    CITIES.find((c) => c.id === 'mhd')
  );
  const [hotelCity, setHotelCity] = useState<CityOption | undefined>(
    CITIES.find((c) => c.id === 'mhd')
  );

  const [departDate, setDepartDate] = useState<string>(daysFromNow(3));

  const [passengers, setPassengers] = useState<PassengerCount>({
    adults: 1,
    childrenCount: 0,
    infants: 0,
    roomCount: 1,
  });

  // Pickers modal states
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [passengerPickerOpen, setPassengerPickerOpen] = useState(false);

  // City selection mode: 'from' | 'to' | 'hotel' | null
  const [citySelectMode, setCitySelectMode] = useState<'from' | 'to' | 'hotel' | null>(null);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('firuzo_mobile_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // Ignore localStorage errors in SSR/private browsing
    }
  }, []);

  const saveRecentSearch = (label: string) => {
    try {
      const next = [label, ...recentSearches.filter((s) => s !== label)].slice(0, 5);
      setRecentSearches(next);
      localStorage.setItem('firuzo_mobile_recent_searches', JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const handleSwapAirports = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  const handleExecuteSearch = () => {
    if (activeTab === 'flights') {
      const fromQuery = fromCity?.airportCode || fromCity?.fa || 'THR';
      const toQuery = toCity?.airportCode || toCity?.fa || 'MHD';
      saveRecentSearch(`${fromCity?.nameFa || fromQuery} به ${toCity?.nameFa || toQuery}`);
      onOpenChange(false);
      router.push(
        `/flights/search?from=${encodeURIComponent(fromQuery)}&to=${encodeURIComponent(
          toQuery
        )}&depart=${departDate}&adults=${passengers.adults}`
      );
    } else {
      const cityQuery = hotelCity?.fa || 'مشهد';
      saveRecentSearch(`هتل‌های ${cityQuery}`);
      onOpenChange(false);
      router.push(
        `/hotels/search?city=${encodeURIComponent(cityQuery)}&checkin=${departDate}&rooms=${
          passengers.roomCount || 1
        }&adults=${passengers.adults}`
      );
    }
  };

  // Filter cities for autocomplete
  const filteredCities = CITIES.filter((c) => {
    if (!citySearchQuery.trim()) return true;
    const q = citySearchQuery.toLowerCase();
    return (
      c.fa.includes(q) ||
      c.en.toLowerCase().includes(q) ||
      c.airportCode.toLowerCase().includes(q) ||
      c.airportNameFa.includes(q)
    );
  });

  const departInfo = dualDate(departDate);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} side="bottom">
        <SheetContent className="max-w-xl mx-auto pb-8 pt-4 px-4 sm:px-6">
          {/* Tabs: Flights / Hotels */}
          <div className="flex rounded-2xl bg-soft p-1 mb-5 border border-line">
            <button
              type="button"
              onClick={() => setActiveTab('flights')}
              className={`flex-1 min-h-[44px] rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'flights'
                  ? 'bg-surface text-brand-dark shadow-xs border border-line/60'
                  : 'text-sub hover:text-ink'
              }`}
            >
              <Plane size={16} />
              <span>{lt(locale, { fa: 'پروازها', en: 'Flights', ar: 'الطيران', zh: '机票', ru: 'Авиабилеты' })}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hotels')}
              className={`flex-1 min-h-[44px] rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'hotels'
                  ? 'bg-surface text-brand-dark shadow-xs border border-line/60'
                  : 'text-sub hover:text-ink'
              }`}
            >
              <Building2 size={16} />
              <span>{lt(locale, { fa: 'هتل‌ها', en: 'Hotels', ar: 'الفنادق', zh: '酒店', ru: 'Отели' })}</span>
            </button>
          </div>

          {activeTab === 'flights' ? (
            /* Flights Flow */
            <div className="space-y-3">
              {/* Origin / Destination Pickers with Swap */}
              <div className="relative rounded-2xl border border-line bg-surface p-2 space-y-2">
                {/* From button */}
                <button
                  type="button"
                  onClick={() => {
                    setCitySelectMode('from');
                    setCitySearchQuery('');
                  }}
                  className="w-full min-h-[52px] px-3 rounded-xl bg-soft/60 hover:bg-soft flex items-center justify-between text-start transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-surface border border-line/60 grid place-items-center text-sub text-xs">
                      {fromCity?.flag || '🛫'}
                    </span>
                    <div>
                      <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                        {lt(locale, { fa: 'مبدأ پرواز', en: 'Departure City', ar: 'مدينة المغادرة', zh: '出发地', ru: 'Откуда' })}
                      </span>
                      <span className="text-sm font-black text-ink">
                        {fromCity?.nameFa} ({fromCity?.airportCode})
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-sub/70 rtl:rotate-180" />
                </button>

                {/* Swap button */}
                <div className="absolute top-[46px] end-5 z-10">
                  <button
                    type="button"
                    onClick={handleSwapAirports}
                    className="w-9 h-9 rounded-full bg-surface border border-line shadow-sm text-brand grid place-items-center active:scale-95 transition hover:bg-mint"
                    aria-label="جابجایی مبدأ و مقصد"
                  >
                    <ArrowUpDown size={15} />
                  </button>
                </div>

                {/* To button */}
                <button
                  type="button"
                  onClick={() => {
                    setCitySelectMode('to');
                    setCitySearchQuery('');
                  }}
                  className="w-full min-h-[52px] px-3 rounded-xl bg-soft/60 hover:bg-soft flex items-center justify-between text-start transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-surface border border-line/60 grid place-items-center text-sub text-xs">
                      {toCity?.flag || '🛬'}
                    </span>
                    <div>
                      <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                        {lt(locale, { fa: 'مقصد پرواز', en: 'Destination City', ar: 'مدينة الوصول', zh: '目的地', ru: 'Куда' })}
                      </span>
                      <span className="text-sm font-black text-ink">
                        {toCity?.nameFa} ({toCity?.airportCode})
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-sub/70 rtl:rotate-180" />
                </button>
              </div>

              {/* Date & Passengers Row */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Date trigger */}
                <button
                  type="button"
                  onClick={() => setDatePickerOpen(true)}
                  className="min-h-[58px] p-3 rounded-2xl border border-line bg-surface hover:border-brand/40 text-start flex flex-col justify-center transition active:scale-[0.99]"
                >
                  <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                    {lt(locale, { fa: 'تاریخ رفت', en: 'Date', ar: 'تاريخ السفر', zh: '出发日期', ru: 'Дата вылета' })}
                  </span>
                  <div className="flex items-center gap-1.5 font-black text-xs text-ink truncate">
                    <Calendar size={14} className="text-brand shrink-0" />
                    <span>{departInfo.j || departDate}</span>
                  </div>
                </button>

                {/* Passengers trigger */}
                <button
                  type="button"
                  onClick={() => setPassengerPickerOpen(true)}
                  className="min-h-[58px] p-3 rounded-2xl border border-line bg-surface hover:border-brand/40 text-start flex flex-col justify-center transition active:scale-[0.99]"
                >
                  <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                    {lt(locale, { fa: 'مسافران', en: 'Passengers', ar: 'المسافرون', zh: '乘客人数', ru: 'Пассажиры' })}
                  </span>
                  <div className="flex items-center gap-1.5 font-black text-xs text-ink truncate">
                    <Users size={14} className="text-brand shrink-0" />
                    <span>
                      {passengers.adults + passengers.childrenCount + passengers.infants}{' '}
                      {lt(locale, { fa: 'مسافر', en: 'pax', ar: 'مسافر', zh: '人', ru: 'пасс.' })}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Hotels Flow */
            <div className="space-y-3">
              {/* Hotel City Destination */}
              <button
                type="button"
                onClick={() => {
                  setCitySelectMode('hotel');
                  setCitySearchQuery('');
                }}
                className="w-full min-h-[58px] p-3.5 rounded-2xl border border-line bg-surface hover:border-brand/40 text-start flex items-center justify-between transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-soft border border-line/60 grid place-items-center text-brand">
                    <MapPin size={18} />
                  </span>
                  <div>
                    <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                      {lt(locale, { fa: 'شهر یا هتل مقصد', en: 'Destination / Hotel', ar: 'المدينة أو الفندق', zh: '目的地城市或酒店', ru: 'Город или отель' })}
                    </span>
                    <span className="text-sm font-black text-ink">
                      {hotelCity?.nameFa || hotelCity?.nameEn}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-sub/70 rtl:rotate-180" />
              </button>

              {/* Date & Guests Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDatePickerOpen(true)}
                  className="min-h-[58px] p-3 rounded-2xl border border-line bg-surface hover:border-brand/40 text-start flex flex-col justify-center transition"
                >
                  <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                    {lt(locale, { fa: 'تاریخ ورود', en: 'Check-in', ar: 'تاريخ الدخول', zh: '入住日期', ru: 'Заезд' })}
                  </span>
                  <div className="flex items-center gap-1.5 font-black text-xs text-ink truncate">
                    <Calendar size={14} className="text-brand shrink-0" />
                    <span>{departInfo.j || departDate}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPassengerPickerOpen(true)}
                  className="min-h-[58px] p-3 rounded-2xl border border-line bg-surface hover:border-brand/40 text-start flex flex-col justify-center transition"
                >
                  <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                    {lt(locale, { fa: 'اتاق و مهمانان', en: 'Rooms & Guests', ar: 'الغرف والضيوف', zh: '房间与人数', ru: 'Номера и гости' })}
                  </span>
                  <div className="flex items-center gap-1.5 font-black text-xs text-ink truncate">
                    <Users size={14} className="text-brand shrink-0" />
                    <span>
                      {passengers.roomCount || 1} اتاق، {passengers.adults} مهمان
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Quick Popular Destination Chips */}
          <div className="mt-4 pt-3 border-t border-line/60">
            <span className="text-[11px] font-black text-sub block mb-2">
              {lt(locale, {
                fa: 'مقصدهای محبوب:',
                en: 'Popular Destinations:',
                ar: 'الوجهات الشائعة:',
                zh: '热门目的地：',
                ru: 'Популярные направления:',
              })}
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {POPULAR_DESTS.map((cId) => {
                const city = CITIES.find((c) => c.id === cId);
                if (!city) return null;
                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => {
                      if (activeTab === 'flights') setToCity(city);
                      else setHotelCity(city);
                    }}
                    className="min-h-[34px] px-3 rounded-full border border-line bg-soft/70 hover:bg-mint text-ink text-xs font-bold shrink-0 transition active:scale-95 flex items-center gap-1.5"
                  >
                    <span>{city.flag}</span>
                    <span>{city.nameFa}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Search CTA */}
          <div className="mt-5 pt-3">
            <button
              type="button"
              onClick={handleExecuteSearch}
              className="w-full min-h-[52px] rounded-2xl bg-action hover:bg-action-hover text-ink font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-[0_6px_22px_rgba(240,166,42,0.35)]"
            >
              <Search size={18} />
              <span>
                {activeTab === 'flights'
                  ? lt(locale, {
                      fa: 'جستجوی پروازها',
                      en: 'Search Flights',
                      ar: 'بحث عن رحلات',
                      zh: '搜索机票',
                      ru: 'Поиск билетов',
                    })
                  : lt(locale, {
                      fa: 'جستجوی هتل‌ها',
                      en: 'Search Hotels',
                      ar: 'بحث عن فنادق',
                      zh: '搜索酒店',
                      ru: 'Поиск отелей',
                    })}
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Nested City Autocomplete Sub-Sheet */}
      {citySelectMode && (
        <Sheet open={Boolean(citySelectMode)} onOpenChange={() => setCitySelectMode(null)} side="bottom">
          <SheetContent className="max-w-lg mx-auto h-[85vh] flex flex-col p-4">
            <div className="flex items-center gap-2 pb-3 border-b border-line">
              <Search size={18} className="text-brand" />
              <h3 className="text-base font-black text-ink">
                {citySelectMode === 'from'
                  ? 'انتخاب شهر مبدأ'
                  : citySelectMode === 'to'
                    ? 'انتخاب شهر مقصد'
                    : 'انتخاب مقصد هتل'}
              </h3>
            </div>

            {/* Search Input */}
            <div className="my-3">
              <input
                type="search"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                placeholder="نام شهر، کشور یا کد فرودگاه..."
                autoFocus
                className="w-full min-h-[48px] px-4 rounded-2xl border border-line bg-soft text-sm font-bold text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {/* City List */}
            <div className="flex-1 overflow-y-auto divide-y divide-line/60">
              {filteredCities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    if (citySelectMode === 'from') setFromCity(city);
                    else if (citySelectMode === 'to') setToCity(city);
                    else setHotelCity(city);
                    setCitySelectMode(null);
                  }}
                  className="w-full min-h-[54px] py-2.5 px-2 flex items-center justify-between text-start hover:bg-soft/70 active:bg-soft rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{city.flag}</span>
                    <div>
                      <p className="text-sm font-black text-ink leading-snug">
                        {city.nameFa}
                        <span className="text-xs font-bold text-sub font-en ms-1.5">
                          ({city.airportCode})
                        </span>
                      </p>
                      <p className="text-[11px] font-bold text-sub/80 truncate max-w-[240px]">
                        {city.airportNameFa}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand-dark bg-mint px-2 py-0.5 rounded-lg font-en">
                    {city.airportCode}
                  </span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* DatePickerSheet */}
      <DatePickerSheet
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
        value={departDate}
        onChange={setDepartDate}
      />

      {/* PassengerPicker */}
      <PassengerPicker
        open={passengerPickerOpen}
        onOpenChange={setPassengerPickerOpen}
        value={passengers}
        onChange={setPassengers}
        showRooms={activeTab === 'hotels'}
      />
    </>
  );
}
