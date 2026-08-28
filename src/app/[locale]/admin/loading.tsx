export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-surface border border-line rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-96 bg-surface border border-line rounded-2xl animate-pulse" />
    </div>
  );
}
