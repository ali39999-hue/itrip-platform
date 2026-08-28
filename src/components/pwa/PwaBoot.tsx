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
    <div className="fixed bottom-20 md:bottom-5 start-4 z-95 flex items-center gap-2 p-2 pe-3 rounded-xl bg-surface/95 backdrop-blur border border-line shadow-elev-3">
      <span className="grid place-items-center w-9 h-9 rounded-full bg-brand text-surface shrink-0">
        <Download size={17} />
      </span>
      <div className="min-w-0">
        <b className="block text-[12px] font-black">نصب اپلیکیشن iTrip</b>
        <span className="block text-[10.5px] font-bold text-sub">دسترسی سریعتر بدون مرورگر</span>
      </div>
      <button
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
        }}
        className="min-h-[34px] px-3 rounded-full bg-brand text-surface text-[12px] font-extrabold shrink-0"
      >
        نصب
      </button>
      <button
        onClick={() => setHidden(true)}
        aria-label="بستن"
        className="grid place-items-center w-7 h-7 rounded-full bg-soft text-sub shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  );
}

