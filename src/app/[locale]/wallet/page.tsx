'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet as WalletIcon, ArrowDownRight, ArrowUpRight,
  Loader2
} from 'lucide-react';

export default function WalletPage() {
  const t = useTranslations('Wallet');
  const locale = useLocale();
  const { wallet, transactions, deposit, exchange } = useBookingStore();

  const [depositAmount, setDepositAmount] = useState('');
  const [charging, setCharging] = useState(false);

  const [exFrom, setExFrom] = useState<'IRR' | 'USDT' | 'AED'>('IRR');
  const [exTo, setExTo] = useState<'IRR' | 'USDT' | 'AED'>('USDT');
  const [exAmount, setExAmount] = useState('');
  const [exMsg, setExMsg] = useState('');

  function doExchange() {
    const amt = Number(exAmount);
    if (!amt || amt <= 0) return;
    const ok = exchange(exFrom, exTo, amt);
    if (ok) {
      setExMsg(locale === 'fa' ? 'تبدیل ارز با موفقیت انجام شد' : 'Exchange completed successfully');
      setExAmount('');
    } else {
      setExMsg(locale === 'fa' ? 'موجودی ناکافی است' : 'Insufficient balance');
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-10 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-black text-[28px] md:text-[34px] text-ink flex items-center gap-3">
            <WalletIcon className="text-brand" size={32} />
            {t('title')}
          </h1>
          <p className="font-bold text-sub text-sm mt-1">{t('subtitle')}</p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl p-6 text-surface shadow-md relative overflow-hidden">
          <span className="text-xs font-black opacity-80 block mb-1">IRR (تومان)</span>
          <span className="text-3xl font-black font-mono num block mb-4">
            {wallet.IRR.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
          </span>
          <span className="text-[11px] font-bold opacity-75">{t('primaryBalance')}</span>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-black text-sub block mb-1">USDT (Tether)</span>
            <span className="text-2xl font-black text-ink font-mono num block mb-1">
              ${wallet.USDT.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
            </span>
          </div>
          <span className="text-[11px] font-bold text-sub">≈ {(wallet.USDT * 60000).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')} {locale === 'fa' ? 'تومان' : 'Toman'}</span>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-black text-sub block mb-1">AED (درهم امارات)</span>
            <span className="text-2xl font-black text-ink font-mono num block mb-1">
              د.إ {wallet.AED.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
            </span>
          </div>
          <span className="text-[11px] font-bold text-sub">≈ {(wallet.AED * 16000).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')} {locale === 'fa' ? 'تومان' : 'Toman'}</span>
        </div>
      </div>

      {/* Action Controls & Topup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Deposit / Topup */}
        <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="font-black text-xl text-ink mb-2">{t('deposit')}</h2>
          <p className="text-xs font-bold text-sub mb-6">{locale === 'fa' ? 'افزایش موجودی ریالی از طریق کلیه کارت‌های عضو شتاب' : 'Top up your Rial balance instantly via Shetab cards'}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'مبلغ شارژ (تومان)' : 'Amount (Toman)'}</label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="5,000,000"
                className="font-bold text-lg font-mono"
              />
            </div>

            <div className="flex gap-2">
              {[1000000, 5000000, 10000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDepositAmount(String(amt))}
                  className="px-3 py-1.5 rounded-lg border border-line bg-soft text-xs font-bold text-sub hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  +{amt.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                </button>
              ))}
            </div>

            <Button
              onClick={() => {
                const amt = Number(depositAmount);
                if (amt > 0) {
                  setCharging(true);
                  setTimeout(() => {
                    deposit('IRR', amt, locale === 'fa' ? 'شارژ درگاه شتاب' : 'Shetab Gateway Topup');
                    setDepositAmount('');
                    setCharging(false);
                  }, 600);
                }
              }}
              disabled={charging || !depositAmount}
              className="w-full h-12 bg-brand hover:bg-brand-dark text-surface font-black rounded-xl text-sm"
            >
              {charging ? <Loader2 className="animate-spin" size={18} /> : t('deposit')}
            </Button>
          </div>
        </div>

        {/* Currency Exchange */}
        <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="font-black text-xl text-ink mb-2">{t('exchange')}</h2>
          <p className="text-xs font-bold text-sub mb-6">{locale === 'fa' ? 'تبدیل آنی ارزها با نرخ لحظه‌ای بدون کارمزد اضافی' : 'Instant multi-currency exchange at live market rates'}</p>

          {exMsg && (
            <div className="p-3 mb-4 rounded-xl bg-mint/50 border border-brand/20 text-brand-dark text-xs font-bold">
              {exMsg}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'از ارز' : 'From'}</label>
                <select
                  value={exFrom}
                  onChange={(e) => setExFrom(e.target.value as 'IRR' | 'USDT' | 'AED')}
                  aria-label="From Currency"
                  className="w-full h-11 border border-line rounded-xl px-3 font-bold text-sm bg-surface"
                >
                  <option value="IRR">IRR (تومان)</option>
                  <option value="USDT">USDT</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'به ارز' : 'To'}</label>
                <select
                  value={exTo}
                  onChange={(e) => setExTo(e.target.value as 'IRR' | 'USDT' | 'AED')}
                  aria-label="To Currency"
                  className="w-full h-11 border border-line rounded-xl px-3 font-bold text-sm bg-surface"
                >
                  <option value="USDT">USDT</option>
                  <option value="AED">AED</option>
                  <option value="IRR">IRR (تومان)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'مقدار مبدا' : 'Amount'}</label>
              <Input
                type="number"
                value={exAmount}
                onChange={(e) => setExAmount(e.target.value)}
                placeholder="100"
                className="font-bold text-lg font-mono"
              />
            </div>

            <Button
              onClick={doExchange}
              disabled={!exAmount || Number(exAmount) <= 0}
              className="w-full h-12 bg-action hover:bg-action-hover text-[#14201f] font-black rounded-xl text-sm"
            >
              {t('exchange')}
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="font-black text-xl text-ink mb-6">{t('transactions')}</h2>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center text-sub py-8 text-sm font-bold">{locale === 'fa' ? 'هنوز تراکنشی ثبت نشده است.' : 'No transactions recorded yet.'}</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-4 rounded-xl border border-line/60 bg-soft/40">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl grid place-items-center ${tx.amount > 0 ? 'bg-success/10 text-success' : 'bg-rose-warm/10 text-rose-warm'}`}>
                    {tx.amount > 0 ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-ink">{tx.description}</h3>
                    <span className="text-[11px] font-mono text-sub">{tx.createdAt} • #{tx.id.slice(0, 8)}</span>
                  </div>
                </div>

                <div className="text-end">
                  <span className={`font-black text-base font-mono num ${tx.amount > 0 ? 'text-success' : 'text-rose-warm'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')} {locale === 'fa' ? 'تومان' : 'Toman'}
                  </span>
                  <span className="block text-[10.5px] text-sub">{tx.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
