'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BizHeader } from '@/components/business/BizHeader';
import { RequestStepper } from '@/components/business/RequestStepper';
import { OptionRow } from '@/components/business/OptionRow';
import { BizPrice, BizFieldError } from '@/components/business/BizText';
import { businessApi, type BusinessPackageDetail } from '@/services/business-client';
import { num } from '@/lib/format';
import { ChildFunnelTracker } from '@/components/business/ChildFunnelTracker';
import { useRouter } from '@/i18n/routing';
import { Minus, Plus } from 'lucide-react';

export default function PackageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const t = useTranslations('Business');
  const locale = useLocale();
  const router = useRouter();

  const [pkg, setPkg] = useState<BusinessPackageDetail | null>(null);
  const [error, setError] = useState(false);
  const [departureId, setDepartureId] = useState<string>('');
  const [pax, setPax] = useState(2);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    businessApi
      .getPackage(slug)
      .then((d) => {
        if (!alive) return;
        setPkg(d);
        setDepartureId(d.departures[0]?.id || '');
        const initialRem = (d.departures[0]?.capacity ?? 30) - (d.departures[0]?.bookedCount ?? 0);
        if (initialRem > 0) {
          setPax((p) => Math.min(Math.max(1, p), initialRem));
        }
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  const departure = pkg?.departures.find((d) => d.id === departureId) || pkg?.departures[0];

  // جمع کل — سند: «با تغییر هر ورودی، جمع کل سمت سرور دوباره محاسبه شود، نه در مرورگر».
  // تا اتصال بک‌اند، quote از mock سرور شبیه‌سازی می‌شود (لایه API)؛ اعداد پایه از سرور می‌آیند.
  const quote = useMemo(() => {
    if (!pkg) return { baseRial: 0, addonRial: 0, totalRial: 0, depositRial: 0 };
    const baseRial = pkg.basePriceRial * pax;
    const addonRial = pkg.addons
      .filter((a) => addonIds.includes(a.id))
      .reduce((sum, a) => sum + (a.unit === 'per_person' ? a.priceRial * pax : a.priceRial), 0);
    const totalRial = baseRial + addonRial;
    // پیش‌پرداخت ۳۰٪ — درصد تنظیم‌پذیر است، نه ثابت (اینجا مقدار پیش‌فرض سند)
    const depositPercent = 0.3;
    const depositRial = Math.round(totalRial * depositPercent);
    return { baseRial, addonRial, totalRial, depositRial };
  }, [pkg, pax, addonIds]);

  if (error) {
    return (
      <>
        <BizHeader />
        <main className="fz-container fz-main">
          <div className="fz-card">
            <h2>{t('common.networkErrorTitle')}</h2>
            <p className="fz-muted">{t('common.networkErrorBody')}</p>
            <button type="button" className="fz-btn" onClick={() => window.location.reload()}>
              {t('common.retry')}
            </button>
          </div>
        </main>
      </>
    );
  }

  if (!pkg) {
    // اسکلت بارگذاری — نه اسپینر تمام‌صفحه
    return (
      <>
        <BizHeader />
        <RequestStepper activeStep={0} />
        <main className="fz-container fz-main">
          <div className="fz-skeleton" style={{ height: 44, width: '60%' }} />
          <div className="fz-split">
            <div className="fz-split__main">
              <div className="fz-skeleton" style={{ height: 280 }} />
              <div className="fz-skeleton" style={{ height: 220 }} />
            </div>
            <div className="fz-skeleton" style={{ flexBasis: 420, height: 420 }} />
          </div>
        </main>
      </>
    );
  }

  const remaining = departure ? departure.capacity - departure.bookedCount : 0;
  const maxPax = Math.min(30, remaining);

  const toggleAddon = (id: string) => {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!departure) {
      setFormError(t('tour.errors.departureRequired'));
      return;
    }
    if (pax < 1 || pax > maxPax) {
      setFormError(t('tour.errors.paxRange', { max: num(maxPax, locale) }));
      return;
    }
    setFormError(null);
    try {
      const draft = await businessApi.createRequest({
        packageId: pkg.id,
        departureId: departure.id,
        paxCount: pax,
        addonIds,
      });
      router.push(`/business/requests/new?id=${draft.id}`);
    } catch {
      router.push('/business/requests/new');
    }
  };

  return (
    <>
      <BizHeader />
      {/* T1112: mid-funnel tour view event (allowlisted, PII-safe). */}
      <ChildFunnelTracker event="tour_viewed" props={{ slug }} />
      <RequestStepper activeStep={0} />

      <main className="fz-container fz-main">
        <header className="fz-stack" style={{ gap: 14 }}>
          <div className="fz-wrap">
            <span className="fz-badge">{pkg.destination}</span>
            <span className="fz-badge fz-badge--warn">{num(pkg.durationDays, locale)} {t('tour.days')}</span>
          </div>
          <h1 style={{ fontSize: 36 }}>{pkg.title}</h1>
          <p className="fz-muted" style={{ maxWidth: 760 }}>{pkg.summary}</p>
        </header>

        <div className="fz-split">
          <div className="fz-split__main">
            {/* گالری — placeholder تا آپلود تصاویر واقعی */}
            <div
              style={{
                height: 280,
                background: 'var(--fz-tint)',
                borderRadius: 'var(--fz-r-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--fz-brand-deep)',
                fontWeight: 700,
              }}
            >
              {t('tour.galleryPlaceholder')}
            </div>

            <section className="fz-card">
              <h2>{t('tour.itinerary')}</h2>
              <div className="fz-stack" style={{ gap: 14 }}>
                {(pkg.itinerary ?? []).map((line, i) => (
                  <div key={i} className="fz-row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start', gap: 16 }}>
                    <span className="fz-strong" style={{ width: 70, flex: '0 0 auto', color: 'var(--fz-brand)' }}>
                      {t('tour.dayN', { n: num(i + 1, locale) })}
                    </span>
                    <span className="fz-muted" style={{ fontSize: 14 }}>{line}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="fz-grid fz-grid--2">
              <section className="fz-card" style={{ gap: 12 }}>
                <h3>{t('tour.includes')}</h3>
                <ul className="fz-muted" style={{ margin: 0, paddingInlineStart: 20, fontSize: 14 }}>
                  {(pkg.includes ?? []).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </section>
              <section className="fz-card" style={{ gap: 12 }}>
                <h3>{t('tour.requiredDocs')}</h3>
                <ul className="fz-muted" style={{ margin: 0, paddingInlineStart: 20, fontSize: 14 }}>
                  {(pkg.requiredDocs ?? []).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
                <p
                  className="fz-card--warn"
                  style={{ padding: '14px 16px', borderRadius: 'var(--fz-r-card-sm)', fontSize: 13, margin: 0 }}
                >
                  {t('tour.grantDocNote')}
                </p>
              </section>
            </div>
          </div>

          {/* کارت رزرو */}
          <aside className="fz-split__aside">
            <form
              className="fz-card fz-card--raised"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              noValidate
            >
              <div className="fz-row">
                <span className="fz-label">{t('tour.perPaxRate')}</span>
                <span className="fz-strong" style={{ fontSize: 22 }}>
                  <BizPrice rial={pkg.basePriceRial} locale={locale} />
                </span>
              </div>

              <fieldset className="fz-stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
                <legend className="fz-label" style={{ paddingBottom: 10 }}>{t('tour.departureDate')}</legend>
                <div className="fz-row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  {pkg.departures.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      role="radio"
                      aria-checked={d.id === departureId}
                      className={`fz-option${d.id === departureId ? ' is-selected' : ''}`}
                      style={{ width: 'auto', padding: '12px 16px' }}
                      onClick={() => setDepartureId(d.id)}
                    >
                      <span className="fz-strong">{d.departDate}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="fz-row">
                <span className="fz-label">{t('tour.paxCount')}</span>
                <div className="fz-counter" role="group" aria-label={t('tour.paxCount')}>
                  <button
                    type="button"
                    className="fz-counter__btn min-h-[44px] min-w-[44px]"
                    aria-label={t('tour.paxMinus')}
                    disabled={pax <= 1}
                    onClick={() => setPax((v) => Math.max(1, v - 1))}
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <span className="fz-counter__value fz-num" aria-live="polite">{num(pax, locale)}</span>
                  <button
                    type="button"
                    className="fz-counter__btn min-h-[44px] min-w-[44px]"
                    aria-label={t('tour.paxPlus')}
                    disabled={pax >= maxPax}
                    onClick={() => setPax((v) => Math.min(maxPax, v + 1))}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <fieldset className="fz-stack" style={{ border: 0, paddingTop: 18, borderTop: '1px solid var(--fz-divider)', gap: 8 }}>
                <legend className="fz-label" style={{ paddingBottom: 10 }}>{t('tour.addons')}</legend>
                {pkg.addons.map((a) => (
                  <OptionRow
                    key={a.id}
                    type="checkbox"
                    selected={addonIds.includes(a.id)}
                    title={a.title}
                    note={`${a.note} — `}
                    onSelect={() => toggleAddon(a.id)}
                  />
                ))}
              </fieldset>

              <div className="fz-card fz-card--tint" style={{ padding: 18, gap: 10 }}>
                <div className="fz-row fz-muted" style={{ fontSize: 14 }}>
                  <span>{t('tour.baseLine', { count: num(pax, locale) })}</span>
                  <span className="fz-strong"><BizPrice rial={quote.baseRial} locale={locale} /></span>
                </div>
                <div className="fz-row fz-muted" style={{ fontSize: 14 }}>
                  <span>{t('tour.addonLine')}</span>
                  <span className="fz-strong"><BizPrice rial={quote.addonRial} locale={locale} /></span>
                </div>
                <div className="fz-row fz-strong" style={{ paddingTop: 10, borderTop: '1px solid var(--fz-brand)', color: 'var(--fz-brand-deep)' }}>
                  <span>{t('tour.total')}</span>
                  <span className="fz-num"><BizPrice rial={quote.totalRial} locale={locale} /></span>
                </div>
                <p className="fz-faint" style={{ margin: 0 }}>
                  {t('tour.depositHint', {
                    deposit: t('price', { amount: num(quote.depositRial / 10, locale) }),
                  })}
                </p>
              </div>

              <BizFieldError>{formError}</BizFieldError>

              <div className="fz-cta-sticky">
                <button type="submit" className="fz-btn fz-btn--action">{t('tour.submitCta')}</button>
              </div>
              <p className="fz-faint" style={{ textAlign: 'center', margin: 0 }}>{t('tour.holdNote')}</p>
            </form>
          </aside>
        </div>
      </main>
    </>
  );
}
