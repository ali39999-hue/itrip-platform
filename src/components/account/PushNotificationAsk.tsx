'use client';

import { useLocale } from 'next-intl';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { FiruzoMascot } from '@/components/shared/FiruzoMascot';
import { BellRing, BellOff, CheckCircle2 } from 'lucide-react';
import { lt } from '@/lib/lt';

/**
 * Soft-ask card for enabling web push notifications (پوش نوتیفیکیشن),
 * rendered on the customer dashboard. Never auto-prompts — the browser
 * permission dialog fires only from the explicit button click.
 */
export function PushNotificationAsk() {
  const locale = useLocale();
  const { supported, enabled, permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications(locale);

  if (loading || !supported || !enabled || permission === 'denied') {
    return null;
  }

  if (subscribed) {
    return (
      <div className="bg-surface rounded-2xl p-4 border border-line shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
            <CheckCircle2 size={18} aria-hidden="true" />
          </span>
          <p className="text-xs font-black text-ink leading-relaxed">
            {lt(locale, {
              fa: 'اعلان‌های سفر روشن است — خبر تایید رزرو و بلیط را زودتر از همه می‌گیری.',
              en: 'Travel notifications are on — booking and ticket updates reach you first.',
              ar: 'إشعارات السفر مفعلة — تصلك تحديثات الحجز أولاً.',
              zh: '旅行通知已开启——预订和出票更新第一时间送达。',
              ru: 'Уведомления о поездках включены — вы узнаете первым.',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => unsubscribe()}
          className="shrink-0 min-h-[44px] px-3 rounded-xl text-[11px] font-black text-sub hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand inline-flex items-center gap-1.5"
        >
          <BellOff size={14} aria-hidden="true" />
          <span className="hidden sm:inline">
            {lt(locale, { fa: 'خاموش', en: 'Turn off', ar: 'إيقاف', zh: '关闭', ru: 'Выключить' })}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-l from-mint/70 to-surface rounded-2xl p-4 sm:p-5 border border-brand/20 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <FiruzoMascot emotion="excited" size={56} className="hidden sm:block" />
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-dark sm:hidden">
          <BellRing size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-ink">
            {lt(locale, { fa: 'خبرهای سفرت را زودتر از همه بگیر 🔔', en: 'Get travel updates before anyone else 🔔', ar: 'احصل على تحديثات سفرك أولاً 🔔', zh: '第一时间获取旅行更新 🔔', ru: 'Узнавайте о поездках первым 🔔' })}
          </p>
          <p className="text-[11.5px] font-bold text-sub mt-1 leading-relaxed">
            {lt(locale, {
              fa: 'با فعال‌سازی اعلان، تایید رزرو، صدور بلیط و وضعیت استرداد را بدون چک کردن سایت ببین. هر زمان بخواهی خاموشش کن.',
              en: 'Enable notifications to see booking confirmations, ticket issuing and refund updates without checking the site. Turn off anytime.',
              ar: 'فعّل الإشعارات لرؤية تأكيدات الحجز وحالة الاسترداد دون فتح الموقع.',
              zh: '开启通知即可随时查看预订确认、出票与退款状态，无需打开网站。',
              ru: 'Включите уведомления, чтобы видеть подтверждения и статусы без захода на сайт.',
            })}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => subscribe()}
        className="shrink-0 min-h-[44px] px-5 rounded-xl bg-brand hover:bg-brand-2 text-surface text-xs font-black transition active:scale-[0.98] inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark"
      >
        <BellRing size={15} aria-hidden="true" />
        {lt(locale, { fa: 'فعال‌سازی اعلان‌ها', en: 'Enable notifications', ar: 'تفعيل الإشعارات', zh: '开启通知', ru: 'Включить уведомления' })}
      </button>
    </div>
  );
}
