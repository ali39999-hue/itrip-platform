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
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

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
  {
    id: 'p1',
    text: {
      fa: 'اصل گذرنامه (با حداقل ۶ ماه اعتبار)',
      en: 'Original passport (with at least 6 months validity)',
      ar: 'جواز السفر الأصلي (صالح لمدة 6 أشهر على الأقل)',
      zh: '护照原件（有效期至少 6 个月）',
      ru: 'Оригинал загранпаспорта (со сроком действия не менее 6 месяцев)',
    },
  },
  {
    id: 'p2',
    text: {
      fa: 'بیمه‌نامه مسافرتی و پرینت واچر هتل',
      en: 'Travel insurance & printed hotel voucher',
      ar: 'تأمين السفر ونسخة مطبوعة من قسيمة الفندق',
      zh: '旅游保险及酒店凭证打印件',
      ru: 'Туристическая страховка и распечатанный ваучер отеля',
    },
  },
  {
    id: 'p3',
    text: {
      fa: 'مبدل برق دوشاخه بین‌المللی (Universal Adapter)',
      en: 'Universal power adapter',
      ar: 'محول كهرباء دولي شامل (Universal Adapter)',
      zh: '万能电源转换插头 (Universal Adapter)',
      ru: 'Универсальный переходник для розеток (Universal Adapter)',
    },
  },
  {
    id: 'p4',
    text: {
      fa: 'داروهای ضروری همراه با نسخه پزشک',
      en: 'Essential personal medications with doctor prescription',
      ar: 'الأدوية الأساسية مع وصفة الطبيب',
      zh: '常备应急药品及医生处方',
      ru: 'Необходимые лекарства с рецептом врача',
    },
  },
  {
    id: 'p5',
    text: {
      fa: 'پاوربانک با ظرفیت مجاز پرواز (زیر ۲۰,۰۰۰ میلی‌آمپر)',
      en: 'Flight-approved power bank (under 20,000 mAh)',
      ar: 'بنك طاقة متوافق مع لوائح الطيران (أقل من 20,000 مللي أمبير)',
      zh: '符合飞行规定的移动电源（20,000毫安以下）',
      ru: 'Повербанк с разрешенной для перелетов емкостью (до 20 000 мАч)',
    },
  },
  {
    id: 'p6',
    text: {
      fa: 'کفش پیاده‌روی راحت و کرم ضدآفتاب',
      en: 'Comfortable walking shoes & sunscreen',
      ar: 'حذاء مشي مريح وواقي شمس',
      zh: '舒适的步行鞋和防晒霜',
      ru: 'Удобная обувь для ходьбы и солнцезащитный крем',
    },
  },
];

export function DigitalTravelHandbook({
  destName,
  destId,
  durationDays,
  locale: propLocale,
  isOpen,
  onClose,
}: HandbookProps) {
  const contextLocale = useLocale();
  const locale = propLocale || contextLocale || 'fa';
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const phrases = PHRASES_BY_DEST[destId.toLowerCase()] || PHRASES_BY_DEST.turkey;

  return (
    <div className="fixed inset-0 z-[220] bg-deep/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-line shadow-elev-3 flex flex-col overflow-hidden">
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
                <span className="text-xs text-white/80">
                  {lt(locale, {
                    fa: `برنامه ${durationDays} روزه`,
                    en: `${durationDays}-Day Itinerary`,
                    ar: `برنامج ${durationDays} أيام`,
                    zh: `${durationDays}天行程`,
                    ru: `Программа на ${durationDays} дн.`,
                  })}
                </span>
              </div>
              <h3 className="text-xl font-black mt-0.5">
                {lt(locale, {
                  fa: `دفترچه راهنمای سفر هوشمند به ${destName}`,
                  en: `Smart Travel Handbook to ${destName}`,
                  ar: `دليل السفر الذكي إلى ${destName}`,
                  zh: `${destName}智能旅行手册`,
                  ru: `Умный путеводитель по ${destName}`,
                })}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white grid place-items-center transition"
              title={lt(locale, {
                fa: 'چاپ دفترچه راهنما',
                en: 'Print Handbook',
                ar: 'طباعة الدليل',
                zh: '打印手册',
                ru: 'Распечатать руководство',
              })}
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
              <span>
                {lt(locale, {
                  fa: 'شماره‌های ضروری و امداد در مقصد',
                  en: 'Emergency & Assistance Numbers in Destination',
                  ar: 'أرقام الطوارئ والمساعدة في الوجهة',
                  zh: '目的地紧急求助电话',
                  ru: 'Экстренные службы в месте назначения',
                })}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold">
              <div className="bg-surface p-2.5 rounded-xl border border-rose-100">
                <span className="text-sub block text-[10px]">
                  {lt(locale, {
                    fa: 'پلیس گردشگری',
                    en: 'Tourist Police',
                    ar: 'شرطة السياحة',
                    zh: '旅游警察',
                    ru: 'Туристическая полиция',
                  })}
                </span>
                <span className="font-mono text-ink text-sm font-black">155 / 999</span>
              </div>
              <div className="bg-surface p-2.5 rounded-xl border border-rose-100">
                <span className="text-sub block text-[10px]">
                  {lt(locale, {
                    fa: 'اورژانس پزشکی',
                    en: 'Medical Emergency',
                    ar: 'الإسعاف الطبي',
                    zh: '医疗急救',
                    ru: 'Скорая медицинская помощь',
                  })}
                </span>
                <span className="font-mono text-ink text-sm font-black">112 / 998</span>
              </div>
              <div className="bg-surface p-2.5 rounded-xl border border-rose-100">
                <span className="text-sub block text-[10px]">
                  {lt(locale, {
                    fa: 'پشتیبانی ۲۴ ساعته فیروزو',
                    en: 'Firuzo 24/7 Support',
                    ar: 'دعم فيروزو على مدار 24 ساعة',
                    zh: 'Firuzo 24小时客服',
                    ru: 'Поддержка Firuzo 24/7',
                  })}
                </span>
                <span className="font-mono text-brand-dark text-sm font-black">+98 21 8888 0000</span>
              </div>
            </div>
          </div>

          {/* Section 2: Essential Phrases */}
          <div>
            <div className="flex items-center gap-2 text-ink font-black text-sm mb-3">
              <Languages size={16} className="text-brand" />
              <span>
                {lt(locale, {
                  fa: 'عبارات پرکاربرد و کلیدی در مقصد',
                  en: 'Key Useful Destination Phrases',
                  ar: 'العبارات الشائعة والأساسية في الوجهة',
                  zh: '目的地常用核心短语',
                  ru: 'Полезные разговорные фразы',
                })}
              </span>
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
              <span>
                {lt(locale, {
                  fa: 'نکات ارزی و آداب انعام دادن',
                  en: 'Currency & Tipping Etiquette',
                  ar: 'إرشادات العملة وآداب البقشيش',
                  zh: '货币及小费礼仪提示',
                  ru: 'Советы по валюте и чаевым',
                })}
              </span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-bold whitespace-pre-line">
              {lt(locale, {
                fa: '• در مقصد ترجیحاً مقداری پول نقد محلی یا دلار همراه داشته باشید.\n• در رستوران‌ها و کافه‌ها انعام دادن به میزان ۵ تا ۱۰ درصد متداول و نشانه قدردانی است.\n• صرافی‌های مرکز شهر معمولاً نرخ بهتری نسبت به باجه‌های فرودگاهی ارائه می‌دهند.',
                en: '• Keep some local cash or USD on hand for daily expenses.\n• Tipping 5% to 10% in cafes and restaurants is customary and appreciated.\n• Downtown currency exchange bureaus generally offer better rates than airport kiosks.',
                ar: '• يفضل حمل بعض النقد المحلي أو الدولار للنفقات اليومية.\n• ترك إكرامية 5 إلى 10% في المطاعم والمقاهي أمر معتاد ومقدر.\n• مكاتب الصرافة في وسط المدينة تقدم عادة أسعار صرف أفضل من المطار.',
                zh: '• 建议随身携带适量当地现金或美元用于日常支出。\n• 在餐厅和咖啡厅通常给 5% 至 10% 的小费以示谢意。\n• 市中心的换汇点通常比机场窗口提供更优惠的汇率。',
                ru: '• Рекомендуется иметь при себе немного наличных в местной валюте или USD.\n• Чаевые 5-10% в ресторанах и кафе общеприняты и приветствуются.\n• Пункты обмена в центре города обычно предлагают более выгодный курс, чем в аэропорту.',
              })}
            </p>
          </div>

          {/* Section 4: Smart Packing Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-ink font-black text-sm">
                <CheckSquare size={16} className="text-brand" />
                <span>
                  {lt(locale, {
                    fa: 'چک‌لیست هوشمند وسایل ضروری سفر',
                    en: 'Smart Packing Checklist',
                    ar: 'قائمة المستلزمات الذكية للسفر',
                    zh: '智能行李打包清单',
                    ru: 'Умный чек-лист сборов в дорогу',
                  })}
                </span>
              </div>
              <span className="text-[11px] font-bold text-sub">
                {lt(locale, {
                  fa: `${Object.values(checkedItems).filter(Boolean).length} از ${DEFAULT_PACKING_ITEMS.length} آماده`,
                  en: `${Object.values(checkedItems).filter(Boolean).length} of ${DEFAULT_PACKING_ITEMS.length} ready`,
                  ar: `${Object.values(checkedItems).filter(Boolean).length} من ${DEFAULT_PACKING_ITEMS.length} جاهز`,
                  zh: `${Object.values(checkedItems).filter(Boolean).length}/${DEFAULT_PACKING_ITEMS.length} 已准备`,
                  ru: `${Object.values(checkedItems).filter(Boolean).length} из ${DEFAULT_PACKING_ITEMS.length} готово`,
                })}
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
                    <span>{lt(locale, item.text)}</span>
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
            {lt(locale, {
              fa: 'بستن و ادامه برنامه‌ریزی',
              en: 'Close & Continue Planning',
              ar: 'إغلاق ومتابعة التخطيط',
              zh: '关闭并继续规划',
              ru: 'Закрыть и продолжить',
            })}
          </button>
        </div>
      </div>
    </div>
  );
}
