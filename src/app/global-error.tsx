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
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-[#053f3e] text-white flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full text-center bg-white/90 text-gray-900 border border-gray-200 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 grid place-items-center mx-auto text-2xl font-bold shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black mb-2 text-gray-900">System Error · خطای موقت سیستم</h1>
            <p className="text-xs md:text-sm text-gray-600 leading-relaxed break-words">
              An unexpected error occurred while loading the page. Please click below to retry.
              <br />
              خطای فنی موقت در بارگذاری صفحه رخ داد. لطفاً برای بازیابی روی دکمه زیر کلیک کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full h-12 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 font-black text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <RotateCcw size={16} />
            Retry / تلاش مجدد
          </button>
        </div>
      </body>
    </html>
  );
}
