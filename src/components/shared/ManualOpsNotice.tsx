import { Hand } from 'lucide-react';

interface ManualOpsNoticeProps {
  title?: string;
  description?: React.ReactNode;
}

export function ManualOpsNotice({ title, description }: ManualOpsNoticeProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start p-5 bg-gold-soft border border-gold/30 rounded-2xl mt-6">
      <span className="flex-shrink-0 w-10 h-10 grid place-items-center rounded-full bg-action text-ink">
        <Hand size={21} />
      </span>
      <div>
        <h4 className="m-0 mb-1 text-[16px] font-bold">{title || 'هر درخواست را یک نفر انجام می‌دهد، نه یک ربات'}</h4>
        <p className="m-0 text-[14px] text-price leading-[1.7]">
          {description || (
            <>
              واریز اعتبار توسط تیم محلی ما و به‌صورت دستی انجام می‌شود. در ساعات کاری
              (۹ تا ۲۱ به وقت تهران) معمولاً <b>زیر ۳۰ دقیقه</b> و خارج از آن تا <b>صبح روز بعد</b> طول می‌کشد.
              تأیید نهایی را در واتساپ دریافت می‌کنید. اگر نتوانستیم انجامش دهیم، کل مبلغ بدون کسر برمی‌گردد.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
