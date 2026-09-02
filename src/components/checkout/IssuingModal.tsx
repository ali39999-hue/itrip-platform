'use client';

import { Loader2, CheckCircle2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface IssuingModalProps {
  countdown: number;
  issueStep: number;
}

export function IssuingModal({ countdown, issueStep }: IssuingModalProps) {
  const locale = useLocale();

  const issueSteps = [
    lt(locale, {
      fa: 'در حال استعلام ظرفیت و برقراری ارتباط با تأمین‌کننده...',
      en: 'Checking capacity and connecting with supplier...',
      ar: 'جاري التحقق من السعة والاتصال بالمزود...',
      zh: '正在查询库存并连接供应商...',
      ru: 'Проверка доступности и связь с поставщиком...'
    }),
    lt(locale, {
      fa: 'تخصیص صندلی و ثبت کد رهگیری PNR در سیستم رزرواسیون جهانی...',
      en: 'Allocating seat and registering PNR code in global system...',
      ar: 'تخصيص المقاعد وتسجيل رمز PNR في نظام الحجز العالمي...',
      zh: '正在分配座位并在全球分销系统中登记 PNR...',
      ru: 'Выделение мест и регистрация PNR в глобальной системе...'
    }),
    lt(locale, {
      fa: 'صدور نهایی بلیط الکترونیکی و ثبت بیمه‌نامه...',
      en: 'Finalizing electronic ticket and insurance policy...',
      ar: 'إصدار التذكرة الإلكترونية النهائية وتوثيق وثيقة التأمين...',
      zh: '最终出具电子客票并确认保单...',
      ru: 'Финальный выпуск электронного билета и полиса...'
    }),
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-ink/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md p-8 rounded-3xl bg-surface border border-line shadow-elev-3 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-mint flex items-center justify-center mx-auto text-brand-dark animate-pulse">
          <Loader2 size={32} className="animate-spin" aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-[20px] font-black text-ink mb-2">
            {lt(locale, {
              fa: 'در حال صدور قطعی واچر و بلیط',
              en: 'Issuing Voucher and Ticket',
              ar: 'جاري إصدار القسيمة والتذكرة نهائياً',
              zh: '正在出具凭证与电子票',
              ru: 'Выпуск ваучера и билета'
            })}
          </h2>
          <p className="text-[13px] font-bold text-sub">
            {lt(locale, {
              fa: 'لطفاً صفحه را نبندید یا رفرش نکنید',
              en: 'Please do not close or refresh this page',
              ar: 'يرجى عدم إغلاق الصفحة أو تحديثها',
              zh: '请勿关闭或刷新页面',
              ru: 'Пожалуйста, не закрывайте и не обновляйте страницу'
            })}
          </p>
        </div>

        <div className="space-y-3 text-start bg-soft p-4 rounded-2xl border border-line/60">
          {issueSteps.map((stepText, idx) => {
            const isDone = issueStep > idx;
            const isCurrent = issueStep === idx;
            return (
              <div key={idx} className="flex items-center gap-3 text-[12px] font-bold">
                {isDone ? (
                  <CheckCircle2 size={16} className="text-success shrink-0" aria-hidden="true" />
                ) : isCurrent ? (
                  <Loader2 size={16} className="text-brand animate-spin shrink-0" aria-hidden="true" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-line shrink-0" aria-hidden="true" />
                )}
                <span className={isCurrent ? 'text-ink font-black' : isDone ? 'text-sub' : 'text-sub/50'}>
                  {stepText}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-[12px] font-mono font-bold text-sub">
          {lt(locale, {
            fa: `زمان تخمینی: ${countdown} ثانیه`,
            en: `Estimated time: ${countdown}s`,
            ar: `الوقت المقدر: ${countdown} ثانية`,
            zh: `预计时间：${countdown} 秒`,
            ru: `Осталось примерно: ${countdown} сек.`
          })}
        </div>
      </div>
    </div>
  );
}
