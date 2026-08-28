'use client';

import { useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Runtime error captured by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-surface border border-line rounded-3xl p-8 shadow-elev-2 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
          <AlertTriangle size={32} />
        </div>
        <div>
          <h2 className="text-xl font-black text-ink mb-2">خطایی در بارگذاری صفحه رخ داد</h2>
          <p className="text-xs text-sub leading-relaxed">
            متأسفانه در دریافت اطلاعات یا اجرای عملیات مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="h-11 px-5 rounded-xl bg-brand text-surface font-bold text-xs hover:bg-brand-dark transition flex items-center gap-2"
          >
            <RotateCcw size={15} />
            <span>تلاش مجدد</span>
          </button>
          <Link
            href="/"
            className="h-11 px-5 rounded-xl bg-soft border border-line text-ink font-bold text-xs hover:bg-line/40 transition flex items-center gap-2"
          >
            <Home size={15} />
            <span>صفحه اصلی</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
