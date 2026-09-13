/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useTransition } from 'react';
import {
  ReceiptText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  User,
  Check,
  X,
  AlertCircle,
  Coins,
  CreditCard,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { lt } from '@/lib/lt';
import { reviewCardTransferReceipt, listCardTransferReceipts } from '@/actions/receipts';
import { reviewCryptoPayment, listCryptoPayments } from '@/actions/crypto-payments';

interface CardReceiptItem {
  id: string;
  bookingId: string;
  bookingRef: string;
  customerName: string;
  customerPhone: string;
  itemTitle: string;
  bankCardName: string;
  cardNumber: string;
  amount: number;
  currency: string;
  trackingCode: string;
  paymentDate: string | null;
  customerNote: string | null;
  receiptImages: string[];
  nationalIdImage: string | null;
  status: string;
  adminNote: string | null;
  reviewerId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface CryptoReceiptItem {
  id: string;
  bookingId: string;
  bookingRef: string;
  customerName: string;
  customerPhone: string;
  itemTitle: string;
  network: string;
  networkLabel: string;
  walletAddress: string;
  amountUsdt: number;
  amountIrr: number;
  fxRate: number;
  txHash: string;
  senderAddress: string | null;
  receiptImage: string | null;
  onChainVerified: boolean;
  status: string;
  adminNote: string | null;
  reviewerId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface ReceiptsClientPageProps {
  locale: string;
  initialReceipts: CardReceiptItem[];
  totalCount: number;
  initialCryptoReceipts?: CryptoReceiptItem[];
  totalCryptoCount?: number;
}

export function ReceiptsClientPage({
  locale,
  initialReceipts,
  initialCryptoReceipts = [],
}: ReceiptsClientPageProps) {
  // Top-level tab: 'card' | 'crypto'
  const [activeChannel, setActiveChannel] = useState<'card' | 'crypto'>('card');

  // Card Receipts State
  const [cardReceipts, setCardReceipts] = useState<CardReceiptItem[]>(initialReceipts);
  const [activeCardStatus, setActiveCardStatus] = useState<string>('ALL');

  // Crypto Receipts State
  const [cryptoReceipts, setCryptoReceipts] = useState<CryptoReceiptItem[]>(initialCryptoReceipts);
  const [activeCryptoStatus, setActiveCryptoStatus] = useState<string>('ALL');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  // Modals State
  const [selectedCardReceipt, setSelectedCardReceipt] = useState<CardReceiptItem | null>(null);
  const [selectedCryptoReceipt, setSelectedCryptoReceipt] = useState<CryptoReceiptItem | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Fetch functions
  const fetchCardReceipts = (status: string, search: string) => {
    startTransition(async () => {
      const res = await listCardTransferReceipts({
        status: status === 'ALL' ? undefined : status,
        search: search.trim() || undefined,
        limit: 50,
      });
      if (res.success) {
        setCardReceipts(res.data as CardReceiptItem[]);
      }
    });
  };

  const fetchCryptoReceipts = (status: string, search: string) => {
    startTransition(async () => {
      const res = await listCryptoPayments({
        status: status === 'ALL' ? undefined : status,
        search: search.trim() || undefined,
        limit: 50,
      });
      if (res.success) {
        setCryptoReceipts(res.data as CryptoReceiptItem[]);
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeChannel === 'card') {
      fetchCardReceipts(activeCardStatus, searchQuery);
    } else {
      fetchCryptoReceipts(activeCryptoStatus, searchQuery);
    }
  };

  // Card Decisions
  const handleCardDecision = (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedCardReceipt) return;
    setActionError('');
    setActionSuccess('');

    startTransition(async () => {
      const res = await reviewCardTransferReceipt(selectedCardReceipt.id, decision, adminNote.trim());
      if (!res.success) {
        setActionError(res.error || 'خطا در ثبت تصمیم');
        return;
      }

      setActionSuccess(res.message || 'عملیات با موفقیت انجام شد.');
      fetchCardReceipts(activeCardStatus, searchQuery);
      setTimeout(() => setSelectedCardReceipt(null), 1200);
    });
  };

  // Crypto Decisions
  const handleCryptoDecision = (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedCryptoReceipt) return;
    setActionError('');
    setActionSuccess('');

    startTransition(async () => {
      const res = await reviewCryptoPayment(selectedCryptoReceipt.id, decision, adminNote.trim());
      if (!res.success) {
        setActionError(res.error || 'خطا در ثبت تصمیم');
        return;
      }

      setActionSuccess(res.message || 'عملیات با موفقیت انجام شد.');
      fetchCryptoReceipts(activeCryptoStatus, searchQuery);
      setTimeout(() => setSelectedCryptoReceipt(null), 1200);
    });
  };

  // Counts
  const pendingCardCount = cardReceipts.filter((r) => r.status === 'PENDING_REVIEW').length;
  const pendingCryptoCount = cryptoReceipts.filter((r) => r.status === 'PENDING_REVIEW').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-3xl border border-line shadow-elev-1">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <ReceiptText size={24} />
          </div>
          <div>
            <h1 className="text-[20px] font-black text-ink">
              {lt(locale, {
                fa: 'میز کار بررسی فیش‌های بانکی و تتر (پیمنتینو)',
                en: 'Bank Slips & Crypto Review Workspace (Paymentino)',
                ar: 'مكتب مراجعة الإيصالات والعملات الرقمية',
                zh: '银行流水与加密货币审核工作台',
                ru: 'Панель проверки чеков и криптовалюты',
              })}
            </h1>
            <p className="text-[13px] text-sub mt-0.5">
              مدیریت و تایید واریزهای کارت‌به‌کارت و تراکنش‌های تتری مسافران با استعلام زنده بلاکچین
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-[12px] font-bold flex items-center gap-1.5">
            <CreditCard size={14} className="text-amber-700" />
            <span>کارت به کارت: {pendingCardCount} در انتظار</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 text-[12px] font-bold flex items-center gap-1.5">
            <Coins size={14} className="text-teal-700" />
            <span>تتر / کریپتو: {pendingCryptoCount} در انتظار</span>
          </span>
        </div>
      </div>

      {/* Main Channel Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-line pb-1">
        <button
          type="button"
          onClick={() => {
            setActiveChannel('card');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-black transition-all ${
            activeChannel === 'card'
              ? 'bg-brand text-white shadow-md'
              : 'text-sub hover:text-ink hover:bg-soft'
          }`}
        >
          <CreditCard size={16} />
          <span>رسیدهای کارت‌به‌کارت (پیمنتینو)</span>
          {pendingCardCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-mono">
              {pendingCardCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveChannel('crypto');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-black transition-all ${
            activeChannel === 'crypto'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-sub hover:text-ink hover:bg-soft'
          }`}
        >
          <Coins size={16} />
          <span>تراکنش‌های رمز ارز و تتر (TRC-20 / On-Chain)</span>
          {pendingCryptoCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-mono">
              {pendingCryptoCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Status Tabs & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-line">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'ALL', label: 'همه موارد' },
            { id: 'PENDING_REVIEW', label: 'در انتظار بررسی' },
            { id: 'APPROVED', label: 'تأیید شده' },
            { id: 'REJECTED', label: 'رد شده' },
          ].map((tab) => {
            const currentStatus = activeChannel === 'card' ? activeCardStatus : activeCryptoStatus;
            const isActive = currentStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (activeChannel === 'card') {
                    setActiveCardStatus(tab.id);
                    fetchCardReceipts(tab.id, searchQuery);
                  } else {
                    setActiveCryptoStatus(tab.id);
                    fetchCryptoReceipts(tab.id, searchQuery);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-[12px] font-bold transition shrink-0 ${
                  isActive
                    ? activeChannel === 'card'
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-teal-600 text-white shadow-xs'
                    : 'text-sub hover:text-ink hover:bg-soft'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-sub absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeChannel === 'card' ? 'جستجو با کد پیگیری، شماره رزرو یا تلفن...' : 'جستجو با هش TxID، آدرس یا رزرو...'}
              className="w-full pe-9 ps-3 py-2 rounded-xl border border-line bg-paper text-[12px] text-ink outline-none focus:border-brand transition"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-soft text-ink hover:bg-line text-[12px] font-bold transition"
          >
            جستجو
          </button>
        </form>
      </div>

      {/* CHANNEL 1: Card-to-Card Table */}
      {activeChannel === 'card' && (
        <div className="bg-surface rounded-3xl border border-line shadow-elev-1 overflow-hidden">
          {cardReceipts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-soft grid place-items-center mx-auto text-sub">
                <CreditCard size={24} />
              </div>
              <h3 className="text-[15px] font-bold text-ink">فیش کارت‌به‌کارتی یافت نشد</h3>
              <p className="text-[12px] text-sub">هیچ رسیدی با فیلترهای انتخابی در سیستم ثبت نشده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-line bg-soft/50 text-[12px] font-black text-sub">
                    <th className="py-3.5 px-4">سفارش / مسافر</th>
                    <th className="py-3.5 px-4">مبلغ واریزی</th>
                    <th className="py-3.5 px-4">کارت مقصد</th>
                    <th className="py-3.5 px-4">کد پیگیری</th>
                    <th className="py-3.5 px-4">تصاویر رسید</th>
                    <th className="py-3.5 px-4">تاریخ ثبت</th>
                    <th className="py-3.5 px-4">وضعیت</th>
                    <th className="py-3.5 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-[13px]">
                  {cardReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-soft/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-ink font-mono">{r.bookingRef}</div>
                        <div className="text-[11px] text-sub flex items-center gap-1 mt-0.5">
                          <User size={11} />
                          <span>{r.customerName}</span>
                          <span className="opacity-40">|</span>
                          <span className="font-mono">{r.customerPhone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-ink">
                        {formatMoney(r.amount, r.currency, locale)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-ink text-[12px]">{r.bankCardName}</div>
                        <div className="text-[10px] font-mono text-sub dir-ltr">{r.cardNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-ink">{r.trackingCode}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {r.receiptImages.slice(0, 3).map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="فیش"
                              className="w-9 h-9 rounded-lg object-cover border border-line shadow-xs"
                            />
                          ))}
                          {r.receiptImages.length > 3 && (
                            <span className="w-9 h-9 rounded-lg bg-soft text-[10px] font-bold text-sub flex items-center justify-center border border-line">
                              +{r.receiptImages.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-sub font-mono">
                        {new Date(r.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.status === 'PENDING_REVIEW' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock size={12} />
                            <span>نیازمند بررسی</span>
                          </span>
                        )}
                        {r.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            <span>تأیید شده</span>
                          </span>
                        )}
                        {r.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle size={12} />
                            <span>رد شده</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCardReceipt(r);
                            setAdminNote(r.adminNote || '');
                            setActiveImageIndex(0);
                            setActionError('');
                            setActionSuccess('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-brand text-white hover:bg-brand-dark text-[11px] font-bold transition shadow-xs flex items-center gap-1.5 mx-auto"
                        >
                          <Eye size={13} />
                          <span>بررسی فیش</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CHANNEL 2: Crypto USDT Table */}
      {activeChannel === 'crypto' && (
        <div className="bg-surface rounded-3xl border border-line shadow-elev-1 overflow-hidden">
          {cryptoReceipts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-soft grid place-items-center mx-auto text-sub">
                <Coins size={24} />
              </div>
              <h3 className="text-[15px] font-bold text-ink">تراکنش رمزارزی یافت نشد</h3>
              <p className="text-[12px] text-sub">هیچ تراکنش تتری با فیلترهای انتخابی در سیستم ثبت نشده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-line bg-soft/50 text-[12px] font-black text-sub">
                    <th className="py-3.5 px-4">سفارش / مسافر</th>
                    <th className="py-3.5 px-4">مبلغ تتر (USDT)</th>
                    <th className="py-3.5 px-4">معادل ریالی</th>
                    <th className="py-3.5 px-4">شبکه</th>
                    <th className="py-3.5 px-4">کد هش تراکنش (TxID)</th>
                    <th className="py-3.5 px-4">استعلام بلاکچین</th>
                    <th className="py-3.5 px-4">تاریخ ثبت</th>
                    <th className="py-3.5 px-4">وضعیت</th>
                    <th className="py-3.5 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-[13px]">
                  {cryptoReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-soft/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-ink font-mono">{r.bookingRef}</div>
                        <div className="text-[11px] text-sub flex items-center gap-1 mt-0.5">
                          <User size={11} />
                          <span>{r.customerName}</span>
                          <span className="opacity-40">|</span>
                          <span className="font-mono">{r.customerPhone}</span>
                        </div>
                      </td>

                      {/* USDT Amount */}
                      <td className="py-3.5 px-4 font-mono font-black text-teal-700 text-[14px]">
                        {r.amountUsdt} USDT
                      </td>

                      {/* IRR Equivalent */}
                      <td className="py-3.5 px-4 font-mono text-sub text-[12px]">
                        {formatMoney(r.amountIrr, 'IRR', locale)}
                      </td>

                      {/* Network */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold font-mono">
                          {r.network}
                        </span>
                      </td>

                      {/* TxHash with Explorer Link */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold truncate max-w-[130px] sm:max-w-[160px] dir-ltr">
                            {r.txHash}
                          </span>
                          {r.network === 'TRC20' && (
                            <a
                              href={`https://tronscan.org/#/transaction/${r.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-soft text-teal-700 transition"
                              title="مشاهده در TronScan"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* On-Chain Verified Badge */}
                      <td className="py-3.5 px-4">
                        {r.onChainVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={11} />
                            <span>تأیید شبکه ✓</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200">
                            بررسی دستی
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[11px] text-sub font-mono">
                        {new Date(r.createdAt).toLocaleDateString('fa-IR')}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {r.status === 'PENDING_REVIEW' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock size={12} />
                            <span>نیازمند بررسی</span>
                          </span>
                        )}
                        {r.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            <span>تأیید شده</span>
                          </span>
                        )}
                        {r.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle size={12} />
                            <span>رد شده</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCryptoReceipt(r);
                            setAdminNote(r.adminNote || '');
                            setActionError('');
                            setActionSuccess('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-[11px] font-bold transition shadow-xs flex items-center gap-1.5 mx-auto"
                        >
                          <Eye size={13} />
                          <span>بررسی تراکنش</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Card-to-Card Review Modal */}
      {selectedCardReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-line shadow-elev-3 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <div className="flex items-center gap-2.5">
                <ReceiptText className="w-5 h-5 text-brand" />
                <h3 className="text-[16px] font-black text-ink">
                  بررسی فیش پرداخت سفارش {selectedCardReceipt.bookingRef}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCardReceipt(null)}
                className="w-8 h-8 rounded-full hover:bg-soft text-sub hover:text-ink flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <label className="text-[12px] font-bold text-ink block">
                    تصاویر فیش واریزی ({selectedCardReceipt.receiptImages.length} تصویر):
                  </label>
                  <div className="rounded-2xl overflow-hidden border border-line bg-black/5 aspect-4/3 relative flex items-center justify-center">
                    {selectedCardReceipt.receiptImages[activeImageIndex] ? (
                      <img
                        src={selectedCardReceipt.receiptImages[activeImageIndex]}
                        alt="رسید"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-sub text-[12px]">تصویری موجود نیست</span>
                    )}
                  </div>
                  {selectedCardReceipt.receiptImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedCardReceipt.receiptImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                            activeImageIndex === idx ? 'border-brand scale-105' : 'border-line opacity-70'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-paper border border-line space-y-2.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-sub">عنوان سفارش:</span>
                      <strong className="text-ink">{selectedCardReceipt.itemTitle}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">مبلغ سفارش:</span>
                      <strong className="text-ink font-mono">
                        {formatMoney(selectedCardReceipt.amount, selectedCardReceipt.currency, locale)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">نام مشتری:</span>
                      <strong className="text-ink">{selectedCardReceipt.customerName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">شماره تماس:</span>
                      <strong className="text-ink font-mono">{selectedCardReceipt.customerPhone}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sub">کد پیگیری بانکی:</span>
                      <strong className="text-brand-dark font-mono text-[13px]">{selectedCardReceipt.trackingCode}</strong>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-ink block">یادداشت مدیر:</label>
                    <textarea
                      rows={3}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="یادداشت تایید یا رد..."
                      className="w-full p-3 rounded-xl border border-line bg-surface text-[12px] text-ink outline-none focus:border-brand transition resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-line bg-soft/30 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedCardReceipt(null)}
                className="px-5 py-2.5 rounded-xl border border-line text-sub hover:text-ink text-[13px] font-bold transition"
              >
                انصراف و بستن
              </button>
              {selectedCardReceipt.status === 'PENDING_REVIEW' && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleCardDecision('REJECT')}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <X size={15} />
                    <span>رد فیش</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleCardDecision('APPROVE')}
                    className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check size={16} />
                    <span>تأیید پرداخت و صدور واچر</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Crypto Review Modal */}
      {selectedCryptoReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-line shadow-elev-3 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-teal-600" />
                <h3 className="text-[16px] font-black text-ink">
                  بررسی تراکنش تتر سفارش {selectedCryptoReceipt.bookingRef}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCryptoReceipt(null)}
                className="w-8 h-8 rounded-full hover:bg-soft text-sub hover:text-ink flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Crypto Details Card */}
              <div className="p-5 rounded-2xl bg-paper border border-line space-y-3 text-[13px]">
                <div className="flex justify-between items-center pb-2 border-b border-line/60">
                  <span className="text-sub">مبلغ تتر:</span>
                  <span className="font-mono text-[18px] font-black text-teal-700">
                    {selectedCryptoReceipt.amountUsdt} USDT
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sub">معادل ریالی:</span>
                  <span className="font-mono font-bold text-ink">
                    {formatMoney(selectedCryptoReceipt.amountIrr, 'IRR', locale)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sub">شبکه انتقال:</span>
                  <span className="font-bold text-ink font-mono">{selectedCryptoReceipt.networkLabel}</span>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-sub text-[11px] block">کد هش تراکنش (TxID):</span>
                  <div className="p-2.5 rounded-xl bg-white border border-line/80 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-ink truncate dir-ltr">
                      {selectedCryptoReceipt.txHash}
                    </span>
                    {selectedCryptoReceipt.network === 'TRC20' && (
                      <a
                        href={`https://tronscan.org/#/transaction/${selectedCryptoReceipt.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold flex items-center gap-1 hover:bg-teal-100 transition shrink-0"
                      >
                        <ExternalLink size={12} />
                        <span>مشاهده در ترون‌اسکن</span>
                      </a>
                    )}
                  </div>
                </div>

                {selectedCryptoReceipt.senderAddress && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sub">مبدأ / فرستنده:</span>
                    <span className="font-mono text-ink text-[11px]">{selectedCryptoReceipt.senderAddress}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className="text-sub">استعلام آن‌چین بلاکچین:</span>
                  {selectedCryptoReceipt.onChainVerified ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      تأیید شده در شبکه ترون ✓
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                      بررسی دستی اپراتور
                    </span>
                  )}
                </div>
              </div>

              {/* Admin Note Input */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-ink block">یادداشت مدیر مالی:</label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="مثال: تراکنش در ترون‌اسکن استعلام شد و به کیف پول واریز گردید..."
                  className="w-full p-3 rounded-xl border border-line bg-surface text-[12px] text-ink outline-none focus:border-teal-500 transition resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-line bg-soft/30 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedCryptoReceipt(null)}
                className="px-5 py-2.5 rounded-xl border border-line text-sub hover:text-ink text-[13px] font-bold transition"
              >
                بستن
              </button>
              {selectedCryptoReceipt.status === 'PENDING_REVIEW' && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleCryptoDecision('REJECT')}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <X size={15} />
                    <span>رد تراکنش</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleCryptoDecision('APPROVE')}
                    className="px-7 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check size={16} />
                    <span>تأیید تتر و صدور واچر</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
