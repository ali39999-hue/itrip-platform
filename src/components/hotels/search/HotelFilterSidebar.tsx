'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Star,
  Check,
  Search,
  X,
  Coffee,
  Waves,
  Wifi,
  Car,
  Sparkles,
  Utensils,
  Dumbbell,
  Plane,
  ShieldCheck,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import type { HotelPropertyType } from '@/lib/types';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { HotelPriceHistogram } from './HotelPriceHistogram';
import type { HotelFilterSidebarProps } from './types';

export function HotelFilterSidebar({
  maxPrice,
  onMaxPriceChange,
  minPrice = 0,
  onMinPriceChange,
  priceBuckets,
  stars,
  onToggleStar,
  propertyTypes = new Set(),
  onTogglePropertyType,
  amenities = new Set(),
  onToggleAmenity,
  hotelName = '',
  onHotelNameChange,
  minScore,
  onMinScoreChange,
  freeCancel,
  onToggleFreeCancel,
  facets,
  onResetAll,
}: HotelFilterSidebarProps) {
  const locale = useLocale();
  const t = useTranslations('HotelsSearch');

  // Accordion open/collapse states (Alibaba & FlyToday standard)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    search: true,
    price: true,
    stars: true,
    propertyType: true,
    amenities: true,
    rating: true,
    cancellation: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const AMENITY_LIST = [
    { key: 'breakfast', icon: Coffee, label: lt(locale, { fa: 'صبحانه رایگان', en: 'Free Breakfast', ar: 'إفطار مجاني', zh: '免费早餐', ru: 'Бесплатный завтрак' }) },
    { key: 'pool', icon: Waves, label: lt(locale, { fa: 'استخر', en: 'Swimming Pool', ar: 'مسبح', zh: '游泳池', ru: 'Бассейн' }) },
    { key: 'wifi', icon: Wifi, label: lt(locale, { fa: 'وای‌فای رایگان', en: 'Free Wi-Fi', ar: 'واي فاي مجاني', zh: '免费无线', ru: 'Бесплатный Wi-Fi' }) },
    { key: 'parking', icon: Car, label: lt(locale, { fa: 'پارکینگ اختصاصی', en: 'Parking', ar: 'موقف سيارات', zh: '专属停车', ru: 'Парковка' }) },
    { key: 'spa', icon: Sparkles, label: lt(locale, { fa: 'مرکز اسپا و سونا', en: 'Spa & Sauna', ar: 'سبا وساونا', zh: '水疗与桑拿', ru: 'Спа и сауна' }) },
    { key: 'restaurant', icon: Utensils, label: lt(locale, { fa: 'رستوران', en: 'Restaurant', ar: 'مطعم', zh: '餐厅', ru: 'Ресторан' }) },
    { key: 'gym', icon: Dumbbell, label: lt(locale, { fa: 'سالن بدنسازی', en: 'Fitness Gym', ar: 'صالة رياضية', zh: '健身房', ru: 'Фитнес-зал' }) },
    { key: 'shuttle', icon: Plane, label: lt(locale, { fa: 'ترانسفر فرودگاهی', en: 'Airport Shuttle', ar: 'نقل المطار', zh: '机场接送', ru: 'Трансфер' }) },
  ];

  const PROPERTY_TYPE_LIST: { key: HotelPropertyType; label: string }[] = [
    { key: 'hotel', label: lt(locale, { fa: 'هتل', en: 'Hotel', ar: 'فندق', zh: '酒店', ru: 'Отель' }) },
    { key: 'apartment', label: lt(locale, { fa: 'هتل‌آپارتمان', en: 'Apartment Hotel', ar: 'شقق فندقية', zh: '公寓酒店', ru: 'Апарт-отель' }) },
    { key: 'boutique', label: lt(locale, { fa: 'اقامتگاه سنتی و بوم‌گردی', en: 'Boutique & Traditional', ar: 'بوتيك وتقليدي', zh: '精品传统住宿', ru: 'Бутик и традиционный' }) },
    { key: 'villa', label: lt(locale, { fa: 'ویلا، سوئیت و مجتمع', en: 'Villa, Suite & Complex', ar: 'فيلا ومجمع', zh: '别墅与套房', ru: 'Вилла и люкс' }) },
  ];

  const activeFiltersCount =
    (hotelName ? 1 : 0) +
    stars.size +
    propertyTypes.size +
    amenities.size +
    (minScore ? 1 : 0) +
    (freeCancel ? 1 : 0) +
    (minPrice > 0 || maxPrice < 25_000_000 ? 1 : 0);

  return (
    <aside className="sticky top-[90px] hidden lg:block max-h-[calc(100vh-100px)] overflow-y-auto p-4 border border-line rounded-2xl bg-surface shadow-xs scrollbar-thin space-y-4">
      {/* 1. Header with Active Filter Count & Clear All */}
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-brand" />
          <h2 className="text-sm font-black text-ink m-0">
            {lt(locale, { fa: 'فیلترهای هتل', en: 'Hotel Filters', ar: 'فلاتر الفنادق', zh: '酒店筛选', ru: 'Фильтры отелей' })}
          </h2>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 grid place-items-center rounded-full bg-brand text-surface text-[10.5px] font-bold num">
              {num(activeFiltersCount, locale)}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onResetAll}
            className="text-[11.5px] font-black text-brand-dark hover:underline flex items-center gap-1 cursor-pointer transition"
          >
            <RotateCcw size={11} />
            <span>{lt(locale, { fa: 'پاک کردن همه', en: 'Clear all', ar: 'مسح الكل', zh: '清除全部', ru: 'Сбросить всё' })}</span>
          </button>
        )}
      </div>

      {/* 2. Hotel Name Search (Alibaba style) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('search')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <span className="text-[12px] font-black text-ink">
            {lt(locale, { fa: 'جستجوی نام هتل', en: 'Search by Hotel Name', ar: 'البحث باسم الفندق', zh: '搜索酒店名称', ru: 'Поиск по названию' })}
          </span>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.search ? 'rotate-180' : ''}`} />
        </button>

        {openSections.search && (
          <div className="p-3 pt-0">
            <div className="relative flex items-center">
              <Search size={14} className="absolute start-3 text-sub pointer-events-none" />
              <input
                type="text"
                value={hotelName}
                onChange={(e) => onHotelNameChange?.(e.target.value)}
                placeholder={lt(locale, { fa: 'نام هتل مورد نظر...', en: 'e.g. Darvishi...', ar: 'اسم الفندق...', zh: '输入酒店名称...', ru: 'Название отеля...' })}
                className="w-full ps-8 pe-8 py-2 text-xs font-bold rounded-xl bg-surface border border-line focus:border-brand focus:outline-none transition"
              />
              {hotelName && (
                <button
                  type="button"
                  onClick={() => onHotelNameChange?.('')}
                  className="absolute end-2.5 w-5 h-5 rounded-full bg-line text-sub hover:text-ink grid place-items-center cursor-pointer"
                  title={lt(locale, { fa: 'پاک کردن', en: 'Clear', ar: 'مسح', zh: '清除', ru: 'Очистить' })}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Price per night with Histogram */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <span className="text-[12px] font-black text-ink">
            {lt(locale, { fa: 'قیمت هر شب', en: 'Price per Night', ar: 'السعر لليلة', zh: '每晚价格', ru: 'Цена за ночь' })}
          </span>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.price ? 'rotate-180' : ''}`} />
        </button>

        {openSections.price && (
          <div className="p-3 pt-0">
            <HotelPriceHistogram
              maxPrice={maxPrice}
              onMaxPriceChange={onMaxPriceChange}
              minPrice={minPrice}
              onMinPriceChange={onMinPriceChange}
              priceBuckets={priceBuckets}
            />
          </div>
        )}
      </div>

      {/* 4. Star Rating (درجه هتل در علی‌بابا) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('stars')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-black text-ink">{t('filterStars')}</span>
            {stars.size > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-surface text-[9px] grid place-items-center font-bold">
                {num(stars.size, locale)}
              </span>
            )}
          </div>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.stars ? 'rotate-180' : ''}`} />
        </button>

        {openSections.stars && (
          <div className="p-3 pt-0 space-y-1.5">
            {[5, 4, 3].map((s) => {
              const count = facets?.starCounts?.[s] ?? 0;
              const active = stars.has(s);
              return (
                <label
                  key={s}
                  className="flex items-center justify-between py-1.5 px-2 rounded-xl text-[12px] font-bold cursor-pointer group hover:bg-surface transition select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-4 h-4 rounded-md grid place-items-center border transition-colors ${
                        active ? 'bg-brand border-brand text-surface' : 'border-line bg-surface group-hover:border-brand'
                      }`}
                    >
                      {active && <Check size={11} strokeWidth={3.5} />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={active}
                      onChange={() => onToggleStar(s)}
                    />
                    <div className="flex items-center gap-1">
                      <div className="inline-flex gap-0.5">
                        {Array.from({ length: s }).map((_, i) => (
                          <Star key={i} size={12} className="fill-gold text-gold" />
                        ))}
                      </div>
                      <span className="text-xs font-black text-ink ms-1">
                        {num(s, locale)} {lt(locale, { fa: 'ستاره', en: 'Stars', ar: 'نجوم', zh: '星级', ru: 'звезд' })}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-sub font-mono">
                    {num(count, locale)}
                  </span>
                </label>
              );
            })}

            {/* 1 & 2 stars combined */}
            {(() => {
              const count12 = (facets?.starCounts?.[1] || 0) + (facets?.starCounts?.[2] || 0);
              const active12 = stars.has(1) || stars.has(2);
              return (
                <label className="flex items-center justify-between py-1.5 px-2 rounded-xl text-[12px] font-bold cursor-pointer group hover:bg-surface transition select-none">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-4 h-4 rounded-md grid place-items-center border transition-colors ${
                        active12 ? 'bg-brand border-brand text-surface' : 'border-line bg-surface group-hover:border-brand'
                      }`}
                    >
                      {active12 && <Check size={11} strokeWidth={3.5} />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={active12}
                      onChange={() => {
                        if (active12) {
                          if (stars.has(1)) onToggleStar(1);
                          if (stars.has(2)) onToggleStar(2);
                        } else {
                          onToggleStar(1);
                          onToggleStar(2);
                        }
                      }}
                    />
                    <span className="text-xs font-black text-ink">
                      {lt(locale, { fa: '۱ و ۲ ستاره (اقتصادی)', en: '1 & 2 Stars (Budget)', ar: 'نجمة ونجمتان (اقتصادي)', zh: '1-2星级（经济型）', ru: '1-2 звезды (Эконом)' })}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-sub font-mono">
                    {num(count12, locale)}
                  </span>
                </label>
              );
            })()}
          </div>
        )}
      </div>

      {/* 5. Property Type (نوع اقامتگاه) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('propertyType')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-black text-ink">
              {lt(locale, { fa: 'نوع اقامتگاه', en: 'Property Type', ar: 'نوع الإقامة', zh: '住宿类型', ru: 'Тип размещения' })}
            </span>
            {propertyTypes.size > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-surface text-[9px] grid place-items-center font-bold">
                {num(propertyTypes.size, locale)}
              </span>
            )}
          </div>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.propertyType ? 'rotate-180' : ''}`} />
        </button>

        {openSections.propertyType && (
          <div className="p-3 pt-0 space-y-1.5">
            {PROPERTY_TYPE_LIST.map((pt) => {
              const count = facets?.propertyTypeCounts?.[pt.key] ?? 0;
              const active = propertyTypes.has(pt.key);
              return (
                <label
                  key={pt.key}
                  className="flex items-center justify-between py-1.5 px-2 rounded-xl text-[12px] font-bold cursor-pointer group hover:bg-surface transition select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-md grid place-items-center border transition-colors shrink-0 ${
                        active ? 'bg-brand border-brand text-surface' : 'border-line bg-surface group-hover:border-brand'
                      }`}
                    >
                      {active && <Check size={11} strokeWidth={3.5} />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={active}
                      onChange={() => onTogglePropertyType?.(pt.key)}
                    />
                    <span className="truncate text-ink">{pt.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-sub font-mono ms-2 shrink-0">
                    {num(count, locale)}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Popular Amenities (امکانات هتل) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('amenities')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-black text-ink">
              {lt(locale, { fa: 'امکانات هتل', en: 'Hotel Amenities', ar: 'المرافق', zh: '酒店设施', ru: 'Удобства' })}
            </span>
            {amenities.size > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-surface text-[9px] grid place-items-center font-bold">
                {num(amenities.size, locale)}
              </span>
            )}
          </div>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.amenities ? 'rotate-180' : ''}`} />
        </button>

        {openSections.amenities && (
          <div className="p-3 pt-0 space-y-1.5">
            {AMENITY_LIST.map((am) => {
              const Icon = am.icon;
              const count = facets?.amenityCounts?.[am.key] ?? 0;
              const active = amenities.has(am.key);
              return (
                <label
                  key={am.key}
                  className="flex items-center justify-between py-1.5 px-2 rounded-xl text-[12px] font-bold cursor-pointer group hover:bg-surface transition select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-md grid place-items-center border transition-colors shrink-0 ${
                        active ? 'bg-brand border-brand text-surface' : 'border-line bg-surface group-hover:border-brand'
                      }`}
                    >
                      {active && <Check size={11} strokeWidth={3.5} />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={active}
                      onChange={() => onToggleAmenity?.(am.key)}
                    />
                    <Icon size={13} className="text-sub shrink-0" />
                    <span className="truncate text-ink">{am.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-sub font-mono ms-2 shrink-0">
                    {num(count, locale)}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Guest Ratings (امتیاز رضایت مسافران) */}
      <div className="rounded-xl border border-line/70 bg-soft/30 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          className="w-full flex items-center justify-between p-3 text-start hover:bg-soft/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-black text-ink">
              {lt(locale, { fa: 'امتیاز مسافران', en: 'Guest Rating', ar: 'تقييم الضيوف', zh: '用户评分', ru: 'Оценка гостей' })}
            </span>
            {minScore && (
              <span className="w-4 h-4 rounded-full bg-brand text-surface text-[9px] grid place-items-center font-bold">
                ۱
              </span>
            )}
          </div>
          <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${openSections.rating ? 'rotate-180' : ''}`} />
        </button>

        {openSections.rating && (
          <div className="p-3 pt-0 space-y-1.5">
            {[
              { val: 9, label: lt(locale, { fa: 'فوق‌العاده: ۹ به بالا', en: 'Wonderful: 9+', ar: 'رائع: 9+', zh: '极佳：9分以上', ru: 'Превосходно: 9+' }) },
              { val: 8, label: lt(locale, { fa: 'خیلی خوب: ۸ به بالا', en: 'Very Good: 8+', ar: 'جيد جداً: 8+', zh: '很好：8分以上', ru: 'Очень хорошо: 8+' }) },
              { val: 7, label: lt(locale, { fa: 'خوب: ۷ به بالا', en: 'Good: 7+', ar: 'جيد: 7+', zh: '好：7分以上', ru: 'Хорошо: 7+' }) },
            ].map((sc) => {
              const checked = minScore === sc.val;
              return (
                <button
                  key={sc.val}
                  type="button"
                  onClick={() => onMinScoreChange?.(checked ? 0 : sc.val)}
                  className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl border text-start transition cursor-pointer ${
                    checked
                      ? 'bg-mint/40 border-brand text-brand-dark shadow-2xs'
                      : 'bg-surface border-line hover:border-brand/40 text-ink'
                  }`}
                >
                  <span className="text-[12px] font-bold">{sc.label}</span>
                  {checked && <Check size={12} className="text-brand" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. Free Cancellation Toggle (کنسلی رایگان در علی‌بابا) */}
      <div className="p-3 rounded-xl border border-line/70 bg-soft/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span className="text-[12px] font-black text-ink">
            {lt(locale, { fa: 'فقط کنسلی رایگان', en: 'Free Cancellation Only', ar: 'إلغاء مجاني فقط', zh: '仅限免费取消', ru: 'Только с бесплатной отменой' })}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(freeCancel)}
          onClick={onToggleFreeCancel}
          className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 shrink-0 ${
            freeCancel ? 'bg-emerald-500' : 'bg-line'
          }`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-surface shadow-xs transition-transform duration-200 ${
              freeCancel ? (locale === 'fa' || locale === 'ar' ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </aside>
  );
}
