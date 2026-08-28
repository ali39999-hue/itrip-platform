'use client';

import { Loader2, CheckCircle2 } from 'lucide-react';

interface IssuingModalProps {
  countdown: number;
  issueStep: number;
}

const ISSUE_STEPS = [
  'در حال استعلام ظرفیت و برقراری ارتباط با ایرلاین...',
  'تخصیص صندلی و ثبت کد رهگیری PNR در سیستم رزرواسیون جهانی...',
  'صدور نهایی بلیط الکترونیکی و ثبت بیمه‌نامه...',
];

export function IssuingModal({ countdown, issueStep }: IssuingModalProps) {
  return (
    <div className="fixed inset-0 z-[120] bg-ink/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md p-8 rounded-3xl bg-surface border border-line shadow-elev-3 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-mint flex items-center justify-center mx-auto text-brand-dark animate-pulse">
          <Loader2 size={32} className="animate-spin" />
        </div>

        <div>
          <h2 className="text-[20px] font-black text-ink mb-2">در حال صدور قطعی واچر و بلیط</h2>
          <p className="text-[13px] font-bold text-sub">لطفاً صفحه را نبندید یا رفرش نکنید</p>
        </div>

        <div className="space-y-3 text-start bg-soft p-4 rounded-2xl border border-line/60">
          {ISSUE_STEPS.map((stepText, idx) => {
            const isDone = issueStep > idx;
            const isCurrent = issueStep === idx;
            return (
              <div key={idx} className="flex items-center gap-3 text-[12px] font-bold">
                {isDone ? (
                  <CheckCircle2 size={16} className="text-success shrink-0" />
                ) : isCurrent ? (
                  <Loader2 size={16} className="text-brand animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-line shrink-0" />
                )}
                <span className={isCurrent ? 'text-ink font-black' : isDone ? 'text-sub' : 'text-sub/50'}>
                  {stepText}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-[12px] font-mono font-bold text-sub">
          زمان تخمینی: {countdown} ثانیه
        </div>
      </div>
    </div>
  );
}
