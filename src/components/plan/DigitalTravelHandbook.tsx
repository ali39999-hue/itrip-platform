'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  PhoneCall,
  Languages,
  Coins,
  CheckSquare,
  Square,
  Printer,
  X,
} from 'lucide-react';

interface HandbookProps {
  destName: string;
  destId: string;
  durationDays: number;
  locale?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface LocalPhrase {
  farsi: string;
  english: string;
  local: string;
  pronunciation: string;
}

const PHRASES_BY_DEST: Record<string, LocalPhrase[]> = {
  turkey: [
    { farsi: 'سلام', english: 'Hello', local: 'Merhaba', pronunciation: 'مَرحَبا' },
    { farsi: 'لطفاً', english: 'Please', local: 'Lütfen', pronunciation: 'لوتفَن' },
    { farsi: 'ممنون', english: 'Thank you', local: 'Teşekkürler', pronunciation: 'تشکّورلر' },
    { farsi: 'قیمت این چقدر است؟', english: 'How much is this?', local: 'Bu ne kadar?', pronunciation: 'بو نه کادار؟' },
    { farsi: 'ایستگاه مترو کجاست؟', english: 'Where is the metro?', local: 'Metro nerede?', pronunciation: 'مترو نِرِده؟' },
  ],
  uae: [
    { farsi: 'سلام', english: 'Hello', local: 'مرحباً', pronunciation: 'مرحباً' },
    { farsi: 'لطفاً', english: 'Please', local: 'من فضلك', pronunciation: 'مِن فضلِک' },
    { farsi: 'ممنون', english: 'Thank you', local: 'شكراً', pronunciation: 'شُکراً' },
    { farsi: 'صورتحساب لطفاً', english: 'Bill please', local: 'الحساب من فضلك', pronunciation: 'الحِساب مِن فضلک' },
  ],
  iran: [
    { farsi: 'درود / سلام', english: 'Hello', local: 'سلام', pronunciation: 'Salam' },
    { farsi: 'خسته نباشید', english: 'More power to you', local: 'خسته نباشید', pronunciation: 'Khasteh Nabashid' },
    { farsi: 'خیلی ممنون', english: 'Thank you very much', local: 'خیلی ممنون', pronunciation: 'Kheili Mamnoon' },
  ],
};

const DEFAULT_PACKING_ITEMS = [
  { id: 'p1', text: 'اصل گذرنامه (با حداقل ۶ ماه اعتبار)' },
  { id: 'p2', text: 'بیمه‌نامه مسافرتی و پرینت واچر هتل' },
  { id: 'p3', text: 'مبدل برق دوشاخه بین‌المللی (Universal Adapter)' },
  { id: 'p4', text: 'داروهای ضروری همراه با نسخه پزشک' },
  { id: 'p5', text: 'پاوربانک با ظرفیت مجاز پرواز (زیر ۲۰,۰۰۰ میلی‌آمپر)' },
  { id: 'p6', text: 'کفش پیاده‌روی راحت و کرم ضدآفتاب' },
];

export function DigitalTravelHandbook({
  destName,
  destId,
  durationDays,
  isOpen,
  onClose,
}: HandbookProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const phrases = PHRASES_BY_DEST[destId.toLowerCase()] || PHRASES_BY_DEST.turkey;

  return (
    <div className="fixed inset-0 z-[220] bg-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] bg-surface rounded-3xl border border-line shadow-elev-3 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-dark to-brand p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md grid place-items-center shrink-0 border border-white/20">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  Digital Travel Handbook
                </span>
                <span className="text-xs text-white/80">برنامه {durationDays} روزه</span>
              </div>
              <h3 className="text-xl font-black mt-0.5">
                دفترچه راهنمای سفر هوشمند به {destName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white grid place-items-center transition"
              title="چاپ دفترچه راهنما"
            >
              <Printer size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white grid place-items-center transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Emergency Hotlines */}
          <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-900">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-black text-sm mb-2">
              <PhoneCall size={16} />
              <span>شماره‌های ضروری و امداد در مقصد</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold">
              <div className="bg-surface p-2.5 rounded-xl border border-rose-100">
                <span className="text-sub block text-[10px]">پلیس گردشگری</span>
                <span className="font-mono text-ink text-sm font-black">155 / 999</span>
              </div>
              <div className="bg-surface p-2.5 rounded-xl border border-rose-100">
                <span className="text-sub block text-[10px]">اورژانس پزشکی</span>
                <span className="font-mono text-ink text-sm font-black">112 / 998</span>
              </div>
              <div className="bg-surface p-2.5 rounded-xl border border-rose-100">
                <span className="text-sub block text-[10px]">پشتیبانی ۲۴ ساعته فیروزو</span>
                <span className="font-mono text-brand-dark text-sm font-black">+98 21 8888 0000</span>
              </div>
            </div>
          </div>

          {/* Section 2: Essential Phrases */}
          <div>
            <div className="flex items-center gap-2 text-ink font-black text-sm mb-3">
              <Languages size={16} className="text-brand" />
              <span>عبارات پرکاربرد و کلیدی در مقصد</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {phrases.map((phrase, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-soft border border-line flex items-center justify-between"
                >
                  <div>
                    <span className="text-ink font-black block">{phrase.local}</span>
                    <span className="text-sub text-[10px]">{phrase.farsi} ({phrase.english})</span>
                  </div>
                  <span className="font-mono text-brand-dark text-[11px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-line">
                    {phrase.pronunciation}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Currency & Tipping Etiquette */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-sm mb-1.5">
              <Coins size={16} />
              <span>نکات ارزی و آداب انعام دادن</span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-bold">
              • در مقصد ترجیحاً مقداری پول نقد محلی یا دلار همراه داشته باشید.<br />
              • در رستوران‌ها و کافه‌ها انعام دادن به میزان ۵ تا ۱۰ درصد متداول و نشانه قدردانی از پرسنل است.<br />
              • صرافی‌های فرودگاهی معمولاً کارمزد بالاتری دارند؛ تبدیل ارز در صرافی‌های مرکز شهر توصیه می‌شود.
            </p>
          </div>

          {/* Section 4: Smart Packing Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-ink font-black text-sm">
                <CheckSquare size={16} className="text-brand" />
                <span>چک‌لیست هوشمند وسایل ضروری سفر</span>
              </div>
              <span className="text-[11px] font-bold text-sub">
                {Object.values(checkedItems).filter(Boolean).length} از {DEFAULT_PACKING_ITEMS.length} آماده
              </span>
            </div>

            <div className="space-y-2">
              {DEFAULT_PACKING_ITEMS.map((item) => {
                const isDone = Boolean(checkedItems[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={`w-full text-start p-3 rounded-xl border transition flex items-center gap-3 text-xs font-bold ${
                      isDone
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 line-through opacity-75'
                        : 'bg-surface border-line hover:border-brand/40 text-ink'
                    }`}
                  >
                    {isDone ? (
                      <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <Square size={16} className="text-sub shrink-0" />
                    )}
                    <span>{item.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-soft border-t border-line flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-xl bg-brand text-surface font-black text-xs hover:bg-brand-2 transition"
          >
            بستن و ادامه برنامه‌ریزی
          </button>
        </div>
      </div>
    </div>
  );
}
