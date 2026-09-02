export default function GenericLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading..."
      className="max-w-[1280px] mx-auto px-4 md:px-10 py-8"
    >
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-line rounded w-1/3" />
        <div className="h-64 bg-line rounded-2xl" />
        <div className="h-32 bg-line rounded-2xl" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}