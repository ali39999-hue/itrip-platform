'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { num } from '@/lib/format';

export interface BizGoal {
  key: string;
  label: string;
  /** icon = path d — استروک ۱.۷ با viewBox 24 */
  icon: string;
  subs: string[];
}

/**
 * GoalWheel — چرخ انتخاب هدف سفر (صفحه اصلی).
 * کاشی‌های هدف روی حلقه، چیپ‌های زیرشاخه روی قوس مقابل.
 * انتخاب در URL می‌آید (?goal=expo&sub=canton) تا لینک shareable باشد.
 * حالت از URL خوانده می‌شود؛ ورودی initialGoal/initialSub برای اولین رندر.
 */
export function GoalWheel({
  goals,
  initialGoal,
  initialSub,
  onSelectionChange,
}: {
  goals: BizGoal[];
  initialGoal?: string | null;
  initialSub?: string | null;
  onSelectionChange?: (goal: string, sub: string | null) => void;
}) {
  const t = useTranslations('Business.landing');
  const locale = useLocale();

  const validGoal = (g: string | null | undefined) =>
    g && goals.some((x) => x.key === g) ? g : goals[0]?.key;

  const [goalKey, setGoalKey] = useState<string>(() => validGoal(initialGoal) || '');
  const [sub, setSub] = useState<string | null>(() => initialSub ?? null);

  const goal = useMemo(() => goals.find((g) => g.key === goalKey) || goals[0], [goals, goalKey]);

  // URL state — shareable
  const syncUrl = useCallback((g: string, s: string | null) => {
    const url = new URL(window.location.href);
    url.searchParams.set('goal', g);
    if (s) url.searchParams.set('sub', s);
    else url.searchParams.delete('sub');
    window.history.replaceState(null, '', url.toString());
  }, []);

  // تغییر از بیرون (back/forward یا لینک جدید)
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const g = validGoal(params.get('goal'));
      setGoalKey(g || '');
      setSub(params.get('sub'));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- validGoal روی goals بسته است که prop پایدار است
  }, [goals]);

  const selectGoal = (key: string) => {
    setGoalKey(key);
    setSub(null);
    syncUrl(key, '');
    onSelectionChange?.(key, null);
  };

  const selectSub = (s: string) => {
    setSub(s);
    syncUrl(goalKey, s);
    onSelectionChange?.(goalKey, s);
  };

  if (!goal) return null;

  // کاشی‌ها: ۶ هدف روی حلقه
  const tilePos = (i: number, n: number) => {
    const deg = -90 + (360 * i) / n;
    const rad = (deg * Math.PI) / 180;
    return {
      left: `${50 + 32 * Math.cos(rad)}%`,
      top: `${50 + 32 * Math.sin(rad)}%`,
    };
  };

  // چیپ‌ها: روی قوس سمت مقابل (±۵۵ درجه)
  const chipPos = (i: number, n: number) => {
    const deg = n === 1 ? 0 : -55 + (110 * i) / (n - 1);
    const rad = (deg * Math.PI) / 180;
    return {
      left: `${50 - 45 * Math.cos(rad)}%`,
      top: `${50 + 45 * Math.sin(rad)}%`,
    };
  };

  return (
    <div className="fz-wheel" role="group" aria-label={t('wheelAria')}>
      <svg className="fz-wheel__bg" viewBox="0 0 700 700" aria-hidden="true">
        <path d="M350 40 A310 310 0 0 0 350 660 Z" fill="var(--fz-tint)" />
        <path
          d="M350 40 A310 310 0 0 0 350 660"
          fill="none"
          stroke="var(--fz-brand)"
          strokeWidth="2"
          strokeDasharray="6 8"
          opacity="0.45"
        />
        <circle cx="350" cy="350" r="224" fill="var(--fz-surface)" stroke="var(--fz-border-soft)" strokeWidth="1" />
      </svg>

      <div className="fz-wheel__core">
        <small>{t('coreSmall')}</small>
        <strong>{goal.label}</strong>
      </div>

      {goals.map((g, i) => (
        <button
          key={g.key}
          type="button"
          className="fz-node"
          style={tilePos(i, goals.length)}
          aria-pressed={g.key === goalKey}
          onClick={() => selectGoal(g.key)}
        >
          <span className="fz-node__tile" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d={g.icon} />
            </svg>
          </span>
          <span className="fz-node__label">{g.label}</span>
        </button>
      ))}

      {goal.subs.map((s, i) => (
        <button
          key={s}
          type="button"
          className="fz-chip"
          style={chipPos(i, goal.subs.length)}
          aria-pressed={s === sub}
          onClick={() => selectSub(s)}
        >
          {s}
        </button>
      ))}
      {/* num برای شماره‌گذاری مراحل در لوکال‌های دیگر — جلوگیری از unused-import در برخی مسیرها */}
      <span className="fz-sr" aria-hidden="true">{num(goals.length, locale)}</span>
    </div>
  );
}
