'use client';

import { Hand } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface ManualOpsNoticeProps {
  title?: string;
  description?: React.ReactNode;
}

export function ManualOpsNotice({ title, description }: ManualOpsNoticeProps) {
  const locale = useLocale();

  const defaultTitle = lt(locale, {
    fa: 'هر درخواست را یک نفر انجام می‌دهد، نه یک ربات',
    en: 'Handled personally by our team, not an automated bot',
    ar: 'كل طلب يُنفذ شخصياً بواسطة فريقنا، وليس روبوتاً',
    zh: '由人工专员亲自跟进办理，非机器人自动化处理',
    ru: 'Каждый запрос обрабатывается специалистом, а не ботом',
  });

  const defaultDesc = (
    <>
      {lt(locale, {
        fa: 'واریز اعتبار توسط تیم محلی ما و به‌صورت دستی انجام می‌شود. در ساعات کاری (۹ تا ۲۱ به وقت تهران) معمولاً زیر ۳۰ دقیقه و خارج از آن تا صبح روز بعد طول می‌کشد. تأیید نهایی را دریافت می‌کنید. در صورت عدم انجام، کل مبلغ بدون کسر بازگردانده می‌شود.',
        en: 'Credits and service confirmations are processed manually by our local concierge. During operational hours (09:00–21:00 Tehran time), requests usually take under 30 minutes. If unfulfilled, 100% of your funds are returned with zero deductions.',
        ar: 'تتم معالجة الطلبات يدوياً بواسطة فريقنا المحلي. خلال ساعات العمل عادة ما يستغرق الأمر أقل من 30 دقيقة. إذا لم نتمكن من التنفيذ، فسيتم استرداد المبلغ كاملاً دون أي خصم.',
        zh: '服务确认与充值由当地专员人工处理。工作时间内通常在30分钟内完成。如无法完成办理，全额款项将无条件原路退回。',
        ru: 'Обработка и подтверждение осуществляются нашей местной командой вручную. В рабочее время это занимает менее 30 минут. При невозможности выполнения возвращается 100% средств.',
      })}
    </>
  );

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start p-5 bg-gold-soft border border-gold/30 rounded-2xl mt-6">
      <span className="flex-shrink-0 w-10 h-10 grid place-items-center rounded-full bg-action text-ink">
        <Hand size={21} />
      </span>
      <div>
        <h4 className="m-0 mb-1 text-[16px] font-bold">{title || defaultTitle}</h4>
        <p className="m-0 text-[14px] text-price leading-[1.7]">
          {description || defaultDesc}
        </p>
      </div>
    </div>
  );
}
