'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Loader2 } from 'lucide-react';
import { retryOutboxEvent } from '@/actions/admin';

/** Requeue button for a failed/stuck outbox row on the Ops page. */
export function OpsRetryButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  async function handleRetry() {
    if (pending) return;
    startTransition(async () => {
      const res = await retryOutboxEvent(eventId);
      if (res.success) {
        setNote(null);
        router.refresh();
      } else {
        setNote(res.error || 'خطا در تلاش مجدد');
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleRetry}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 text-[10px] font-black text-brand-dark transition hover:bg-brand/20 disabled:opacity-60 cursor-pointer"
      >
        {pending ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={11} aria-hidden="true" />}
        <span>تلاش مجدد</span>
      </button>
      {note && <span className="text-[10px] font-bold text-destructive">{note}</span>}
    </span>
  );
}
