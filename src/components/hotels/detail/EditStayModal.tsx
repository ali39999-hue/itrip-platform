'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { X, Calendar, Minus, Plus, Check } from 'lucide-react';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import { lt } from '@/lib/lt';
import { fa } from '@/lib/hotel-format';
import type { useHotelBooking } from '@/hooks/useHotelBooking';

interface EditStayModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: ReturnType<typeof useHotelBooking>;
}

export function EditStayModal({ isOpen, onClose, booking }: EditStayModalProps) {
  const locale = useLocale();
  const isFa = locale === 'fa';

  const [tempCheckin, setTempCheckin] = useState(booking.checkin);
  const [tempCheckout, setTempCheckout] = useState(booking.checkout);
  const [tempAdults, setTempAdults] = useState(booking.adults);
  const [tempChildren, setTempChildren] = useState(booking.children);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempCheckin(booking.checkin);
      setTempCheckout(booking.checkout);
      setTempAdults(booking.adults);
      setTempChildren(booking.children);
    }
  }, [isOpen, booking.checkin, booking.checkout, booking.adults, booking.children]);

  // Handle escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate temp nights
  const d1 = new Date(tempCheckin + 'T00:00:00');
  const d2 = new Date(tempCheckout + 'T00:00:00');
  const tempNights = !isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 > d1
    ? Math.round((d2.getTime() - d1.getTime()) / 864e5)
    : 1;

  function handleSave() {
    booking.setCheckin(tempCheckin);
    booking.setCheckout(tempCheckout);
    booking.setAdults(tempAdults);
    booking.setChildren(tempChildren);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-surface border border-line shadow-elev-3 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-soft/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand-dark grid place-items-center">
              <Calendar size={16} />
            </div>
            <h3 className="m-0 text-base font-black text-ink">
              {lt(locale, {
                fa: 'ویرایش تاریخ اقامت و مسافران',
                en: 'Edit Stay Dates & Guests',
                ar: 'تعديل تواريخ الإقامة والمسافرين',
                zh: '修改入住日期与住客人数',
                ru: 'Изменить даты и гостей',
              })}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-soft hover:bg-line grid place-items-center text-sub hover:text-ink transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Dates section */}
          <div>
            <span className="block text-xs font-black text-ink mb-2">
              {lt(locale, {
                fa: 'تاریخ ورود و خروج',
                en: 'Check-in & Check-out Dates',
                ar: 'تواريخ تسجيل الوصول والمغادرة',
                zh: '入住与离店日期',
                ru: 'Даты заезда и выезда',
              })}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <JalaliDatePicker
                  value={tempCheckin}
                  onChange={(d) => d && setTempCheckin(d)}
                  label={lt(locale, { fa: 'تاریخ ورود', en: 'Check-in', ar: 'تاريخ الوصول', zh: '入住日期', ru: 'Дата заезда' })}
                  id="modal-date-checkin"
                  format={isFa ? 'D MMMM (dddd)' : 'D MMM (ddd)'}
                />
              </div>
              <div>
                <JalaliDatePicker
                  value={tempCheckout}
                  onChange={(d) => d && setTempCheckout(d)}
                  label={lt(locale, { fa: 'تاریخ خروج', en: 'Check-out', ar: 'تاريخ المغادرة', zh: '离店日期', ru: 'Дата выезда' })}
                  id="modal-date-checkout"
                  format={isFa ? 'D MMMM (dddd)' : 'D MMM (ddd)'}
                />
              </div>
            </div>

            {/* Duration pill */}
            <div className="mt-2.5 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint/70 border border-brand/20 text-brand-dark text-xs font-black">
                {lt(locale, {
                  fa: `مدت اقامت: ${fa(tempNights)} شب`,
                  en: `Duration: ${tempNights} nights`,
                  ar: `مدة الإقامة: ${tempNights} ليالٍ`,
                  zh: `入住时长：${tempNights} 晚`,
                  ru: `Длительность: ${tempNights} ноч.`,
                })}
              </span>
            </div>
          </div>

          {/* Guests section */}
          <div className="pt-3 border-t border-line">
            <span className="block text-xs font-black text-ink mb-3">
              {lt(locale, {
                fa: 'تعداد مسافران',
                en: 'Number of Guests',
                ar: 'عدد المسافرين',
                zh: '住客人数',
                ru: 'Количество гостей',
              })}
            </span>

            <div className="space-y-3">
              {/* Adults */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-soft/50 border border-line">
                <div>
                  <b className="block text-sm font-black text-ink">
                    {lt(locale, { fa: 'بزرگسال', en: 'Adults', ar: 'البالغين', zh: '成人', ru: 'Вزрослые' })}
                  </b>
                  <span className="block text-[11px] font-bold text-sub">
                    {lt(locale, { fa: '۱۲ سال به بالا', en: '12+ years', ar: '١٢ سنة فما فوق', zh: '12岁及以上', ru: 'От 12 лет' })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="کاهش بزرگسال"
                    onClick={() => setTempAdults(Math.max(1, tempAdults - 1))}
                    disabled={tempAdults <= 1}
                    className="w-9 h-9 rounded-xl bg-surface border border-line grid place-items-center text-ink disabled:opacity-40 hover:border-brand transition cursor-pointer"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-6 text-center text-sm font-black font-mono">{tempAdults}</span>
                  <button
                    type="button"
                    aria-label="افزایش بزرگسال"
                    onClick={() => setTempAdults(Math.min(9, tempAdults + 1))}
                    disabled={tempAdults >= 9}
                    className="w-9 h-9 rounded-xl bg-surface border border-line grid place-items-center text-ink disabled:opacity-40 hover:border-brand transition cursor-pointer"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-soft/50 border border-line">
                <div>
                  <b className="block text-sm font-black text-ink">
                    {lt(locale, { fa: 'کودک', en: 'Children', ar: 'الأطفال', zh: '儿童', ru: 'Дети' })}
                  </b>
                  <span className="block text-[11px] font-bold text-sub">
                    {lt(locale, { fa: 'تا ۱۲ سال', en: 'Up to 12 years', ar: 'حتى ١٢ سنة', zh: '12岁以下', ru: 'До 12 лет' })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="کاهش کودک"
                    onClick={() => setTempChildren(Math.max(0, tempChildren - 1))}
                    disabled={tempChildren <= 0}
                    className="w-9 h-9 rounded-xl bg-surface border border-line grid place-items-center text-ink disabled:opacity-40 hover:border-brand transition cursor-pointer"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-6 text-center text-sm font-black font-mono">{tempChildren}</span>
                  <button
                    type="button"
                    aria-label="افزایش کودک"
                    onClick={() => setTempChildren(Math.min(6, tempChildren + 1))}
                    disabled={tempChildren >= 6}
                    className="w-9 h-9 rounded-xl bg-surface border border-line grid place-items-center text-ink disabled:opacity-40 hover:border-brand transition cursor-pointer"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-line bg-soft/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-line bg-surface text-sub hover:text-ink text-xs font-bold transition cursor-pointer"
          >
            {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Check size={15} />
            <span>
              {lt(locale, {
                fa: 'تأیید و به‌روزرسانی قیمت‌ها',
                en: 'Update & Recalculate Rates',
                ar: 'تأكيد وتحديث الأسعار',
                zh: '确认并更新价格',
                ru: 'Применить и пересчитать',
              })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
