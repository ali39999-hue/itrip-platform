import { ErpSkeleton } from '@/components/admin/erp-ui';

export default function AdminLoading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading admin panel">
      <ErpSkeleton className="h-36" />
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <ErpSkeleton key={i} className="h-28" />
        ))}
      </div>
      <ErpSkeleton className="h-96" />
    </div>
  );
}
