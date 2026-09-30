'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { BizHeader } from '@/components/business/BizHeader';
import { RequestStepper } from '@/components/business/RequestStepper';
import { StatusTimeline } from '@/components/business/StatusTimeline';
import { StatusTag } from '@/components/business/StatusTag';
import { PriceRow } from '@/components/business/PriceRow';
import { businessApi, type BusinessRequestDetail } from '@/services/business-client';
import { Check, RefreshCw } from 'lucide-react';

const POLL_MS = 60_000; // سند: هر ۶۰ ثانیه وضعیت تازه گرفته شود

export default function RequestStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('Business');
  const locale = useLocale();
  const router = useRouter();

  const [req, setReq] = useState<BusinessRequestDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const load = (silent: boolean) => {
    if (!silent) setLoadError(false);
    return businessApi
      .getRequest(id)
      .then((d) => {
        setReq(d);
        setRefreshedAt(new Date().toLocaleTimeString(locale));
        // ریدایرکت حالت غیرمجاز: اگر به ووچر صادر شده، برو به ووچر
        if (d.status === 'issued') {
          router.replace(`/business/requests/${d.id}/voucher`);
        }
      })
      .catch(() => {
        if (!silent) setLoadError(true);
      });
  };

  useEffect(() => {
    load(false);
    timerRef.current = window.setInterval(() => load(true), POLL_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load روی id/locale پایدار است
  }, [id]);

  if (loadError && !req) {
    return (
      <>
        <BizHeader requestCode={id} />
        <main className="fz-container fz-main">
          <div className="fz-card">
            <h2>{t('common.networkErrorTitle')}</h2>
            <p className="fz-muted">{t('common.networkErrorBody')}</p>
            <button type="button" className="fz-btn" onClick={() => load(false)}>{t('common.retry')}</button>
          </div>
        </main>
      </>
    );
  }

  if (!req) {
    return (
      <>
        <BizHeader requestCode={id} />
        <RequestStepper activeStep={3} />
        <main className="fz-container fz-main">
          <div className="fz-split">
            <div className="fz-split__main">
              <div className="fz-skeleton" style={{ height: 100 }} />
              <div className="fz-skeleton" style={{ height: 320 }} />
              <div className="fz-skeleton" style={{ height: 220 }} />
            </div>
            <div className="fz-skeleton" style={{ flexBasis: 420, height: 380 }} />
          </div>
        </main>
      </>
    );
  }

  // نوار تایم‌لاین شش‌مرحله‌ای — وضعیت درخواست → مرحله فعال
  const stepIndex: Record<string, number> = {
    draft: 1,
    submitted: 2,
    deposit_paid: 3,
    under_review: 3,
    changes_requested: 3,
    approved: 4,
    issued: 5,
    cancelled: 3,
  };
  const active = stepIndex[req.status] ?? 3;

  const isCancelled = req.status === 'cancelled';
  const isApproved = req.status === 'approved';
  const isUnderReview = req.status === 'under_review' || req.status === 'deposit_paid' || req.status === 'changes_requested';

  return (
    <>
      <BizHeader requestCode={req.code} />
      <RequestStepper activeStep={active} />

      <main className="fz-container fz-main">
        <div className="fz-split">
          <div className="fz-split__main">
            {/* نوار تایید بالای صفحه */}
            <div className="fz-card fz-card--tint fz-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <span
                style={{
                  width: 52,
                  height: 52,
                  flex: '0 0 auto',
                  borderRadius: 'var(--fz-r-card-sm)',
                  background: 'var(--fz-brand-deep)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                <Check size={26} strokeWidth={2.5} />
              </span>
              <div style={{ flex: 1 }}>
                <h2>{t('status.bannerTitle')}</h2>
                <p className="fz-muted" style={{ fontSize: 14 }}>
                  {req.assigneeName
                    ? t('status.bannerWithAssignee', { assignee: req.assigneeName })
                    : t('status.bannerBody')}
                </p>
              </div>
              <button type="button" className="fz-btn fz-btn--sm" onClick={() => load(false)} aria-label={t('status.refreshAria')}>
                <RefreshCw size={14} aria-hidden="true" /> {refreshedAt}
              </button>
            </div>

            {/* تایم‌لاین پنج‌مرحله‌ای */}
            <section className="fz-card">
              <h2>{t('status.reviewTitle')}</h2>
              {req.timeline.length > 0 ? (
                <StatusTimeline steps={req.timeline} />
              ) : (
                <StatusTimeline
                  steps={[
                    { title: t('status.step1'), note: t('status.step1Note'), state: 'done' },
                    { title: t('status.step2'), note: t('status.step2Note'), state: 'doing' },
                    { title: t('status.step3'), note: t('status.step3Note'), state: 'waiting' },
                    { title: t('status.step4'), note: t('status.step4Note'), state: 'waiting' },
                    { title: t('status.step5'), note: t('status.step5Note'), state: 'waiting' },
                  ]}
                />
              )}
            </section>

            {/* وضعیت مدارک */}
            <section className="fz-card">
              <h2>{t('status.docsTitle')}</h2>
              <div className="fz-stack">
                {req.documents.length === 0 &&
                  [0, 1].map((i) => (
                    <div key={i} className="fz-card fz-card--sub fz-row">
                      <div className="fz-skeleton" style={{ height: 20, width: '50%' }} />
                      <div className="fz-skeleton" style={{ height: 30, width: 90 }} />
                    </div>
                  ))}
                {req.documents.map((doc) => (
                  <div key={doc.id} className="fz-card fz-card--sub fz-row">
                    <div>
                      <div className="fz-strong">{t(`form.docTypes.${doc.type}`, { defaultMessage: doc.type })}</div>
                      <div className="fz-faint">{doc.state === 'rejected' && doc.rejectReason ? doc.rejectReason : '—'}</div>
                    </div>
                    <div className="fz-row" style={{ gap: 12 }}>
                      {doc.state === 'approved' && <StatusTag state="ok" />}
                      {doc.state === 'rejected' && <StatusTag state="warn" />}
                      {doc.state === 'pending' && <StatusTag state="pending" />}
                      {doc.state === 'rejected' ? (
                        <label className="fz-btn fz-btn--sm">
                          <input
                            type="file"
                            className="fz-sr"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const fd = new FormData();
                              fd.set('type', doc.type);
                              fd.set('fileName', f.name);
                              fd.set('file', f);
                              businessApi.uploadDocument(req.id, fd).then(() => load(false));
                            }}
                          />
                          {t('status.reupload')}
                        </label>
                      ) : (
                        <button type="button" className="fz-btn fz-btn--sm">{t('status.view')}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* خلاصه مالی + کارت وقت سفارت */}
            <aside className="fz-split__aside">
              <div className="fz-card fz-card--raised">
                <h2 style={{ fontSize: 18 }}>{t('status.financeTitle')}</h2>
                <div>
                  <PriceRow label={t('status.total')} amount={req.totalAmountRial} />
                  <PriceRow label={t('status.paidDeposit')} amount={req.paidAmountRial} negative />
                  <PriceRow
                    label={
                      req.grantPending
                        ? t('status.grantPending')
                        : t('status.grantDeducted')
                    }
                    amount={req.grantAmountRial}
                    negative={!req.grantPending}
                  />
                  <PriceRow label={t('status.remaining')} amount={req.totalAmountRial - req.grantAmountRial - req.paidAmountRial} total />
                </div>

                {isCancelled && (
                  <div className="fz-card fz-card--warn" style={{ padding: 18, gap: 6, borderRadius: 'var(--fz-r-card-sm)' }}>
                    <span className="fz-strong">{t('status.cancelledTitle')}</span>
                    <span style={{ fontSize: 13 }}>{t('status.cancelledBody')}</span>
                  </div>
                )}

                {isUnderReview && (
                  <>
                    <div className="fz-card fz-card--warn" style={{ padding: 18, gap: 6, borderRadius: 'var(--fz-r-card-sm)' }}>
                      <span className="fz-strong">{t('status.reviewingTitle')}</span>
                      <span style={{ fontSize: 13 }}>{t('status.reviewingBody')}</span>
                    </div>
                    <button type="button" className="fz-btn fz-btn--action" aria-disabled="true" disabled>
                      {t('status.disabledSettleCta')}
                    </button>
                  </>
                )}

                {isApproved && (
                  <div className="fz-cta-sticky">
                    <button
                      type="button"
                      className="fz-btn fz-btn--action"
                      onClick={() => router.push(`/business/requests/${req.id}/settlement`)}
                    >
                      {t('status.settleCta')}
                    </button>
                  </div>
                )}

                {!isApproved && !isUnderReview && !isCancelled && (
                  <div className="fz-cta-sticky">
                    <button type="button" className="fz-btn fz-btn--action" aria-disabled="true" disabled>
                      {t('status.disabledSettleCta')}
                    </button>
                  </div>
                )}
              </div>

              <div className="fz-card fz-card--dark">
                <h3>{t('status.embassyTitle')}</h3>
                <p>{t('status.embassyBody')}</p>
              </div>
            </aside>
          </div>
      </main>
    </>
  );
}
