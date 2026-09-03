'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { INTERPRETERS, INTERPRETER_PRICING as P } from '@/lib/interpreters';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { Siren, PhoneCall, PhoneOff, X, Headphones } from 'lucide-react';

type Phase = 'pick' | 'connecting' | 'live';

/** دکمه شناور «مترجم SOS» — سطح ۳ سرویس مترجم؛ شیک، خوانا و بدون ایجاد آلودگی بصری */
export function SosInterpreter() {
  const t = useTranslations('Interpreter');
  const ariaT = useTranslations('Common.aria');
  const locale = useLocale();
  const isEn = locale === 'en';
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('pick');
  const [lang, setLang] = useState('en');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  function call() {
    setPhase('connecting');
    setTimeout(() => setPhase('live'), 2000);
  }

  const interpreter = INTERPRETERS[2]; // النا — ru/en/fa

  return (
    <>
      {/* Floating SOS button — always positioned on the physical right corner (right-4 md:right-6)
          so it never collides with the phone call widget which is permanently docked on the left (left-4) */}
      <button
        onClick={() => { setOpen(true); setPhase('pick'); setSeconds(0); }}
        aria-label={t('sos')}
        className="fixed z-[120] bottom-[76px] md:bottom-6 right-4 md:right-6 min-h-[44px] px-3.5 rounded-full bg-deep/95 hover:bg-deep text-surface border border-line/30 backdrop-blur-md shadow-elev-2 hover:shadow-elev-3 transition-all inline-flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="relative grid place-items-center w-6 h-6 rounded-full bg-rose-500 text-surface shadow-sm">
          <Siren size={13} />
        </span>
        <span className="text-xs font-black text-surface/90 group-hover:text-surface">
          {t('sos')}
        </span>
      </button>

      {/* مودال تماس اضطراری */}
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
                  : t('sosConnected', { name: isEn ? interpreter.nameEn : interpreter.name })}
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
                      { id: 'en', label: 'English · انگلیسی' },
                      { id: 'ar', label: 'العربية · عربی' },
                      { id: 'ru', label: 'Русский · روسی' },
                      { id: 'zh', label: '中文 · چینی' },
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
