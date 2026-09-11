'use client';

import React, { useState, useTransition } from 'react';
import {
  FileDown,
  X,
  Sparkles,
  Plane,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { importExternalBookingAction } from '@/actions/booking';
import { TravelIngestionService, ParsedTravelDetails } from '@/domains/booking/TravelIngestionService';

interface ImportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale: string;
}

export function ImportTicketModal({
  isOpen,
  onClose,
  onSuccess,
  locale,
}: ImportTicketModalProps) {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParsedTravelDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setRawText(text);
    setError(null);
    if (text.trim().length > 15) {
      try {
        const parsed = TravelIngestionService.parseRawConfirmation(text);
        setPreview(parsed);
      } catch {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || rawText.trim().length < 10) {
      setError('لطفاً متن بلیت یا پیامک تاییدیه را وارد کنید.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await importExternalBookingAction(rawText);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || 'خطا در وارد کردن بلیت');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'خطای ارتباط با سرور');
      }
    });
  };

  const sampleSms =
    'رزرو شماره PNR: W5-94812. پرواز هواپیمایی ماهان W5-1152 تاریخ 2026-09-20 ساعت 08:30 از فرودگاه تهران (THR) به استانبول (IST). مسافر: علی رضایی. صندلی 14A.';

  return (
    <div className="fixed inset-0 z-[220] bg-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface rounded-3xl border border-line shadow-elev-3 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-soft/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
              <FileDown size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-ink m-0">
                {lt(locale, {
                  fa: 'افزودن خودکار بلیت خارجی',
                  en: 'Import External Ticket / Voucher',
                  ar: 'استيراد تذكرة خارجية',
                  zh: '导入外部客票凭证',
                  ru: 'Импорт стороннего билета',
                })}
              </h3>
              <span className="text-[11px] text-sub font-bold">
                {lt(locale, {
                  fa: 'استخراج هوشمند PNR و تاریخ از متن پیامک یا ایمیل',
                  en: 'Smart parsing of PNR and travel dates from text/SMS',
                  ar: 'استخراج ذكي لرمز الحجز وتفاصيل الرحلة',
                  zh: '智能提取短信或邮件中的预订号与行程时间',
                  ru: 'Умное распознавание PNR и дат из SMS или письма',
                })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-soft text-sub hover:text-ink grid place-items-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleImportSubmit} className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-ink">
                {lt(locale, {
                  fa: 'متن پیامک یا ایمیل تاییدیه پرواز / هتل:',
                  en: 'Paste Confirmation SMS or Email text:',
                  ar: 'نص رسالة التأكيد:',
                  zh: '粘贴确认短信或邮件文本：',
                  ru: 'Текст SMS или письма с подтверждением:',
                })}
              </label>
              <button
                type="button"
                onClick={() => handleTextChange(sampleSms)}
                className="text-[10.5px] font-bold text-brand hover:underline flex items-center gap-1"
              >
                <Sparkles size={11} />
                <span>نمونه تستی</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="مثال: رزرو پرواز ماهان شماره 1152 تاریخ 2026-09-20 ساعت 08:30 کد پی‌ان‌آر: W5-ABC123..."
              className="w-full bg-soft/50 border border-line rounded-2xl p-3.5 text-xs font-mono font-bold text-ink resize-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition leading-relaxed"
            />
          </div>

          {/* Live Extraction Preview */}
          {preview && (
            <div className="p-3.5 rounded-2xl bg-brand/5 border border-brand/20 space-y-2 text-xs font-bold animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-brand-dark font-black">
                <span className="flex items-center gap-1.5">
                  <Plane size={14} />
                  <span>اطلاعات شناسایی شده توسط سیستم:</span>
                </span>
                <span className="text-[10px] font-mono bg-mint px-2 py-0.5 rounded-md">
                  دقت: {Math.round(preview.confidenceScore * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-ink pt-1">
                <div>
                  <span className="text-sub block text-[10px]">ایرلاین و شماره:</span>
                  <span>
                    {preview.airline} ({preview.flightNo})
                  </span>
                </div>
                <div>
                  <span className="text-sub block text-[10px]">کد PNR:</span>
                  <span className="font-mono text-brand-dark font-black">
                    {preview.pnr || 'شناسایی خودکار'}
                  </span>
                </div>
                <div>
                  <span className="text-sub block text-[10px]">مسیر پرواز:</span>
                  <span>
                    {preview.originCity} ({preview.origin}) ← {preview.destinationCity} ({preview.destination})
                  </span>
                </div>
                <div>
                  <span className="text-sub block text-[10px]">تاریخ و ساعت:</span>
                  <span className="font-mono">
                    {preview.travelDate} ساعت {preview.departureTime}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-soft hover:bg-line/60 text-sub font-bold text-xs transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isPending || !rawText.trim()}
              className="flex-1 h-11 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>افزودن به سفرهای من</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
