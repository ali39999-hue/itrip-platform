'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { BizHeader } from '@/components/business/BizHeader';
import { GoalWheel, type BizGoal } from '@/components/business/GoalWheel';
import { num } from '@/lib/format';
import { useLocale } from 'next-intl';
import { BizPrice } from '@/components/business/BizText';
import { businessApi, MOCK_PACKAGES } from '@/services/business-client';
import { useEffect, useState } from 'react';

/** شش هدف سفر — متن‌ها از messages/Business.goals، آیکون‌ها path SVG */
const GOAL_META: Array<{ key: string; icon: string; subKeys: string[] }> = [
  { key: 'expo', icon: 'M3 4h18M5 4v10h14V4M12 14v4M8 21l4-3 4 3', subKeys: ['canton', 'electronics', 'textile', 'medical'] },
  { key: 'factory', icon: 'M3 21h18M4 21V10l5 3V10l5 3V7l5 3v11', subKeys: ['mobile', 'machinery', 'materials'] },
  { key: 'b2b', icon: 'M4 8h16v11H4zM9 8V6a3 3 0 0 1 6 0v2M9 13h6', subKeys: ['sourcing', 'negotiation', 'dealership'] },
  { key: 'visa', icon: 'M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z', subKeys: ['visa', 'invitation', 'insurance'] },
  { key: 'budget', icon: 'M6 20V10M12 20V4M18 20v-7', subKeys: ['estimate', 'grant', 'report'] },
  { key: 'tech', icon: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', subKeys: ['park', 'accelerator', 'startup'] },
];

export default function BusinessLandingPage() {
  const t = useTranslations('Business');
  const locale = useLocale();

  // حالت از URL — shareable (?goal=expo&sub=canton)
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const goals: BizGoal[] = useMemo(
    () =>
      GOAL_META.map((g) => ({
        key: g.key,
        icon: g.icon,
        label: t(`goals.${g.key}.label`),
        subs: g.subKeys.map((s) => t(`goals.${g.key}.subs.${s}`)),
      })),
    [t]
  );

  const goal = searchParams?.get('goal') || null;
  const sub = searchParams?.get('sub') || null;

  const selectedGoal = goals.find((x) => x.key === (goal || goals[0]?.key)) || goals[0];
  const selectedSub = selectedGoal?.subs.find((s) => s === sub) || null;

  // کارت درخواست — متن‌ها با انتخاب عوض می‌شوند
  const summaryText = selectedSub || selectedGoal?.label || '';

  const [packages, setPackages] = useState<typeof MOCK_PACKAGES>([]);
  useEffect(() => {
    businessApi.listPackages().then(setPackages);
  }, []);

  const stepDots = [1, 2, 3, 4, 5, 6];

  return (
    <>
      <BizHeader />

      <main className="fz-container fz-main">
        {/* هیرو: متن + چرخ انتخاب هدف سفر */}
        <section className="fz-hero">
          <div className="fz-hero__text">
            <span className="fz-badge fz-badge--biz">{t('landing.heroBadge')}</span>
            <h1 className="fz-hero__title">{t('landing.heroTitle')}</h1>
            <p className="fz-muted" style={{ fontSize: 17 }}>{t('landing.heroLead')}</p>

            <div className="fz-card fz-card--raised" style={{ gap: 16 }}>
              <div className="fz-row">
                <Link
                  className="fz-btn fz-btn--action"
                  style={{ width: 'auto', minHeight: 52 }}
                  href={`/business/tours/${packages[0]?.slug || 'canton-fair'}${
                    goal || sub ? `?${new URLSearchParams({ ...(goal ? { goal } : {}), ...(sub ? { sub } : {}) }).toString()}` : ''
                  }`}
                >
                  {t('landing.cta')}
                </Link>
                <div>
                  <div className="fz-faint">{t('landing.yourRequest')}</div>
                  <div className="fz-strong" style={{ fontSize: 20, color: 'var(--fz-brand)' }}>{summaryText}</div>
                </div>
              </div>
              <p className="fz-muted" style={{ paddingTop: 14, borderTop: '1px solid var(--fz-divider)', fontSize: 14 }}>
                {selectedGoal ? t(`goals.${selectedGoal.key}.note`) : ''}
              </p>
            </div>

            <p className="fz-muted" style={{ fontSize: 14 }}>{t('landing.grantHint')}</p>
          </div>

          <GoalWheel
            goals={goals}
            initialGoal={goal}
            initialSub={sub}
          />
        </section>

        {/* چهار مزیت */}
        <section className="fz-grid fz-grid--4" aria-label={t('landing.benefitsAria')}>
          {(['visa', 'interpreter', 'contract', 'grant'] as const).map((k) => (
            <article key={k} className="fz-card" style={{ gap: 10 }}>
              <h3>{t(`benefits.${k}.title`)}</h3>
              <p className="fz-muted" style={{ fontSize: 14 }}>{t(`benefits.${k}.desc`)}</p>
            </article>
          ))}
        </section>

        {/* سه پکیج */}
        <section id="biz-packages">
          <div className="fz-row" style={{ alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 32 }}>{t('landing.packagesTitle')}</h2>
              <p className="fz-muted">{t('landing.packagesLead')}</p>
            </div>
          </div>

          <div className="fz-grid fz-grid--3">
            {packages.length === 0 &&
              [0, 1, 2].map((i) => (
                <div key={i} className="fz-card" style={{ gap: 14 }}>
                  <div className="fz-skeleton" style={{ height: 150, borderRadius: 0 }} />
                  <div className="fz-skeleton" style={{ height: 22 }} />
                  <div className="fz-skeleton" style={{ height: 14 }} />
                  <div className="fz-skeleton" style={{ height: 14, width: '70%' }} />
                </div>
              ))}
            {packages.map((p) => (
              <article key={p.id} className="fz-card" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
                <div
                  style={{
                    height: 150,
                    background: 'var(--fz-tint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fz-brand-deep)',
                    fontWeight: 700,
                  }}
                >
                  {p.destination}
                </div>
                <div className="fz-stack" style={{ padding: 24, gap: 14 }}>
                  <div className="fz-wrap">
                    <span className="fz-badge">{p.destination}</span>
                    <span className="fz-badge fz-badge--warn">{num(p.durationDays, locale)} {t('landing.daysUnit')}</span>
                  </div>
                  <h3 style={{ fontSize: 20 }}>{p.title}</h3>
                  <div className="fz-row" style={{ paddingTop: 14, borderTop: '1px solid var(--fz-divider)' }}>
                    <div>
                      <div className="fz-faint">{t('landing.perPaxRate')}</div>
                      <div className="fz-strong"><BizPrice rial={p.basePriceRial} locale={locale} /></div>
                    </div>
                    <Link className="fz-btn fz-btn--brand" href={`/business/tours/${p.slug}`}>{t('landing.detailsCta')}</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* مسیر شش‌مرحله‌ای */}
        <section id="biz-how">
          <h2 style={{ fontSize: 32, marginBottom: 24 }}>{t('landing.howTitle')}</h2>
          <ol className="fz-grid fz-grid--6" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {stepDots.map((n, i) => (
              <li
                key={n}
                className={`fz-card${i === 5 ? ' fz-card--tint' : ''}`}
                style={{ padding: 20, gap: 8 }}
              >
                <span
                  className="fz-step__dot"
                  style={
                    i === 5
                      ? { background: 'var(--fz-action)', borderColor: 'var(--fz-action)', color: 'var(--fz-action-ink)' }
                      : i === 0
                        ? { background: 'var(--fz-brand-deep)', borderColor: 'var(--fz-brand-deep)', color: '#fff' }
                        : undefined
                  }
                  aria-hidden="true"
                >
                  {num(n, locale)}
                </span>
                <span className="fz-strong">{t(`how.${i}.title`)}</span>
                <p className="fz-muted" style={{ fontSize: 13 }}>{t(`how.${i}.desc`)}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
