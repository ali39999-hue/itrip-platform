'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { refundBookingAdmin } from '@/actions/admin';
import { useRouter } from 'next/navigation';
import { lt } from '@/lib/lt';

export function RefundButton({ bookingId, reference }: { bookingId: string, reference: string }) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRefund = () => {
    if (!confirm(lt(locale, { fa: `آیا از استرداد رزرو ${reference} مطمئن هستید؟`, en: `Are you sure you want to refund booking ${reference}?`, ar: `هل أنت متأكد من استرداد الحجز ${reference}؟`, zh: `确定要退款预订 ${reference} 吗？`, ru: `Вернуть бронирование ${reference}?` }))) return;

    startTransition(async () => {
      const res = await refundBookingAdmin(bookingId);
      if (res.success) {
        alert(lt(locale, { fa: 'استرداد با موفقیت انجام شد', en: 'Booking refunded successfully', ar: 'تم استرداد الحجز بنجاح', zh: '退款成功', ru: 'Возврат выполнен' }));
        router.refresh();
      } else {
        alert(lt(locale, { fa: `خطا: ${res.error}`, en: `Error: ${res.error}`, ar: `خطأ: ${res.error}`, zh: `错误：${res.error}`, ru: `Ошибка: ${res.error}` }));
      }
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      aria-label={`${lt(locale, { fa: 'استرداد سفارش', en: 'Refund booking', ar: 'استرداد الحجز', zh: '退款预订', ru: 'Вернуть бронирование' })} ${reference}`}
      onClick={handleRefund}
      disabled={isPending}
      className="h-8 border-rose-warm/20 text-rose-warm hover:bg-rose-warm/10 focus-visible:ring-brand"
    >
      <RotateCcw size={13} aria-hidden="true" /> {isPending ? lt(locale, { fa: 'در حال استرداد...', en: 'Refunding...', ar: 'جارٍ الاسترداد...', zh: '退款中…', ru: 'Возврат…' }) : lt(locale, { fa: 'استرداد', en: 'Refund', ar: 'استرداد', zh: '退款', ru: 'Возврат' })}
    </Button>
  );
}
