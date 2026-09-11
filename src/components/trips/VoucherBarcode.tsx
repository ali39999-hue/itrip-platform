'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { lt } from '@/lib/lt';
import { Check, Copy, ShieldCheck } from 'lucide-react';

interface VoucherBarcodeProps {
  reference: string;
  pnr?: string;
  serviceType?: string;
  locale: string;
  className?: string;
}

interface BarcodeBar {
  x: number;
  width: number;
}

/**
 * Deterministically generates SVG linear barcode lines based on a string token.
 */
function generateLinearBarcodeBars(code: string): BarcodeBar[] {
  const sanitized = (code || 'ITR-00000').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const bars: BarcodeBar[] = [];
  let currentX = 10;

  for (let i = 0; i < sanitized.length; i++) {
    const charCode = sanitized.charCodeAt(i);
    const w1 = ((charCode % 3) + 1) * 1.5;
    const s1 = (((charCode >> 1) % 2) + 1) * 1.5;
    const w2 = (((charCode >> 2) % 3) + 1) * 1.5;
    const s2 = (((charCode >> 3) % 2) + 1) * 1.5;

    bars.push({ x: currentX, width: w1 });
    currentX += w1 + s1;

    bars.push({ x: currentX, width: w2 });
    currentX += w2 + s2;
  }

  return bars;
}

export function VoucherBarcode({
  reference,
  pnr,
  locale,
  className = '',
}: VoucherBarcodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const verificationUrl = `https://firuzo.com/verify?ref=${encodeURIComponent(
    reference
  )}${pnr ? `&pnr=${encodeURIComponent(pnr)}` : ''}`;

  useEffect(() => {
    let active = true;
    async function genQr() {
      try {
        const url = await QRCode.toDataURL(verificationUrl, {
          width: 220,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        if (active) setQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    }
    genQr();
    return () => {
      active = false;
    };
  }, [verificationUrl]);

  const copyRef = () => {
    navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bars = generateLinearBarcodeBars(reference + (pnr || ''));

  return (
    <div
      className={`bg-surface dark:bg-slate-900 rounded-2xl border border-line p-5 text-center flex flex-col items-center shadow-xs ${className}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 mb-2">
        <ShieldCheck size={16} />
        <span>
          {lt(locale, {
            fa: 'شناسه تاییدیه اصالت رزرو',
            en: 'Verified Booking Authentication',
            ar: 'رمز التحقق من صحة الحجز',
            zh: '预订有效性验证码',
            ru: 'Верифицированный код брони',
          })}
        </span>
      </div>

      <p className="text-[11px] text-sub mb-4 max-w-[260px]">
        {lt(locale, {
          fa: 'این کد در گیت فرودگاه یا پذیرش هتل توسط متصدی اسکن می‌شود.',
          en: 'Scan this code at airport security, boarding gates, or hotel front desk.',
          ar: 'امسح هذا الرمز عند بوابات الصعود أو مكتب استقبال الفندق.',
          zh: '在机场安检、登机口或酒店前台出示并扫描此代码。',
          ru: 'Отсканируйте этот код при посадке или на стойке регистрации отеля.',
        })}
      </p>

      {/* QR Code Container */}
      <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-sm mb-3">
        {qrDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qrDataUrl}
            alt={`QR Verification for ${reference}`}
            width={160}
            height={160}
            className="w-36 h-36 rounded-lg object-contain"
          />
        ) : (
          <div className="w-36 h-36 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-sub">
            Loading...
          </div>
        )}
      </div>

      {/* Linear 1D Barcode (Roamarr / Boarding Pass Style) */}
      <div className="w-full max-w-[240px] px-2 py-2 bg-white rounded-lg border border-slate-200 my-2">
        <svg
          className="w-full h-10 overflow-hidden"
          viewBox="0 0 240 40"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Linear barcode ${reference}`}
        >
          <g fill="#0f172a">
            {bars.map((bar, idx) => (
              <rect
                key={idx}
                x={bar.x}
                y={2}
                width={bar.width}
                height={36}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Alphanumeric Code and Copy */}
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-xs font-black text-ink bg-soft px-3 py-1 rounded-lg border border-line">
          {reference}
        </span>
        <button
          type="button"
          onClick={copyRef}
          className="w-8 h-8 rounded-lg bg-soft border border-line hover:border-brand/40 text-sub hover:text-brand-dark grid place-items-center transition active:scale-95 min-w-[32px] min-h-[32px]"
          title={lt(locale, {
            fa: 'کپی کد رهگیری',
            en: 'Copy reference code',
            ar: 'نسخ رمز الحجز',
            zh: '复制参考号',
            ru: 'Скопировать номер брони',
          })}
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </button>
      </div>

      {pnr && (
        <span className="text-[10px] font-mono text-sub mt-1">
          PNR: <strong className="text-ink">{pnr}</strong>
        </span>
      )}
    </div>
  );
}
