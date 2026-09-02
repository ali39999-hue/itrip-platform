'use client';

import { Wallet, CreditCard, ShieldCheck } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

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
  const locale = useLocale();
  const hasEnoughWallet = walletBalance >= totalPayable;

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-elev-1 space-y-4">
      <h2 className="text-[16px] font-black text-ink">
        {lt(locale, {
          fa: 'انتخاب روش پرداخت',
          en: 'Select Payment Method',
          ar: 'اختر طريقة الدفع',
          zh: '选择支付方式',
          ru: 'Выберите способ оплаты'
        })}
      </h2>

      <div className="space-y-3">
        {/* Wallet Method */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer ${
            method === 'wallet_irr'
              ? 'border-brand bg-mint/30 shadow-elev-1'
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
                <Wallet size={17} className="text-brand-dark shrink-0" aria-hidden="true" />
                <strong className="text-[14px] font-bold text-ink">
                  {lt(locale, {
                    fa: 'کیف پول ریالی Firuzo',
                    en: 'Firuzo Rial Wallet',
                    ar: 'محفظة Firuzo بالريال',
                    zh: 'Firuzo 里亚尔钱包',
                    ru: 'Риаловый кошелек Firuzo'
                  })}
                </strong>
              </div>
              <span className="text-[12px] font-bold font-mono text-sub">
                {lt(locale, { fa: 'موجودی:', en: 'Balance:', ar: 'الرصيد:', zh: '余额：', ru: 'Баланс:' })} {formatMoney(walletBalance, 'IRR')}
              </span>
            </div>
            <p className="text-[12px] text-sub">
              {hasEnoughWallet
                ? lt(locale, {
                    fa: 'پرداخت آنی و کسر مستقیم از اعتبار کیف‌پول',
                    en: 'Instant payment and direct deduction from wallet balance',
                    ar: 'دفع فوري وخصم مباشر من رصيد المحفظة',
                    zh: '即时支付，直接从钱包余额扣除',
                    ru: 'Мгновенная оплата и прямое списание с кошелька'
                  })
                : lt(locale, {
                    fa: 'موجودی ناکافی است — باقی‌مانده از درگاه بانکی پرداخت خواهد شد.',
                    en: 'Insufficient balance — remaining amount will be paid via gateway.',
                    ar: 'الرصيد غير كافٍ — سيتم دفع المبلغ المتبقي عبر بوابة الدفع.',
                    zh: '余额不足 — 剩余部分将通过网关支付。',
                    ru: 'Недостаточно средств — остаток будет оплачен через шлюз.'
                  })}
            </p>
          </div>
        </label>

        {/* Direct Card Gateway */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer ${
            method === 'gateway'
              ? 'border-brand bg-mint/30 shadow-elev-1'
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
              <CreditCard size={17} className="text-brand-dark shrink-0" aria-hidden="true" />
              <strong className="text-[14px] font-bold text-ink">
                {lt(locale, {
                  fa: 'درگاه امن بانکی شاپرک (شتاب)',
                  en: 'Secure Banking Gateway (Shetab)',
                  ar: 'بوابة الدفع البنكية الآمنة',
                  zh: '安全银行网关',
                  ru: 'Безопасный банковский шлюз'
                })}
              </strong>
            </div>
            <p className="text-[12px] text-sub">
              {lt(locale, {
                fa: 'پرداخت با تمامی کارت‌های عضو شبکه شتاب با رمز پویا',
                en: 'Payment with all Shetab network cards using dynamic OTP',
                ar: 'الدفع بجميع البطاقات المصرفية عبر كلمة المرور لمرة واحدة',
                zh: '支持所有主流借记卡及动态口令支付',
                ru: 'Оплата всеми банковскими картами с динамическим паролем'
              })}
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center gap-2 pt-2 text-[11px] font-bold text-sub">
        <ShieldCheck size={15} className="text-success shrink-0" aria-hidden="true" />
        <span>
          {lt(locale, {
            fa: 'تضمین امنیت تراکنش با پروتکل رمزنگاری SSL و نماد اعتماد الکترونیکی',
            en: 'Guaranteed transaction security with SSL encryption and trust badge',
            ar: 'ضمان أمان المعاملات مع تشفير SSL وشارة الثقة',
            zh: '通过 SSL 加密协议和电子信任认证保障交易安全',
            ru: 'Гарантия безопасности транзакций с SSL-шифрованием и знаком доверия'
          })}
        </span>
      </div>
    </div>
  );
}
