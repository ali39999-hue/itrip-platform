'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { INTERPRETERS, INTERPRETER_PRICING as P } from '@/lib/interpreters';
import { num } from '@/lib/format';
import { Siren, PhoneCall, PhoneOff, X } from 'lucide-react';

type Phase = 'pick' | 'connecting' | 'live';

/** دکمه ثابت «مترجم SOS» — سطح ۳ سرویس مترجم؛ سراسری در همه صفحات */
export function SosInterpreter() {
  const t = useTranslations('Interpreter');
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
      {/* دکمه شناور */}
      <button
        onClick={() => { setOpen(true); setPhase('pick'); setSeconds(0); }}
        aria-label={t('sos')}
        className="fixed z-[120] bottom-[76px] md:bottom-6 start-4 md:start-6 min-h-[46px] ps-3.5 pe-3 rounded-full bg-rose-warm text-surface font-black text-[12.5px] shadow-[0_10px_26px_rgba(216,68,47,.4)] hover:brightness-105 transition inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="relative grid place-items-center w-6 h-6 rounded-full bg-surface/20">
          <Siren size={14} />
          <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-surface animate-ping" />
        </span>
        <span className="hidden sm:inline">{t('sos')}</span>
      </button>

      {/* مودال */}
      {open && (
        <div className="fixed inset-0 z-[200] grid place-items-center p-4 bg-ink/60 backdrop-blur-sm fade-soft" onClick={() => { setOpen(false); }}>
          <div className="w-full max-w-md rounded-xl bg-surface shadow-elev-3 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className={`p-6 text-center text-surface ${phase === 'live' ? 'bg-gradient-to-b from-success to-success/70' : 'bg-gradient-to-b from-rose-warm to-rose-warm/70'}`}>
              <button onClick={() => setOpen(false)} aria-label={isEn ? 'Close' : 'بستن'} className="absolute top-4 start-4 w-8 h-8 rounded-full bg-surface/20 grid place-items-center hover:bg-surface/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><X size={15} /></button>
              <span className={`mx-auto mb-4 w-20 h-20 rounded-full grid place-items-center ${phase === 'live' ? 'bg-surface/20' : 'bg-surface/15 animate-pulse'}`}>
                {phase === 'live' ? <PhoneCall size={34} /> : <Siren size={34} />}
              </span>
              <h3 className="text-lg font-black m-0 mb-1">
                {phase === 'pick' ? t('sosTitle') : phase === 'connecting' ? t('sosConnecting') : t('sosConnected', { name: isEn ? interpreter.nameEn : interpreter.name })}
              </h3>
              {phase === 'live' && (
                <p className="text-[13px] font-bold m-0 opacity-90">
                  {t('sosTimer')}: <span dir="ltr" className="num">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
                </p>
              )}
            </div>
            <div className="p-6">
              {phase === 'pick' && (
                <>
                  <p className="text-[12.5px] font-bold text-sub m-0 mb-3">{t('sosPick')}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[['en', 'English'], ['ar', 'العربية'], ['ru', 'Русский'], ['tr', 'Türkçe']].map(([code, label]) => (
                      <button
                        key={code}
                        onClick={() => setLang(code)}
                        className={`min-h-9 px-4 rounded-full text-[12.5px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${lang === code ? 'bg-brand text-surface shadow-sm shadow-brand/25' : 'bg-soft/80 border border-line/70 text-sub hover:text-brand-dark'}`}
                      >{label}</button>
                    ))}
                  </div>
                  <button onClick={call} className="w-full min-h-12 rounded-xl bg-rose-warm hover:bg-rose-warm/90 text-surface font-black text-sm inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    <PhoneCall size={16} /> {t('sosTitle')}
                  </button>
                </>
              )}
              {phase === 'connecting' && (
                <div className="py-6 text-center">
                  <span className="inline-block w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {phase === 'live' && (
                <>
                  <p className="text-[12px] font-bold text-sub m-0 mb-4 text-center">
                    {t('sosCost', { price: num(P.sosPerCall, locale), min: num(P.sosMinutes, locale) })}
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-full min-h-12 rounded-full bg-ink text-surface font-black text-sm inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <PhoneOff size={16} /> {t('sosEnd')}
                  </button>
                </>
              )}
              <p className="text-[10.5px] font-bold text-sub m-0 mt-3 leading-relaxed text-center">{t('sosNote')}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

