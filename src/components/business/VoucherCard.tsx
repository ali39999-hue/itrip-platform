'use client';

import { useLocale, useTranslations } from 'next-intl';
import { QRCode } from './VoucherQr';

export interface VoucherData {
  code: string;
  packageTitle: string;
  companyName: string;
  repName: string;
  travelDate: string;
  paxCount: number;
  outboundFlight: string;
  returnFlight: string;
  hotel: string;
  guide: string;
  qrPayload: string;
  services: string[];
}

/**
 * VoucherCard — کارت ووچر گروهی.
 * همان قالبی که در PDF هم رندر می‌شود (سند: «صفحه و PDF از یک منبع رندر شوند»).
 * QR حاوی کد ووچر و لینک تایید اعتبار است.
 */
export function VoucherCard({ voucher }: { voucher: VoucherData }) {
  const t = useTranslations('Business.voucher');
  const locale = useLocale();

  const rows: Array<[string, string]> = [
    [t('company'), voucher.companyName],
    [t('rep'), voucher.repName],
    [t('travelDate'), voucher.travelDate],
    [t('pax'), String(voucher.paxCount)],
    [t('outbound'), voucher.outboundFlight],
    [t('return'), voucher.returnFlight],
    [t('hotel'), voucher.hotel],
    [t('guide'), voucher.guide],
  ];

  return (
    <article className="fz-voucher">
      <div className="fz-voucher__head">
        <div>
          <div className="fz-faint" style={{ color: 'var(--fz-text-muted)' }}>{t('groupVoucher')}</div>
          <h2 style={{ fontSize: 22 }}>{voucher.packageTitle}</h2>
        </div>
        <div style={{ textAlign: 'end' }}>
          <div className="fz-faint" style={{ color: 'var(--fz-text-muted)' }}>{t('code')}</div>
          <div className="fz-voucher__code fz-num" dir="ltr">{voucher.code}</div>
        </div>
      </div>

      <div className="fz-voucher__body">
        <dl className="fz-dl">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="fz-stack" style={{ alignItems: 'center', gap: 12 }}>
          <div className="fz-voucher__qr">
            <QRCode value={voucher.qrPayload} size={150} />
          </div>
          <p className="fz-faint" style={{ textAlign: 'center', margin: 0 }}>{t('qrHint')}</p>
        </div>
      </div>

      <div className="fz-stack" style={{ padding: '0 30px 30px', gap: 14 }}>
        <div className="fz-strong" style={{ color: 'var(--fz-brand-deep)' }}>{t('confirmedServices')}</div>
        <div className="fz-wrap">
          {voucher.services.map((s, i) => (
            <span key={i} className="fz-badge">{s}</span>
          ))}
        </div>
      </div>
      {/* locale در شماره‌گذاری ووچرهای مسافر مصرف می‌شود */}
      <span className="fz-sr" aria-hidden="true">{locale}</span>
    </article>
  );
}
