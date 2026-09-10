'use client';

import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { ArrowDownUp, Check } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export interface SortOption<T extends string = string> {
  id: T;
  label: string;
  description?: string;
}

interface SortSheetProps<T extends string = string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: readonly SortOption<T>[] | SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
  title?: string;
}

export function SortSheet<T extends string = string>({
  open,
  onOpenChange,
  options,
  value,
  onChange,
  title,
}: SortSheetProps<T>) {
  const locale = useLocale();

  const handleSelect = (id: T) => {
    onChange(id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom">
      <SheetContent className="max-w-md mx-auto pb-6 pt-4 px-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line">
          <ArrowDownUp size={18} className="text-brand-dark" />
          <h3 className="text-base font-black text-ink">
            {title ||
              lt(locale, {
                fa: 'مرتب‌سازی نتایج بر اساس',
                en: 'Sort Results By',
                ar: 'ترتيب النتائج حسب',
                zh: '排序方式',
                ru: 'Сортировка',
              })}
          </h3>
        </div>

        <div className="space-y-1 divide-y divide-line/40">
          {options.map((opt) => {
            const isSelected = value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className={`w-full min-h-[52px] px-3 py-2 rounded-xl flex items-center justify-between text-start transition-all active:scale-[0.99] ${
                  isSelected ? 'bg-mint/60 text-brand-dark font-black' : 'text-ink hover:bg-soft'
                }`}
              >
                <div>
                  <span className="text-sm font-black block">{opt.label}</span>
                  {opt.description && (
                    <span className="text-[11px] font-bold text-sub block">
                      {opt.description}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <span className="w-6 h-6 rounded-full bg-brand text-white grid place-items-center shadow-xs">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
