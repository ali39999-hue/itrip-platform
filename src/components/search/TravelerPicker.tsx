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
    <div ref={popoverRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={guestSummary}
        className="w-full h-full min-h-[58px] flex items-center gap-3 px-3 rounded-xl bg-surface border border-line/80 hover:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none transition text-start"
      >
        <Users size={18} className="text-brand-dark shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <span className="block mb-0.5 text-[11px] font-bold text-sub">{t('guestsAndRooms')}</span>
          <span className="block text-[13px] font-bold text-ink truncate">{guestSummary}</span>
        </div>
        <ChevronDown size={14} className={`text-sub transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('guestsAndRooms')}
          className="absolute top-[calc(100%+12px)] end-0 z-[100] w-72 p-4 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in slide-in-from-top-2 duration-200"
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
                  className="w-8 h-8 grid place-items-center border border-brand/40 rounded-full text-brand-dark hover:bg-mint disabled:opacity-30 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Minus size={14} />
                </button>
                <b className="min-w-5 text-center text-[14px] font-bold">{num(adults, locale)}</b>
                <button
                  type="button"
                  aria-label={t('adult') + ' +'}
                  onClick={() => setAdults(Math.min(9, adults + 1))}
                  className="w-8 h-8 grid place-items-center border border-brand/40 rounded-full text-brand-dark hover:bg-mint transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Plus size={14} />
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
                  className="w-8 h-8 grid place-items-center border border-brand/40 rounded-full text-brand-dark hover:bg-mint disabled:opacity-30 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Minus size={14} />
                </button>
                <b className="min-w-5 text-center text-[14px] font-bold">{num(childrenCount, locale)}</b>
                <button
                  type="button"
                  aria-label={t('child') + ' +'}
                  onClick={() => setChildrenCount(Math.min(6, childrenCount + 1))}
                  className="w-8 h-8 grid place-items-center border border-brand/40 rounded-full text-brand-dark hover:bg-mint transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Plus size={14} />
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
                  className="w-8 h-8 grid place-items-center border border-brand/40 rounded-full text-brand-dark hover:bg-mint disabled:opacity-30 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Minus size={14} />
                </button>
                <b className="min-w-5 text-center text-[14px] font-bold">{num(rooms, locale)}</b>
                <button
                  type="button"
                  aria-label={t('room') + ' +'}
                  onClick={() => setRooms(Math.min(5, rooms + 1))}
                  className="w-8 h-8 grid place-items-center border border-brand/40 rounded-full text-brand-dark hover:bg-mint transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
