'use client';

import { use, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { BizHeader } from '@/components/business/BizHeader';
import { RequestStepper } from '@/components/business/RequestStepper';
import { OptionRow } from '@/components/business/OptionRow';
import { PriceRow } from '@/components/business/PriceRow';
import { BizPrice } from '@/components/business/BizText';
import { num } from '@/lib/format';
import { businessApi, BusinessApiError, type BusinessRequestDetail } from '@/services/business-client';

const SETTLEMENT_METHODS = ['gateway', 'wallet', 'transfer'] as const;

export default function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('Business');
  const locale = useLocale();
  const router = useRouter();

  const [req, setReq] = useState<BusinessRequestDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [method, setMethod] = useState<string>('gateway');
  const [officialInvoice, setOfficialInvoice] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    businessApi
      .getRequest(id)
      .then((d) => {
        if (!alive) return;
        setReq(d);
        // حالت غیرمجاز: پرداخت نهایی فقط در approved فعال است (سند)
        if (d.status !== 'approved') {
          router.replace(`/business/requests/${d.id}`);
        }
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [id, router]);

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await businessApi.createPayment(
        id,
        { kind: 'settlement', method: officialInvoice ? `${method}:official_invoice` : method },
        crypto.randomUUID()
      );
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        router.push(`/business/requests/${id}/voucher`);
      }
    } catch (e) {
      setPayError(
        e instanceof BusinessApiError && e.code === 'payment_failed'
          ? t('deposit.paymentFailed')
          : t('common.networkErrorBody')
      );
      setPaying(false);
    }
  };

  if (loadError) {
    return (
      <>
        <BizHeader requestCode={id} />
        <main className="fz-container fz-main">
          <div className="fz-card">
            <h2>{t('common.networkErrorTitle')}</h2>
            <p className="fz-muted">{t('common.networkErrorBody')}</p>
            <button type="button" className="fz-btn" onClick={() => window.location.reload()}>{t('common.retry')}</button>
          </div>
        </main>
      </>
    );
  }

  if (!req) {
    return (
      <>
        <BizHeader requestCode={id} />
        <RequestStepper activeStep={4} />
        <main className="fz-container fz-main">
          <div className="fz-split">
            <div className="fz-split__main">
              <div className="fz-skeleton" style={{ height: 40, width: '50%' }} />
              <div className="fz-skeleton" style={{ height: 300 }} />
            </div>
            <div className="fz-skeleton" style={{ flexBasis: 420, height: 380 }} />
          </div>
        </main>
      </>
    );
  }

  const remaining = req.totalAmountRial - req.grantAmountRial - req.paidAmountRial;

  return (
    <>
      <BizHeader requestCode={req.code} />
      <RequestStepper activeStep={4} />

      <main className="fz-container fz-main">
        <div className="fz-split">
          <div className="fz-split__main">
            <div className="fz-stack" style={{ gap: 10 }}>
              <h1>{t('settlement.title')}</h1>
              <p className="fz-muted">{t('settlement.lead')}</p>
            </div>

            {/* صورتحساب نهایی با کسر کمک‌هزینه و پیش‌پرداخت */}
            <section className="fz-card" style={{ gap: 0 }}>
              <div
                className="fz-row fz-faint fz-strong"
                style={{ paddingBottom: 14, borderBottom: '1px solid var(--fz-divider)' }}
              >
                <span>{t('settlement.colDesc')}</span>
                <span>{t('settlement.colAmount')}</span>
              </div>
              <PriceRow label={t('settlement.linePackage', { count: num(req.paxCount, locale) })} note={t('settlement.linePackageNote')} amount={req.totalAmountRial - 450_000_00 - 1_200_000_0} />
              <PriceRow label={t('settlement.lineTranslator')} note={t('settlement.lineTranslatorNote')} amount={450_000_00} />
              <PriceRow label={t('settlement.lineVisa', { count: num(req.paxCount, locale) })} note={t('settlement.lineVisaNote')} amount={1_200_000_0} />
              {!req.grantPending && (
                <PriceRow label={t('settlement.lineGrant')} note={t('settlement.lineGrantNote')} amount={req.grantAmountRial} negative />
              )}
              <PriceRow label={t('settlement.lineDeposit')} note={t('settlement.lineDepositNote')} amount={req.paidAmountRial} negative />
              <PriceRow label={t('settlement.lineRemaining')} amount={remaining} total />
            </section>

            <section className="fz-card">
              <h2>{t('settlement.methodTitle')}</h2>
              <div className="fz-stack" role="radiogroup" aria-label={t('settlement.methodTitle')}>
                {SETTLEMENT_METHODS.map((m) => (
                  <OptionRow
                    key={m}
                    type="radio"
                    groupName="settlement-method"
                    selected={method === m}
                    title={t(`settlement.methods.${m}.title`)}
                    note={t(`settlement.methods.${m}.note`)}
                    onSelect={() => setMethod(m)}
                  />
                ))}
              </div>
              <label className="fz-row" style={{ justifyContent: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={officialInvoice}
                  onChange={(e) => setOfficialInvoice(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: 'var(--fz-brand)' }}
                />
                <span className="fz-muted" style={{ fontSize: 14 }}>{t('settlement.officialInvoice')}</span>
              </label>
            </section>
          </div>

          <aside className="fz-split__aside">
            <section className="fz-card fz-card--raised">
              <h2 style={{ fontSize: 18 }}>{t('settlement.tripInfo')}</h2>
              <dl className="fz-stack fz-muted" style={{ margin: 0, fontSize: 14 }}>
                <div className="fz-row">
                  <dt>{t('settlement.package')}</dt>
                  <dd className="fz-strong" style={{ margin: 0, color: 'var(--fz-text)' }}>{req.packageTitle}</dd>
                </div>
                <div className="fz-row">
                  <dt>{t('settlement.date')}</dt>
                  <dd className="fz-strong fz-num" style={{ margin: 0, color: 'var(--fz-text)' }}>
                    {req.departureDate} — {req.returnDate}
                  </dd>
                </div>
                <div className="fz-row">
                  <dt>{t('settlement.pax')}</dt>
                  <dd className="fz-strong fz-num" style={{ margin: 0, color: 'var(--fz-text)' }}>
                    {num(req.paxCount, locale)} {t('form.paxUnit')}
                  </dd>
                </div>
                <div className="fz-row">
                  <dt>{t('settlement.visa')}</dt>
                  <dd className="fz-strong" style={{ margin: 0, color: 'var(--fz-brand)' }}>{t('settlement.visaIssued')}</dd>
                </div>
              </dl>
              <div className="fz-card fz-card--dark" style={{ padding: 20, gap: 6, borderRadius: 'var(--fz-r-card-sm)' }}>
                <span className="fz-faint">{t('settlement.payAmount')}</span>
                <strong style={{ fontSize: 26 }}><BizPrice rial={remaining} locale={locale} /></strong>
                <span className="fz-faint">{t('settlement.deadline')}</span>
              </div>

              {payError && (
                <div className="fz-card fz-card--warn" style={{ padding: 14, fontSize: 13 }} role="alert">
                  {payError}
                </div>
              )}

              <div className="fz-cta-sticky">
                <button type="button" className="fz-btn fz-btn--action" disabled={paying} onClick={handlePay}>
                  {paying ? t('deposit.redirecting') : t('settlement.payCta')}
                </button>
              </div>
              <p className="fz-faint" style={{ textAlign: 'center', margin: 0 }}>{t('deposit.gatewayNote')}</p>
              <button type="button" className="fz-btn fz-btn--ghost" onClick={() => router.push(`/business/requests/${id}`)}>
                {t('settlement.backToStatus')}
              </button>
            </section>

            <p className="fz-card fz-card--warn" style={{ fontSize: 13 }}>
              {t('settlement.afterPayNote')}
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
