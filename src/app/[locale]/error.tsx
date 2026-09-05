'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('Common');

  if (process.env.NODE_ENV !== 'production') {
    console.error('Handled ErrorBoundary exception:', error);
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-surface border border-line rounded-3xl p-8 shadow-elev-2 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center mx-auto border border-rose-200">
          <AlertTriangle size={32} />
        </div>
        <div>
          <h1 className="text-xl font-black text-ink mb-2">
            {t('aria.error') || 'اختلال موقت در پردازش درخواست'}
          </h1>
          <p className="text-xs text-sub leading-relaxed">
            متأسفانه در پردازش اطلاعات خطایی رخ داد. لطفاً مجدداً تلاش نمایید یا به صفحه اصلی بازگردید.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="h-11 px-5 rounded-xl bg-brand text-surface font-black text-xs hover:bg-brand-dark transition flex items-center gap-2 shadow-xs active:scale-95"
          >
            <RefreshCw size={14} />
            <span>{t('aria.retry') || 'تلاش دوباره'}</span>
          </button>
          <Link
            href="/"
            className="h-11 px-5 rounded-xl bg-soft border border-line text-ink font-bold text-xs hover:bg-line/40 transition flex items-center gap-2"
          >
            <Home size={14} />
            <span>صفحه اصلی</span>
          </Link>
        </div>
      </div>
    </div>
  );
}