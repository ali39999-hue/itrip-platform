'use client';

import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertTriangle, X, CheckCircle2, Loader2 } from 'lucide-react';
import { refundBookingAdmin } from '@/actions/admin';
import { useRouter } from 'next/navigation';
import { lt } from '@/lib/lt';

export function RefundButton({ bookingId, reference }: { bookingId: string, reference: string }) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [openModal, setOpenModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  const handleConfirmRefund = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await refundBookingAdmin(bookingId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: lt(locale, { fa: 'استرداد با موفقیت در دفتر کل ثبت شد', en: 'Booking refunded successfully in general ledger', ar: 'تم استرداد الحجز بنجاح', zh: '退款成功入账', ru: 'Возврат успешно проведен' }),
        });
        setTimeout(() => {
          setOpenModal(false);
          setFeedback(null);
          router.refresh();
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || lt(locale, { fa: 'خطا در انجام استرداد', en: 'Refund operation failed', ar: 'فشلت عملية الاسترداد', zh: '退款失败', ru: 'Ошибка операции возврата' }),
        });
      }
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        aria-label={`${lt(locale, { fa: 'استرداد سفارش', en: 'Refund booking', ar: 'استرداد الحجز', zh: '退款预订', ru: 'Вернуть бронирование' })} ${reference}`}
        onClick={() => {
          setFeedback(null);
          setOpenModal(true);
        }}
        disabled={isPending}
        className="h-8 border-rose-warm/20 text-rose-warm hover:bg-rose-warm/10 focus-visible:ring-brand font-black text-xs gap-1.5"
      >
        <RotateCcw size={13} aria-hidden="true" />
        <span>{lt(locale, { fa: 'استرداد', en: 'Refund', ar: 'استرداد', zh: '退款', ru: 'Возврат' })}</span>
      </Button>

      {/* Modern In-App Confirmation Modal */}
      {openModal && (
        <div className="fixed inset-0 z-[200] bg-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface rounded-3xl p-6 border border-line shadow-elev-3 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                <AlertTriangle size={18} />
                <span>تأییدیه استرداد سفارش اداری</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                disabled={isPending}
                className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>

            {feedback ? (
              <div className={`p-4 rounded-2xl border text-center space-y-2 ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                {feedback.type === 'success' ? <CheckCircle2 size={32} className="mx-auto text-emerald-600" /> : <AlertTriangle size={32} className="mx-auto text-rose-600" />}
                <p className="text-xs font-black m-0">{feedback.message}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-sub leading-relaxed font-bold">
                  آیا از اجرای عملیات استرداد سفارش با کد پیگیری <strong className="font-mono text-ink">#{reference}</strong> اطمینان دارید؟
                  این عملیات تراز دوبل سند مالی را صادر کرده و وجه را به کیف پول یا حساب بانکی مشتری بازمی‌گرداند.
                </p>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpenModal(false)}
                    disabled={isPending}
                    className="flex-1 h-11 rounded-xl bg-soft hover:bg-line/60 text-sub font-bold text-xs transition"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRefund}
                    disabled={isPending}
                    className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-surface font-black text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isPending && <Loader2 size={14} className="animate-spin" />}
                    <span>تأیید و اجرای استرداد</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
