'use client';

import { useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Users, Minus, Plus, ChevronDown } from 'lucide-react';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';

interface TravelerPickerProps {
  adults: number;
  setAdults: (val: number) => void;
  childrenCount: number;
  setChildrenCount: (val: number) => void;
  rooms: number;
  setRooms: (val: number) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  showRooms?: boolean;
  className?: string;
}

export function TravelerPicker({
  adults,
  setAdults,
  childrenCount,
  setChildrenCount,
  rooms,
  setRooms,
  open,
  setOpen,
  showRooms = true,
  className = '',
}: TravelerPickerProps) {
  const t = useTranslations('Search');
  const locale = useLocale();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', onDoc);
      return () => document.removeEventListener('pointerdown', onDoc);
    }
  }, [open, setOpen]);

  const guestSummary = showRooms
    ? t('guestSummary', { rooms, adults, children: childrenCount })
    : `${num(adults + childrenCount, locale)} ${lt(locale, { fa: 'مسافر', en: 'passengers', ar: 'مسافر', zh: '位乘客', ru: 'пасс.' })}`;

  const fieldLabel = showRooms
    ? t('guestsAndRooms')
    : lt(locale, { fa: 'مسافران', en: 'Passengers', ar: 'المسافرون', zh: '乘客人数', ru: 'Пассажиры' });

  return (
    <div ref={popoverRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={guestSummary}
        className="w-full min-h-[58px] px-3.5 py-2 rounded-2xl bg-surface border border-line/80 hover:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none flex items-center gap-2.5 transition text-start"
      >
        <Users size={18} className="text-brand-dark shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <span className="block text-[11px] font-bold text-sub select-none leading-none mb-1">
            {fieldLabel}
          </span>
          <span className="block text-[12.5px] font-bold text-ink truncate leading-tight">
            {guestSummary}
          </span>
        </div>
        <ChevronDown size={14} className={`text-sub shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* ================= DESKTOP POPOVER (MD+) ================= */}
          <div
            role="dialog"
            aria-label={t('guestsAndRooms')}
            className="hidden md:block absolute top-[calc(100%+8px)] end-0 z-[100] w-72 p-4 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="space-y-3">
              {/* Adults */}
              <div className="flex items-center justify-between py-1.5 border-b border-line/50">
                <div>
                  <strong className="block text-[13px] font-bold text-ink">{t('adult')}</strong>
                  <span className="block text-[11px] text-sub">{t('adultHint')}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label={t('adult') + ' -'}
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    disabled={adults <= 1}
                    className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-line/40 transition"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-5 text-center text-[13px] font-bold text-ink font-mono num">
                    {num(adults, locale)}
                  </span>
                  <button
                    type="button"
                    aria-label={t('adult') + ' +'}
                    onClick={() => setAdults(Math.min(9, adults + 1))}
                    disabled={adults >= 9}
                    className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-line/40 transition"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between py-1.5 border-b border-line/50">
                <div>
                  <strong className="block text-[13px] font-bold text-ink">{t('child')}</strong>
                  <span className="block text-[11px] text-sub">{t('childHint')}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label={t('child') + ' -'}
                    onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                    disabled={childrenCount <= 0}
                    className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-line/40 transition"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-5 text-center text-[13px] font-bold text-ink font-mono num">
                    {num(childrenCount, locale)}
                  </span>
                  <button
                    type="button"
                    aria-label={t('child') + ' +'}
                    onClick={() => setChildrenCount(Math.min(6, childrenCount + 1))}
                    disabled={childrenCount >= 6}
                    className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-line/40 transition"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Rooms (Optional - for hotels only) */}
              {showRooms && (
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <strong className="block text-[13px] font-bold text-ink">{t('room')}</strong>
                    <span className="block text-[11px] text-sub">{t('roomHint')}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      aria-label={t('room') + ' -'}
                      onClick={() => setRooms(Math.max(1, rooms - 1))}
                      disabled={rooms <= 1}
                      className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-line/40 transition"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center text-[13px] font-bold text-ink font-mono num">
                      {num(rooms, locale)}
                    </span>
                    <button
                      type="button"
                      aria-label={t('room') + ' +'}
                      onClick={() => setRooms(Math.min(5, rooms + 1))}
                      disabled={rooms >= 5}
                      className="w-8 h-8 rounded-lg bg-soft border border-line text-ink grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-line/40 transition"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= MOBILE BOTTOM SHEET (< MD) — FLYTODAY STYLE ================= */}
          <div className="md:hidden fixed inset-0 z-[160] flex items-end justify-center bg-deep/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('guestsAndRooms')}
              className="w-full bg-surface rounded-t-3xl p-5 border-t border-line shadow-elev-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200 space-y-4"
            >
              {/* Drag Handle Indicator */}
              <div className="w-10 h-1 rounded-full bg-line mx-auto mb-1" />

              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-brand-dark" />
                  <h3 className="font-black text-base text-ink">{t('guestsAndRooms')}</h3>
                </div>
                <span className="text-xs font-bold text-brand-dark bg-mint px-2.5 py-1 rounded-full">
                  {guestSummary}
                </span>
              </div>

              {/* Rows with touch-friendly larger controls */}
              <div className="space-y-4 py-2">
                {/* Adults */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-soft/60 border border-line/60">
                  <div>
                    <strong className="block text-sm font-black text-ink">{t('adult')}</strong>
                    <span className="block text-xs text-sub">{t('adultHint')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={t('adult') + ' -'}
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="w-10 h-10 rounded-xl bg-surface border border-line text-ink grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition shadow-2xs"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-6 text-center text-base font-black text-ink font-mono num">
                      {num(adults, locale)}
                    </span>
                    <button
                      type="button"
                      aria-label={t('adult') + ' +'}
                      onClick={() => setAdults(Math.min(9, adults + 1))}
                      disabled={adults >= 9}
                      className="w-10 h-10 rounded-xl bg-brand text-surface grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition shadow-xs shadow-brand/30"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-soft/60 border border-line/60">
                  <div>
                    <strong className="block text-sm font-black text-ink">{t('child')}</strong>
                    <span className="block text-xs text-sub">{t('childHint')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={t('child') + ' -'}
                      onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                      disabled={childrenCount <= 0}
                      className="w-10 h-10 rounded-xl bg-surface border border-line text-ink grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition shadow-2xs"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-6 text-center text-base font-black text-ink font-mono num">
                      {num(childrenCount, locale)}
                    </span>
                    <button
                      type="button"
                      aria-label={t('child') + ' +'}
                      onClick={() => setChildrenCount(Math.min(6, childrenCount + 1))}
                      disabled={childrenCount >= 6}
                      className="w-10 h-10 rounded-xl bg-brand text-surface grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition shadow-xs shadow-brand/30"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Rooms (Optional - for hotels only) */}
                {showRooms && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-soft/60 border border-line/60">
                    <div>
                      <strong className="block text-sm font-black text-ink">{t('room')}</strong>
                      <span className="block text-xs text-sub">{t('roomHint')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={t('room') + ' -'}
                        onClick={() => setRooms(Math.max(1, rooms - 1))}
                        disabled={rooms <= 1}
                        className="w-10 h-10 rounded-xl bg-surface border border-line text-ink grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition shadow-2xs"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-6 text-center text-base font-black text-ink font-mono num">
                        {num(rooms, locale)}
                      </span>
                      <button
                        type="button"
                        aria-label={t('room') + ' +'}
                        onClick={() => setRooms(Math.min(5, rooms + 1))}
                        disabled={rooms >= 5}
                        className="w-10 h-10 rounded-xl bg-brand-dark text-surface hover:bg-brand grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition shadow-xs"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Button for Mobile */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full h-12 rounded-2xl bg-action hover:bg-action-hover text-ink font-black text-sm shadow-md active:scale-[0.98] transition flex items-center justify-center cursor-pointer"
                >
                  {lt(locale, { fa: 'تأیید مسافران', en: 'Confirm Passengers', ar: 'تأكيد المسافرين', zh: '确认乘客', ru: 'Подтвердить' })}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
