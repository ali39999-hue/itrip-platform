'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error caught:', error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body className="bg-soft text-ink font-sans antialiased min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-surface border border-line rounded-3xl p-8 shadow-elev-2 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mx-auto shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-black text-ink">خطای پیش‌بینی نشده در سامانه</h1>
            <p className="text-xs md:text-sm text-sub leading-relaxed">
              متأسفانه مشکلی در بارگذاری رخ داده است. لطفاً صفحه را بازنشانی فرمایید.
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full h-11 rounded-xl bg-brand hover:bg-brand-dark text-surface font-black text-xs md:text-sm transition flex items-center justify-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
          >
            <RotateCcw size={16} />
            تلاش مجدد
          </button>
        </div>
      </body>
    </html>
  );
}
