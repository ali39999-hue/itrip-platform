import { HotelSkeletonList } from '@/components/hotels/search';

export default function HotelsLoading() {
  return (
    <div className="min-h-screen bg-soft/40 py-8 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="h-16 bg-surface border border-line rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="hidden lg:block lg:col-span-1 h-96 bg-surface border border-line rounded-2xl animate-pulse" />
          <div className="lg:col-span-3">
            <HotelSkeletonList count={4} />
          </div>
        </div>
      </div>
    </div>
  );
}
