import { useTranslations } from 'next-intl';

export default function RootLoading() {
  const t = useTranslations('Common.aria');
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('loading')}
      className="min-h-[75vh] w-full max-w-[1280px] mx-auto px-4 md:px-10 py-10 space-y-8 animate-pulse"
    >
      {/* Top Banner Skeleton */}
      <div className="w-full h-44 md:h-56 rounded-3xl bg-soft/80 border border-line/50 p-6 flex flex-col justify-end gap-3">
        <div className="h-6 w-1/3 bg-line/60 rounded-xl" />
        <div className="h-4 w-1/2 bg-line/40 rounded-lg" />
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-surface border border-line/60 p-5 space-y-4 shadow-sm">
            <div className="h-32 w-full bg-soft rounded-xl" />
            <div className="h-4 w-3/4 bg-line/50 rounded-md" />
            <div className="h-3 w-1/2 bg-line/30 rounded-md" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-5 w-20 bg-line/40 rounded-md" />
              <div className="h-8 w-24 bg-mint/50 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
}
