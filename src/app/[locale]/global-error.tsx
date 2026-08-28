'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-deep text-surface flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full text-center glass-card bg-surface/90 text-ink border border-line/80 rounded-3xl p-8 shadow-elev-3 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 grid place-items-center mx-auto text-2xl font-bold shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black mb-2 text-ink">خطای غیرمنتظره در بارگذاری سیستم</h1>
            <p className="text-xs md:text-sm text-sub leading-relaxed">
              سیستم با خطای فنی موقت روبرو شد. برای بارگذاری مجدد و بازیابی اطلاعات روی دکمه زیر کلیک کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full h-12 rounded-xl bg-action hover:bg-gold-light text-[#14201f] font-black text-sm transition flex items-center justify-center gap-2 shadow-sm hover:shadow-elev-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <RotateCcw size={16} />
            تلاش مجدد و بارگذاری سیستم
          </button>
        </div>
      </body>
    </html>
  );
}
