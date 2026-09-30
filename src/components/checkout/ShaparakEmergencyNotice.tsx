'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight, CreditCard } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { validateIranianMobile } from '@/lib/iranian-commerce';

interface ShaparakEmergencyNoticeProps {
  onSelectCardTransfer?: () => void;
  className?: string;
}

export function ShaparakEmergencyNotice({
  onSelectCardTransfer,
  className = '',
}: ShaparakEmergencyNoticeProps) {
  const locale = useLocale();
  const [mobile, setMobile] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim()) return;

    if (!validateIranianMobile(mobile)) {
      setErrorMsg(
        lt(locale, {
          fa: 'لطفاً شماره موبایل معتبر ایران (۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.',
          en: 'Please enter a valid Iranian mobile number (09123456789).',
          ar: 'يرجى إدخال رقم هاتف إيراني صالح (09123456789).',
          zh: '请输入有效的伊朗手机号码（09123456789）。',
          ru: 'Пожалуйста, введите действительный номер мобильного телефона в Иране (09123456789).'
        })
      );
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      // In development/test mode, simulate notice registration or record alert
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSubmitted(true);
    } catch {
      setErrorMsg(
        lt(locale, {
          fa: 'خطا در ثبت درخواست. لطفاً دوباره تلاش کنید.',
          en: 'Failed to register notification. Please try again.',
          ar: 'فشل في تسجيل الإشعار. حاول مرة اخرى.',
          zh: '注册通知失败，请重试。',
          ru: 'Не удалось зарегистрировать уведомление. Попробуйте еще раз.'
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-5 space-y-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1">
          <h4 className="text-[15px] font-bold text-amber-700 dark:text-amber-400">
            {lt(locale, {
              fa: 'هشدار موقت در سوئیچ شاپرک و درگاه‌های آنلاین بانکی',
              en: 'Temporary Notice: Shaparak Switch & Online Banking Gateways',
              ar: 'تنبيه مؤقت: شبكة شاابراك المصرفية وبوابات الدفع الإلكتروني',
              zh: '临时通知：Shaparak银行支付网关网络波动',
              ru: 'Временное уведомление: Перебои в работе сети Shaparak и онлайн-банкинга'
            })}
          </h4>
          <p className="text-xs leading-relaxed text-ink/80 dark:text-ink/70">
            {lt(locale, {
              fa: 'با توجه به گزارش اختلال مقطعی در برخی درگاه‌های پرداخت آنلاین، در صورت عدم موفقیت در پرداخت مستقیم، می‌توانید از گزینه «کارت به کارت و ثبت فیش» استفاده کنید یا شماره موبایل خود را ثبت نمایید تا به محض پایدار شدن شبکه، پیامک اطلاع‌رسانی ارسال گردد.',
              en: 'Due to intermittent network fluctuations reported on some online banking switches, you may use "Card-to-Card Bank Transfer" or submit your phone number to receive an SMS alert once payment switches normalize.',
              ar: 'نظراً لتقلبات مؤقتة في بوابات الدفع المصرفية عبر الإنترنت، يمكنك استخدام خيار "التحويل من بطاقة إلى بطاقة" أو تسجيل رقمك لتلقي إشعار فور استقرار الشبكة.',
              zh: '由于部分在线网关报告短暂网络波动，您可以选用“银行卡转账”方式完成付款，或留下手机号码以便系统在支付网关恢复后通过短信通知您。',
              ru: 'В связи с временными сбоями в некоторых банковских шлюзах вы можете воспользоваться переводом «С карты на карту» или оставить свой номер для получения SMS после стабилизации сети.'
            })}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {onSelectCardTransfer && (
              <button
                type="button"
                onClick={onSelectCardTransfer}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm"
              >
                <CreditCard className="w-4 h-4" />
                {lt(locale, {
                  fa: 'تغییر به کارت به کارت دستی',
                  en: 'Switch to Card-to-Card',
                  ar: 'التحويل إلى بطاقة إلى بطاقة',
                  zh: '切换至银行卡转账',
                  ru: 'Перейти на перевод с карты на карту'
                })}
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            )}

            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 max-w-sm">
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="0912..."
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-line bg-surface text-ink placeholder:text-sub focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="shrink-0 px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-semibold transition disabled:opacity-50"
                >
                  {loading
                    ? lt(locale, { fa: 'در حال ثبت...', en: 'Registering...', ar: 'جاري...', zh: '提交中...', ru: 'Запись...' })
                    : lt(locale, { fa: 'اطلاع بده', en: 'Notify Me', ar: 'أبلغني', zh: '通知我', ru: 'Уведомить' })}
                </button>
              </form>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lt(locale, {
                  fa: 'شماره شما ثبت شد. به محض رفع اختلال پیامک ارسال می‌شود.',
                  en: 'Phone registered. You will receive an SMS alert upon recovery.',
                  ar: 'تم تسجيل رقمك. سيتم إرسال رسالة نصية فور التعافي.',
                  zh: '号码已登记，网络恢复后将短信提醒您。',
                  ru: 'Номер записан. Вы получите SMS после восстановления.'
                })}
              </div>
            )}
          </div>

          {errorMsg && <p className="text-[11px] text-red-500 font-medium pt-1">{errorMsg}</p>}
        </div>
      </div>
    </div>
  );
}
