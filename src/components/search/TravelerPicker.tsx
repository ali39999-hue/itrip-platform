'use client';

import { useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Users, Minus, Plus, ChevronDown } from 'lucide-react';
import { num } from '@/lib/format';

interface TravelerPickerProps {
  adults: number;
  setAdults: (val: number) => void;
  childrenCount: number;
  setChildrenCount: (val: number) => void;
  rooms: number;
  setRooms: (val: number) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
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

  const guestSummary = t('guestSummary', { rooms, adults, children: childrenCount });

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
            {t('guestsAndRooms')}
          </span>
          <span className="block text-[12.5px] font-bold text-ink truncate leading-tight">
            {guestSummary}
          </span>
        </div>
        <ChevronDown size={14} className={`text-sub shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('guestsAndRooms')}
          className="absolute top-[calc(100%+8px)] end-0 z-[100] w-72 p-4 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in slide-in-from-top-2 duration-200"
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

            {/* Rooms */}
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
          </div>
        </div>
      )}
    </div>
  );
}
