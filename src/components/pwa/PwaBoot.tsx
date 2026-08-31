'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaBoot() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!deferred || hidden) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 end-4 md:end-6 z-[115] flex items-center gap-3 p-2.5 pe-3.5 rounded-2xl bg-surface/95 backdrop-blur border border-line shadow-elev-3 animate-in slide-in-from-bottom-2 duration-300">
      <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand text-surface shrink-0 shadow-sm">
        <Download size={17} />
      </span>
      <div className="min-w-0">
        <b className="block text-[12px] font-black text-ink leading-snug">نصب اپلیکیشن Firuzo</b>
        <span className="block text-[10.5px] font-bold text-sub">دسترسی سریع‌تر بدون مرورگر</span>
      </div>
      <button
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
        }}
        className="min-h-[34px] px-3.5 rounded-xl bg-action hover:bg-action-hover text-[#14201f] text-[12px] font-black shrink-0 transition shadow-sm"
      >
        نصب
      </button>
      <button
        onClick={() => setHidden(true)}
        aria-label="بستن"
        className="grid place-items-center w-7 h-7 rounded-lg bg-soft text-sub hover:text-ink shrink-0 transition"
      >
        <X size={13} />
      </button>
    </div>
  );
}
