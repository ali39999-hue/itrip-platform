'use client';

import React from 'react';
import { Wallet, CreditCard, ShieldCheck, ReceiptText, Coins, Globe2, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export type PaymentMethodType = 'wallet_irr' | 'gateway_ecardo' | 'gateway' | 'card_transfer' | 'crypto_usdt';

interface PaymentGatewaySelectorProps {
  method: PaymentMethodType;
  setMethod: (m: PaymentMethodType) => void;
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

  // Adapt wallet currency presentation based on user language/locale
  const localizedCurrency = locale === 'zh' ? 'CNY' : locale === 'en' || locale === 'ru' ? 'USDT' : 'IRR';

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-elev-1 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-black text-ink">
            {lt(locale, {
              fa: 'انتخاب روش پرداخت (درگاه و کیف‌پول)',
              en: 'Select Payment Method & Gateway',
              ar: 'اختر طريقة الدفع والبوابة',
              zh: '选择支付方式与网关',
              ru: 'Выберите способ оплаты и шлюз'
            })}
          </h2>
          <p className="text-[12px] text-sub mt-0.5">
            {lt(locale, {
              fa: 'پشتیبانی یکپارچه از کارت‌های بین‌المللی، شتاب، وی‌چت‌پِی، علی‌پِی و تتر',
              en: 'Integrated support for International Cards, Shetab, WeChat Pay, Alipay & USDT',
              ar: 'دعم متكامل لبطاقات شتاب، فيزا/ماستركارد، وي شات، علي بي والتيثر',
              zh: '支持国际信用卡、银联/Shetab、微信支付、支付宝及泰达币',
              ru: 'Поддержка карт Shetab, Visa/Mastercard, WeChat Pay, Alipay и USDT'
            })}
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand/10 text-brand-dark border border-brand/20">
          <ShieldCheck size={14} className="text-brand-dark" />
          eCardo Fintech
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* ========================================================================= */}
        {/* 1. ECARDO MULTI-CURRENCY GATEWAY (FEATURED / ICONIC)                       */}
        {/* ========================================================================= */}
        <label
          className={`relative flex items-start gap-3.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
            method === 'gateway_ecardo'
              ? 'border-brand bg-gradient-to-br from-brand/5 via-mint/20 to-surface shadow-elev-2'
              : 'border-line/80 bg-surface hover:border-brand/40 hover:bg-soft/30'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            checked={method === 'gateway_ecardo'}
            onChange={() => setMethod('gateway_ecardo')}
            className="mt-1 w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-[11px] shadow-sm">
                  eC
                </div>
                <div>
                  <strong className="text-[14px] font-black text-ink flex items-center gap-2">
                    {lt(locale, {
                      fa: 'درگاه چند ارزی و بین‌المللی ای‌کاردو (eCardo)',
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
                {lt(locale, { fa: 'درگاه رسمی کریدور', en: 'Official Corridor Gateway', ar: 'البوابة الرسمية', zh: '官方直连通道', ru: 'Официальный шлюз' })}
              </span>
            </div>

            <p className="text-[12px] text-sub mb-3 leading-relaxed">
              {lt(locale, {
                fa: 'پرداخت آنی و امن با دلار (USD)، تتر (USDT)، یوان چین (CNY) و ریال ایران از طریق درگاه ای‌کاردو.',
                en: 'Instant, secure checkout supporting USD, USDT, Chinese Yuan (CNY) and Iranian Rial via eCardo.',
                ar: 'دفع فوري وآمن بالدولار الأمريكي والتيثر واليوان الصيني والريال الإيراني عبر بوابة إيكاردو.',
                zh: '支持美元 (USD)、泰达币 (USDT)、人民币 (CNY) 及伊朗里亚尔，直连 eCardo 结算。',
                ru: 'Мгновенная и безопасная оплата в USD, USDT, CNY и IRR через защищённый шлюз eCardo.'
              })}
            </p>

            {/* Iconic Badges for Supported Instruments */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/50">
              <span className="text-[11px] font-bold text-sub me-1">
                {lt(locale, { fa: 'پشتیبانی از:', en: 'Supports:', ar: 'يدعم:', zh: '支持卡种：', ru: 'Поддерживает:' })}
              </span>

              {/* Visa Icon Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-black tracking-wider">
                <span className="font-serif italic font-black">VISA</span>
              </span>

              {/* Mastercard Icon Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black">
                <span className="inline-flex -space-x-1 rtl:space-x-reverse me-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block opacity-90" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block opacity-90" />
                </span>
                Mastercard
              </span>

              {/* WeChat Pay Icon Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 border border-green-200 text-green-800 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
                WeChat Pay (微信支付)
              </span>

              {/* Alipay Icon Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" />
                Alipay (支付宝)
              </span>

              {/* Tether USDT Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
                <Coins size={11} className="text-teal-600" />
                USDT
              </span>
            </div>
          </div>
        </label>

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
                {lt(locale, { fa: 'موجودی:', en: 'Balance:', ar: 'الرصيد:', zh: '余额：', ru: 'Баланс:' })}{' '}
                {formatMoney(walletBalance, localizedCurrency, locale)}
              </span>
            </div>
            <p className="text-[12px] text-sub">
              {hasEnoughWallet
                ? lt(locale, {
                    fa: 'پرداخت آنی و کسر مستقیم از اعتبار کیف‌پول بدون هدایت به درگاه',
                    en: 'Instant checkout with direct deduction from your wallet balance',
                    ar: 'دفع فوري وخصم مباشر من رصيد المحفظة',
                    zh: '即时支付，直接从钱包余额扣除',
                    ru: 'Мгновенная оплата и прямое списание с баланса'
                  })
                : lt(locale, {
                    fa: 'موجودی کیف‌پول کافی نیست. درگاه ای‌کاردو یا شاپرک را انتخاب کنید.',
                    en: 'Insufficient wallet balance. Please choose eCardo or Shetab gateway below.',
                    ar: 'رصيد المحفظة غير كافٍ. يرجى اختيار بوابة إيكاردو أو شتاب أدناه.',
                    zh: '钱包余额不足，请选择 eCardo 易卡通或银行网关支付。',
                    ru: 'Недостаточно средств на кошельке. Выберите шлюз eCardo или Shetab.'
                  })}
            </p>
            {!hasEnoughWallet && (
              <button
                type="button"
                onClick={() => setMethod('gateway_ecardo')}
                className="mt-1.5 text-[12px] font-black text-brand-dark underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded"
              >
                {lt(locale, {
                  fa: 'پرداخت مستقیم با درگاه ای‌کاردو',
                  en: 'Pay directly via eCardo Gateway',
                  ar: 'الدفع عبر بوابة إيكاردو',
                  zh: '使用 eCardo 网关直接支付',
                  ru: 'Оплатить через eCardo'
                })}
              </button>
            )}
          </div>
        </label>

        {/* ========================================================================= */}
        {/* 3. SHAPARAK / SHETAB BANKING GATEWAY (IRANIAN DOMESTIC)                   */}
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
                    fa: 'درگاه بانکی شاپرک (کارت‌های عضو شتاب)',
                    en: 'Shetab Banking Gateway (Shaparak)',
                    ar: 'بوابة الدفع المصرفية الإيرانية (شتاب)',
                    zh: '伊朗国内银行卡网关 (Shetab)',
                    ru: 'Банковский шлюз Shetab (Иран)'
                  })}
                </strong>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {lt(locale, { fa: 'رمز پویا', en: 'Dynamic OTP', ar: 'كلمة مرور ديناميكية', zh: '动态验证码', ru: 'OTP' })}
              </span>
            </div>
            <p className="text-[12px] text-sub">
              {lt(locale, {
                fa: 'پرداخت با تمامی کارت‌های بانکی عضو شبکه شتاب با استفاده از رمز یکبارمصرف (پویا)',
                en: 'Payment with all Iranian debit cards using dynamic OTP password',
                ar: 'الدفع بجميع البطاقات المصرفية عبر كلمة المرور لمرة واحدة',
                zh: '支持所有伊朗银行发行的借记卡动态口令支付',
                ru: 'Оплата всеми банковскими картами сети Shetab'
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

        {/* ========================================================================= */}
        {/* 5. DIRECT CRYPTO TETHER (USDT ON-CHAIN)                                   */}
        {/* ========================================================================= */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer ${
            method === 'crypto_usdt'
              ? 'border-brand bg-mint/30 shadow-elev-1'
              : 'border-line/80 bg-surface hover:border-brand/40'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            checked={method === 'crypto_usdt'}
            onChange={() => setMethod('crypto_usdt')}
            className="mt-1 w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Coins size={17} className="text-brand-dark shrink-0" aria-hidden="true" />
                <strong className="text-[14px] font-bold text-ink">
                  {lt(locale, {
                    fa: 'پرداخت رمزارز تتر مستقیم (USDT TRC-20 / TON)',
                    en: 'Direct Crypto Tether (USDT TRC-20 / TON)',
                    ar: 'الدفع المباشر بالتيثر (USDT TRC-20 / TON)',
                    zh: '直接加密货币支付 (USDT TRC-20 / TON)',
                    ru: 'Прямая оплата USDT (TRC-20 / TON)'
                  })}
                </strong>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                {lt(locale, { fa: 'تأیید بلاکچین', en: 'On-Chain Verified', ar: 'تحقق البلوكشين', zh: '链上验证', ru: 'Блокчейн' })}
              </span>
            </div>
            <p className="text-[12px] text-sub">
              {lt(locale, {
                fa: 'واریز امن تتر با کیوآرکد اختصاصی، قفل لحظه‌ای نرخ ارز و استعلام خودکار بر خط',
                en: 'Secure Tether deposit with dedicated QR code, exchange rate lock and auto check',
                ar: 'إيداع آمن للتيثر مع رمز QR مخصص وقفل سعر الصرف والاستعلام الفوري',
                zh: '配备动态专属二维码与汇率锁定的 USDT 充值',
                ru: 'Безопасная оплата USDT с QR-кодом и фиксацией курса'
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
