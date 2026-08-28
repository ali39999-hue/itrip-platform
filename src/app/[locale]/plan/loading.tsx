export default function PlanLoading() {
  return (
    <div className="min-h-screen bg-soft/40 py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-20 bg-surface border border-line rounded-3xl animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-3xl bg-surface border border-line animate-pulse space-y-3">
              <div className="h-5 w-40 bg-soft rounded" />
              <div className="h-3 w-full bg-soft rounded" />
              <div className="h-3 w-3/4 bg-soft rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
