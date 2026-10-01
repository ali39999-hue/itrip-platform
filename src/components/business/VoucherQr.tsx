'use client';

import { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';

/**
 * QRCode — رندر QR به‌صورت data-URL با کتابخانه qrcode (از قبل نصب).
 * payload شامل کد ووچر و لینک تایید اعتبار است.
 */
export function QRCode({ value, size = 150 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCodeLib.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (alive) setDataUrl(url);
      })
      .catch(() => {
        if (alive) setDataUrl(null);
      });
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className="fz-skeleton"
        style={{ width: size, height: size }}
        role="img"
        aria-label={value}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data-URL تولیدشده سمت کلاینت؛ بهینه‌سازی مسیر ندارد
    <img src={dataUrl} width={size} height={size} alt={value} style={{ display: 'block' }} />
  );
}
