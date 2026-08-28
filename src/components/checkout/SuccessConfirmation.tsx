'use client';

import { CheckCircle2, Download, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/i18n/routing';

interface SuccessConfirmationProps {
  confirmedRef: string;
  confirmedTitle: string;
}

export function SuccessConfirmation({ confirmedRef, confirmedTitle }: SuccessConfirmationProps) {
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto p-8 rounded-3xl bg-surface border border-line shadow-elev-2 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
        <CheckCircle2 size={36} />
      </div>

      <div>
        <h1 className="text-[24px] font-black text-ink mb-1.5">رزرو شما با موفقیت قطعی شد!</h1>
        <p className="text-[14px] font-bold text-sub">
          واچر و کد رهگیری الکترونیکی به شماره موبایل شما پیامک شد.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-mint/50 border border-brand/20 space-y-2 text-start">
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-sub font-bold">عنوان خدمت:</span>
          <span className="font-black text-ink">{confirmedTitle || 'سرویس رزرو شده'}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-sub font-bold">کد پیگیری (PNR):</span>
          <span className="font-mono font-black text-brand-dark tracking-wider">{confirmedRef || 'FIR-948175'}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/my-trips')}
          className="flex-1 min-h-[48px] px-5 rounded-xl bg-brand text-surface font-black text-[14px] shadow-sm hover:bg-brand-dark transition flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <span>مشاهده در سفرهای من</span>
          <ArrowRight size={16} className="rtl:rotate-180" />
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[48px] px-5 rounded-xl bg-surface border border-line text-ink font-bold text-[14px] hover:bg-soft transition flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <Download size={16} />
          <span>دانلود فایل PDF</span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-sub font-bold">
        <ShieldCheck size={14} className="text-success" />
        <span>گارانتی بازگشت وجه و پشتیبانی ۲۴ ساعته Firuzo</span>
      </div>
    </div>
  );
}
