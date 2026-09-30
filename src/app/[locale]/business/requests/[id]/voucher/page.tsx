'use client';

import { use, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { BizHeader } from '@/components/business/BizHeader';
import { RequestStepper } from '@/components/business/RequestStepper';
import { VoucherCard, type VoucherData } from '@/components/business/VoucherCard';
import { businessApi } from '@/services/business-client';
import { num } from '@/lib/format';
import { Check, Printer, Mail, Download } from 'lucide-react';

interface TravelerVoucher {
  fullName: string;
  code: string;
}

export default function VoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('Business');
  const locale = useLocale();
  const router = useRouter();

  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [travelerVouchers, setTravelerVouchers] = useState<TravelerVoucher[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    businessApi
      .getRequest(id)
      .then((req) => {
        if (!alive) return;
        // حالت غیرمجاز: ووچر فقط در issued
        if (req.status !== 'issued') {
          router.replace(`/business/requests/${req.id}`);
          return;
        }
        return businessApi.getVoucher(id).then((v) => {
          if (!alive) return;
          setVoucher(v);
          setTravelerVouchers(
            Array.from({ length: req.paxCount }, (_, i) => ({
              fullName: `${t('form.travelerN', { n: num(i + 1, locale) })}`,
              code: `${v.code}-${i + 1}`,
            }))
          );
        });
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t/locale پایدار در طول عمر صفحه
  }, [id, router]);

  const handlePrint = () => {
    // صفحه و PDF از یک منبع رندر می‌شوند — همان VoucherCard با @media print
    window.print();
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

  if (!voucher) {
    return (
      <>
        <BizHeader requestCode={id} />
        <RequestStepper activeStep={5} />
        <main className="fz-container fz-main">
          <div className="fz-split">
            <div className="fz-split__main">
              <div className="fz-skeleton" style={{ height: 340 }} />
            </div>
            <div className="fz-skeleton" style={{ flexBasis: 420, height: 320 }} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <BizHeader requestCode={voucher.code} />
      <RequestStepper activeStep={5} />

      <main className="fz-container fz-main">
        {/* نوار موفقیت */}
        <div className="fz-card fz-card--dark fz-row" style={{ padding: '30px 32px', flexDirection: 'row' }} role="status">
          <div className="fz-row" style={{ justifyContent: 'flex-start', gap: 18 }}>
            <span
              style={{
                width: 56,
                height: 56,
                flex: '0 0 auto',
                borderRadius: 'var(--fz-r-card-sm)',
                background: 'var(--fz-action)',
                color: 'var(--fz-action-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden="true"
            >
              <Check size={28} strokeWidth={2.4} />
            </span>
            <div>
              <h2 style={{ fontSize: 24 }}>{t('voucher.bannerTitle')}</h2>
              <p style={{ fontSize: 14 }}>{t('voucher.bannerBody')}</p>
            </div>
          </div>
          <div className="fz-wrap fz-print-hide">
            <button type="button" className="fz-btn" style={{ minHeight: 50 }} onClick={handlePrint}>
              <Printer size={16} aria-hidden="true" /> {t('voucher.downloadPdf')}
            </button>
            <button type="button" className="fz-btn" style={{ minHeight: 50, background: 'rgba(255,255,255,.14)', borderColor: 'transparent', color: '#fff' }}>
              <Mail size={16} aria-hidden="true" /> {t('voucher.sendEmail')}
            </button>
          </div>
        </div>

        <div className="fz-split">
          <div className="fz-split__main">
            <div className="print-area">
              <VoucherCard voucher={voucher} />
            </div>
          </div>

          <aside className="fz-split__aside">
            <div className="fz-card fz-print-hide">
              <h2 style={{ fontSize: 18 }}>{t('voucher.perTraveler')}</h2>
              <div className="fz-stack">
                {travelerVouchers.map((tv, i) => (
                  <div key={i} className="fz-card fz-card--sub fz-row">
                    <div>
                      <div className="fz-strong">{tv.fullName}</div>
                      <div className="fz-faint fz-num" dir="ltr" style={{ textAlign: 'end' }}>{tv.code}</div>
                    </div>
                    <button type="button" className="fz-btn fz-btn--sm">
                      <Download size={14} aria-hidden="true" /> {t('voucher.download')}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="fz-card fz-print-hide">
              <h2 style={{ fontSize: 18 }}>{t('voucher.nextSteps')}</h2>
              <ol className="fz-muted" style={{ margin: 0, paddingInlineStart: 20, fontSize: 14 }}>
                {[1, 2, 3, 4].map((n) => (
                  <li key={n}>{t(`voucher.nextStep${n}`)}</li>
                ))}
              </ol>
              <button type="button" className="fz-btn" onClick={() => router.push(`/business/requests/${id}`)}>
                {t('voucher.viewFile')}
              </button>
            </div>

            <div className="fz-card fz-card--dark fz-print-hide">
              <h3>{t('voucher.supportTitle')}</h3>
              <p>{t('voucher.supportBody')}</p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
