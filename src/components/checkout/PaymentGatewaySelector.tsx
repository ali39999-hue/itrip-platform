'use client';

import React, { useState } from 'react';
import {
  Wallet,
  CreditCard,
  ShieldCheck,
  ReceiptText,
  Coins,
  Globe2,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export type PaymentMethodType = 'wallet_irr' | 'gateway_ecardo' | 'gateway' | 'card_transfer' | 'crypto_usdt';

export type EcardoInstrument = 'visa_mastercard' | 'crypto_usdt' | 'wechat_alipay' | 'shetab_card';

interface PaymentGatewaySelectorProps {
  method: PaymentMethodType;
  setMethod: (m: PaymentMethodType) => void;
  walletBalance: number;
  totalPayable: number; // in Toman
  selectedInstrument?: EcardoInstrument;
  setSelectedInstrument?: (inst: EcardoInstrument) => void;
}

export function PaymentGatewaySelector({
  method,
  setMethod,
  walletBalance,
  totalPayable,
  selectedInstrument: externalInstrument,
  setSelectedInstrument: setExternalInstrument,
}: PaymentGatewaySelectorProps) {
  const locale = useLocale();
  const hasEnoughWallet = walletBalance >= totalPayable;

  // Local state if not controlled from parent
  const [internalInstrument, setInternalInstrument] = useState<EcardoInstrument>('visa_mastercard');
  const activeInstrument = externalInstrument || internalInstrument;
  const setInstrument = setExternalInstrument || setInternalInstrument;

  // Adapt wallet currency presentation based on user language/locale
  const localizedCurrency = locale === 'zh' ? 'CNY' : locale === 'en' || locale === 'ru' ? 'USDT' : 'IRR';

  // Dynamic Real-time Conversions from Toman (Base) into Target Payment Currencies
  // 1 USD = 55,000 Toman, 1 USDT = 55,000 Toman, 1 CNY = 7,600 Toman
  const usdAmount = totalPayable > 0 ? (totalPayable / 55000).toFixed(2) : '0.00';
  const usdtAmount = totalPayable > 0 ? (totalPayable / 55000).toFixed(2) : '0.00';
  const cnyAmount = totalPayable > 0 ? (totalPayable / 7600).toFixed(2) : '0.00';
  const irrAmount = totalPayable.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US');

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-elev-1 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-black text-ink">
            {lt(locale, {
              fa: 'انتخاب روش و ارز پرداخت',
              en: 'Select Payment Method & Currency',
              ar: 'اختر طريقة وعملة الدفع',
              zh: '选择支付方式与币种',
              ru: 'Выберите способ оплаты и валюту'
            })}
          </h2>
          <p className="text-[12px] text-sub mt-0.5">
            {lt(locale, {
              fa: 'انتخاب آسان ارز مورد نظر با تبدیل آنی و شفاف نرخ تسعیر ارز (بدون کارمزد مخفی)',
              en: 'Choose your preferred currency with transparent, instant exchange rate lock',
              ar: 'اختر عملتك المفضلة مع تثبيت سعر الصرف الفوري والشفاف دون رسوم خفية',
              zh: '自由选择支付币种，实时汇率换算并锁定（无隐藏手续费）',
              ru: 'Выберите желаемую валюту с мгновенной и прозрачной фиксацией курса'
            })}
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand/10 text-brand-dark border border-brand/20">
          <ShieldCheck size={14} className="text-brand-dark" />
          eCardo Fintech
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {/* ========================================================================= */}
        {/* 1. ECARDO MULTI-CURRENCY GATEWAY (FEATURED WITH INSTRUMENT SELECTION)     */}
        {/* ========================================================================= */}
        <div
          className={`relative rounded-2xl border-2 transition-all overflow-hidden ${
            method === 'gateway_ecardo'
              ? 'border-brand bg-gradient-to-br from-brand/5 via-mint/15 to-surface shadow-elev-2'
              : 'border-line/80 bg-surface hover:border-brand/40'
          }`}
        >
          <label className="flex items-start gap-3.5 p-4 cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              value="gateway_ecardo"
              checked={method === 'gateway_ecardo'}
              onChange={() => setMethod('gateway_ecardo')}
              className="mt-1 w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-[12px] shadow-sm">
                    eC
                  </div>
                  <div>
                    <strong className="text-[15px] font-black text-ink flex items-center gap-2">
                      {lt(locale, {
                        fa: 'درگاه چند ارزی بین‌المللی ای‌کاردو (eCardo)',
                        en: 'eCardo Multi-Currency Gateway',
                        ar: 'بوابة إيكاردو متعددة العملات الدولية',
                        zh: 'eCardo 易卡通跨国多币种网关',
                        ru: 'Мультивалютный международный шлюз eCardo'
                      })}
                    </strong>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 size={12} />
                  {lt(locale, { fa: 'انتخاب ارز دلخواه', en: 'Multi-Currency Choice', ar: 'اختيار العملة', zh: '支持多种币种结算', ru: 'Выбор валюты' })}
                </span>
              </div>

              <p className="text-[12px] text-sub leading-relaxed mb-3">
                {lt(locale, {
                  fa: 'پرداخت با کارت‌های بین‌المللی، تتر، یوان چین یا شتاب. مبلغ سفارش به صورت خودکار به ارز انتخابی شما تبدیل می‌شود.',
                  en: 'Pay with International Cards, Tether, Chinese Yuan or Shetab. Converted automatically to your selected currency.',
                  ar: 'ادفع بالبطاقات الدولية، التيثر، اليوان الصيني أو شتاب. يتم التحويل تلقائياً إلى العملة المختارة.',
                  zh: '支持国际信用卡、泰达币、微信/支付宝及银联卡，系统自动按实时汇率精准换算。',
                  ru: 'Оплата картами Visa/MC, USDT, CNY или картами Shetab с автоматическим пересчетом курса.'
                })}
              </p>

              {/* Interactive Currency / Instrument Picker */}
              <div className="mt-3 pt-3 border-t border-line/60">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[12px] font-black text-ink flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    {lt(locale, {
                      fa: 'ارز و روش پرداختی خود را مشخص کنید:',
                      en: 'Select your payment instrument & currency:',
                      ar: 'حدد طريقة وعملة الدفع الخاصة بك:',
                      zh: '请选择您的支付渠道与结算币种：',
                      ru: 'Выберите метод оплаты и валюту:'
                    })}
                  </span>
                  <span className="text-[11px] text-sub flex items-center gap-1">
                    <Lock size={12} className="text-success" />
                    {lt(locale, { fa: 'نرخ تضمین‌شده ۱۵ دقیقه', en: '15-min Rate Lock', ar: 'سعر مضمون 15 دقيقة', zh: '15分钟汇率锁定', ru: 'Курс зафиксирован' })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Visa / Mastercard (USD) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setMethod('gateway_ecardo');
                      setInstrument('visa_mastercard');
                    }}
                    className={`p-3 rounded-xl border text-start transition-all ${
                      method === 'gateway_ecardo' && activeInstrument === 'visa_mastercard'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-line/70 bg-surface hover:border-brand/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif italic font-black text-blue-700 text-xs px-1.5 py-0.5 rounded bg-blue-100 border border-blue-200">
                          VISA
                        </span>
                        <span className="text-[11px] font-bold text-amber-900 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200">
                          MC
                        </span>
                        <strong className="text-[13px] font-black text-ink">
                          {lt(locale, { fa: 'کارت‌های بین‌المللی (دلار)', en: 'International Cards (USD)', ar: 'بطاقات دولية (دولار)', zh: '国际银行卡 (USD)', ru: 'Карты Visa/MC (USD)' })}
                        </strong>
                      </div>
                      {method === 'gateway_ecardo' && activeInstrument === 'visa_mastercard' && (
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-[15px] font-black font-mono text-emerald-700">
                        ${usdAmount} <span className="text-[11px] font-sans">USD</span>
                      </span>
                      <span className="text-[11px] text-sub font-mono">
                        1 USD ≈ 55,000 T
                      </span>
                    </div>
                  </button>

                  {/* Option 2: Tether Crypto (USDT) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setMethod('gateway_ecardo');
                      setInstrument('crypto_usdt');
                    }}
                    className={`p-3 rounded-xl border text-start transition-all ${
                      method === 'gateway_ecardo' && activeInstrument === 'crypto_usdt'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-line/70 bg-surface hover:border-brand/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-teal-700 px-1.5 py-0.5 rounded bg-teal-100 border border-teal-200 text-xs font-black flex items-center gap-1">
                          <Coins size={12} />
                          USDT
                        </span>
                        <strong className="text-[13px] font-black text-ink">
                          {lt(locale, { fa: 'رمزارز و تتر (USDT)', en: 'Crypto & Tether (USDT)', ar: 'العملات الرقمية والتيثر', zh: '泰达币支付 (USDT)', ru: 'Tether (USDT)' })}
                        </strong>
                      </div>
                      {method === 'gateway_ecardo' && activeInstrument === 'crypto_usdt' && (
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-[15px] font-black font-mono text-teal-700">
                        {usdtAmount} <span className="text-[11px] font-sans">USDT</span>
                      </span>
                      <span className="text-[11px] text-sub font-mono">
                        TRC20 / TON / BEP20
                      </span>
                    </div>
                  </button>

                  {/* Option 3: WeChat Pay & Alipay (CNY) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setMethod('gateway_ecardo');
                      setInstrument('wechat_alipay');
                    }}
                    className={`p-3 rounded-xl border text-start transition-all ${
                      method === 'gateway_ecardo' && activeInstrument === 'wechat_alipay'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-line/70 bg-surface hover:border-brand/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-green-800 px-1.5 py-0.5 rounded bg-green-100 border border-green-200 text-xs font-black">
                          微信/支
                        </span>
                        <strong className="text-[13px] font-black text-ink">
                          {lt(locale, { fa: 'وی‌چت‌پِی و علی‌پِی (یوان)', en: 'WeChat & Alipay (CNY)', ar: 'وي شات وعلي بي (يوان)', zh: '微信支付 / 支付宝 (CNY)', ru: 'WeChat / Alipay (CNY)' })}
                        </strong>
                      </div>
                      {method === 'gateway_ecardo' && activeInstrument === 'wechat_alipay' && (
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-[15px] font-black font-mono text-green-700">
                        ¥{cnyAmount} <span className="text-[11px] font-sans">CNY (元)</span>
                      </span>
                      <span className="text-[11px] text-sub font-mono">
                        1 CNY ≈ 7,600 T
                      </span>
                    </div>
                  </button>

                  {/* Option 4: Shetab Iranian Cards (IRR / IRT) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setMethod('gateway_ecardo');
                      setInstrument('shetab_card');
                    }}
                    className={`p-3 rounded-xl border text-start transition-all ${
                      method === 'gateway_ecardo' && activeInstrument === 'shetab_card'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-line/70 bg-surface hover:border-brand/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800 px-1.5 py-0.5 rounded bg-slate-200 border border-slate-300 text-xs font-black">
                          شتاب
                        </span>
                        <strong className="text-[13px] font-black text-ink">
                          {lt(locale, { fa: 'کارت‌های بانکی شتاب (تومان)', en: 'Shetab Debit Cards (IRT)', ar: 'بطاقات شتاب المصرفية', zh: '伊朗本地银行卡 (Shetab)', ru: 'Карты Shetab (IRT)' })}
                        </strong>
                      </div>
                      {method === 'gateway_ecardo' && activeInstrument === 'shetab_card' && (
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-[15px] font-black font-mono text-slate-800">
                        {irrAmount} <span className="text-[11px] font-sans">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Toman' })}</span>
                      </span>
                      <span className="text-[11px] text-sub">
                        {lt(locale, { fa: 'رمز پویا', en: 'Dynamic OTP', ar: 'OTP', zh: '动态口令', ru: 'OTP' })}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </label>
        </div>

        {/* ========================================================================= */}
        {/* 2. LOCALE-ADAPTED WALLET (FIROUZO & ECARDO WALLET)                         */}
        {/* ========================================================================= */}
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
            value="wallet_irr"
            checked={method === 'wallet_irr'}
            onChange={() => setMethod('wallet_irr')}
            className="mt-1 w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Wallet size={17} className="text-brand-dark shrink-0" aria-hidden="true" />
                <strong className="text-[14px] font-bold text-ink">
                  {locale === 'zh'
                    ? 'Firuzo 账户钱包 (CNY / USDT)'
                    : locale === 'en' || locale === 'ru'
                    ? 'Firuzo Multi-Currency Wallet (USD / USDT)'
                    : 'کیف پول کاربر (فیروزو / ای‌کاردو)'}
                </strong>
              </div>
              <span className="text-[12px] font-bold font-mono text-sub">
                {lt(locale, { fa: 'موجودی:', en: 'Balance:', ar: 'الرصيد:', zh: '余额：', ru: 'Баланس:' })}{' '}
                {formatMoney(walletBalance, localizedCurrency, locale)}
              </span>
            </div>
            <p className="text-[12px] text-sub">
              {hasEnoughWallet
                ? lt(locale, {
                    fa: 'پرداخت آنی و کسر مستقیم از اعتبار کیف‌پول بدون نیاز به ورود مجدد اطلاعات کارت',
                    en: 'Instant checkout with direct deduction from your wallet balance',
                    ar: 'دفع فوري وخصم مباشر من رصيد المحفظة دون الحاجة لبيانات البطاقة',
                    zh: '即时支付，直接从钱包余额扣除',
                    ru: 'Мгновенная оплата и прямое списание с баланса'
                  })
                : lt(locale, {
                    fa: 'موجودی کیف‌پول کافی نیست. درگاه چندارزی ای‌کاردو را انتخاب کنید.',
                    en: 'Insufficient wallet balance. Please choose eCardo Multi-Currency Gateway.',
                    ar: 'رصيد المحفظة غير كافٍ. يرجى اختيار بوابة إيكاردو متعددة العملات.',
                    zh: '钱包余额不足，请选择上方 eCardo 易卡通进行跨国支付。',
                    ru: 'Недостаточно средств на кошельке. Выберите шлюз eCardo.'
                  })}
            </p>
            {!hasEnoughWallet && (
              <button
                type="button"
                onClick={() => setMethod('gateway_ecardo')}
                className="mt-1.5 text-[12px] font-black text-brand-dark underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded"
              >
                {lt(locale, {
                  fa: 'انتخاب درگاه پرداخت آنلاین ای‌کاردو ↗',
                  en: 'Switch to eCardo Gateway ↗',
                  ar: 'الانتقال إلى بوابة إيكاردو ↗',
                  zh: '切换至 eCardo 网关支付 ↗',
                  ru: 'Перейти к шлюзу eCardo ↗'
                })}
              </button>
            )}
          </div>
        </label>

        {/* ========================================================================= */}
        {/* 3. SHAPARAK / SHETAB BANKING GATEWAY (IRANIAN DOMESTIC DIRECT)            */}
        {/* ========================================================================= */}
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
            value="gateway"
            checked={method === 'gateway'}
            onChange={() => setMethod('gateway')}
            className="mt-1 w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <CreditCard size={17} className="text-brand-dark shrink-0" aria-hidden="true" />
                <strong className="text-[14px] font-bold text-ink">
                  {lt(locale, {
                    fa: 'درگاه مستقیم شاپرک (سپ / سامان کیش)',
                    en: 'Direct Shetab Gateway (SEP / Saman)',
                    ar: 'بوابة شتاب المباشرة (سامان كيش)',
                    zh: '直连伊朗 شاپرک 银行网关',
                    ru: 'Прямой шлюз Shetab (SEP)'
                  })}
                </strong>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {lt(locale, { fa: 'رمز پویا', en: 'Dynamic OTP', ar: 'كلمة مرور ديناميكية', zh: '动态验证码', ru: 'OTP' })}
              </span>
            </div>
            <p className="text-[12px] text-sub">
              {lt(locale, {
                fa: 'اتصال مستقیم به درگاه شاپرک با کارت‌های بانکی عضو شبکه شتاب',
                en: 'Direct connection to Shaparak gateway with Iranian debit cards',
                ar: 'اتصال مباشر ببوابة شاابراك مع بطاقات شتاب الإيرانية',
                zh: '直连伊朗国内银联清算系统',
                ru: 'Прямое подключение к шлюзу Shaparak'
              })}
            </p>
          </div>
        </label>

        {/* ========================================================================= */}
        {/* 4. CARD TO CARD & RECEIPT UPLOAD (PAYMENTINO)                             */}
        {/* ========================================================================= */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer ${
            method === 'card_transfer'
              ? 'border-brand bg-mint/30 shadow-elev-1'
              : 'border-line/80 bg-surface hover:border-brand/40'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="card_transfer"
            checked={method === 'card_transfer'}
            onChange={() => setMethod('card_transfer')}
            className="mt-1 w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <ReceiptText size={17} className="text-brand-dark shrink-0" aria-hidden="true" />
                <strong className="text-[14px] font-bold text-ink">
                  {lt(locale, {
                    fa: 'کارت به کارت و ثبت فیش بانکی (پیمنتینو)',
                    en: 'Card-to-Card & Receipt Upload (Paymentino)',
                    ar: 'تحويل بنكي وتحميل الإيصال (بيمينتينو)',
                    zh: '银行卡转账及上传回执 (Paymentino)',
                    ru: 'Банковский перевод и загрузка квитанции'
                  })}
                </strong>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {lt(locale, { fa: 'تخفیف مستقیم', en: 'Special Discount', ar: 'خصم خاص', zh: '转账特惠', ru: 'Скидка' })}
              </span>
            </div>
            <p className="text-[12px] text-sub">
              {lt(locale, {
                fa: 'واریز به شماره کارت‌های رسمی فیروزو، ثبت شماره پیگیری و آپلود تصویر رسید',
                en: 'Direct transfer to official bank cards with tracking number & receipt upload',
                ar: 'تحويل مباشر إلى بطاقات فيروزو وتحميل صورة الإيصال مع رقم التتبع',
                zh: '转账至官方卡号并上传付款凭证',
                ru: 'Перевод на карты Firuzo с загрузкой чека'
              })}
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-line/60 text-[11px] font-bold text-sub">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-success shrink-0" aria-hidden="true" />
          <span>
            {lt(locale, {
              fa: 'رمزنگاری ۲۵۶ بیتی SSL و انطباق کامل با پروتکل مالی امن کریدور فین‌تک',
              en: '256-bit SSL encryption & full compliance with Fintech Corridor protocols',
              ar: 'تشفير 256 بت SSL والتوافق الكامل مع بروتوكولات الدفع الآمنة',
              zh: '256位 SSL 传输加密及跨国金融合规协议保障',
              ru: '256-битное шифрование SSL и полное соответствие протоколам'
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-brand-dark">
          <Globe2 size={13} />
          <span>IR-CN Corridor</span>
        </div>
      </div>
    </div>
  );
}
