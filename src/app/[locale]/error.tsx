'use client';

import { useTranslations } from 'next-intl';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('Common');
  return (
    <div className="max-w-[1280px] mx-auto px-4 py-24 text-center">
      <h1 className="text-xl font-black text-ink mb-4">{t('aria.error') || 'An Error Occurred'}</h1>
      <p className="text-sub mb-6">{error.message}</p>
      <button onClick={reset} className="bg-brand text-surface px-6 py-3 rounded-xl font-black">
        {t('aria.retry') || 'Retry'}
      </button>
    </div>
  );
}