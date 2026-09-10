'use client';

import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { SlidersHorizontal, RotateCcw, Check } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  resultCount?: number;
  onReset?: () => void;
  onApply: () => void;
  children: React.ReactNode;
}

export function FilterSheet({
  open,
  onOpenChange,
  title,
  resultCount,
  onReset,
  onApply,
  children,
}: FilterSheetProps) {
  const locale = useLocale();

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom">
      <SheetContent className="max-w-lg mx-auto flex flex-col max-h-[85vh] p-0">
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between bg-soft/40">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-brand-dark" />
            <h3 className="text-base font-black text-ink">
              {title ||
                lt(locale, {
                  fa: 'فیلترهای نتایج',
                  en: 'Filter Results',
                  ar: 'تصفية النتائج',
                  zh: '筛选结果',
                  ru: 'Фильтры',
                })}
            </h3>
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-bold text-sub hover:text-rose-600 flex items-center gap-1 active:scale-95 transition"
            >
              <RotateCcw size={13} />
              <span>
                {lt(locale, {
                  fa: 'پاک کردن همه',
                  en: 'Reset all',
                  ar: 'إعادة ضبط',
                  zh: '重置全部',
                  ru: 'Сбросить все',
                })}
              </span>
            </button>
          )}
        </div>

        {/* Scrollable Filter Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">{children}</div>

        {/* Sticky Apply Footer */}
        <div className="p-4 border-t border-line bg-surface shadow-xs">
          <button
            type="button"
            onClick={() => {
              onApply();
              onOpenChange(false);
            }}
            className="w-full min-h-[48px] rounded-2xl bg-brand hover:bg-brand-dark text-white font-black text-sm active:scale-95 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Check size={18} />
            <span>
              {resultCount !== undefined
                ? lt(locale, {
                    fa: `مشاهده (${resultCount}) نتیجه`,
                    en: `Show (${resultCount}) Results`,
                    ar: `عرض (${resultCount}) نتائج`,
                    zh: `查看 (${resultCount}) 条结果`,
                    ru: `Показать (${resultCount})`,
                  })
                : lt(locale, {
                    fa: 'اعمال فیلترها',
                    en: 'Apply Filters',
                    ar: 'تطبيق التصفية',
                    zh: '应用筛选',
                    ru: 'Применить',
                  })}
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
