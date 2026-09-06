'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import {
  X,
  Plane,
  Briefcase,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Luggage,
  Utensils,
  Armchair,
  Sparkles,
} from 'lucide-react';
import type { Flight } from '@/lib/types';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { AirlineLogo } from './AirlineLogo';
import { durationLocalized } from './BentoFlightCard';

interface FlightCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparedFlights: Flight[];
  onRemove: (id: string) => void;
  onSelectFlight: (flight: Flight) => void;
}

export function FlightCompareModal({
  isOpen,
  onClose,
  comparedFlights,
  onRemove,
  onSelectFlight,
}: FlightCompareModalProps) {
  const locale = useLocale();

  if (!isOpen || comparedFlights.length === 0) return null;

  const minPrice = Math.min(...comparedFlights.map((f) => f.price));

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-deep/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] bg-surface rounded-3xl border border-line shadow-elev-3 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface/90">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-ink flex items-center gap-2">
              <Plane size={20} className="text-brand shrink-0" />
              <span>
                {lt(locale, {
                  fa: `مقایسه رو در روی پروازها (${num(comparedFlights.length, locale)} پرواز)`,
                  en: `Side-by-Side Flight Comparison (${num(comparedFlights.length, locale)} flights)`,
                  ar: `مقارنة الرحلات جنباً إلى جنب (${num(comparedFlights.length, locale)} رحلات)`,
                  zh: `航班横向对比（${num(comparedFlights.length, locale)} 个航班）`,
                  ru: `Сравнение рейсов (${num(comparedFlights.length, locale)} рейсов)`,
                })}
              </span>
            </h3>
            <p className="text-xs text-sub mt-0.5">
              {lt(locale, {
                fa: 'بررسی دقیق تفاوت قیمت، زمان پرواز، بار مجاز و قوانین کنسلی',
                en: 'Compare prices, flight times, baggage allowances, and cancellation policies at a glance',
                ar: 'مقارنة دقيقة للأسعار ومواعيد الرحلات والأمتعة وسياسات الإلغاء',
                zh: '一目了然对比价格、飞行时间、免费行李额及退改签政策',
                ru: 'Сравните цены, время вылета, норму багажа и условия возврата',
              })}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
            className="w-10 h-10 rounded-full bg-soft text-sub hover:text-ink grid place-items-center transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Comparison Grid Scroll Container (supports both horizontal & vertical scrolling on mobile) */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-auto flex-1 space-y-6">
          <div
            className="grid gap-4 items-start"
            style={{
              gridTemplateColumns: `repeat(${comparedFlights.length}, minmax(260px, 1fr))`,
            }}
          >
            {comparedFlights.map((flight) => {
              const isCheapest = flight.price === minPrice;
              const overnight = flight.arrivalTime < flight.departureTime;
              const business = flight.cabinClass === 'business';

              return (
                <div
                  key={flight.id}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between h-full relative transition-all ${
                    isCheapest
                      ? 'border-brand bg-mint/20 shadow-elev-1'
                      : 'border-line bg-surface shadow-xs'
                  }`}
                >
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => onRemove(flight.id)}
                    className="absolute top-3 end-3 w-7 h-7 rounded-full bg-soft hover:bg-destructive/10 text-sub hover:text-destructive grid place-items-center transition text-xs"
                    title={lt(locale, { fa: 'حذف از مقایسه', en: 'Remove', ar: 'حذف', zh: '删除', ru: 'Удалить' })}
                  >
                    <X size={14} />
                  </button>

                  {/* Top Card: Airline & Flight Class */}
                  <div>
                    <div className="flex items-center gap-3 mb-4 pe-8">
                      <AirlineLogo
                        airline={flight.airline}
                        airlineEn={flight.airlineEn}
                        size={40}
                      />
                      <div>
                        <h4 className="text-base font-black text-ink leading-tight">
                          {flight.airline}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-bold text-sub">
                            {flight.flightNo}
                          </span>
                          <span className="text-[10.5px] px-2 py-0.5 rounded-full font-bold bg-amber-100/80 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            {business ? 'Business' : 'Economy'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price Block */}
                    <div className="p-3.5 rounded-xl bg-surface border border-line/80 mb-5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-sub">
                          {lt(locale, { fa: 'نرخ نهایی بلیط', en: 'Total Fare', ar: 'السعر الإجمالي', zh: '机票总价', ru: 'Итоговый тариф' })}:
                        </span>
                        {isCheapest && (
                          <span className="text-[10.5px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Sparkles size={11} />
                            {lt(locale, { fa: 'ارزان‌ترین نرخ', en: 'Best Price', ar: 'أفضل سعر', zh: '最低价格', ru: 'Лучшая цена' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5 font-mono">
                        <span className="text-2xl font-black text-brand-dark">
                          {num(flight.price, locale)}
                        </span>
                        <span className="text-xs font-bold text-sub">
                          {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Туман' })}
                        </span>
                      </div>
                    </div>

                    {/* Schedule & Flight Route */}
                    <div className="space-y-3 mb-5 text-sm border-b border-line pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sub text-xs font-bold flex items-center gap-1.5">
                          <Clock size={14} className="text-brand" />
                          {lt(locale, { fa: 'حرکت و رسیدن', en: 'Departure & Arrival', ar: 'المغادرة والوصول', zh: '起飞与到达', ru: 'Вылет и прилет' })}:
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-mono font-black text-ink text-sm">
                          <span>{flight.departureTime}</span>
                          <ArrowRight size={13} className="ltr:inline rtl:hidden text-brand" />
                          <ArrowLeft size={13} className="rtl:inline ltr:hidden text-brand" />
                          <span>{flight.arrivalTime}</span>
                          {overnight && (
                            <sup className="text-[10px] text-rose-500 font-bold ms-1">+1</sup>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sub text-xs font-bold">
                          {lt(locale, { fa: 'مدت زمان پرواز', en: 'Duration', ar: 'المدة', zh: '飞行时长', ru: 'Длительность' })}:
                        </span>
                        <span className="font-bold text-ink text-xs">
                          {durationLocalized(flight.duration, locale)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sub text-xs font-bold">
                          {lt(locale, { fa: 'توقف‌ها', en: 'Stops', ar: 'التوقفات', zh: '经停情况', ru: 'Пересадки' })}:
                        </span>
                        <span className="font-bold text-ink text-xs">
                          {flight.stops === 0
                            ? lt(locale, { fa: 'مستقیم (بدون توقف)', en: 'Non-stop', ar: 'مباشر', zh: '直飞无经停', ru: 'Прямой рейс' })
                            : `${num(flight.stops, locale)} ${lt(locale, { fa: 'توقف', en: 'stop', ar: 'توقف', zh: '次经停', ru: 'пересадка' })}`}
                        </span>
                      </div>
                    </div>

                    {/* Baggage & Specs */}
                    <div className="space-y-3 mb-5 text-xs border-b border-line pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sub font-bold flex items-center gap-1.5">
                          <Briefcase size={14} className="text-brand" />
                          {lt(locale, { fa: 'بار تحویلی (قسمت بار)', en: 'Checked Baggage', ar: 'الأمتعة المسجلة', zh: '托运行李额', ru: 'Багаж (багажное отделение)' })}:
                        </span>
                        <span className="font-bold text-ink">
                          {flight.baggage}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sub font-bold flex items-center gap-1.5">
                          <Luggage size={14} className="text-sub" />
                          {lt(locale, { fa: 'بار دستی کابین', en: 'Cabin Luggage', ar: 'حقيبة اليد', zh: '随身手提行李', ru: 'Ручная кладь' })}:
                        </span>
                        <span className="font-bold text-ink">
                          {business ? '۱۰ کیلوگرم' : '۷ کیلوگرم'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sub font-bold flex items-center gap-1.5">
                          <Armchair size={14} className="text-sub" />
                          {lt(locale, { fa: 'صندلی‌های باقیمانده', en: 'Seats Remaining', ar: 'المقاعد المتبقية', zh: '剩余席位', ru: 'Осталось мест' })}:
                        </span>
                        <span className={`font-black ${flight.seatsLeft <= 3 ? 'text-rose-600' : 'text-ink'}`}>
                          {num(flight.seatsLeft, locale)} {lt(locale, { fa: 'صندلی', en: 'seats', ar: 'مقعد', zh: '位', ru: 'мест' })}
                        </span>
                      </div>
                    </div>

                    {/* Cancellation & Services */}
                    <div className="space-y-2.5 mb-6 text-xs">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        <ShieldCheck size={15} className="shrink-0" />
                        <span>{lt(locale, { fa: 'استرداد آنلاین طبق قوانین سازمان هواپیمایی', en: 'Online refund according to CAO rules', ar: 'استرداد فوري حسب شروط الطيران', zh: '支持按航司规则线上退改签', ru: 'Онлайн возврат по правилам авиакомпании' })}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sub font-medium">
                        <Utensils size={14} className="shrink-0 text-amber-600" />
                        <span>{lt(locale, { fa: 'پذیرایی و میان‌وعده داخل پرواز', en: 'In-flight catering & snacks included', ar: 'وجبات خفيفة ومشروبات مشمولة', zh: '包含机上配餐与饮品', ru: 'Питание и напитки включены' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking CTA Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectFlight(flight);
                    }}
                    className="w-full min-h-[46px] rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-auto"
                  >
                    <span>
                      {lt(locale, { fa: 'انتخاب این پرواز و رزرو', en: 'Select Flight & Book', ar: 'اختيار هذه الرحلة والحجز', zh: '选择此航班并预订', ru: 'Выбрать и забронировать' })}
                    </span>
                    <ArrowRight size={15} className="rtl:rotate-180 shrink-0" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
