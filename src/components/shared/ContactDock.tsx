'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { INTERPRETERS, INTERPRETER_PRICING as P } from '@/lib/interpreters';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { toast } from 'sonner';
import { Siren, PhoneCall, PhoneOff, X, Headphones, Headset, ChevronDown } from 'lucide-react';

type Phase = 'pick' | 'connecting' | 'live';

/**
 * داک تماس واحد — جایگزین جفت دکمه شناور قبلی (ویجت مرکز تماس + مترجم SOS)
 * که روی هم سوار شده بودند. یک دکمه، دو مسیر: پنل مرکز تماس (ویجت خارجی)
 * و مودال مترجم فوری SOS.
 */
export function ContactDock() {
  const pathname = usePathname() || '';
  const t = useTranslations('Interpreter');
  const ariaT = useTranslations('Common.aria');
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('pick');
  const [lang, setLang] = useState('en');
  const [seconds, setSeconds] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Checkout, payment and product detail pages have sticky bottom reservation CTAs on mobile (< lg);
  // on mobile, the dock raises slightly above them. On desktop (lg+), it always anchors cleanly to bottom-6 end-6.
  // Search pages (/hotels/search, /flights/search, etc.) are never excluded.
  const isExcluded =
    !pathname.includes('/search') &&
    (pathname.includes('/checkout') ||
      pathname.includes('/payment-status') ||
      /^\/([a-z]{2}\/)?(hotels|tours)\/(?!search)[^/]+$/.test(pathname));

  // در موبایل تا اولین اسکرول مخفی می‌ماند تا دکمه شناور روی CTA اصلیِ
  // بالای صفحه (فرم جستجوی فرود/hotel) و پاپ‌آپ‌های اولیه نیفتد. دسکتاپ همیشه نمایان.
  const [pastFold, setPastFold] = useState(false);
  useEffect(() => {
    function onScroll() {
      setPastFold(window.scrollY > 80);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Escape + click-outside close the action menu
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  function call() {
    setPhase('connecting');
    setTimeout(() => setPhase('live'), 2000);
  }

  /** پنل مرکز تماس (ویجت خارجی call.firuzo.online) را برنامه‌نویسی‌شده باز می‌کند */
  function openCallCenter() {
    setMenuOpen(false);
    const fab = document.querySelector<HTMLElement>('.fzw2-fabwrap .fzw2-fab, .fzw2-fab');
    if (fab) {
      fab.click();
    } else {
      toast.error(
        lt(locale, {
          fa: 'مرکز تماس هنوز بارگذاری نشده؛ چند لحظه بعد دوباره امتحان کنید.',
          en: 'The call center is still loading; please try again in a moment.',
          ar: 'مركز الاتصال قيد التحميل؛ حاول مرة أخرى بعد قليل.',
          zh: '呼叫中心仍在加载，请稍后重试。',
          ru: 'Центр звонков ещё загружается; попробуйте позже.',
        })
      );
    }
  }

  function openSos() {
    setMenuOpen(false);
    setPhase('pick');
    setSeconds(0);
    setOpen(true);
  }

  const interpreter = INTERPRETERS[2]; // النا — ru/en/fa

  return (
    <>
      {/* داک شناور واحد — گوشه انتهایی؛ روی دسکتاپ همیشه در گوشه پایینی (bottom-6 end-6) و روی موبایل بالای نوارها */}
      <div
        ref={menuRef}
        className={`fixed z-[120] ${
          isExcluded
            ? 'bottom-[calc(120px+env(safe-area-inset-bottom))] lg:bottom-6'
            : 'bottom-[calc(78px+env(safe-area-inset-bottom))] lg:bottom-6'
        } end-4 lg:end-6 max-lg:transition-all max-lg:duration-200 ${
          pastFold
            ? 'max-lg:opacity-100 max-lg:visible'
            : 'max-lg:opacity-0 max-lg:invisible max-lg:translate-y-2'
        }`}
      >
        {/* منوی دو گزینه‌ای تماس */}
        {menuOpen && (
          <div
            role="menu"
            aria-label={lt(locale, { fa: 'گزینه‌های تماس و پشتیبانی', en: 'Call & support options', ar: 'خيارات الاتصال والدعم', zh: '通话与支持选项', ru: 'Варианты звонка и поддержки' })}
            className="absolute bottom-[calc(100%+10px)] end-0 w-[264px] rounded-2xl bg-surface border border-line shadow-elev-3 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <button
              type="button"
              role="menuitem"
              onClick={openCallCenter}
              className="w-full min-h-[56px] px-4 py-2.5 flex items-center gap-3 text-start hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
            >
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand text-surface shrink-0">
                <PhoneCall size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-black text-ink">
                  {lt(locale, { fa: 'تماس تلفنی با فیروزو', en: 'Call Firuzo support', ar: 'اتصال هاتفي بفيروزو', zh: '致电 Firuzo 客服', ru: 'Позвонить в Firuzo' })}
                </span>
                <span className="block text-[10.5px] font-bold text-sub">
                  {lt(locale, { fa: 'رایگان · پاسخگویی ۲۴ ساعته', en: 'Free · 24/7 answer', ar: 'مجاني · متاح ٢٤/٧', zh: '免费 · 全天候', ru: 'Бесплатно · 24/7' })}
                </span>
              </span>
            </button>

            <div className="h-px bg-line/60" aria-hidden="true" />

            <button
              type="button"
              role="menuitem"
              onClick={openSos}
              className="w-full min-h-[56px] px-4 py-2.5 flex items-center gap-3 text-start hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
            >
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-rose-500 text-surface shrink-0">
                <Siren size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-black text-ink">{t('sos')}</span>
                <span className="block text-[10.5px] font-bold text-sub">
                  {lt(locale, { fa: 'اتصال زنده در کمتر از ۳۰ ثانیه', en: 'Live connection in under 30s', ar: 'اتصال مباشر في أقل من ٣٠ ثانية', zh: '30秒内实时接通', ru: 'Связь менее чем за 30 секунд' })}
                </span>
              </span>
            </button>
          </div>
        )}

        {/* دکمه واحد داک */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={lt(locale, { fa: 'تماس و پشتیبانی', en: 'Call & support', ar: 'الاتصال والدعم', zh: '通话与支持', ru: 'Звонок и поддержка' })}
          className="min-h-[44px] max-lg:w-11 max-lg:px-0 max-lg:justify-center px-3.5 h-11 rounded-full bg-deep/95 hover:bg-deep text-white dark:bg-brand/20 dark:text-brand dark:border-brand/40 dark:hover:bg-brand/30 border border-line/30 backdrop-blur-md shadow-elev-2 hover:shadow-elev-3 transition-all inline-flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {menuOpen ? (
            <ChevronDown size={17} className="max-lg:hidden text-white/90 group-hover:text-white dark:text-brand" />
          ) : (
            <Headset size={17} className="text-white/90 group-hover:text-white dark:text-brand" />
          )}
          <span className="max-lg:hidden text-xs font-black text-white/90 group-hover:text-white dark:text-brand">
            {lt(locale, { fa: 'تماس و پشتیبانی', en: 'Call & support', ar: 'الاتصال والدعم', zh: '通话与支持', ru: 'Звонок و поддержка' })}
          </span>
        </button>
      </div>

      {/* مودال تماس اضطراری با مترجم */}
      {open && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-surface border border-line shadow-elev-3 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`relative p-6 text-center text-surface ${
                phase === 'live'
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700'
                  : 'bg-gradient-to-b from-deep to-brand-dark'
              }`}
            >
              <button
                onClick={() => setOpen(false)}
                aria-label={ariaT('close')}
                className="absolute top-4 start-4 w-8 h-8 rounded-full bg-surface/20 grid place-items-center hover:bg-surface/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition"
              >
                <X size={15} />
              </button>

              <span
                className={`mx-auto mb-3 w-16 h-16 rounded-2xl grid place-items-center ${
                  phase === 'live' ? 'bg-surface/20' : 'bg-surface/15 animate-pulse'
                }`}
              >
                {phase === 'live' ? <PhoneCall size={28} /> : <Headphones size={28} />}
              </span>

              <h3 className="text-lg font-black m-0 mb-1">
                {phase === 'pick'
                  ? t('sosTitle')
                  : phase === 'connecting'
                  ? t('sosConnecting')
                  : t('sosConnected', { name: lt(locale, { fa: interpreter.name, en: interpreter.nameEn, ar: interpreter.name, zh: interpreter.nameEn, ru: interpreter.nameEn }) })}
              </h3>

              {phase === 'live' && (
                <p className="text-xs font-bold m-0 opacity-90">
                  {t('sosTimer')}:{' '}
                  <span dir="ltr" className="font-mono">
                    {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                    {String(seconds % 60).padStart(2, '0')}
                  </span>
                </p>
              )}
            </div>

            <div className="p-6">
              {phase === 'pick' && (
                <>
                  <p className="text-xs font-bold text-sub m-0 mb-3">{t('sosPick')}</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: 'en', label: lt(locale, { fa: 'English (انگلیسی)', en: 'English', ar: 'الإنجليزية', zh: '英语', ru: 'Английский' }) },
                      { id: 'ar', label: lt(locale, { fa: 'العربية (عربی)', en: 'Arabic', ar: 'العربية', zh: '阿拉伯语', ru: 'Арабский' }) },
                      { id: 'ru', label: lt(locale, { fa: 'Русский (روسی)', en: 'Russian', ar: 'الروسية', zh: '俄语', ru: 'Русский' }) },
                      { id: 'zh', label: lt(locale, { fa: '中文 (چینی)', en: 'Chinese', ar: 'الصينية', zh: '中文', ru: 'Китайский' }) },
                    ].map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLang(l.id)}
                        className={`min-h-[44px] px-3 rounded-xl border text-xs font-black transition text-start ${
                          lang === l.id
                            ? 'bg-mint border-brand text-brand-dark shadow-sm'
                            : 'border-line/70 text-ink hover:bg-soft'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-soft border border-line/60 text-xs text-sub mb-4 leading-relaxed">
                    <p className="m-0 font-medium">
                      {lt(locale, {
                        fa: 'اتصال آنی به مترجم رسمی و مسلط به زبان مقصد در کمتر از ۳۰ ثانیه.',
                        en: 'Instant connection to a certified interpreter of your target language in under 30 seconds.',
                        ar: 'اتصال فوري بمترجم معتمد للغة الوجهة في أقل من 30 ثانية.',
                        zh: '30秒内即时接通精通目标语言的认证译员。',
                        ru: 'Мгновенное соединение с сертифицированным переводчиком менее чем за 30 секунд.',
                      })}
                    </p>
                    <b className="block mt-1 text-ink">
                      {lt(locale, { fa: 'نرخ:', en: 'Rate:', ar: 'السعر:', zh: '费率:', ru: 'Тариф:' })}{' '}
                      {num(P.sosPerCall / 1000, locale)}{' '}
                      {lt(locale, { fa: 'هزار تومان / هر تماس', en: 'thousand Toman / per call', ar: 'ألف تومان / لكل مكالمة', zh: '千图曼 / 每次通话', ru: 'тыс. томан / за звонок' })}
                    </b>
                  </div>

                  <button
                    type="button"
                    onClick={call}
                    className="w-full h-12 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-elev-1 transition active:scale-[0.98]"
                  >
                    <PhoneCall size={16} />
                    <span>{lt(locale, { fa: 'برقراری تماس زنده با مترجم', en: 'Start live interpreter call', ar: 'بدء مكالمة حية مع المترجم', zh: '开始译员实时通话', ru: 'Начать живой звонок переводчику' })}</span>
                  </button>
                </>
              )}

              {phase === 'connecting' && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full border-3 border-brand border-t-transparent animate-spin mx-auto mb-4" />
                  <p className="text-xs text-sub font-bold m-0">
                    {lt(locale, { fa: 'در حال یافتن نزدیک‌ترین مترجم آنلاین...', en: 'Finding the nearest available interpreter...', ar: 'جارٍ إيجاد أقرب مترجم متاح...', zh: '正在寻找最近的在线译员...', ru: 'Ищем ближайшего доступного переводчика...' })}
                  </p>
                </div>
              )}

              {phase === 'live' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
                    {lt(locale, {
                      fa: 'مکالمه شما با مترجم همراه برقرار است. صدای مترجم از طریق بلندگو پخش می‌شود.',
                      en: 'You are connected with your interpreter. Their voice is played through the speaker.',
                      ar: 'أنت متصل بالمترجم. يتم تشغيل صوته عبر مكبر الصوت.',
                      zh: '您已连接译员，译员的声音将通过扬声器播放。',
                      ru: 'Вы на связи с переводчиком. Голос передается через динамик.',
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPhase('pick'); setOpen(false); }}
                    className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-surface font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
                  >
                    <PhoneOff size={16} />
                    <span>{t('sosEnd')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
