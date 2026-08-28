export default function FlightsLoading() {
  return (
    <div className="min-h-screen bg-soft/40 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-14 bg-surface border border-line rounded-2xl animate-pulse mb-6" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-surface border border-line animate-pulse flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 rounded-xl bg-soft shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-soft rounded" />
                <div className="h-3 w-20 bg-soft rounded" />
              </div>
            </div>
            <div className="flex items-center gap-6 w-full md:w-auto justify-between">
              <div className="h-4 w-24 bg-soft rounded" />
              <div className="h-10 w-28 bg-soft rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
