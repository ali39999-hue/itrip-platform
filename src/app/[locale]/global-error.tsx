'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 grid place-items-center mx-auto text-2xl font-bold">
            !
          </div>
          <div>
            <h1 className="text-2xl font-black mb-2">خطای سیستمی در برنامه</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              سیستم با خطای غیرمنتظره‌ای روبرو شد. برای بارگذاری مجدد برنامه روی دکمه زیر کلیک کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full h-11 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-900 font-black text-xs transition"
          >
            بارگذاری مجدد سیستم
          </button>
        </div>
      </body>
    </html>
  );
}
