export default function RootLoading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-mint text-brand grid place-items-center animate-spin">
        <div className="w-6 h-6 border-3 border-brand border-t-transparent rounded-full" />
      </div>
      <p className="text-xs font-bold text-sub animate-pulse">در حال آماده‌سازی اطلاعات سفر...</p>
    </div>
  );
}
