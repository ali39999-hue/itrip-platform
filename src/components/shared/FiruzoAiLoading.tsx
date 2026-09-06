'use client';

import React, { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface Step {
  text: string;
  count: number;
  label: string;
}

const LOCALIZED_STEPS: Record<string, Step[]> = {
  fa: [
    { text: 'همهٔ گزینه‌ها و اقامتگاه‌های ایران را باز کردم', count: 2400, label: 'اقامتگاه' },
    { text: 'آن‌هایی که در تاریخ مد نظرت جا دارند', count: 310, label: 'اتاق آزاد' },
    { text: 'سنتی، با حیاط، متناسب با سلیقه و بودجهٔ تو', count: 34, label: 'گزینه منتخب' },
    { text: 'استعلام نرخ‌های لحظه‌ای و تخفیف‌های ویژه', count: 9, label: 'گزینه نهایی' },
    { text: 'سه تا از بهترین‌ها را برایت چیدم', count: 3, label: 'پیشنهاد طلایی' },
  ],
  en: [
    { text: 'Scanning all boutique stays & destinations', count: 2400, label: 'properties' },
    { text: 'Filtering verified availability for your dates', count: 310, label: 'available rooms' },
    { text: 'Matching architectural style & your budget', count: 34, label: 'curated picks' },
    { text: 'Confirming real-time rates & direct perks', count: 9, label: 'options' },
    { text: 'Curated the 3 best recommendations for you', count: 3, label: 'top proposals' },
  ],
  ar: [
    { text: 'مسح جميع خيارات الإقامة والوجهات الأصيلة', count: 2400, label: 'إقامة' },
    { text: 'تصفية التوافر الفعلي للتواريخ المحددة', count: 310, label: 'غرفة شاغرة' },
    { text: 'اختيار الأنسب لذوقك المعماري وميزانيتك', count: 34, label: 'خياراً منتقى' },
    { text: 'التحقق من الأسعار اللحظية والخصومات الخاصة', count: 9, label: 'خيارات' },
    { text: 'ترتيب أفضل ٣ مقترحات مثالية لك', count: 3, label: 'عروض مميزة' },
  ],
  zh: [
    { text: '正在检索目的地全部精品住宿与行程选项', count: 2400, label: '处特色房源' },
    { text: '筛选所选日期实时可用房态与优质席位', count: 310, label: '间可用客房' },
    { text: '匹配波斯传统庭院美学与您的预算偏好', count: 34, label: '个精选方案' },
    { text: '核验实时最优汇率与独家礼遇价格', count: 9, label: '个最终候选' },
    { text: '已为您定制并呈现最佳 3 项旅行方案', count: 3, label: '项臻选推荐' },
  ],
  ru: [
    { text: 'Сканирование аутентичных отелей и маршрутов', count: 2400, label: 'объектов' },
    { text: 'Фильтрация свободных номеров на выбранные даты', count: 310, label: 'доступных номеров' },
    { text: 'Подбор под ваш бюджет и эстетические предпочтения', count: 34, label: 'отобранных вариантов' },
    { text: 'Проверка актуальных тарифов и эксклюзивных скидок', count: 9, label: 'вариантов' },
    { text: 'Сформировали 3 лучших предложения для вас', count: 3, label: 'топ-рекомендации' },
  ],
};

// Deterministically precomputed Persian architectural tiles to guarantee SSR/hydration parity
const TILES = (() => {
  const list: Array<{
    id: number;
    x: number;
    y: number;
    d: string;
    c: string;
    dx: number;
    dy: number;
    dr: number;
    groupDelay: number;
    tileDelay: number;
  }> = [];

  let k = 0;
  function pseudoRandom(seed: number) {
    const s = Math.sin(seed) * 10000;
    return s - Math.floor(s);
  }

  for (let y = 6; y < 306; y += 25) {
    for (let x = 6; x < 246; x += 25) {
      const star = (Math.round(x / 25) + Math.round(y / 25)) % 2 === 0;
      const rColor = pseudoRandom(k * 57 + 23);
      const c =
        rColor < 0.08
          ? 'var(--color-action)'
          : star
          ? 'var(--color-brand)'
          : rColor < 0.45
          ? 'var(--color-mint-bright)'
          : 'var(--color-brand-dark)';

      const d = star
        ? 'M0 -10 3 -3 10 0 3 3 0 10 -3 3 -10 0 -3 -3Z'
        : 'M0 -9 9 0 0 9 -9 0Z';

      const dist = Math.hypot(x - 120, y - 300) / 40;
      const r1 = pseudoRandom(k * 13 + 7);
      const r2 = pseudoRandom(k * 29 + 11);
      const r3 = pseudoRandom(k * 43 + 19);
      const dx = Math.round(-90 + r1 * 180);
      const dy = Math.round(-70 + r2 * 140);
      const dr = Math.round(-140 + r3 * 280);
      const groupDelay = Math.round((k % 7) * 40 + dist * 55);
      const tileDelay = Math.round((300 - y) * 4);

      list.push({
        id: k,
        x,
        y,
        d,
        c,
        dx,
        dy,
        dr,
        groupDelay,
        tileDelay,
      });
      k++;
    }
  }
  return list;
})();

export interface FiruzoAiLoadingProps {
  /** Optional custom title text overriding progressive steps */
  title?: string;
  /** Optional custom subtitle text */
  subtitle?: string;
  /** Force explicit locale or fallback to next-intl locale */
  locale?: string;
  /** Compact styling for drawers or smaller panels */
  compact?: boolean;
  /** Show the Persian architectural skeleton cards below */
  showSkeletons?: boolean;
  /** Animation step delay in ms (defaults to 1400ms) */
  stepDuration?: number;
}

export function FiruzoAiLoading({
  title,
  subtitle,
  locale: propLocale,
  compact = false,
  showSkeletons = true,
  stepDuration = 1400,
}: FiruzoAiLoadingProps) {
  const currentLocale = useLocale() || 'fa';
  const activeLocale = propLocale || currentLocale;
  const steps = LOCALIZED_STEPS[activeLocale] || LOCALIZED_STEPS.fa;

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    if (title) return; // If fixed custom title is provided, don't cycle
    const interval = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev < steps.length - 1) {
          setFadeKey((k) => k + 1);
          return prev + 1;
        }
        return prev;
      });
    }, stepDuration);

    return () => clearInterval(interval);
  }, [steps.length, stepDuration, title]);

  const activeStep = steps[currentStepIdx] || steps[0];
  const progressPercent = title ? 100 : Math.round(((currentStepIdx + 1) / steps.length) * 100);

  // Format count according to locale
  const formattedCount = new Intl.NumberFormat(
    activeLocale === 'fa' ? 'fa-IR' : activeLocale === 'ar' ? 'ar-EG' : 'en-US'
  ).format(activeStep.count);

  return (
    <div className={`w-full mx-auto ${compact ? 'max-w-md py-4' : 'max-w-2xl py-8 px-4 sm:px-6'}`}>
      <style>{`
        @keyframes firuzo-land {
          from {
            opacity: 0;
            transform: translate(var(--dx), var(--dy)) rotate(var(--dr)) scale(0.4);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes firuzo-wave {
          0%, 100% { opacity: 0.30; }
          45% { opacity: 1; }
        }
        @keyframes firuzo-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes firuzo-shimmer {
          to { transform: translateX(100%); }
        }
        .firuzo-g {
          animation: firuzo-land 0.9s cubic-bezier(0.2, 0.8, 0.25, 1) both;
        }
        .firuzo-tile {
          transform-box: fill-box;
          transform-origin: center;
          animation: firuzo-wave 2.4s ease-in-out infinite;
        }
        .firuzo-fade-anim {
          animation: firuzo-fade 0.45s ease both;
        }
        .firuzo-shimmer-box {
          position: relative;
          overflow: hidden;
        }
        .firuzo-shimmer-box::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(0, 169, 165, 0.16), transparent);
          animation: firuzo-shimmer 1.4s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .firuzo-g, .firuzo-tile, .firuzo-fade-anim, .firuzo-shimmer-box::after {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Main Arch Stage Card */}
      <section
        role="status"
        aria-live="polite"
        className="bg-surface border border-line rounded-3xl p-6 sm:p-9 text-center shadow-elev-1 overflow-hidden"
      >
        {/* Persian Arch SVG */}
        <div className="relative mx-auto mb-5 w-[164px] h-[205px] sm:w-[190px] sm:h-[238px]">
          <svg
            className="w-full h-full block select-none"
            viewBox="0 0 240 300"
            aria-label={title || activeStep.text}
          >
            <defs>
              <clipPath id="firuzoArchClip">
                <path d="M22 300V152C22 74 78 32 120 10c42 22 98 64 98 142v148Z" />
              </clipPath>
            </defs>

            {/* Falling & Pulsing Geometric Tiles */}
            <g clipPath="url(#firuzoArchClip)">
              {TILES.map((t) => (
                <g
                  key={t.id}
                  className="firuzo-g"
                  style={
                    {
                      '--dx': `${t.dx}px`,
                      '--dy': `${t.dy}px`,
                      '--dr': `${t.dr}deg`,
                      animationDelay: `${t.groupDelay}ms`,
                    } as React.CSSProperties
                  }
                >
                  <path
                    className="firuzo-tile"
                    d={t.d}
                    transform={`translate(${t.x} ${t.y})`}
                    fill={t.c}
                    style={{ animationDelay: `${t.tileDelay}ms` }}
                  />
                </g>
              ))}
            </g>

            {/* Architectural Outline of the Arch */}
            <path
              d="M22 300V152C22 74 78 32 120 10c42 22 98 64 98 142v148Z"
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="2"
              opacity="0.6"
            />
          </svg>

          {/* Saffron Centerpiece Accent */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-action shadow-xs animate-ping" />
        </div>

        {/* Dynamic Reasoning Step Text */}
        <h3
          key={`title-${fadeKey}`}
          className="text-lg sm:text-xl font-bold text-ink mb-2 min-h-[2rem] firuzo-fade-anim leading-snug"
        >
          {title || activeStep.text}
        </h3>

        {/* Candidate Count Metric */}
        <p
          key={`count-${fadeKey}`}
          className="text-xs sm:text-sm text-sub min-h-[1.5rem] firuzo-fade-anim flex items-center justify-center gap-1.5 font-medium"
        >
          {subtitle ? (
            <span>{subtitle}</span>
          ) : (
            <>
              <b className="font-en text-brand-dark font-black tracking-wider text-sm sm:text-base">
                {formattedCount}
              </b>
              <span>{activeStep.label}</span>
            </>
          )}
        </p>

        {/* Precision Progress Indicator Line */}
        <div className="w-full max-w-[260px] h-[3px] bg-line rounded-full mx-auto mt-6 overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* Architectural Shimmer Skeletons (Revealed as reasoning advances) */}
      {showSkeletons && (
        <div
          className={`grid gap-3.5 mt-5 transition-opacity duration-700 ${
            currentStepIdx >= 2 ? 'opacity-100' : 'opacity-40'
          }`}
        >
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="grid grid-cols-[76px_1fr] sm:grid-cols-[88px_1fr] gap-3.5 p-3 sm:p-4 rounded-2xl bg-surface border border-line items-center text-start shadow-xs firuzo-fade-anim"
              style={{ animationDelay: `${idx * 130}ms` }}
            >
              {/* Arch-shaped Shimmer Thumbnail */}
              <div className="h-20 sm:h-24 rounded-[44%_44%_10px_10px/30%_30%_0_0] bg-mint/70 border border-brand/20 firuzo-shimmer-box" />

              {/* Shimmer Information Lines */}
              <div className="space-y-2.5">
                <div className="h-3.5 w-3/5 rounded-md bg-line firuzo-shimmer-box" />
                <div className="h-2.5 w-2/5 rounded-md bg-line/70 firuzo-shimmer-box" />
                <div className="h-3 w-1/4 rounded-md bg-mint firuzo-shimmer-box" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
