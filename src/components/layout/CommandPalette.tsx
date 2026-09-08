'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import {
  Search,
  Plane,
  BedDouble,
  Compass,
  Wallet,
  Wifi,
  ShieldCheck,
  Sparkles,
  Headphones,
  X,
  ArrowRight,
} from 'lucide-react';
import { lt } from '@/lib/lt';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({
  open: externalOpen,
  onOpenChange: setExternalOpen,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();

  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;

  const setIsOpen = useCallback(
    (val: boolean) => {
      if (isControlled) {
        setExternalOpen?.(val);
      } else {
        setInternalOpen(val);
      }
    },
    [isControlled, setExternalOpen]
  );

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  function handleSelect(href: string) {
    setIsOpen(false);
    router.push(href);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-deep/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="fixed inset-0"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl bg-surface rounded-3xl border border-line shadow-elev-3 overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
        <Command label="Global search" className="w-full">
          {/* Search Input Bar */}
          <div className="flex items-center px-4 border-b border-line bg-surface">
            <Search size={18} className="text-sub shrink-0 me-2.5" aria-hidden="true" />
            <Command.Input
              autoFocus
              placeholder={lt(locale, {
                fa: 'جستجوی پرواز، هتل، مقصد، کیف پول، ویزا یا خدمات... (Esc برای خروج)',
                en: 'Search flights, hotels, destinations, wallet, visa or services... (Esc to exit)',
                ar: 'ابحث عن الرحلات، الفنادق، الوجهات، المحفظة... (Esc للخروج)',
                zh: '搜索航班、酒店、目的地、钱包或服务... (按 Esc 退出)',
                ru: 'Поиск рейсов, отелей, направлений, кошелька... (Esc для выхода)',
              })}
              className="w-full h-14 bg-transparent border-0 outline-none text-sm font-bold text-ink placeholder:text-sub"
            />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
              className="w-8 h-8 rounded-full bg-soft text-sub hover:text-ink grid place-items-center transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Results List */}
          <Command.List className="max-h-[380px] overflow-y-auto p-3 space-y-3">
            <Command.Empty className="py-8 text-center text-xs font-bold text-sub">
              {lt(locale, {
                fa: 'موردی یافت نشد. می‌توانید نام شهر، ایرلاین یا خدمت موردنظر را تایپ کنید.',
                en: 'No results found. Try typing a city, airline, or travel service.',
                ar: 'لم يتم العثور على نتائج.',
                zh: '未找到匹配结果。',
                ru: 'Ничего не найдено.',
              })}
            </Command.Empty>

            {/* Travel Services Group */}
            <Command.Group
              heading={
                <span className="px-2 text-[10.5px] font-black text-brand-dark uppercase tracking-wider block mb-1.5">
                  {lt(locale, { fa: 'خدمات اصلی سفر', en: 'Travel Services', ar: 'خدمات السفر', zh: '核心旅行服务', ru: 'Основные услуги' })}
                </span>
              }
            >
              <Command.Item
                onSelect={() => handleSelect('/flights/search')}
                className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-ink hover:bg-soft cursor-pointer transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
                    <Plane size={15} />
                  </div>
                  <div>
                    <span className="block font-black text-[13px]">
                      {lt(locale, { fa: 'بلیط هواپیما داخلی و خارجی', en: 'Flights & Airline Tickets', ar: 'تذاكر الطيران', zh: '国内与国际机票', ru: 'Авиабилеты' })}
                    </span>
                    <span className="block text-[10.5px] text-sub font-medium">
                      {lt(locale, { fa: 'بیش از ۴۰۰ ایرلاین با نرخ سیستمی و چارتری', en: 'Over 400 airlines with systemic & charter fares', ar: 'أكثر من 400 شركة طيران', zh: '400+ 航空公司正班与特惠包机', ru: 'Более 400 авиакомпаний' })}
                    </span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-sub rtl:rotate-180" />
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/hotels/search')}
                className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-ink hover:bg-soft cursor-pointer transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 grid place-items-center">
                    <BedDouble size={15} />
                  </div>
                  <div>
                    <span className="block font-black text-[13px]">
                      {lt(locale, { fa: 'هتل و اقامتگاه‌های لوکس', en: 'Hotels & Stays', ar: 'الفنادق والإقامات', zh: '酒店与度假住宿', ru: 'Отели и гостиницы' })}
                    </span>
                    <span className="block text-[10.5px] text-sub font-medium">
                      {lt(locale, { fa: 'رزرو آنی هتل با تضمین کمترین قیمت و کنسلی رایگان', en: 'Instant booking with lowest rate guarantee', ar: 'حجز فوري مع ضمان أقل سعر', zh: '即时出具凭证与免费取消保障', ru: 'Мгновенное бронирование' })}
                    </span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-sub rtl:rotate-180" />
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/tours')}
                className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-ink hover:bg-soft cursor-pointer transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 grid place-items-center">
                    <Compass size={15} />
                  </div>
                  <div>
                    <span className="block font-black text-[13px]">
                      {lt(locale, { fa: 'تورهای مسافرتی و گشت‌های تفریحی', en: 'Tours & Activities', ar: 'الجولات السياحية', zh: '旅游线路与在地体验', ru: 'Туры и экскурсии' })}
                    </span>
                    <span className="block text-[10.5px] text-sub font-medium">
                      {lt(locale, { fa: 'پکیج‌های کامل به همراه پرواز، هتل و لیدر', en: 'All-inclusive packages with flights & hotels', ar: 'باقات شاملة الطيران والإقامة', zh: '一价全包式旅行套餐', ru: 'Пакетные туры с перелетом' })}
                    </span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-sub rtl:rotate-180" />
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/plan')}
                className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-ink hover:bg-soft cursor-pointer transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-mint text-brand-dark grid place-items-center">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <span className="block font-black text-[13px]">
                      {lt(locale, { fa: 'برنامه‌ریز هوشمند سفر با هوش مصنوعی', en: 'AI Travel Planner', ar: 'مخطط السفر الذكي', zh: 'AI 智能行程规划助手', ru: 'Умный ИИ-планировщик' })}
                    </span>
                    <span className="block text-[10.5px] text-sub font-medium">
                      {lt(locale, { fa: 'تنظیم برنامه اختصاصی روزانه بر اساس سلیقه و بودجه', en: 'Personalized itinerary based on your taste & budget', ar: 'خطة مخصصة لميزانيتك واهتماماتك', zh: '基于您的偏好与预算量身定制', ru: 'Индивидуальный маршрут под ваш бюджет' })}
                    </span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-sub rtl:rotate-180" />
              </Command.Item>
            </Command.Group>

            {/* Financial & Auxiliary Group */}
            <Command.Group
              heading={
                <span className="px-2 text-[10.5px] font-black text-brand-dark uppercase tracking-wider block mb-1.5 mt-2">
                  {lt(locale, { fa: 'خدمات مالی و بین‌المللی', en: 'Financial & Add-ons', ar: 'الخدمات المالية والإضافية', zh: '金融与增值服务', ru: 'Финансовые и доп. услуги' })}
                </span>
              }
            >
              <Command.Item
                onSelect={() => handleSelect('/wallet')}
                className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-ink hover:bg-soft cursor-pointer transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
                    <Wallet size={15} />
                  </div>
                  <div>
                    <span className="block font-black text-[13px]">
                      {lt(locale, { fa: 'کیف پول چندارزی فیروزو (ریال و تتر)', en: 'Multi-Currency Wallet (IRR & USDT)', ar: 'المحفظة متعددة العملات', zh: 'Firuzo 多币种电子钱包', ru: 'Мультивалютный кошелек' })}
                    </span>
                    <span className="block text-[10.5px] text-sub font-medium">
                      {lt(locale, { fa: 'شارژ آنلاین، استرداد آنی وجه و تبدیل ارز', en: 'Instant top-up, auto refund and currency exchange', ar: 'شحن فوري واسترداد سريع', zh: '即刻充值、极速退款与货币兑换', ru: 'Пополнение, возврат и обмен' })}
                    </span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-sub rtl:rotate-180" />
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/esim')}
                className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-ink hover:bg-soft cursor-pointer transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 grid place-items-center">
                    <Wifi size={15} />
                  </div>
                  <div>
                    <span className="block font-black text-[13px]">
                      {lt(locale, { fa: 'سیم‌کارت بین‌المللی eSIM', en: 'International eSIM', ar: 'شريحة eSIM الدولية', zh: '国际旅行 eSIM 卡', ru: 'Международная eSIM' })}
                    </span>
                    <span className="block text-[10.5px] text-sub font-medium">
                      {lt(locale, { fa: 'تحویل و فعال‌سازی فوری بارکد QR در ۶۰ ثانیه', en: 'Instant QR code delivery in 60 seconds', ar: 'تسليم فوري لرمز QR خلال 60 ثانية', zh: '60秒内极速生成激活二维码', ru: 'Доставка QR-кода за 60 секунд' })}
                    </span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-sub rtl:rotate-180" />
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/insurance')}
                className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-ink hover:bg-soft cursor-pointer transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 grid place-items-center">
                    <ShieldCheck size={15} />
                  </div>
                  <div>
                    <span className="block font-black text-[13px]">
                      {lt(locale, { fa: 'بیمه مسافرتی سامان (معتبر شنگن)', en: 'Travel Insurance (Schengen Approved)', ar: 'تأمين السفر المعتمد لشنغن', zh: '申根认可旅游医疗保险', ru: 'Туристическая страховка' })}
                    </span>
                    <span className="block text-[10.5px] text-sub font-medium">
                      {lt(locale, { fa: 'پوشش تا ۵۰,۰۰۰ یورو با صدور آنی بیمه‌نامه', en: 'Coverage up to €50k with instant policy issuance', ar: 'تغطية حتى 50 ألف يورو', zh: '保额最高5万欧元，即刻出函', ru: 'Покрытие до 50 000 €' })}
                    </span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-sub rtl:rotate-180" />
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/support')}
                className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-ink hover:bg-soft cursor-pointer transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 grid place-items-center">
                    <Headphones size={15} />
                  </div>
                  <div>
                    <span className="block font-black text-[13px]">
                      {lt(locale, { fa: 'پشتیبانی ۲۴ ساعته و مرکز تماس SOS', en: '24/7 Support & SOS Helpdesk', ar: 'دعم العملاء على مدار الساعة', zh: '24/7 全天候客服支持与紧急救援', ru: 'Поддержка 24/7' })}
                    </span>
                    <span className="block text-[10.5px] text-sub font-medium">
                      {lt(locale, { fa: 'پاسخگویی اختصاصی به ۵ زبان زنده دنیا', en: 'Multilingual support in 5 languages', ar: 'فريق دعم بخمس لغات', zh: '提供5种语言专属客服', ru: 'Поддержка на 5 языках' })}
                    </span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-sub rtl:rotate-180" />
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer Shortcuts */}
          <div className="p-3 border-t border-line/70 bg-paper/60 flex items-center justify-between text-[11px] font-bold text-sub">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-soft border border-line font-mono text-[10px] text-ink me-1">↵</kbd>
                {lt(locale, { fa: 'انتخاب', en: 'Select', ar: 'اختيار', zh: '选择', ru: 'Выбрать' })}
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-soft border border-line font-mono text-[10px] text-ink me-1">Esc</kbd>
                {lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
              </span>
            </div>
            <span className="text-[10px] font-mono text-brand-dark">
              FIRUZO COMMAND PALETTE
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
