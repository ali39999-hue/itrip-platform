'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { refundBookingAdmin } from '@/actions/admin';
import { useRouter } from 'next/navigation';

export function RefundButton({ bookingId, reference }: { bookingId: string, reference: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRefund = () => {
    if (!confirm(`Are you sure you want to refund booking ${reference}?`)) return;
    
    startTransition(async () => {
      const res = await refundBookingAdmin(bookingId);
      if (res.success) {
        alert('Booking refunded successfully');
        router.refresh();
      } else {
        alert(`Error: ${res.error}`);
      }
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      aria-label={`استرداد سفارش ${reference}`}
      onClick={handleRefund}
      disabled={isPending}
      className="h-8 border-rose-warm/20 text-rose-warm hover:bg-rose-warm/10 focus-visible:ring-brand"
    >
      <RotateCcw size={13} aria-hidden="true" /> {isPending ? 'در حال استرداد...' : 'استرداد'}
    </Button>
  );
}
