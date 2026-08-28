'use client';

import { Wallet, CreditCard, ShieldCheck } from 'lucide-react';
import { formatMoney } from '@/lib/money';

interface PaymentGatewaySelectorProps {
  method: 'wallet_irr' | 'gateway';
  setMethod: (m: 'wallet_irr' | 'gateway') => void;
  walletBalance: number;
  totalPayable: number;
}

export function PaymentGatewaySelector({
  method,
  setMethod,
  walletBalance,
  totalPayable,
}: PaymentGatewaySelectorProps) {
  const hasEnoughWallet = walletBalance >= totalPayable;

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-sm space-y-4">
      <h2 className="text-[16px] font-black text-ink">انتخاب روش پرداخت</h2>

      <div className="space-y-3">
        {/* Wallet Method */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer ${
            method === 'wallet_irr'
              ? 'border-brand bg-mint/30 shadow-sm'
              : 'border-line/80 bg-surface hover:border-brand/40'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            checked={method === 'wallet_irr'}
            onChange={() => setMethod('wallet_irr')}
            className="mt-1 w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Wallet size={17} className="text-brand-dark shrink-0" />
                <strong className="text-[14px] font-bold text-ink">کیف پول ریالی Firuzo</strong>
              </div>
              <span className="text-[12px] font-bold font-mono text-sub">
                موجودی: {formatMoney(walletBalance, 'IRR')}
              </span>
            </div>
            <p className="text-[12px] text-sub">
              {hasEnoughWallet
                ? 'پرداخت آنی و کسر مستقیم از اعتبار کیف‌پول'
                : 'موجودی ناکافی است — باقی‌مانده از درگاه بانکی پرداخت خواهد شد.'}
            </p>
          </div>
        </label>

        {/* Direct Card Gateway */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer ${
            method === 'gateway'
              ? 'border-brand bg-mint/30 shadow-sm'
              : 'border-line/80 bg-surface hover:border-brand/40'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            checked={method === 'gateway'}
            onChange={() => setMethod('gateway')}
            className="mt-1 w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={17} className="text-brand-dark shrink-0" />
              <strong className="text-[14px] font-bold text-ink">درگاه امن بانکی شاپرک (شتاب)</strong>
            </div>
            <p className="text-[12px] text-sub">پرداخت با تمامی کارت‌های عضو شبکه شتاب با رمز پویا</p>
          </div>
        </label>
      </div>

      <div className="flex items-center gap-2 pt-2 text-[11px] font-bold text-sub">
        <ShieldCheck size={15} className="text-success shrink-0" />
        <span>تضمین امنیت تراکنش با پروتکل رمزنگاری SSL و نماد اعتماد الکترونیکی</span>
      </div>
    </div>
  );
}
