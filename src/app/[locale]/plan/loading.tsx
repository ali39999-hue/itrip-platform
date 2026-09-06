import { FiruzoAiLoading } from '@/components/shared/FiruzoAiLoading';

export default function PlanLoading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-soft/30 py-10 px-4">
      <FiruzoAiLoading />
    </div>
  );
}

