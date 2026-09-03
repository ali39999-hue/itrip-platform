'use client';

import { CheckCircle2, Download, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface SuccessConfirmationProps {
  confirmedRef: string;
  confirmedTitle: string;
}

export function SuccessConfirmation({ confirmedRef, confirmedTitle }: SuccessConfirmationProps) {
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="max-w-xl mx-auto p-8 rounded-3xl bg-surface border border-line shadow-elev-2 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
        <CheckCircle2 size={36} aria-hidden="true" />
      </div>

      <div>
        <h1 className="text-[24px] font-black text-ink mb-1.5">
          {lt(locale, {
            fa: 'رزرو شما با موفقیت قطعی شد!',
            en: 'Your booking has been confirmed!',
            ar: 'تم تأكيد حجزك بنجاح!',
            zh: '您的预订已确认成功！',
            ru: 'Ваше бронирование успешно подтверждено!'
          })}
        </h1>
        <p className="text-[14px] font-bold text-sub">
          {lt(locale, {
            fa: 'واچر و کد رهگیری شما صادر شد و در «سفرهای من» قابل مشاهده است.',
            en: 'Your voucher and tracking code have been issued and are available in "My Trips".',
            ar: 'تم إصدار القسيمة ورمز التتبع وهي متاحة في "رحلاتي".',
            zh: '凭证和追踪码已生成，可在“我的行程”中查看。',
            ru: 'Ваучер и код отслеживания сформированы и доступны в разделе «Мои поездки».'
          })}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-mint/50 border border-brand/20 space-y-2 text-start">
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-sub font-bold">
            {lt(locale, { fa: 'عنوان خدمت:', en: 'Service Title:', ar: 'عنوان الخدمة:', zh: '服务项目：', ru: 'Название услуги:' })}
          </span>
          <span className="font-black text-ink">
            {confirmedTitle || lt(locale, { fa: 'سرویس رزرو شده', en: 'Booked Service', ar: 'الخدمة المحجوزة', zh: '已预订服务', ru: 'Забронированная услуга' })}
          </span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-sub font-bold">
            {lt(locale, { fa: 'کد پیگیری (PNR):', en: 'Tracking Code (PNR):', ar: 'رمز التتبع (PNR):', zh: '追踪码 (PNR)：', ru: 'Код бронирования (PNR):' })}
          </span>
          <span className="font-mono font-black text-brand-dark tracking-wider" dir="ltr">{confirmedRef || '—'}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/my-trips')}
          className="flex-1 min-h-[48px] px-5 rounded-xl bg-brand text-surface font-black text-[14px] shadow-elev-1 hover:bg-brand-dark transition flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <span>{lt(locale, { fa: 'مشاهده در سفرهای من', en: 'View in My Trips', ar: 'عرض في رحلاتي', zh: '在我的行程中查看', ru: 'Посмотреть в моих поездках' })}</span>
          <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[48px] px-5 rounded-xl bg-surface border border-line text-ink font-bold text-[14px] hover:bg-soft transition flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <Download size={16} aria-hidden="true" />
          <span>{lt(locale, { fa: 'دانلود فایل PDF', en: 'Download PDF', ar: 'تحميل ملف PDF', zh: '下载 PDF 文件', ru: 'Скачать PDF' })}</span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-sub font-bold">
        <ShieldCheck size={14} className="text-success" aria-hidden="true" />
        <span>
          {lt(locale, {
            fa: 'گارانتی بازگشت وجه و پشتیبانی ۲۴ ساعته Firuzo',
            en: 'Money-back guarantee and 24/7 Firuzo support',
            ar: 'ضمان استرداد الأموال ودعم على مدار 24 ساعة من Firuzo',
            zh: '退款保证与 Firuzo 24/7 全天候支持',
            ru: 'Гарантия возврата средств и поддержка 24/7 Firuzo'
          })}
        </span>
      </div>
    </div>
  );
}
