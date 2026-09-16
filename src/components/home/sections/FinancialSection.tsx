'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { Link } from '@/i18n/routing';
import { Wallet, ArrowLeft, ShieldCheck, Zap, CreditCard, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES } from '@/lib/countries';
import { CURRENCY_LABEL, toLocalCurrency } from '@/lib/money';

export function FinancialSection() {
  const locale = useLocale();
  const { country } = useCountryStore();
  const c = COUNTRIES[country] || COUNTRIES.iran;
  const currencyCode = c.currency;
  const currencyName = CURRENCY_LABEL[currencyCode] ? lt(locale, CURRENCY_LABEL[currencyCode]) : currencyCode;

  const [activeTab, setActiveTab] = useState<'local' | 'usdt'>('local');
  const numberLocale = locale === 'fa' ? 'fa-IR' : 'en-US';
  const formatAmount = (amount: number, maximumFractionDigits = 0) =>
    new Intl.NumberFormat(numberLocale, { maximumFractionDigits }).format(amount);

  const localBalance = toLocalCurrency(150000000, currencyCode);

  return (
    <section className="w-full py-14 md:py-20 px-4 md:px-10 bg-soft/50">
      <div className="max-w-[1280px] mx-auto grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        
        {/* Left Column: Description & Value Props */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand-dark text-xs font-bold">
            <Wallet size={16} />
            <span>{lt(locale, { fa: 'کیف پول چندارزی فیروزو', en: 'Firuzo Multi-Currency Wallet', ar: 'محفظة فيروزو متعددة العملات', zh: 'Firuzo 多币种钱包', ru: 'Мультивалютный кошелек Firuzo' })}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ink leading-tight">
            {lt(locale, { fa: 'پرداخت مطمئن با ریال، شتاب و کیف پول اختصاصی', en: 'Reliable payment with IRR, Shetab & Wallet', ar: 'دفع موثوق بالريال وشتاب والمحفظة', zh: '使用里亚尔、Shetab和专属钱包安全支付', ru: 'Надежная оплаتا в IRR, картами Shetab и кошельком' })}
          </h2>
          <p className="text-sm md:text-base text-sub leading-relaxed max-w-xl">
            {lt(locale, { fa: 'با شارژ کیف پول اعتباری خود به ریال، تمامی خدمات سفر اعم از هتل، پرواز، ترانسفر محلی و سیم‌کارت را با اطمینان کامل و قیمت شفاف خریداری کنید.', en: 'By topping up your wallet in IRR, book all travel services including hotels, flights, local transfers, and eSIMs with complete certainty and transparent pricing.', ar: 'من خلال شحن محفظتك، يمكنك شراء جميع خدمات السفر بأسعار شفافة.', zh: '通过充值钱包，以透明价格放心订购所有旅行服务。', ru: 'Пополнив свой кошелек, бронируйте все туристические услуги по прозрачным ценам.' })}
          </p>

          <ul className="grid sm:grid-cols-2 gap-4 pt-2">
            <li className="flex items-center gap-2.5 text-[13px] font-bold text-ink">
              <span className="w-7 h-7 rounded-lg bg-mint text-brand-dark grid place-items-center"><Zap size={14} aria-hidden="true" /></span>
              {lt(locale, { fa: 'شارژ سریع و صدور واچر معتبر', en: 'Fast Top-up & Verified Voucher Issue', ar: 'شحن سريع وإصدار واچر معتمد', zh: '快速充值与出具认证凭证', ru: 'Быстрое пополнение и ваучер' })}
            </li>
            <li className="flex items-center gap-2.5 text-[13px] font-bold text-ink">
              <span className="w-7 h-7 rounded-lg bg-brand/10 text-brand-dark grid place-items-center"><Wallet size={14} aria-hidden="true" /></span>
              {lt(locale, { fa: 'پشتیبانی از شبکه بانکی و کارت به کارت', en: 'Supports Banking Network & Card Transfer', ar: 'دعم الشبكة المصرفية والتحويل المباشر', zh: '支持银行网络与卡对卡转账', ru: 'Поддержка банковских карт и переводов' })}
            </li>
            <li className="flex items-center gap-2.5 text-[13px] font-bold text-ink">
              <span className="w-7 h-7 rounded-lg bg-action/10 text-action grid place-items-center"><ShieldCheck size={14} aria-hidden="true" /></span>
              {lt(locale, { fa: 'امنیت بانکی بر پایه General Ledger', en: 'Bank-grade General Ledger Security', ar: 'أمان مصرفي متقدم', zh: '银行级复式记账安全', ru: 'Банковская безопасность транзакций' })}
            </li>
            <li className="flex items-center gap-2.5 text-[13px] font-bold text-ink">
              <span className="w-7 h-7 rounded-lg bg-success/10 text-success grid place-items-center"><RefreshCw size={14} aria-hidden="true" /></span>
              {lt(locale, { fa: 'بازگشت وجه به کیف پول طبق قوانین کنسلی', en: 'Wallet Refund per Cancellation Rules', ar: 'استرداد الرصيد وفقاً لسياسات الإلغاء', zh: '按退改规则退还至钱包', ru: 'Возврат средств по правилам отмены' })}
            </li>
          </ul>

          <div className="pt-3 flex flex-wrap gap-3">
            <Link 
              href="/wallet" 
              className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-brand hover:bg-brand-dark transition-colors text-surface rounded-xl shadow-elev-1 focus-visible:ring-2 focus-visible:ring-brand font-black text-sm"
            >
              <span>{lt(locale, { fa: 'مدیریت و شارژ کیف پول', en: 'Open & Top Up Wallet', ar: 'عرض وإدارة المحفظة', zh: '管理与充值钱包', ru: 'Управление кошельком' })}</span>
              <ArrowLeft size={16} className="ltr:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Right Column: Modern Fintech Digital Card Preview */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-3xl">
          {/* Card Container with Gradient Mesh and Glassmorphism */}
          <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#064e4d] via-[#043e3d] to-[#022322] text-surface shadow-elev-3 border border-surface/15 overflow-hidden">
            {/* Background Decorative Rings */}
            <div className="absolute end-0 -top-8 w-40 h-40 rounded-full border-[16px] border-mint-bright/10 pointer-events-none" />
            <div className="absolute start-0 -bottom-6 w-32 h-32 rounded-full border-[12px] border-mint-bright/5 pointer-events-none" />

            {/* Top Bar of Card */}
            <div className="relative z-10 flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-surface/15 backdrop-blur-md grid place-items-center border border-surface/20">
                  <CreditCard size={20} className="text-mint-bright" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-mint-bright block leading-tight">FIRUZO TRAVEL CARD</span>
                  <span className="text-xs font-black tracking-widest text-surface/80 font-mono">•••• 8842</span>
                </div>
              </div>

              {/* Currency Selector Pills with ARIA Tab semantics */}
              <div
                role="tablist"
                aria-label="Currency selection"
                className="flex items-center p-1 rounded-xl bg-surface/10 backdrop-blur-md border border-surface/10 text-xs font-bold"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'local'}
                  onClick={() => setActiveTab('local')}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg transition focus-visible:ring-2 focus-visible:ring-mint-bright focus-visible:outline-none ${activeTab === 'local' ? 'bg-mint text-brand-dark font-black' : 'text-surface/80 hover:text-surface'}`}
                >
                  {currencyName} ({currencyCode})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'usdt'}
                  onClick={() => setActiveTab('usdt')}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg transition focus-visible:ring-2 focus-visible:ring-mint-bright focus-visible:outline-none ${activeTab === 'usdt' ? 'bg-mint text-brand-dark font-black' : 'text-surface/80 hover:text-surface'}`}
                >
                  USDT
                </button>
              </div>
            </div>

            {/* Balance Display */}
            <div className="relative z-10 mb-8">
              <span className="text-xs text-mint-bright/80 font-bold block mb-1">
                {lt(locale, { fa: 'موجودی در دسترس', en: 'Available Balance', ar: 'الرصيد المتاح', zh: '可用余额', ru: 'Доступный баланс' })}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black font-sans tabular-nums tracking-tight">
                  {activeTab === 'local' ? formatAmount(localBalance) : formatAmount(2500, 2)}
                </span>
                <span className="text-sm font-bold text-mint-bright">
                  {activeTab === 'local'
                    ? currencyName
                    : 'USDT (Tether)'}
                </span>
              </div>
              <span className="text-[11px] text-surface/60 font-mono mt-1 block">
                {activeTab === 'local'
                  ? `≈ ${formatAmount(2500, 2)} USDT`
                  : `≈ ${formatAmount(localBalance)} ${currencyName}`}
              </span>
            </div>

            {/* Quick Actions Footer of the Card */}
            <div className="relative z-10 pt-4 border-t border-surface/15 flex items-center justify-between">
              <span className="text-xs font-bold text-surface/70">
                {lt(locale, { fa: 'اتصال به شبکه شتاب و رمزارز', en: 'Connected to Shetab & Crypto', ar: 'متصل بشبكة شتاب والعملات', zh: '已连接Shetab与加密网络', ru: 'Подключено к Shetab и крипто' })}
              </span>
              <Link
                href="/wallet"
                className="inline-flex items-center gap-1 text-xs font-black text-action hover:text-gold-light transition py-2 px-3 -my-2 -mx-3 rounded-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <span>{lt(locale, { fa: 'شارژ آنلاین', en: 'Top Up', ar: 'شحن', zh: '快速充值', ru: 'Пополнить' })}</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}