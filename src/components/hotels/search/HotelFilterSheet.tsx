'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  X,
  RotateCcw,
  Search,
  Coffee,
  Waves,
  Wifi,
  Car,
  Sparkles,
  Utensils,
  Dumbbell,
  Plane,
  ShieldCheck,
} from 'lucide-react';
import type { HotelPropertyType } from '@/lib/types';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { HotelPriceHistogram } from './HotelPriceHistogram';
import type { HotelFilterSheetProps } from './types';

export function HotelFilterSheet({
  isOpen,
  onClose,
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
  resultsCount,
}: HotelFilterSheetProps) {
  const locale = useLocale();
  const t = useTranslations('HotelsSearch');

  if (!isOpen) return null;

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
    { key: 'boutique', label: lt(locale, { fa: 'سنتی و بوم‌گردی', en: 'Boutique & Traditional', ar: 'بوتيك وتقليدي', zh: '精品传统住宿', ru: 'Бутик' }) },
    { key: 'villa', label: lt(locale, { fa: 'ویلا و سوئیت', en: 'Villa & Suite', ar: 'فيلا وجناح', zh: '别墅与套房', ru: 'Вилла' }) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-deep/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[88vh] bg-surface rounded-t-3xl sm:rounded-3xl border border-line shadow-elev-3 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">
            {lt(locale, { fa: 'فیلترهای پیشرفته اقامتگاه', en: 'Advanced Hotel Filters', ar: 'فلاتر متقدمة', zh: '高级住宿筛选', ru: 'Расширенные фильтры' })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-soft text-sub hover:text-ink grid place-items-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1 divide-y divide-line/60">
          {/* Hotel Name Search */}
          <div className="pb-2">
            <h4 className="text-xs font-black text-ink mb-1.5">
              {lt(locale, { fa: 'جستجوی نام هتل', en: 'Search Hotel Name', ar: 'البحث باسم الفندق', zh: '搜索酒店名称', ru: 'Поиск по названию' })}
            </h4>
            <div className="relative flex items-center">
              <Search size={14} className="absolute start-3 text-sub" />
              <input
                type="text"
                value={hotelName}
                onChange={(e) => onHotelNameChange?.(e.target.value)}
                placeholder={lt(locale, { fa: 'نام هتل مورد نظر...', en: 'Hotel name...', ar: 'اسم الفندق...', zh: '输入酒店名称...', ru: 'Название отеля...' })}
                className="w-full ps-8 pe-3 py-2 text-xs font-bold rounded-xl bg-soft border border-line focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>
          </div>

          {/* Price Histogram */}
          <div className="pt-3">
            <HotelPriceHistogram
              maxPrice={maxPrice}
              onMaxPriceChange={onMaxPriceChange}
              minPrice={minPrice}
              onMinPriceChange={onMinPriceChange}
              priceBuckets={priceBuckets}
            />
          </div>

          {/* Star Rating */}
          <div className="pt-4">
            <h4 className="text-xs font-black text-ink mb-2.5">{t('filterStars')}</h4>
            <div className="grid grid-cols-4 gap-2">
              {[5, 4, 3, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onToggleStar(s)}
                  className={`h-11 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    stars.has(s)
                      ? 'bg-brand text-surface border-brand shadow-xs'
                      : 'bg-surface border-line text-ink hover:bg-soft'
                  }`}
                >
                  <span className="font-mono">{num(s, locale)}</span>
                  <span>★</span>
                  {facets?.starCounts?.[s] !== undefined && (
                    <span className="text-[10px] opacity-70">({num(facets.starCounts[s], locale)})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Property Types */}
          <div className="pt-4">
            <h4 className="text-xs font-black text-ink mb-2.5">
              {lt(locale, { fa: 'نوع اقامتگاه', en: 'Property Type', ar: 'نوع الإقامة', zh: '住宿类型', ru: 'Тип размещения' })}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPE_LIST.map((pt) => {
                const active = propertyTypes.has(pt.key);
                return (
                  <button
                    key={pt.key}
                    type="button"
                    onClick={() => onTogglePropertyType?.(pt.key)}
                    className={`h-10 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      active
                        ? 'bg-brand text-surface border-brand shadow-xs'
                        : 'bg-surface border-line text-ink hover:bg-soft'
                    }`}
                  >
                    <span className="truncate">{pt.label}</span>
                    {facets?.propertyTypeCounts?.[pt.key] !== undefined && (
                      <span className="text-[10px] opacity-70 font-mono">
                        {num(facets.propertyTypeCounts[pt.key], locale)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amenities */}
          <div className="pt-4">
            <h4 className="text-xs font-black text-ink mb-2.5">
              {lt(locale, { fa: 'امکانات محبوب', en: 'Popular Amenities', ar: 'المرافق الشائعة', zh: '热门设施', ru: 'Популярные удобства' })}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {AMENITY_LIST.map((am) => {
                const Icon = am.icon;
                const active = amenities.has(am.key);
                return (
                  <button
                    key={am.key}
                    type="button"
                    onClick={() => onToggleAmenity?.(am.key)}
                    className={`h-10 px-2.5 rounded-xl border text-[11.5px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-brand text-surface border-brand shadow-xs'
                        : 'bg-surface border-line text-ink hover:bg-soft'
                    }`}
                  >
                    <Icon size={13} className="shrink-0" />
                    <span className="truncate">{am.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest Rating Score */}
          <div className="pt-4">
            <h4 className="text-xs font-black text-ink mb-2.5">{t('filterScore')}</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { score: 9, label: lt(locale, { fa: 'فوق‌العاده (۹+)', en: 'Wonderful (9+)', ar: 'رائع (٩+)', zh: '极佳 (9+)', ru: 'Восхитительно (9+)' }) },
                { score: 8, label: lt(locale, { fa: 'خیلی خوب (۸+)', en: 'Very good (8+)', ar: 'جيد جداً (٨+)', zh: '很好 (8+)', ru: 'Очень хорошо (8+)' }) },
                { score: 0, label: lt(locale, { fa: 'همه امتیازها', en: 'All ratings', ar: 'جميع التقييمات', zh: '全部评分', ru: 'Все оценки' }) },
              ].map((item) => (
                <button
                  key={item.score}
                  type="button"
                  onClick={() => onMinScoreChange(item.score)}
                  className={`h-10 rounded-xl border text-xs font-bold px-2 truncate transition cursor-pointer ${
                    minScore === item.score
                      ? 'bg-brand text-surface border-brand'
                      : 'bg-surface border-line text-ink hover:bg-soft'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Free cancellation */}
          <div className="pt-4">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-mint-bright/10 border border-mint-bright/30 cursor-pointer">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand" />
                <span className="text-xs font-black text-brand-dark">{t('freeCancel')}</span>
              </div>
              <input
                type="checkbox"
                checked={freeCancel}
                onChange={onToggleFreeCancel}
                className="accent-brand w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="p-4 border-t border-line flex items-center gap-3 bg-soft/50">
          <button
            type="button"
            onClick={onResetAll}
            className="px-4 h-11 rounded-xl bg-surface border border-line text-sub font-bold text-xs hover:text-ink flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>{lt(locale, { fa: 'ریست', en: 'Reset', ar: 'إعادة تعيين', zh: '重置', ru: 'Сброс' })}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition cursor-pointer shadow-xs"
          >
            {lt(locale, { fa: 'مشاهده', en: 'Show', ar: 'عرض', zh: '查看', ru: 'Показать' })} ({num(resultsCount, locale)}{' '}
            {lt(locale, { fa: 'اقامتگاه', en: 'stays', ar: 'إقامة', zh: '家住宿', ru: 'вариантов' })})
          </button>
        </div>
      </div>
    </div>
  );
}
