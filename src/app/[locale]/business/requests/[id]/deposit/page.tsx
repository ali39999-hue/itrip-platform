'use client';

import { use, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { BizHeader } from '@/components/business/BizHeader';
import { RequestStepper } from '@/components/business/RequestStepper';
import { OptionRow } from '@/components/business/OptionRow';
import { PriceRow } from '@/components/business/PriceRow';
import { BizPrice } from '@/components/business/BizText';
import { businessApi, BusinessApiError, type BusinessRequestDetail } from '@/services/business-client';
import { num } from '@/lib/format';
import { UploadCloud } from 'lucide-react';

const DEPOSIT_METHODS = [
  { key: 'gateway', tagKey: 'instant', reveals: false },
  { key: 'wallet', tagKey: 'noFee', reveals: false },
  { key: 'credit', tagKey: 'needsApproval', reveals: false },
  { key: 'receipt', tagKey: 'within24h', reveals: true },
] as const;

export default function DepositPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('Business');
  const locale = useLocale();
  const router = useRouter();

  const [req, setReq] = useState<BusinessRequestDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [method, setMethod] = useState<string>('gateway');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    businessApi
      .getRequest(id)
      .then((d) => {
        if (!alive) return;
        setReq(d);
        // حالت غیرمجاز: سند — «اگر وضعیت درخواست با صفحه نمی‌خواند، ریدایرکت به صفحه وضعیت»
        if (d.status !== 'submitted' && d.status !== 'draft') {
          router.replace(`/business/requests/${d.id}`);
        }
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [id, router]);

  /* پس از بازگشت از درگاه، نتیجه فقط از کال‌بک سرور خوانده می‌شود، نه از پارامتر URL (سند) */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'return') {
      businessApi.getRequest(id).then(setReq).catch(() => undefined);
      // پارامتر را از URL پاک می‌کنیم تا رفرش دوباره همان حالت را نسازد
      params.delete('payment');
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState(null, '', url.toString());
    }
  }, [id]);

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await businessApi.createPayment(
        id,
        { kind: 'deposit', method },
        crypto.randomUUID()
      );
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        // TODO(biz-backend): درگاه واقعی — فعلاً به وضعیت
        router.push(`/business/requests/${id}`);
      }
    } catch (e) {
      // سند: 402 payment_failed → بازگشت به همان صفحه با امکان تلاش دوباره
      setPayError(e instanceof BusinessApiError && e.code === 'payment_failed'
        ? t('deposit.paymentFailed')
        : t('common.networkErrorBody'));
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
        <RequestStepper activeStep={2} />
        <main className="fz-container fz-main">
          <div className="fz-split">
            <div className="fz-split__main">
              <div className="fz-skeleton" style={{ height: 40, width: '50%' }} />
              <div className="fz-skeleton" style={{ height: 260 }} />
            </div>
            <div className="fz-skeleton" style={{ flexBasis: 420, height: 380 }} />
          </div>
        </main>
      </>
    );
  }

  const isReceipt = method === 'receipt';

  return (
    <>
      <BizHeader requestCode={req.code} />
      <RequestStepper activeStep={2} />

      <main className="fz-container fz-main">
        <div className="fz-split">
          <div className="fz-split__main">
            <div className="fz-stack" style={{ gap: 10 }}>
              <h1>{t('deposit.title')}</h1>
              <p className="fz-muted">{t('deposit.lead')}</p>
            </div>

            <section className="fz-card">
              <h2>{t('deposit.methodTitle')}</h2>
              <div className="fz-stack" style={{ gap: 8 }} role="radiogroup" aria-label={t('deposit.methodTitle')}>
                {DEPOSIT_METHODS.map((m) => (
                  <OptionRow
                    key={m.key}
                    type="radio"
                    groupName="deposit-method"
                    selected={method === m.key}
                    title={t(`deposit.methods.${m.key}.title`)}
                    note={t(`deposit.methods.${m.key}.note`)}
                    tag={t(`deposit.tags.${m.tagKey}`)}
                    onSelect={() => setMethod(m.key)}
                    revealContent={
                      m.reveals ? (
                        <div className="fz-stack">
                          <div className="fz-strong" style={{ color: 'var(--fz-brand-deep)' }}>{t('deposit.receiptAccount')}</div>
                          <div className="fz-grid fz-grid--2 fz-muted" style={{ fontSize: 14, gap: 12 }}>
                            <span dir="ltr" style={{ textAlign: 'end' }}>IR— [SHEBA]</span>
                            <span>{t('deposit.accountName')}: <b style={{ color: 'var(--fz-text)' }}>[FIRUZO]</b></span>
                          </div>
                          <label className="fz-btn" style={{ alignSelf: 'flex-start' }}>
                            <input
                              type="file"
                              className="fz-sr"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) businessApi.uploadDocument(id, (() => { const fd = new FormData(); fd.set('type', 'receipt'); fd.set('fileName', f.name); fd.set('file', f); return fd; })());
                              }}
                            />
                            <UploadCloud size={16} aria-hidden="true" /> {t('deposit.uploadReceipt')}
                          </label>
                        </div>
                      ) : undefined
                    }
                    revealed={m.reveals && isReceipt}
                  />
                ))}
              </div>
            </section>

            <p className="fz-card fz-card--warn" style={{ fontSize: 14 }}>
              {t('deposit.refundPolicy')}
            </p>
          </div>

          {/* صورتحساب اولیه */}
          <aside className="fz-split__aside">
            <section className="fz-card fz-card--raised">
              <h2 style={{ fontSize: 18 }}>{t('deposit.invoiceTitle')}</h2>
              <div>
                <PriceRow label={t('deposit.linePackage', { count: num(req.paxCount, locale) })} amount={req.totalAmountRial - req.grantAmountRial - 1_200_000_0} />
                <PriceRow label={t('deposit.lineTranslator')} amount={450_000_00} />
                <PriceRow label={t('deposit.lineVisa')} amount={1_200_000_0} />
                <PriceRow label={t('deposit.total')} amount={req.totalAmountRial} total />
              </div>

              <div className="fz-card fz-card--dark" style={{ padding: 20, gap: 6, borderRadius: 'var(--fz-r-card-sm)' }}>
                <span className="fz-faint">{t('deposit.payNow')}</span>
                <strong style={{ fontSize: 26 }}><BizPrice rial={req.depositAmountRial} locale={locale} /></strong>
                <span className="fz-faint">
                  {t('deposit.remainingAfter', {
                    remaining: t('price', { amount: num((req.totalAmountRial - req.depositAmountRial) / 10, locale) }),
                  })}
                </span>
              </div>

              {payError && (
                <div className="fz-card fz-card--warn" style={{ padding: 14, fontSize: 13 }} role="alert">
                  {payError}
                </div>
              )}

              <div className="fz-cta-sticky">
                <button type="button" className="fz-btn fz-btn--action" disabled={paying} onClick={handlePay}>
                  {paying ? t('deposit.redirecting') : t('deposit.payCta')}
                </button>
              </div>
              <p className="fz-faint" style={{ textAlign: 'center', margin: 0 }}>{t('deposit.gatewayNote')}</p>
              <button type="button" className="fz-btn fz-btn--ghost" onClick={() => router.push('/business/requests/new')}>
                {t('deposit.backToForm')}
              </button>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
