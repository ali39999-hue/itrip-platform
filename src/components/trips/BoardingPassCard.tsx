'use client';

import React from 'react';
import {
  Plane,
  BedDouble,
  MapPin,
  User,
  Ticket,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { BaggagePill } from './BaggagePill';
import { VoucherBarcode } from './VoucherBarcode';

export interface BoardingPassProps {
  serviceType: 'FLIGHT' | 'HOTEL' | 'TOUR' | 'TRANSFER' | string;
  reference: string;
  externalPnr?: string | null;
  status: string;
  travelDate?: string;
  title?: string;
  // Flight specifics
  flightNo?: string;
  airline?: string;
  origin?: string;
  originCity?: string;
  destination?: string;
  destinationCity?: string;
  departureTime?: string;
  arrivalTime?: string;
  terminal?: string;
  gate?: string;
  seat?: string;
  cabinClass?: string;
  baggage?: string;
  // Hotel specifics
  hotelName?: string;
  city?: string;
  nights?: number;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  // Common
  passengers?: Array<{
    firstName?: string;
    lastName?: string;
    nationalId?: string;
    passportNo?: string;
  }>;
  totalAmount?: number;
  currency?: string;
  locale: string;
  onSaveOffline?: () => void;
  className?: string;
}

export function BoardingPassCard({
  serviceType = 'FLIGHT',
  reference,
  externalPnr,
  status,
  travelDate,
  flightNo = 'W5-1152',
  airline = 'هواپیمایی ماهان',
  origin = 'THR',
  originCity = 'تهران',
  destination = 'IST',
  destinationCity = 'استانبول',
  departureTime = '08:30',
  arrivalTime = '11:45',
  terminal = 'T1',
  gate = 'B14',
  seat = 'Auto',
  cabinClass = 'Economy',
  baggage = '30kg',
  hotelName = 'هتل اسپیناس پالاس',
  city = 'تهران',
  nights = 1,
  roomType = 'اتاق دابل لوکس',
  checkIn = '14:00',
  checkOut = '12:00',
  passengers = [],
  locale,
  onSaveOffline,
  className = '',
}: BoardingPassProps) {
  const isFlight = serviceType.toUpperCase() === 'FLIGHT';
  const isConfirmed = status === 'CONFIRMED';

  const leadPassenger = passengers[0];
  const passengerName = leadPassenger
    ? `${leadPassenger.firstName || ''} ${leadPassenger.lastName || ''}`.trim()
    : 'Guest Traveler';

  return (
    <div
      className={`w-full bg-surface dark:bg-slate-900 rounded-3xl border border-line shadow-md overflow-hidden print:border-black print:shadow-none ${className}`}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-dark via-brand to-brand-2 p-5 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md grid place-items-center shrink-0 border border-white/20">
            {isFlight ? <Plane size={24} className="text-white" /> : <BedDouble size={24} className="text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                {isFlight ? 'Official Boarding Pass' : 'Hotel Booking Voucher'}
              </span>
              {isConfirmed && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-500/80 text-white px-2 py-0.5 rounded-md">
                  <CheckCircle2 size={12} />
                  <span>تایید قطعی</span>
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-black mt-1">
              {isFlight ? `${airline} — ${flightNo}` : hotelName}
            </h3>
          </div>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end print:hidden">
          {onSaveOffline && (
            <button
              type="button"
              onClick={onSaveOffline}
              className="h-9 px-3.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-black transition flex items-center gap-1.5"
              title="ذخیره در حافظه دستگاه جهت دسترسی بدون اینترنت"
            >
              <Ticket size={14} />
              <span>
                {lt(locale, {
                  fa: 'ذخیره آفلاین واچر',
                  en: 'Save Offline',
                  ar: 'حفظ بدون إنترنت',
                  zh: '离线保存',
                  ru: 'Сохранить офлайн',
                })}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-3.5 rounded-xl bg-white text-brand-dark hover:bg-slate-100 font-black text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Printer size={14} />
            <span>
              {lt(locale, {
                fa: 'چاپ بلیت',
                en: 'Print Pass',
                ar: 'طباعة التذكرة',
                zh: '打印登机牌',
                ru: 'Печать',
              })}
            </span>
          </button>
        </div>
      </div>

      {/* Main Ticket Body & Perforated Stub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 relative">
        {/* Left/Main Ticket Section (8 Cols) */}
        <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-e border-dashed border-line/90">
          {isFlight ? (
            /* Flight Details Flow */
            <div>
              {/* Route Arc & IATA Badges */}
              <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-line/60">
                {/* Origin */}
                <div className="text-start">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-ink block">
                    {origin}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-sub block mt-0.5">
                    {originCity}
                  </span>
                  <span className="text-sm sm:text-base font-black text-brand-dark dark:text-brand font-mono block mt-1">
                    {departureTime}
                  </span>
                </div>

                {/* Plane Route Center Arc */}
                <div className="flex-1 flex flex-col items-center px-4 max-w-[200px]">
                  <div className="flex items-center gap-1 text-xs text-sub font-mono mb-1">
                    <span>{flightNo}</span>
                  </div>
                  <div className="w-full flex items-center gap-1 relative">
                    <div className="h-[2px] flex-1 bg-line rounded-full" />
                    <div className="w-7 h-7 rounded-full bg-brand/10 text-brand-dark dark:text-brand grid place-items-center shrink-0">
                      <Plane size={15} className="rtl:rotate-180" />
                    </div>
                    <div className="h-[2px] flex-1 bg-line rounded-full" />
                  </div>
                  <span className="text-[10px] text-sub font-bold mt-1">
                    {cabinClass}
                  </span>
                </div>

                {/* Destination */}
                <div className="text-end">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-ink block">
                    {destination}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-sub block mt-0.5">
                    {destinationCity}
                  </span>
                  <span className="text-sm sm:text-base font-black text-brand-dark dark:text-brand font-mono block mt-1">
                    {arrivalTime}
                  </span>
                </div>
              </div>

              {/* Boarding Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-soft/60 border border-line/60 mb-6">
                <div>
                  <span className="text-[10px] font-bold text-sub block uppercase">
                    {lt(locale, { fa: 'تاریخ پرواز', en: 'Date', ar: 'التاريخ', zh: '日期', ru: 'Дата' })}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-ink">
                    {travelDate || '2026-09-20'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-sub block uppercase">
                    {lt(locale, { fa: 'ترمینال', en: 'Terminal', ar: 'المبنى', zh: '航站楼', ru: 'Терминал' })}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-ink">
                    {terminal}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-sub block uppercase">
                    {lt(locale, { fa: 'گیت خروجی', en: 'Gate', ar: 'البوابة', zh: '登机口', ru: 'Выход' })}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-brand-dark dark:text-brand">
                    {gate}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-sub block uppercase">
                    {lt(locale, { fa: 'شماره صندلی', en: 'Seat', ar: 'المقعد', zh: '座位', ru: 'Место' })}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-ink">
                    {seat}
                  </span>
                </div>
              </div>

              {/* Baggage and Amenities */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <BaggagePill checkedBaggage={baggage} cabinBaggage="7kg" locale={locale} />
                <span className="text-xs font-mono text-sub">
                  Aircraft: <strong className="text-ink font-sans">Airbus A340 / Boeing 737</strong>
                </span>
              </div>
            </div>
          ) : (
            /* Hotel Details Flow */
            <div>
              <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-line/60">
                <div>
                  <span className="text-[11px] font-bold text-sub block">
                    {lt(locale, { fa: 'اقامتگاه تایید شده', en: 'Confirmed Stay', ar: 'الإقامة المؤكدة', zh: '已确认入住', ru: 'Подтвержденное проживание' })}
                  </span>
                  <h4 className="text-2xl font-black text-ink mt-0.5">{hotelName}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-sub font-bold mt-1">
                    <MapPin size={14} className="text-brand" />
                    <span>{city} — موقعیت مرکزی</span>
                  </div>
                </div>

                <div className="text-end">
                  <span className="text-2xl font-black font-mono text-brand-dark dark:text-brand block">
                    {nights}
                  </span>
                  <span className="text-xs font-bold text-sub">
                    {lt(locale, { fa: 'شب اقامت', en: 'Nights', ar: 'ليالٍ', zh: '晚', ru: 'ночей' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-soft/60 border border-line/60 mb-6">
                <div>
                  <span className="text-[10px] font-bold text-sub block uppercase">
                    {lt(locale, { fa: 'تاریخ ورود (چک‌این)', en: 'Check-In', ar: 'تسجيل الوصول', zh: '入住', ru: 'Заезд' })}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-ink">
                    {travelDate || '2026-09-20'} ({checkIn})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-sub block uppercase">
                    {lt(locale, { fa: 'ساعت تحویل (چک‌اوت)', en: 'Check-Out', ar: 'تسجيل المغادرة', zh: '退房', ru: 'Выезд' })}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-ink">
                    {checkOut}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-sub block uppercase">
                    {lt(locale, { fa: 'نوع اتاق', en: 'Room Type', ar: 'نوع الغرفة', zh: '房型', ru: 'Тип номера' })}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-ink">
                    {roomType}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>
                  {lt(locale, {
                    fa: 'شامل بوفه صبحانه رایگان و اینترنت نامحدود پرسرعت در سراسر هتل',
                    en: 'Includes complimentary buffet breakfast and high-speed Wi-Fi',
                    ar: 'يشمل بوفيه إفطار مجاني وواي فاي مجاني',
                    zh: '包含免费自助早餐及全馆高速网络',
                    ru: 'Включает бесплатный завтрак «шведский стол» и Wi-Fi',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Passenger Footer Info */}
          <div className="pt-6 mt-6 border-t border-line/60 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-soft border border-line grid place-items-center text-sub">
                <User size={15} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-sub block uppercase">
                  {lt(locale, { fa: 'مسافر اصلی', en: 'Lead Passenger', ar: 'المسافر الرئيسي', zh: '主旅客', ru: 'Основной пассажир' })}
                </span>
                <span className="text-xs sm:text-sm font-black text-ink">
                  {passengerName}
                </span>
              </div>
            </div>

            {externalPnr && (
              <div className="text-end">
                <span className="text-[10px] font-bold text-sub block uppercase">
                  {lt(locale, { fa: 'کد رفرنس PNR', en: 'PNR Reference', ar: 'رمز PNR', zh: 'PNR 代码', ru: 'Код PNR' })}
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-brand-dark dark:text-brand bg-mint/50 px-2 py-0.5 rounded-md border border-brand/20">
                  {externalPnr}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Stub Section (4 Cols - Barcode / Verification) */}
        <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col items-center justify-center bg-soft/30">
          <VoucherBarcode
            reference={reference}
            pnr={externalPnr || undefined}
            serviceType={serviceType}
            locale={locale}
            className="w-full border-0 bg-transparent shadow-none p-0"
          />
        </div>
      </div>
    </div>
  );
}
