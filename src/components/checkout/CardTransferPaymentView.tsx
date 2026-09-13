/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Copy,
  CheckCircle2,
  Clock,
  UploadCloud,
  X,
  AlertCircle,
  Send,
  Building2,
  ShieldCheck,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import {
  submitCardTransferReceipt,
  getBookingReceiptContext,
  DestinationBankCardDto,
} from '@/actions/receipts';

interface CardTransferPaymentViewProps {
  bookingId: string;
  onBackToMethods?: () => void;
  onSuccess?: () => void;
}

export function CardTransferPaymentView({
  bookingId,
  onBackToMethods,
  onSuccess,
}: CardTransferPaymentViewProps) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<{
    id: string;
    reference: string;
    totalAmount: number;
    currency: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
    expiresAt: string | null;
  } | null>(null);
  const [cards, setCards] = useState<DestinationBankCardDto[]>([]);
  const [latestReceipt, setLatestReceipt] = useState<{
    id: string;
    bankCardId: string | null;
    bankCard: DestinationBankCardDto | null;
    amount: number;
    trackingCode: string | null;
    paymentDate: string | null;
    customerNote: string | null;
    receiptImages: string[];
    nationalIdImage: string | null;
    status: string;
    adminNote: string | null;
    createdAt: string;
  } | null>(null);

  // Selected Bank Card
  const [selectedCardId, setSelectedCardId] = useState<string>('');

  // Copy feedbacks
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form Fields
  const [trackingCode, setTrackingCode] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  // Files
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptPreviews, setReceiptPreviews] = useState<string[]>([]);
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [nationalIdPreview, setNationalIdPreview] = useState<string | null>(null);

  // Errors & Alerts
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // 30 Minutes Deadline Countdown
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60);

  // Load Context
  useEffect(() => {
    let cancelled = false;
    getBookingReceiptContext(bookingId).then((res) => {
      if (cancelled) return;
      if (res.success && res.booking) {
        setBooking(res.booking);
        setCards(res.cards as DestinationBankCardDto[]);
        if (res.cards.length > 0) {
          setSelectedCardId(res.cards[0].id);
        }
        if (res.latestReceipt) {
          setLatestReceipt(res.latestReceipt as unknown as typeof latestReceipt);
        }
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // Countdown timer calculation
  useEffect(() => {
    if (!booking) return;
    const createdAt = new Date(booking.createdAt).getTime();
    const expiryTime = createdAt + 30 * 60 * 1000;
    const now = Date.now();
    const initialSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));
    setTimeLeft(initialSeconds);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [booking]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleReceiptFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length + receiptFiles.length > 10) {
      setFormError('حداکثر ۱۰ تصویر رسید مجاز است.');
      return;
    }
    setFormError('');

    const newFiles = [...receiptFiles, ...files];
    setReceiptFiles(newFiles);

    // Generate previews
    const newPreviews: string[] = [];
    newFiles.forEach((file) => {
      newPreviews.push(URL.createObjectURL(file));
    });
    setReceiptPreviews(newPreviews);
  };

  const removeReceiptFile = (index: number) => {
    const newFiles = receiptFiles.filter((_, i) => i !== index);
    const newPreviews = receiptPreviews.filter((_, i) => i !== index);
    setReceiptFiles(newFiles);
    setReceiptPreviews(newPreviews);
  };

  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setNationalIdFile(file);
    setNationalIdPreview(URL.createObjectURL(file));
  };

  const removeNationalId = () => {
    setNationalIdFile(null);
    setNationalIdPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedCardId) {
      setFormError('لطفاً کارت بانکی مقصدی که به آن واریز کرده‌اید را انتخاب کنید.');
      return;
    }

    if (receiptFiles.length === 0) {
      setFormError('لطفاً حداقل یک تصویر فیش واریزی آپلود کنید.');
      return;
    }

    startTransition(async () => {
      try {
        // 1. Upload files to API
        const formData = new FormData();
        formData.append('bookingId', bookingId);
        receiptFiles.forEach((file) => {
          formData.append('receipts', file);
        });
        if (nationalIdFile) {
          formData.append('nationalId', nationalIdFile);
        }

        const uploadRes = await fetch('/api/payments/receipt-upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          setFormError(uploadData.error || 'خطا در آپلود تصاویر رسید');
          return;
        }

        // 2. Submit receipt metadata
        const submitRes = await submitCardTransferReceipt({
          bookingId,
          bankCardId: selectedCardId,
          trackingCode: trackingCode.trim(),
          paymentDate: paymentDate || undefined,
          customerNote: customerNote.trim() || undefined,
          receiptImages: uploadData.receiptImages,
          nationalIdImage: uploadData.nationalIdImage || undefined,
        });

        if (!submitRes.success) {
          setFormError(submitRes.error || 'خطا در ثبت اطلاعات رسید');
          return;
        }

        setFormSuccess(submitRes.message || 'رسید پرداخت با موفقیت ثبت شد.');
        if (onSuccess) onSuccess();

        // Refresh context
        const ctx = await getBookingReceiptContext(bookingId);
        if (ctx.success && ctx.latestReceipt) {
          setLatestReceipt(ctx.latestReceipt as unknown as typeof latestReceipt);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'خطای غیرمنتظره در ارسال رسید';
        setFormError(errorMsg);
      }
    });
  };

  // Messenger message text generator
  const bookingRef = booking?.reference || bookingId;
  const messengerText = encodeURIComponent(
    `سلام، رسید پرداخت سفارش مسافرتی شماره ${bookingRef} در سایت فیروزو را جهت بررسی و تایید ارسال می‌کنم.`
  );

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-surface border border-line animate-pulse space-y-4">
        <div className="h-6 w-48 bg-soft rounded-lg" />
        <div className="h-28 bg-soft rounded-xl" />
        <div className="h-44 bg-soft rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface border border-line shadow-elev-2 space-y-6">
      {/* Header & Back Action */}
      <div className="flex items-center justify-between border-b border-line/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
            <h2 className="text-[17px] font-black text-ink">
              {lt(locale, {
                fa: 'پرداخت کارت به کارت و ثبت فیش (پیمنتینو)',
                en: 'Card-to-Card & Receipt Submission (Paymentino)',
                ar: 'تحويل بنكي وتحميل الإيصال',
                zh: '银行卡转账及上传回执',
                ru: 'Банковский перевод и загрузка квитанции',
              })}
            </h2>
          </div>
          <p className="text-[12px] text-sub mt-1">
            شماره سفارش: <strong className="font-mono text-ink font-bold">{booking?.reference}</strong>
          </p>
        </div>

        {onBackToMethods && (
          <button
            type="button"
            onClick={onBackToMethods}
            className="flex items-center gap-1.5 text-[12px] font-bold text-sub hover:text-brand transition"
          >
            <span>بازگشت به روش‌ها</span>
            <ArrowRight size={15} className="rotate-180" />
          </button>
        )}
      </div>

      {/* Countdown Timer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-amber-700 shrink-0 animate-spin-slow" />
          <div>
            <h3 className="text-[13px] font-bold text-amber-900">
              مهلت واریز و ثبت فیش در سایت:
            </h3>
            <p className="text-[11px] text-amber-700">
              لطفاً پیش از اتمام زمان، انتقال وجه را انجام داده و فیش را در کادر زیر ثبت نمایید.
            </p>
          </div>
        </div>
        <div className="font-mono text-[18px] font-black tracking-widest text-amber-900 px-3 py-1 bg-white rounded-xl border border-amber-300 shadow-sm">
          {formatCountdown(timeLeft)}
        </div>
      </div>

      {/* Existing Submitted Receipt Banner */}
      {latestReceipt && (
        <div
          className={`p-4 rounded-2xl border ${
            latestReceipt.status === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : latestReceipt.status === 'REJECTED'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          } space-y-2`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <strong className="text-[13px] font-bold">
                {latestReceipt.status === 'APPROVED'
                  ? 'پرداخت شما توسط کارشناس مالی تایید شد'
                  : latestReceipt.status === 'REJECTED'
                  ? 'رسید پرداخت توسط کارشناس مالی رد شد'
                  : 'رسید پرداخت شما ثبت شده و در صف بررسی واحد مالی قرار دارد'}
              </strong>
            </div>
            <span className="text-[11px] font-mono opacity-80">
              {new Date(latestReceipt.createdAt).toLocaleDateString('fa-IR')}
            </span>
          </div>
          {latestReceipt.adminNote && (
            <p className="text-[12px] bg-white/70 p-2.5 rounded-xl border border-current/20">
              یادداشت کارشناس مالی: <strong>{latestReceipt.adminNote}</strong>
            </p>
          )}
          {latestReceipt.trackingCode && (
            <p className="text-[12px]">
              کد پیگیری ثبت‌شده: <strong className="font-mono">{latestReceipt.trackingCode}</strong>
            </p>
          )}
          {latestReceipt.receiptImages && latestReceipt.receiptImages.length > 0 && (
            <div className="flex gap-2 pt-2 overflow-x-auto snap-x touch-pan-x">
              {latestReceipt.receiptImages.map((img, idx) => (
                <a
                  key={idx}
                  href={img}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 rounded-lg overflow-hidden border border-current/30 shrink-0 hover:opacity-80 transition"
                >
                  <img src={img} alt="رسید" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Total Amount to Pay */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-paper border border-line">
        <span className="text-[13px] font-bold text-sub">مبلغ قابل پرداخت:</span>
        <span className="text-[18px] font-black text-ink font-mono">
          {formatMoney(booking?.totalAmount || 0, booking?.currency || 'IRR', locale)}
        </span>
      </div>

      {/* Bank Cards Section (1-Click Copy) */}
      <div className="space-y-3">
        <label className="text-[13px] font-bold text-ink flex items-center gap-1.5">
          <Building2 size={16} className="text-brand-dark" />
          <span>انتخاب کارت بانکی مقصد فیروزو جهت واریز:</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cards.map((card) => {
            const isSelected = selectedCardId === card.id;
            const formattedNum = card.cardNumber.replace(/(\d{4})/g, '$1 ').trim();

            return (
              <div
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-brand bg-mint/20 shadow-elev-1'
                    : 'border-line bg-surface hover:border-brand/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-black text-ink">{card.bankName}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-sub mb-1.5">{card.accountHolder}</div>

                {/* Card Number with Copy */}
                <div className="bg-white p-2 rounded-xl border border-line/80 flex items-center justify-between mb-2">
                  <span className="font-mono text-[13px] font-bold text-ink tracking-wider dir-ltr">
                    {formattedNum}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(card.cardNumber, `card_${card.id}`);
                    }}
                    className="p-1 rounded-lg hover:bg-soft text-sub hover:text-brand transition"
                    title="کپی شماره کارت"
                  >
                    {copiedField === `card_${card.id}` ? (
                      <CheckCircle2 size={15} className="text-success" />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>
                </div>

                {/* IBAN with Copy */}
                {card.iban && (
                  <div className="bg-white p-2 rounded-xl border border-line/80 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-sub tracking-tight dir-ltr truncate max-w-[170px]">
                      {card.iban}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(card.iban!, `iban_${card.id}`);
                      }}
                      className="p-1 rounded-lg hover:bg-soft text-sub hover:text-brand transition shrink-0"
                      title="کپی شماره شبا"
                    >
                      {copiedField === `iban_${card.id}` ? (
                        <CheckCircle2 size={13} className="text-success" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                )}

                {copiedField?.includes(card.id) && (
                  <span className="absolute -top-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 text-[10px] font-bold bg-ink text-white px-2 py-0.5 rounded-full shadow-md animate-fade-in">
                    کپی شد!
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Receipt Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Upload 1 to 10 Receipts */}
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-ink flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UploadCloud size={16} className="text-brand-dark" />
              <span>تصاویر فیش واریزی (۱ تا ۱۰ تصویر):</span>
            </span>
            <span className="text-[11px] text-sub font-mono font-normal">
              {receiptFiles.length} از ۱۰ تصویر
            </span>
          </label>

          {/* Drag & Drop Area */}
          <label className="border-2 border-dashed border-line hover:border-brand/60 rounded-2xl p-6 text-center cursor-pointer transition block bg-paper/50">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleReceiptFilesChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <UploadCloud className="w-8 h-8 text-brand-dark opacity-80" />
              <span className="text-[13px] font-bold text-ink">
                تصاویر رسید پرداخت را اینجا بکشید یا برای انتخاب کلیک کنید
              </span>
              <span className="text-[11px] text-sub">
                فرمت‌های مجاز: JPG, PNG, WebP (حداکثر ۵ مگابایت برای هر تصویر)
              </span>
            </div>
          </label>

          {/* Previews Grid */}
          {receiptPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {receiptPreviews.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl overflow-hidden border border-line aspect-square bg-black/5"
                >
                  <img src={url} alt={`رسید ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeReceiptFile(idx)}
                    className="absolute top-1 end-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition shadow-sm"
                    title="حذف این تصویر"
                  >
                    <X size={13} />
                  </button>
                  <span className="absolute bottom-1 start-1 text-[10px] font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tracking Code and Payment Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-bold text-ink mb-1">
              کد پیگیری یا شماره ارجاع بانکی: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="مثال: 9482710482"
              className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink text-[13px] font-mono focus:border-brand focus:ring-1 focus:ring-brand outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-ink mb-1">
              تاریخ و ساعت واریز:
            </label>
            <input
              type="datetime-local"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink text-[13px] focus:border-brand focus:ring-1 focus:ring-brand outline-none transition"
            />
          </div>
        </div>

        {/* Customer Note */}
        <div>
          <label className="block text-[12px] font-bold text-ink mb-1">
            توضیحات واریز (اختیاری):
          </label>
          <textarea
            rows={2}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="هرگونه توضیح تکمیلی در رابطه با واریز، بانک مبدأ یا نام واریزکننده..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink text-[12px] focus:border-brand focus:ring-1 focus:ring-brand outline-none transition resize-none"
          />
        </div>

        {/* Optional National ID Upload */}
        <div className="p-3.5 rounded-xl border border-line/80 bg-paper/30 space-y-2">
          <label className="text-[12px] font-bold text-ink flex items-center justify-between">
            <span>تصویر کارت ملی یا مدرک شناسایی (اختیاری):</span>
            {nationalIdPreview && (
              <button
                type="button"
                onClick={removeNationalId}
                className="text-rose-600 text-[11px] hover:underline"
              >
                حذف مدرک
              </button>
            )}
          </label>

          {!nationalIdPreview ? (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleNationalIdChange}
              className="block w-full text-[12px] text-sub file:me-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[12px] file:font-bold file:bg-mint file:text-brand-dark hover:file:bg-mint/80 cursor-pointer"
            />
          ) : (
            <div className="flex items-center gap-3">
              <img
                src={nationalIdPreview}
                alt="کارت ملی"
                className="w-16 h-12 rounded-lg object-cover border border-line"
              />
              <span className="text-[11px] text-sub">تصویر مدرک شناسایی ضمیمه شد.</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 rounded-2xl bg-brand hover:bg-brand-dark text-white font-bold text-[14px] shadow-elev-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <span>در حال ارسال و ثبت رسید...</span>
          ) : (
            <>
              <Send size={16} />
              <span>ثبت نهایی فیش پرداخت</span>
            </>
          )}
        </button>
      </form>

      {/* Messenger Buttons (Paymentino feature) */}
      <div className="border-t border-line/60 pt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-sub flex items-center gap-1.5">
            <MessageCircle size={15} />
            <span>ارسال مستقیم فیش در پیام‌رسان‌ها:</span>
          </span>
          <span className="text-[11px] text-sub">پشتیبانی آنلاین ۲۴/۷</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Telegram */}
          <a
            href={`https://t.me/share/url?url=${messengerText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold transition"
          >
            <span>تلگرام</span>
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${messengerText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold transition"
          >
            <span>واتساپ</span>
          </a>

          {/* Bale */}
          <a
            href={`https://ble.ir/share/url?url=${messengerText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 text-[11px] font-bold transition"
          >
            <span>بله</span>
          </a>

          {/* Eitaa */}
          <a
            href={`https://eitaa.com/share/url?url=${messengerText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 text-[11px] font-bold transition"
          >
            <span>ایتا</span>
          </a>

          {/* Rubika */}
          <a
            href={`https://rubika.ir`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold transition"
          >
            <span>روبیکا</span>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 text-[11px] text-sub">
        <ShieldCheck size={15} className="text-success shrink-0" />
        <span>
          اطلاعات کارت‌های بانکی و رسیدهای ارسالی در سرورهای امن فیروزو رمزنگاری شده و صرفاً جهت تایید مالی نگهداری می‌شوند.
        </span>
      </div>
    </div>
  );
}
