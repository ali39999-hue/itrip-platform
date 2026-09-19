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
      setError(
        lt(locale, {
          fa: 'لطفاً متن بلیت یا پیامک تاییدیه را وارد کنید.',
          en: 'Please paste the ticket text or confirmation SMS.',
          ar: 'يرجى إدخال نص التذكرة أو رسالة التأكيد.',
          zh: '请输入机票文本或确认短信。',
          ru: 'Пожалуйста, введите текст билета или подтверждающее SMS.',
        })
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await importExternalBookingAction(rawText);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(
            res.error ||
              lt(locale, {
                fa: 'خطا در وارد کردن بلیت',
                en: 'Failed to import ticket',
                ar: 'خطأ في استيراد التذكرة',
                zh: '导入客票失败',
                ru: 'Ошибка импорта билета',
              })
          );
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : lt(locale, {
                fa: 'خطای ارتباط با سرور',
                en: 'Server communication error',
                ar: 'خطأ في الاتصال بالخادم',
                zh: '服务器通信错误',
                ru: 'Ошибка связи с сервером',
              })
        );
      }
    });
  };

  const sampleSms =
    'رزرو شماره PNR: W5-94812. پرواز هواپیمایی ماهان W5-1152 تاریخ 2026-09-20 ساعت 08:30 از فرودگاه تهران (THR) به استانبول (IST). مسافر: علی رضایی. صندلی 14A.';

  return (
    <div className="fixed inset-0 z-[220] bg-deep/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-line shadow-elev-3 overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-line/80 mx-auto mt-3" />
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
                <span>
                  {lt(locale, {
                    fa: 'نمونه تستی',
                    en: 'Sample text',
                    ar: 'نص تجريبي',
                    zh: '示例文本',
                    ru: 'Пример текста',
                  })}
                </span>
              </button>
            </div>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={lt(locale, {
                fa: 'مثال: رزرو پرواز ماهان شماره 1152 تاریخ 2026-09-20 ساعت 08:30 کد پی‌ان‌آر: W5-ABC123...',
                en: 'Example: Mahan Air flight 1152 on 2026-09-20 at 08:30 PNR: W5-ABC123...',
                ar: 'مثال: حجز طيران ماهان رقم 1152 بتاريخ 2026-09-20 الساعة 08:30 رمز الحجز: W5-ABC123...',
                zh: '示例：马汉航空 1152 航班 日期 2026-09-20 时间 08:30 PNR: W5-ABC123...',
                ru: 'Пример: рейс Mahan Air 1152 дата 2026-09-20 время 08:30 PNR: W5-ABC123...',
              })}
              className="w-full bg-soft/50 border border-line rounded-2xl p-3.5 text-xs font-mono font-bold text-ink resize-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition leading-relaxed"
            />
          </div>

          {/* Live Extraction Preview */}
          {preview && (
            <div className="p-3.5 rounded-2xl bg-brand/5 border border-brand/20 space-y-2 text-xs font-bold animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-brand-dark font-black">
                <span className="flex items-center gap-1.5">
                  <Plane size={14} />
                  <span>
                    {lt(locale, {
                      fa: 'اطلاعات شناسایی شده توسط سیستم:',
                      en: 'System-detected details:',
                      ar: 'البيانات المستخرجة بواسطة النظام:',
                      zh: '系统识别出的信息：',
                      ru: 'Распознанные данные системы:',
                    })}
                  </span>
                </span>
                <span className="text-[10px] font-mono bg-mint px-2 py-0.5 rounded-md">
                  {lt(locale, {
                    fa: `دقت: ${Math.round(preview.confidenceScore * 100)}٪`,
                    en: `Confidence: ${Math.round(preview.confidenceScore * 100)}%`,
                    ar: `الدقة: ${Math.round(preview.confidenceScore * 100)}%`,
                    zh: `准确度：${Math.round(preview.confidenceScore * 100)}%`,
                    ru: `Точность: ${Math.round(preview.confidenceScore * 100)}%`,
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-ink pt-1">
                <div>
                  <span className="text-sub block text-[10px]">
                    {lt(locale, {
                      fa: 'ایرلاین و شماره:',
                      en: 'Airline & Flight No:',
                      ar: 'شركة الطيران ورقم الرحلة:',
                      zh: '航司与航班号：',
                      ru: 'Авиакомпания и рейс:',
                    })}
                  </span>
                  <span>
                    {preview.airline} ({preview.flightNo})
                  </span>
                </div>
                <div>
                  <span className="text-sub block text-[10px]">
                    {lt(locale, {
                      fa: 'کد PNR:',
                      en: 'PNR Code:',
                      ar: 'رمز الحجز (PNR):',
                      zh: '预订码 (PNR)：',
                      ru: 'Код бронирования (PNR):',
                    })}
                  </span>
                  <span className="font-mono text-brand-dark font-black">
                    {preview.pnr ||
                      lt(locale, {
                        fa: 'شناسایی خودکار',
                        en: 'Auto-detected',
                        ar: 'اكتشاف تلقائي',
                        zh: '自动识别',
                        ru: 'Автоопределение',
                      })}
                  </span>
                </div>
                <div>
                  <span className="text-sub block text-[10px]">
                    {lt(locale, {
                      fa: 'مسیر پرواز:',
                      en: 'Flight Route:',
                      ar: 'مسار الرحلة:',
                      zh: '飞行航线：',
                      ru: 'Маршрут рейса:',
                    })}
                  </span>
                  <span>
                    {preview.originCity} ({preview.origin}) ← {preview.destinationCity} ({preview.destination})
                  </span>
                </div>
                <div>
                  <span className="text-sub block text-[10px]">
                    {lt(locale, {
                      fa: 'تاریخ و ساعت:',
                      en: 'Date & Time:',
                      ar: 'التاريخ والوقت:',
                      zh: '日期与时间：',
                      ru: 'Дата и время:',
                    })}
                  </span>
                  <span className="font-mono">
                    {preview.travelDate} {preview.departureTime}
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
              {lt(locale, {
                fa: 'انصراف',
                en: 'Cancel',
                ar: 'إلغاء',
                zh: '取消',
                ru: 'Отмена',
              })}
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
                  <span>
                    {lt(locale, {
                      fa: 'افزودن به سفرهای من',
                      en: 'Add to My Trips',
                      ar: 'إضافة إلى رحلاتي',
                      zh: '添加到我的行程',
                      ru: 'Добавить в мои поездки',
                    })}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
