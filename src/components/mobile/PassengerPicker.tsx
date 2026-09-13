'use client';

import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { Users, Plus, Minus, Check } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export interface PassengerCount {
  adults: number;
  childrenCount: number;
  infants: number;
  roomCount?: number;
}

interface PassengerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: PassengerCount;
  onChange: (value: PassengerCount) => void;
  showRooms?: boolean;
  maxTotal?: number;
}

export function PassengerPicker({
  open,
  onOpenChange,
  value,
  onChange,
  showRooms = false,
  maxTotal = 9,
}: PassengerPickerProps) {
  const locale = useLocale();
  const [localVal, setLocalVal] = React.useState<PassengerCount>(value);

  React.useEffect(() => {
    setLocalVal(value);
  }, [value, open]);

  const totalPassengers = localVal.adults + localVal.childrenCount + localVal.infants;

  const update = (key: keyof PassengerCount, delta: number) => {
    setLocalVal((prev) => {
      const next = { ...prev };
      if (key === 'adults') {
        const nextAdults = Math.max(1, Math.min(maxTotal, prev.adults + delta));
        next.adults = nextAdults;
        // Infants cannot exceed adults
        if (next.infants > nextAdults) {
          next.infants = nextAdults;
        }
      } else if (key === 'childrenCount') {
        const nextChild = Math.max(0, prev.childrenCount + delta);
        if (prev.adults + nextChild + prev.infants <= maxTotal) {
          next.childrenCount = nextChild;
        }
      } else if (key === 'infants') {
        const nextInfant = Math.max(0, Math.min(prev.adults, prev.infants + delta));
        if (prev.adults + prev.childrenCount + nextInfant <= maxTotal) {
          next.infants = nextInfant;
        }
      } else if (key === 'roomCount' && prev.roomCount !== undefined) {
        next.roomCount = Math.max(1, Math.min(8, prev.roomCount + delta));
      }
      return next;
    });
  };

  const handleApply = () => {
    onChange(localVal);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom">
      <SheetContent className="max-w-md mx-auto pb-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-line">
          <Users size={18} className="text-brand-dark" aria-hidden="true" />
          <h3 className="text-base font-black text-ink">
            {showRooms
              ? lt(locale, {
                  fa: 'انتخاب تعداد مسافران و اتاق',
                  en: 'Select Guests & Rooms',
                  ar: 'اختيار الضيوف والغرف',
                  zh: '选择人数与房间',
                  ru: 'Гости и номера',
                })
              : lt(locale, {
                  fa: 'انتخاب تعداد مسافران',
                  en: 'Select Passengers',
                  ar: 'تحديد عدد المسافرين',
                  zh: '选择乘客人数',
                  ru: 'Выбор пассажиров',
                })}
          </h3>
        </div>

        <div className="space-y-4 divide-y divide-line/60">
          {/* Rooms (if applicable) */}
          {showRooms && (
            <div className="pt-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-ink">
                  {lt(locale, { fa: 'تعداد اتاق', en: 'Rooms', ar: 'الغرف', zh: '房间数', ru: 'Номера' })}
                </p>
                <p className="text-[11px] font-bold text-sub">
                  {lt(locale, {
                    fa: 'حداکثر ۸ اتاق در هر رزرو',
                    en: 'Max 8 rooms per booking',
                    ar: 'الحد الأقصى 8 غرف',
                    zh: '每次最多8间房',
                    ru: 'До 8 номеров',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => update('roomCount', -1)}
                  disabled={(localVal.roomCount ?? 1) <= 1}
                  className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                  aria-label="کاهش اتاق"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-black text-base text-ink">
                  {localVal.roomCount ?? 1}
                </span>
                <button
                  type="button"
                  onClick={() => update('roomCount', 1)}
                  disabled={(localVal.roomCount ?? 1) >= 8}
                  className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                  aria-label="افزایش اتاق"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Adults */}
          <div className="pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-ink">
                {lt(locale, { fa: 'بزرگسال', en: 'Adults', ar: 'بالغ', zh: '成人', ru: 'Взрослые' })}
              </p>
              <p className="text-[11px] font-bold text-sub">
                {lt(locale, {
                  fa: '۱۲ سال به بالا',
                  en: 'Age 12+',
                  ar: '12 سنة فما فوق',
                  zh: '12岁及以上',
                  ru: 'От 12 лет',
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update('adults', -1)}
                disabled={localVal.adults <= 1}
                className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                aria-label="کاهش بزرگسال"
              >
                <Minus size={16} />
              </button>
              <span className="w-6 text-center font-black text-base text-ink">
                {localVal.adults}
              </span>
              <button
                type="button"
                onClick={() => update('adults', 1)}
                disabled={totalPassengers >= maxTotal}
                className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                aria-label="افزایش بزرگسال"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Children */}
          <div className="pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-ink">
                {lt(locale, { fa: 'کودک', en: 'Children', ar: 'طفل', zh: '儿童', ru: 'Дети' })}
              </p>
              <p className="text-[11px] font-bold text-sub">
                {lt(locale, {
                  fa: '۲ تا ۱۲ سال (دارای صندلی)',
                  en: 'Age 2-12 (with seat)',
                  ar: 'من 2 إلى 12 سنة (مع مقعد)',
                  zh: '2-12岁（含座位）',
                  ru: 'От 2 до 12 лет (с местом)',
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update('childrenCount', -1)}
                disabled={localVal.childrenCount <= 0}
                className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                aria-label="کاهش کودک"
              >
                <Minus size={16} />
              </button>
              <span className="w-6 text-center font-black text-base text-ink">
                {localVal.childrenCount}
              </span>
              <button
                type="button"
                onClick={() => update('childrenCount', 1)}
                disabled={totalPassengers >= maxTotal}
                className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                aria-label="افزایش کودک"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Infants */}
          <div className="pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-ink">
                {lt(locale, { fa: 'نوزاد', en: 'Infants', ar: 'رضيع', zh: '婴儿', ru: 'Младенцы' })}
              </p>
              <p className="text-[11px] font-bold text-sub">
                {lt(locale, {
                  fa: 'زیر ۲ سال (بدون صندلی)',
                  en: 'Under 2 (on lap)',
                  ar: 'أقل من سنتين (بدون مقعد)',
                  zh: '2岁以下（无座位）',
                  ru: 'До 2 лет (без места)',
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update('infants', -1)}
                disabled={localVal.infants <= 0}
                className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                aria-label="کاهش نوزاد"
              >
                <Minus size={16} />
              </button>
              <span className="w-6 text-center font-black text-base text-ink">
                {localVal.infants}
              </span>
              <button
                type="button"
                onClick={() => update('infants', 1)}
                disabled={localVal.infants >= localVal.adults || totalPassengers >= maxTotal}
                className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-line bg-soft text-ink grid place-items-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                aria-label="افزایش نوزاد"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-line">
          <button
            type="button"
            onClick={handleApply}
            className="w-full min-h-[48px] rounded-2xl bg-brand hover:bg-brand-dark text-white font-black text-sm active:scale-95 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Check size={18} />
            <span>
              {lt(locale, {
                fa: `تایید (${totalPassengers} مسافر)`,
                en: `Confirm (${totalPassengers} passengers)`,
                ar: `تأكيد (${totalPassengers} مسافر)`,
                zh: `确认 (${totalPassengers} 人)`,
                ru: `Применить (${totalPassengers})`,
              })}
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
