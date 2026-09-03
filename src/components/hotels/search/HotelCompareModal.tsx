'use client';

import React from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { X, Star, Check, Ban, ExternalLink, MapPin } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Hotel } from '@/lib/types';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { getHotelImage, shimmerDataUrl } from '@/lib/image-utils';

interface HotelCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparedHotels: Hotel[];
  onRemove: (id: string) => void;
  checkin?: string;
  checkout?: string;
  adults?: number;
  childrenCount?: number;
}

export function HotelCompareModal({
  isOpen,
  onClose,
  comparedHotels,
  onRemove,
  checkin,
  checkout,
  adults,
  childrenCount,
}: HotelCompareModalProps) {
  const locale = useLocale();

  if (!isOpen || comparedHotels.length === 0) return null;

  const queryParams = new URLSearchParams();
  if (checkin) queryParams.set('checkin', checkin);
  if (checkout) queryParams.set('checkout', checkout);
  if (adults !== undefined) queryParams.set('adults', String(adults));
  if (childrenCount !== undefined) queryParams.set('children', String(childrenCount));
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-deep/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[90vh] bg-surface rounded-3xl border border-line shadow-elev-3 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface/90">
          <div>
            <h3 className="text-lg font-black text-ink">
              {lt(locale, {
                fa: `مقایسه رو در روی اقامتگاه‌ها (${comparedHotels.length} مورد)`,
                en: `Side-by-Side Comparison (${comparedHotels.length} stays)`,
                ar: `مقارنة الإقامات جنبًا إلى جنب (${comparedHotels.length})`,
                zh: `住宿并排对比（${comparedHotels.length} 项）`,
                ru: `Сравнение отелей (${comparedHotels.length})`,
              })}
            </h3>
            <p className="text-xs text-sub mt-0.5">
              {lt(locale, {
                fa: 'بررسی قیمت، امکانات، موقعیت مکانی و شرایط کنسلی در یک نگاه',
                en: 'Compare price, amenities, location and cancellation policies at a glance',
                ar: 'قارن الأسعار والمرافق والموقع وسياسات الإلغاء في لمحة',
                zh: '一目了然对比价格、设施、位置和取消政策',
                ru: 'Сравните цены, удобства, расположение и правила отмены',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-soft text-sub hover:text-ink grid place-items-center transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparedHotels.map((hotel) => {
              const img = getHotelImage(hotel);
              const priceM = num(hotel.pricePerNight / 10000000, locale, {
                maximumFractionDigits: 1,
              });

              return (
                <div
                  key={hotel.id}
                  className="rounded-2xl border border-line bg-surface p-4 flex flex-col justify-between space-y-4 shadow-2xs hover:border-brand/40 transition relative group"
                >
                  <button
                    type="button"
                    onClick={() => onRemove(hotel.id)}
                    className="absolute top-6 end-6 z-10 w-7 h-7 rounded-full bg-deep/70 hover:bg-destructive text-surface grid place-items-center backdrop-blur-xs transition"
                    title={lt(locale, { fa: 'حذف از مقایسه', en: 'Remove', ar: 'إزالة', zh: '移除', ru: 'Удалить' })}
                  >
                    <X size={14} />
                  </button>

                  <div className="space-y-3">
                    {/* Photo */}
                    <div className="relative w-full h-40 rounded-xl overflow-hidden bg-soft">
                      <Image
                        src={img}
                        alt={hotel.name}
                        fill
                        sizes="320px"
                        placeholder="blur"
                        blurDataURL={shimmerDataUrl(320, 160)}
                        className="object-cover"
                      />
                      <span className="absolute bottom-2 start-2 px-2 py-0.5 rounded-full bg-deep/80 text-surface text-[11px] font-bold">
                        ★ {hotel.rating}
                      </span>
                    </div>

                    {/* Basic Info */}
                    <div>
                      <div className="flex items-center gap-1 text-gold mb-1">
                        {Array.from({ length: hotel.stars || 4 }).map((_, i) => (
                          <Star key={i} size={13} className="fill-gold" />
                        ))}
                      </div>
                      <h4 className="font-bold text-ink text-base line-clamp-1">
                        {locale === 'fa' ? hotel.name : (hotel.nameEn || hotel.name)}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-sub mt-1">
                        <MapPin size={13} className="text-brand shrink-0" />
                        <span className="truncate">{hotel.city} · {hotel.distanceFromCenter}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="p-3 rounded-xl bg-mint/30 border border-mint-bright/40">
                      <span className="text-[11px] text-sub block">
                        {lt(locale, { fa: 'قیمت هر شب از:', en: 'Per night from:', ar: 'السعر لليلة من:', zh: '每晚起：', ru: 'За ночь от:' })}
                      </span>
                      <div className="text-lg font-black text-brand-dark font-mono">
                        {priceM} <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'میلیون تومان', en: 'Million Toman', ar: 'مليون تومان', zh: '百万图曼', ru: 'млн томанов' })}</span>
                      </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      {hotel.freeCancellation ? (
                        <span className="text-success flex items-center gap-1">
                          <Check size={14} />
                          {lt(locale, { fa: 'کنسلی رایگان دارد', en: 'Free cancellation available', ar: 'إلغاء مجاني متاح', zh: '可免费取消', ru: 'Бесплатная отмена' })}
                        </span>
                      ) : (
                        <span className="text-sub flex items-center gap-1">
                          <Ban size={14} />
                          {lt(locale, { fa: 'طبق قوانین استاندارد هتل', en: 'Hotel standard policy', ar: 'وفق سياسة الفندق', zh: '按酒店标准政策', ru: 'По правилам отеля' })}
                        </span>
                      )}
                    </div>

                    {/* Key Amenities */}
                    <div>
                      <span className="text-[11px] font-bold text-sub block mb-1.5">
                        {lt(locale, { fa: 'امکانات شاخص:', en: 'Key Amenities:', ar: 'المرافق البارزة:', zh: '特色设施：', ru: 'Оснащение:' })}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {hotel.amenities.slice(0, 4).map((am) => (
                          <span
                            key={am}
                            className="px-2 py-0.5 rounded-md bg-soft text-[10.5px] font-bold text-sub border border-line"
                          >
                            {am}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/hotels/${hotel.id}${queryString}`}
                    className="w-full h-10 mt-3 rounded-xl bg-brand hover:bg-brand-dark text-surface font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <span>{lt(locale, { fa: 'مشاهده و رزرو اتاق‌ها', en: 'View & Book Rooms', ar: 'عرض الحجز والغرف', zh: '查看并预订', ru: 'Смотреть и бронировать' })}</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
