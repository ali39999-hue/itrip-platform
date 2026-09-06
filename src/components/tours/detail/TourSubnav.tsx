'use client';

import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface TourSubnavProps {
  activeSection: string;
  onSectionClick: (id: string) => void;
}

export function TourSubnav({ activeSection, onSectionClick }: TourSubnavProps) {
  const locale = useLocale();

  const navItems = [
    { id: 'overview', label: lt(locale, { fa: 'معرفی کلی', en: 'Overview', ar: 'نظرة عامة', zh: '行程概览', ru: 'Обзор' }) },
    { id: 'itinerary', label: lt(locale, { fa: 'برنامه روزشمار سفر', en: 'Daily Itinerary', ar: 'جدول الرحلة', zh: '每日行程', ru: 'Маршрут по дням' }) },
    { id: 'services', label: lt(locale, { fa: 'خدمات و اقلام پکیج', en: 'Included & Excluded', ar: 'الخدمات المشمولة', zh: '服务与包含', ru: 'Услуги и пакет' }) },
    { id: 'accommodation', label: lt(locale, { fa: 'هتل و پرواز', en: 'Hotel & Flight', ar: 'الفندق والطيران', zh: '酒店与航班', ru: 'Отель и перелёт' }) },
    { id: 'dates', label: lt(locale, { fa: 'تاریخ‌ها و قیمت', en: 'Dates & Pricing', ar: 'المواعيد والأسعار', zh: '班期与价格', ru: 'Даты и цены' }) },
    { id: 'reviews', label: lt(locale, { fa: 'نظرات مسافران', en: 'Reviews', ar: 'آراء المسافرين', zh: '旅客评价', ru: 'Отзывы' }) },
    { id: 'policies', label: lt(locale, { fa: 'قوانین و مدارک', en: 'Policies & Documents', ar: 'الشروط والوثائق', zh: '退改与证件', ru: 'Правила и виза' }) },
  ];

  return (
    <nav
      aria-label={lt(locale, { fa: 'ناوبری بخش‌های تور', en: 'Tour sections navigation', ar: 'التنقل بين أقسام الجولة', zh: '行程各部分导航', ru: 'Навигация по разделам тура' })}
      className="sticky top-16 z-40 border-y border-line/80 bg-surface/95 backdrop-blur-xl"
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-1 overflow-x-auto scrollbar-none" role="tablist">
        {navItems.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            aria-selected={activeSection === item.id}
            aria-controls={item.id}
            onClick={() => onSectionClick(item.id)}
            className={`shrink-0 min-h-12 px-3.5 border-b-[3px] border-transparent bg-transparent text-[13px] font-extrabold whitespace-nowrap transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              activeSection === item.id
                ? 'text-brand-dark border-brand font-black'
                : 'text-sub hover:text-brand-dark'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
