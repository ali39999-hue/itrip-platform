/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Coins,
  Copy,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertCircle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Send,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { formatMoney } from '@/lib/money';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import {
  getBookingCryptoContext,
  submitCryptoPayment,
  CryptoWalletDto,
} from '@/actions/crypto-payments';

interface CryptoPaymentViewProps {
  bookingId: string;
  onBackToMethods?: () => void;
  onSuccess?: () => void;
}

export function CryptoPaymentView({
  bookingId,
  onBackToMethods,
  onSuccess,
}: CryptoPaymentViewProps) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<{
    id: string;
    reference: string;
    totalAmountIrr: number;
    amountUsdt: number;
    rateIrr: number;
    rateToman: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    expiresAt: string | null;
  } | null>(null);

  const [wallets, setWallets] = useState<CryptoWalletDto[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const [latestReceipt, setLatestReceipt] = useState<{
    id: string;
    network: string;
    currency: string;
    amountUsdt: number;
    amountIrr: number;
    txHash: string;
    senderAddress: string | null;
    receiptImage: string | null;
    onChainVerified: boolean;
    status: string;
    adminNote: string | null;
    createdAt: string;
  } | null>(null);

  // Form State
  const [txHash, setTxHash] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // 20 Minutes Rate Lock Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number>(20 * 60);

  // Load Context
  useEffect(() => {
    let cancelled = false;
    getBookingCryptoContext(bookingId).then((res) => {
      if (cancelled) return;
      if (res.success && res.booking) {
        setBooking(res.booking);
        setWallets(res.wallets);
        if (res.wallets.length > 0) {
          setSelectedWalletId(res.wallets[0].id);
        }
        if (res.latestReceipt) {
          setLatestReceipt(res.latestReceipt);
          setTxHash(res.latestReceipt.txHash);
        }
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // Selected Wallet
  const currentWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];

  // Generate QR Code whenever wallet or amount changes
  useEffect(() => {
    if (!currentWallet) return;
    let cancelled = false;

    // Standard crypto address format or URI scheme
    const qrPayload = currentWallet.walletAddress;

    QRCode.toDataURL(qrPayload, {
      width: 220,
      margin: 1.5,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [currentWallet]);

  // Countdown timer
  useEffect(() => {
    if (!booking) return;
    const createdAt = new Date(booking.createdAt).getTime();
    const expiryTime = createdAt + 20 * 60 * 1000;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanHash = txHash.trim();
    if (!cleanHash || cleanHash.length < 16) {
      setFormError('لطفاً کد هش معتبر تراکنش (TxID) را وارد نمایید.');
      return;
    }

    if (!currentWallet) {
      setFormError('کیف پول مقصد انتخاب نشده است.');
      return;
    }

    startTransition(async () => {
      const res = await submitCryptoPayment({
        bookingId,
        cryptoWalletId: currentWallet.id,
        txHash: cleanHash,
        senderAddress: senderAddress.trim() || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'خطا در ثبت تراکنش');
        return;
      }

      setFormSuccess(res.message || 'تراکنش با موفقیت ثبت شد.');
      if (onSuccess) onSuccess();

      // Refresh
      const ctx = await getBookingCryptoContext(bookingId);
      if (ctx.success && ctx.latestReceipt) {
        setLatestReceipt(ctx.latestReceipt);
      }
    });
  };

  // Messenger support message
  const bookingRef = booking?.reference || bookingId;
  const messengerText = encodeURIComponent(
    `سلام، هش تراکنش پرداخت تتر سفارش مسافرتی شماره ${bookingRef} به مقدار ${booking?.amountUsdt} USDT:\nTxID: ${txHash || latestReceipt?.txHash || 'هنوز ثبت نشده'}`
  );

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-surface border border-line animate-pulse space-y-4">
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
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
            <h2 className="text-[17px] font-black text-ink">
              {lt(locale, {
                fa: 'پرداخت امن با رمز ارز و تتر (USDT)',
                en: 'Secure Crypto & Tether (USDT) Payment',
                ar: 'الدفع الآمن بالعملات الرقمية والتيثر',
                zh: '加密货币与泰达币 (USDT) 安全支付',
                ru: 'Безопасная оплата криптовалютой и Tether',
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

      {/* Rate-Lock & Countdown Banner */}
      <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-teal-700 shrink-0" />
          <div>
            <h3 className="text-[13px] font-bold text-teal-950">
              قفل لحظه‌ای نرخ تبدیل تتر (Rate-Lock):
            </h3>
            <p className="text-[11px] text-teal-800">
              نرخ محاسبه‌شده هر تتر برابر با{' '}
              <strong className="font-mono">{booking?.rateToman?.toLocaleString('fa-IR')}</strong> تومان
              است و تا پایان زمان زیر بدون تغییر تضمین می‌شود.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-[11px] font-bold text-teal-900">زمان باقی‌مانده:</span>
          <div className="font-mono text-[17px] font-black tracking-widest text-teal-950 px-3 py-1 bg-white rounded-xl border border-teal-300 shadow-xs">
            {formatCountdown(timeLeft)}
          </div>
        </div>
      </div>

      {/* Latest Submitted Status Banner */}
      {latestReceipt && (
        <div
          className={`p-4 rounded-2xl border ${
            latestReceipt.status === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : latestReceipt.status === 'REJECTED'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          } space-y-2`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <strong className="text-[13px] font-bold">
                {latestReceipt.status === 'APPROVED'
                  ? 'تراکنش تتر شما تایید شد و واچر صادر گردید'
                  : latestReceipt.status === 'REJECTED'
                  ? 'تراکنش تتر توسط کارشناس مالی رد شد'
                  : latestReceipt.onChainVerified
                  ? 'تراکنش در شبکه بلاکچین تأیید شد و در انتظار ثبت نهایی است'
                  : 'اطلاعات هش تراکنش ثبت شد و در صف استعلام شبکه قرار دارد'}
              </strong>
            </div>
            {latestReceipt.onChainVerified && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                تأیید آن‌چین ✓
              </span>
            )}
          </div>

          <div className="text-[12px] space-y-1">
            <div className="flex items-center gap-2">
              <span className="opacity-80">کد هش (TxID):</span>
              <span className="font-mono font-bold truncate max-w-xs sm:max-w-md">{latestReceipt.txHash}</span>
              {latestReceipt.network === 'TRC20' && (
                <a
                  href={`https://tronscan.org/#/transaction/${latestReceipt.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-black/10 transition inline-flex items-center gap-1 text-[11px] underline"
                  title="مشاهده در اکسپلورر ترون‌اسکن"
                >
                  <ExternalLink size={12} />
                  <span>TronScan</span>
                </a>
              )}
            </div>

            {latestReceipt.adminNote && (
              <p className="p-2 rounded-lg bg-white/70 border border-current/20 text-[11px]">
                یادداشت پشتیبانی: <strong>{latestReceipt.adminNote}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Network Selector Tabs (TRC-20, BEP-20, TON) */}
      <div className="space-y-2">
        <label className="text-[13px] font-bold text-ink flex items-center gap-1.5">
          <Coins size={16} className="text-teal-600" />
          <span>انتخاب شبکه انتقال تتر:</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {wallets.map((w) => {
            const isSelected = w.id === selectedWalletId;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWalletId(w.id)}
                className={`p-3 rounded-2xl border-2 text-start transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50/50 shadow-xs'
                    : 'border-line bg-surface hover:border-teal-300'
                }`}
              >
                <div>
                  <div className="text-[13px] font-black text-ink">{w.networkLabel}</div>
                  <div className="text-[10px] text-sub font-mono">{w.network}</div>
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Payment Details Box (QR Code + Address + Amount) */}
      {currentWallet && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 rounded-3xl bg-paper border border-line items-center">
          {/* QR Code Column */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-3 bg-white rounded-2xl border border-line shadow-xs inline-block">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="کیوآرکد آدرس ولت"
                  className="w-40 h-40 object-contain rounded-lg"
                />
              ) : (
                <div className="w-40 h-40 bg-soft rounded-lg flex items-center justify-center text-sub">
                  <QrCode size={32} />
                </div>
              )}
            </div>
            <span className="text-[11px] text-sub font-bold flex items-center gap-1">
              <QrCode size={13} />
              <span>اسکن در تراست ولت یا ترون‌لینک</span>
            </span>
          </div>

          {/* Details & Copy Fields Column */}
          <div className="md:col-span-8 space-y-3.5">
            {/* Amount to transfer in USDT */}
            <div className="p-3.5 rounded-2xl bg-white border border-line/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-sub block">مبلغ دقیق تتر جهت واریز:</span>
                <span className="font-mono text-[20px] font-black text-teal-700 tracking-tight">
                  {booking?.amountUsdt} USDT
                </span>
                <span className="text-[11px] text-sub block">
                  معادل {formatMoney(booking?.totalAmountIrr || 0, 'IRR', locale)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(String(booking?.amountUsdt), 'amount')}
                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-[12px] font-bold border border-teal-200 transition flex items-center gap-1.5"
                title="کپی مبلغ"
              >
                {copiedField === 'amount' ? (
                  <>
                    <CheckCircle2 size={15} className="text-success" />
                    <span>کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    <span>کپی مبلغ</span>
                  </>
                )}
              </button>
            </div>

            {/* Wallet Address with 1-Click Copy */}
            <div className="p-3.5 rounded-2xl bg-white border border-line/80 space-y-1.5 relative">
              <span className="text-[11px] font-bold text-sub block">
                آدرس کیف پول رسمی فیروزو ({currentWallet.network}):
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12px] font-bold text-ink tracking-tight truncate dir-ltr max-w-[280px] sm:max-w-md">
                  {currentWallet.walletAddress}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentWallet.walletAddress, 'wallet')}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-[12px] font-bold border border-teal-200 transition flex items-center gap-1.5 shrink-0"
                  title="کپی آدرس ولت"
                >
                  {copiedField === 'wallet' ? (
                    <>
                      <CheckCircle2 size={15} className="text-success" />
                      <span>کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>کپی آدرس</span>
                    </>
                  )}
                </button>
              </div>

              {currentWallet.note && (
                <p className="text-[10px] text-sub pt-1">{currentWallet.note}</p>
              )}
            </div>

            {/* Optional Memo / Tag (e.g. for TON) */}
            {currentWallet.memoOrTag && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-900 block">
                    ممو / تگ الزامی شبکه (MEMO / Tag):
                  </span>
                  <span className="font-mono text-[13px] font-black text-amber-950">
                    {currentWallet.memoOrTag}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentWallet.memoOrTag!, 'memo')}
                  className="px-3 py-1.5 rounded-lg bg-white text-amber-900 border border-amber-300 text-[11px] font-bold transition flex items-center gap-1"
                >
                  {copiedField === 'memo' ? 'کپی شد' : 'کپی ممو'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gas Fee Warning Box */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[12px] space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold">
          <AlertCircle size={16} className="text-amber-700 shrink-0" />
          <span>نکته بسیار مهم کارمزد انتقال شبکه (Network Fee):</span>
        </div>
        <p className="leading-relaxed text-[11px] text-amber-800 ps-5">
          هنگام واریز از صرافی (مانند نوبیتکس، والکس، کوینکس یا بایننس) یا کیف پول، لطفاً دقت فرمایید که کارمزد انتقال شبکه را جداگانه بپردازید تا دقیقاً مبلغ{' '}
          <strong className="font-mono text-amber-950 underline">{booking?.amountUsdt} USDT</strong> خالص به حساب فیروزو بنشیند.
        </p>
      </div>

      {/* Submission Form: TxID / TxHash */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
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

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5">
            کد هش تراکنش انتقال (TxID / Transaction Hash): <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="مثال: 5e6f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f"
            className="w-full px-4 py-3 rounded-xl border border-line bg-surface text-ink text-[13px] font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition dir-ltr"
          />
          <span className="text-[10px] text-sub block mt-1">
            کد ۶۴ رقمی یکتای تراکنش که پس از تایید واریز در کیف پول یا صرافی دریافت می‌کنید.
          </span>
        </div>

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1">
            آدرس کیف پول فرستنده یا نام صرافی مبدأ (اختیاری جهت تطبیق سریع‌تر):
          </label>
          <input
            type="text"
            value={senderAddress}
            onChange={(e) => setSenderAddress(e.target.value)}
            placeholder="مثال: نوبیتکس یا آدرس ولت شخصی..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink text-[12px] focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[14px] shadow-elev-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>در حال استعلام و اعتبارسنجی شبکه...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>ثبت و بررسی آنی تراکنش تتر</span>
            </>
          )}
        </button>
      </form>

      {/* Messenger Support Buttons */}
      <div className="border-t border-line/60 pt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-sub flex items-center gap-1.5">
            <MessageCircle size={15} />
            <span>ارسال اطلاعات هش به پشتیبانی رمز ارز:</span>
          </span>
          <span className="text-[11px] text-sub">پاسخگویی سریع</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Telegram */}
          <a
            href={`https://t.me/share/url?url=${messengerText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold transition"
          >
            <span>ارسال در تلگرام</span>
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${messengerText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold transition"
          >
            <span>ارسال در واتساپ</span>
          </a>

          {/* Bale */}
          <a
            href={`https://ble.ir/share/url?url=${messengerText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 text-[11px] font-bold transition"
          >
            <span>ارسال در پیام‌رسان بله</span>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 text-[11px] text-sub">
        <ShieldCheck size={15} className="text-success shrink-0" />
        <span>
          کلیه تراکنش‌های رمز ارز مطابق استانداردهای حسابداری دفترکل و اسناد مالی فیروزو در صندوق تتر ثبت و واچر بلافاصله صادر می‌شود.
        </span>
      </div>
    </div>
  );
}
