'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWallet, requestWalletTopUp, exchangeWalletCurrency } from '@/actions/booking';
import {
  Wallet as WalletIcon,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  LogIn,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { CURRENCY_TO_TOMAN } from '@/lib/money';

export default function WalletPage() {
  const t = useTranslations('Wallet');
  const commonT = useTranslations('Common.aria');
  const locale = useLocale();
  const router = useRouter();

  const [wallet, setWallet] = useState<{ IRR: number; USDT: number; AED: number; USD?: number; CNY?: number }>({
    IRR: 0,
    USDT: 0,
    AED: 0,
    USD: 0,
    CNY: 0,
  });
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    direction: string;
    amount: number;
    currency: string;
    referenceType: string | null;
    createdAt: Date;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [actionError, setActionError] = useState('');

  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState<'IRR' | 'USD' | 'USDT' | 'CNY'>('IRR');
  const [depositGateway, setDepositGateway] = useState<'ecardo' | 'shetab'>('ecardo');
  const [charging, setCharging] = useState(false);

  const [exFrom, setExFrom] = useState<'IRR' | 'USDT' | 'AED'>('IRR');
  const [exTo, setExTo] = useState<'IRR' | 'USDT' | 'AED'>('USDT');
  const [exAmount, setExAmount] = useState('');
  const [exMsg, setExMsg] = useState('');
  const [exError, setExError] = useState('');
  const [exchanging, setExchanging] = useState(false);

  // Bumping this counter re-fetches the wallet from the server.
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await getWallet();
        if (!active) return;
        if (res.success && res.balances) {
          setWallet(res.balances);
          setTransactions(res.transactions || []);
          setUnauthorized(false);
        } else if (res.error === 'Unauthorized') {
          setUnauthorized(true);
        }
      } catch (e) {
        console.error('Failed to load wallet:', e);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [reloadTick]);

  async function doDeposit() {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) return;
    setCharging(true);
    setActionError('');
    try {
      const res = await requestWalletTopUp(amt, {
        currency: depositCurrency,
        gateway: depositGateway,
      });
      if (res.success) {
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
          return;
        }
        setDepositAmount('');
        setReloadTick((tick) => tick + 1);
      } else if (res.error === 'Unauthorized') {
        setUnauthorized(true);
      } else {
        setActionError(res.error || lt(locale, { fa: 'شارژ ناموفق بود', en: 'Top-up failed', ar: 'فشل الشحن', zh: '充值失败', ru: 'Ошибка пополнения' }));
      }
    } finally {
      setCharging(false);
    }
  }

  async function doExchange() {
    const amt = Number(exAmount);
    if (!amt || amt <= 0) return;
    setExchanging(true);
    setExMsg('');
    setExError('');
    try {
      const res = await exchangeWalletCurrency(exFrom, exTo, amt);
      if (res.success) {
        setExMsg(
          lt(locale, {
            fa: `تبدیل ${amt.toLocaleString()} ${exFrom} به ${exTo} با موفقیت انجام شد`,
            en: `Exchanged ${amt.toLocaleString()} ${exFrom} to ${exTo} successfully`,
            ar: `تم تحويل ${amt.toLocaleString()} ${exFrom} إلى ${exTo} بنجاح`,
            zh: `成功将 ${amt.toLocaleString()} ${exFrom} 兑换为 ${exTo}`,
            ru: `Обмен ${amt.toLocaleString()} ${exFrom} на ${exTo} выполнен`,
          })
        );
        setExAmount('');
        setReloadTick((tick) => tick + 1);
      } else if (res.error === 'Unauthorized') {
        setUnauthorized(true);
      } else {
        setExError(res.error || lt(locale, { fa: 'تبدیل ناموفق بود', en: 'Exchange failed', ar: 'فشل التحويل', zh: '兑换失败', ru: 'Ошибка обмена' }));
      }
    } finally {
      setExchanging(false);
    }
  }

  if (unauthorized && !loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-surface border border-line rounded-3xl p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-mint grid place-items-center mx-auto mb-5 text-brand-dark">
            <LogIn size={28} />
          </div>
          <h1 className="text-xl font-black text-ink mb-2">{t('title')}</h1>
          <p className="text-[13px] font-bold text-sub mb-6 leading-relaxed">
            {lt(locale, {
              fa: 'برای مشاهده کیف پول خود ابتدا وارد حساب شوید.',
              en: 'Sign in to view your wallet.',
              ar: 'سجّل الدخول لعرض محفظتك.',
              zh: '请登录以查看您的钱包。',
              ru: 'Войдите, чтобы посмотреть свой кошелёк.',
            })}
          </p>
          <Button
            onClick={() => router.push('/auth?callbackUrl=/wallet')}
            className="w-full h-12 bg-brand hover:bg-brand-dark text-surface font-black rounded-xl text-sm"
          >
            {lt(locale, { fa: 'ورود / ثبت‌نام', en: 'Sign in', ar: 'تسجيل الدخول', zh: '登录', ru: 'Войти' })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8 py-6 md:py-8 pb-24">
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

      {loading ? (
        <div className="p-16 flex items-center justify-center text-brand">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <>
          {/* Mobile Balance Allocation Summary (Available / Pending / Locked) */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-surface border border-line/80 shadow-xs mb-6 text-center">
            <div className="p-1">
              <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                {lt(locale, { fa: 'در دسترس', en: 'Available', ar: 'المتاح', zh: '可用余额', ru: 'Доступно' })}
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                {wallet.IRR.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
              </span>
            </div>
            <div className="p-1 border-x border-line/60">
              <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                {lt(locale, { fa: 'در انتظار تسویه', en: 'Pending', ar: 'معلق', zh: '待结算', ru: 'В обработке' })}
              </span>
              <span className="text-sm sm:text-base font-black text-sub font-mono">۰</span>
            </div>
            <div className="p-1">
              <span className="text-[10.5px] font-bold text-sub block leading-none mb-1">
                {lt(locale, { fa: 'مسدود / قفل', en: 'Locked', ar: 'محجوز', zh: '冻结', ru: 'Заблокировано' })}
              </span>
              <span className="text-sm sm:text-base font-black text-sub font-mono">۰</span>
            </div>
          </div>

          {/* Real Live FX vs Reference Indicator */}
          <div className="flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-soft/80 border border-line/80 text-[11px] font-bold text-sub mb-6">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand" />
              {lt(locale, {
                fa: 'نرخ تسعیر مرجع سیستمی بر پایه دفتر کل فیروزو',
                en: 'System Reference FX Rates Backed by Firuzo Ledger',
                ar: 'أسعار الصرف المرجعية في النظام المالي',
                zh: 'Firuzo 总账系统参考汇率',
                ru: 'Системный курс обмена на основе Главной книги Firuzo',
              })}
            </span>
            <span className="text-[10px] bg-surface px-2 py-0.5 rounded font-black text-brand-dark border border-line">
              {lt(locale, { fa: 'نرخ مصوب مرجع', en: 'Reference Standard', ar: 'السعر المرجعي', zh: '基准参考', ru: 'Базовый курс' })}
            </span>
          </div>

          {/* Balance Cards with Mobile Snap Carousel */}
          <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory md:grid-cols-4 gap-4 md:gap-4 mb-8 pb-2 md:pb-0 scrollbar-none touch-pan-x">
            <div className="shrink-0 w-[84vw] sm:w-[260px] md:w-auto snap-start bg-gradient-to-br from-brand to-brand-dark rounded-3xl p-5 text-surface shadow-elev-2 relative overflow-hidden flex flex-col justify-between">
              <span className="text-xs font-black opacity-80 block mb-1">
                {lt(locale, { fa: 'IRR (تومان ایران)', en: 'IRR (Iran Toman)', ar: 'IRR (تومان)', zh: 'IRR (伊朗托曼)', ru: 'IRR (Томан)' })}
              </span>
              <span className="text-2xl font-black font-mono num block mb-3">
                {wallet.IRR.toLocaleString(
                  lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                )}
              </span>
              <span className="text-[11px] font-bold opacity-75">{t('primaryBalance')}</span>
            </div>

            <div className="shrink-0 w-[84vw] sm:w-[260px] md:w-auto snap-start bg-surface border border-line rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-sub block mb-1">USDT (Tether)</span>
                <span className="text-2xl font-black text-ink font-mono num block mb-1">
                  ${wallet.USDT.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                </span>
              </div>
              <span className="text-[11px] font-bold text-sub">
                ≈ {(wallet.USDT * CURRENCY_TO_TOMAN.USDT).toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}{' '}
                {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
              </span>
            </div>

            <div className="shrink-0 w-[84vw] sm:w-[260px] md:w-auto snap-start bg-surface border border-line rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-sub block mb-1">USD (US Dollar)</span>
                <span className="text-2xl font-black text-ink font-mono num block mb-1">
                  ${(wallet.USD || 0).toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                </span>
              </div>
              <span className="text-[11px] font-bold text-sub">
                {lt(locale, { fa: 'ولت دلاری ای‌کاردو', en: 'eCardo USD Wallet', ar: 'محفظة دولار إيكاردو', zh: 'eCardo 美元钱包', ru: 'USD кошелек eCardo' })}
              </span>
            </div>

            <div className="shrink-0 w-[84vw] sm:w-[260px] md:w-auto snap-start bg-surface border border-line rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-sub block mb-1">CNY (人民币 / 元)</span>
                <span className="text-2xl font-black text-ink font-mono num block mb-1">
                  ¥{(wallet.CNY || 0).toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                </span>
              </div>
              <span className="text-[11px] font-bold text-sub">
                {lt(locale, { fa: 'ولت یوان چین ای‌کاردو', en: 'eCardo CNY Wallet', ar: 'محفظة يوان إيكاردو', zh: 'eCardo 人民币钱包', ru: 'CNY кошелек eCardo' })}
              </span>
            </div>
          </div>

          {/* Action Controls & Topup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Deposit / Topup */}
            <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-black text-xl text-ink">{t('deposit')}</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  eCardo Gateway
                </span>
              </div>
              <p className="text-xs font-bold text-sub mb-4">
                {lt(locale, {
                  fa: 'شارژ آنلاین چند ارزی از طریق درگاه ای‌کاردو (ویزا، مسترکارت، وی‌چت، علی‌پی، شتاب، تتر)',
                  en: 'Online multi-currency deposit via eCardo (Visa, Mastercard, WeChat, Alipay, Shetab, USDT)',
                  ar: 'شحن رصيد متعدد العملات عبر بوابة إيكاردو (فيزا، ماستركارد، وي شات، علي بي، شتاب، تيثر)',
                  zh: '通过 eCardo 易卡通进行跨国多币种充值（支持信用卡、微信、支付宝、Shetab、USDT）',
                  ru: 'Мультивалютное пополнение через шлюз eCardo',
                })}
              </p>

              {actionError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-warm/10 border border-rose-warm/30 text-rose-warm text-xs font-bold">
                  {actionError}
                </div>
              )}

              <div className="space-y-4">
                {/* Gateway Picker */}
                <div>
                  <label className="block text-xs font-bold text-sub mb-1.5">
                    {lt(locale, { fa: 'درگاه پرداخت:', en: 'Payment Gateway:', ar: 'بوابة الدفع:', zh: '支付网关：', ru: 'Платежный шлюз:' })}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDepositGateway('ecardo')}
                      className={`p-2.5 rounded-xl border text-xs font-black transition text-start flex items-center justify-between ${
                        depositGateway === 'ecardo'
                          ? 'bg-mint/40 border-brand text-brand-dark shadow-xs'
                          : 'bg-soft border-line text-sub hover:border-brand/40'
                      }`}
                    >
                      <span>{lt(locale, { fa: 'درگاه ای‌کاردو (بین‌المللی)', en: 'eCardo Gateway', ar: 'بوابة إيكاردو', zh: 'eCardo 跨国网关', ru: 'eCardo' })}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand-dark font-bold">USD/USDT/CNY</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDepositGateway('shetab'); setDepositCurrency('IRR'); }}
                      className={`p-2.5 rounded-xl border text-xs font-black transition text-start flex items-center justify-between ${
                        depositGateway === 'shetab'
                          ? 'bg-mint/40 border-brand text-brand-dark shadow-xs'
                          : 'bg-soft border-line text-sub hover:border-brand/40'
                      }`}
                    >
                      <span>{lt(locale, { fa: 'شاپرک (شتاب ریالی)', en: 'Shetab Shaparak', ar: 'شتاب شاابراك', zh: 'Shetab 银行卡', ru: 'Shetab' })}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">IRR</span>
                    </button>
                  </div>
                </div>

                {/* Currency Picker (if eCardo) */}
                {depositGateway === 'ecardo' && (
                  <div>
                    <label className="block text-xs font-bold text-sub mb-1.5">
                      {lt(locale, { fa: 'ارز واریزی:', en: 'Deposit Currency:', ar: 'عملة الإيداع:', zh: '充值币种：', ru: 'Валюта:' })}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['IRR', 'USDT', 'USD', 'CNY'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setDepositCurrency(c)}
                          className={`py-2 px-1 rounded-xl border text-xs font-black transition text-center ${
                            depositCurrency === c
                              ? 'bg-brand text-surface border-brand shadow-xs'
                              : 'bg-soft border-line text-sub hover:border-brand/40'
                          }`}
                        >
                          {c === 'IRR' ? 'تومان (IRR)' : c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, {
                      fa: `مبلغ شارژ (${depositCurrency === 'IRR' ? 'تومان' : depositCurrency})`,
                      en: `Amount (${depositCurrency})`,
                      ar: `المبلغ (${depositCurrency})`,
                      zh: `充值金额（${depositCurrency}）`,
                      ru: `Сумма (${depositCurrency})`,
                    })}
                  </label>
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="5,000,000"
                    className="font-bold text-lg font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { amt: 1000000, label: '+۱ میلیون' },
                    { amt: 5000000, label: '+۵ میلیون' },
                    { amt: 10000000, label: '+۱۰ میلیون' },
                  ].map(({ amt, label }) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(String(amt))}
                      className={`py-2 px-1 rounded-xl border text-xs font-black transition active:scale-95 text-center ${
                        depositAmount === String(amt)
                          ? 'bg-mint border-brand text-brand-dark shadow-xs'
                          : 'bg-soft border-line text-sub hover:text-ink hover:border-brand/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={doDeposit}
                  disabled={charging || !depositAmount}
                  className="w-full h-12 bg-brand hover:bg-brand-dark text-surface font-black rounded-xl text-sm"
                >
                  {charging ? <Loader2 className="animate-spin" size={18} /> : t('deposit')}
                </Button>
              </div>
            </div>

            {/* Currency Exchange */}
            <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="font-black text-xl text-ink">{t('exchange')}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {lt(locale, { fa: 'نرخ مرجع پلتفرم (شبیه‌سازی‌شده)', en: 'Platform Reference Rate (Simulated)', ar: 'سعر مرجعي للمنصة', zh: '平台参考汇率（模拟）', ru: 'Справочный курс' })}
                </span>
              </div>
              <p className="text-xs font-bold text-sub mb-5 leading-relaxed">
                {lt(locale, {
                  fa: 'تبدیل آنی موجودی بر پایه جدول نرخ‌های مرجع داخلی فیروزو با اسپرد شفاف (نرخ زنده وب‌سرویس بانک مرکزی به‌زودی متصل خواهد شد).',
                  en: 'Instant conversion based on Firuzo reference rates with transparent spread (Live Central Bank API feed coming soon).',
                  ar: 'تحويل فوري بناءً على جدول الأسعار المرجعية الداخلية فيروزو مع هامش شفاف.',
                  zh: '基于 Firuzo 内部参考汇率进行即时多币种兑换（实时央行汇率即将接入）。',
                  ru: 'Мгновенный обмен по внутреннему справочному курсу Firuzo с прозрачным спредом.',
                })}
              </p>

              {exMsg && (
                <div className="p-3 mb-4 rounded-xl bg-mint/50 border border-brand/20 text-brand-dark text-xs font-bold">
                  {exMsg}
                </div>
              )}
              {exError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-warm/10 border border-rose-warm/30 text-rose-warm text-xs font-bold">
                  {exError}
                </div>
              )}

                <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-sub mb-1">
                      {lt(locale, { fa: 'از ارز', en: 'From', ar: 'من عملة', zh: '从货币', ru: 'Из валюты' })}
                    </label>
                    <select
                      value={exFrom}
                      onChange={(e) => setExFrom(e.target.value as 'IRR' | 'USDT' | 'AED')}
                      aria-label={commonT('fromCurrency')}
                      className="w-full h-11 border border-line rounded-xl px-3 font-bold text-sm bg-surface"
                    >
                      <option value="IRR">{lt(locale, { fa: 'IRR (تومان)', en: 'IRR (Toman)', ar: 'IRR (تومان)', zh: 'IRR (托曼)', ru: 'IRR (Томан)' })}</option>
                      <option value="USDT">USDT</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-sub mb-1">
                      {lt(locale, { fa: 'به ارز', en: 'To', ar: 'إلى عملة', zh: '到货币', ru: 'В валюту' })}
                    </label>
                    <select
                      value={exTo}
                      onChange={(e) => setExTo(e.target.value as 'IRR' | 'USDT' | 'AED')}
                      aria-label={commonT('toCurrency')}
                      className="w-full h-11 border border-line rounded-xl px-3 font-bold text-sm bg-surface"
                    >
                      <option value="USDT">USDT</option>
                      <option value="AED">AED</option>
                      <option value="IRR">{lt(locale, { fa: 'IRR (تومان)', en: 'IRR (Toman)', ar: 'IRR (تومان)', zh: 'IRR (托曼)', ru: 'IRR (Томан)' })}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-sub">
                      {lt(locale, { fa: 'مقدار مبدا', en: 'Amount', ar: 'المبلغ', zh: '金额', ru: 'Сумма' })}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const maxVal = wallet[exFrom] ?? 0;
                        if (maxVal > 0) setExAmount(String(maxVal));
                      }}
                      className="text-[11px] font-black text-brand-dark hover:underline"
                    >
                      {lt(locale, { fa: 'کل موجودی (Max)', en: 'Max Balance', ar: 'أقصى رصيد', zh: '全部余额', ru: 'Макс' })}
                    </button>
                  </div>
                  <Input
                    type="number"
                    value={exAmount}
                    onChange={(e) => setExAmount(e.target.value)}
                    placeholder="100"
                    className="font-bold text-lg font-mono"
                  />
                </div>

                {/* Live Exchange Rate & Estimated Receive Preview */}
                {exFrom !== exTo && Number(exAmount) > 0 && (
                  <div className="p-3 rounded-xl bg-soft border border-line/80 space-y-1.5 text-xs animate-in fade-in duration-200">
                    <div className="flex justify-between text-sub font-bold">
                      <span>{lt(locale, { fa: 'نرخ لحظه‌ای تبادل:', en: 'Live Exchange Rate:', ar: 'سعر الصرف اللحظي:', zh: '实时汇率：', ru: 'Текущий курс:' })}</span>
                      <span className="font-mono text-ink">
                        {exFrom === 'USDT' && exTo === 'IRR' && `1 USDT ≈ ${CURRENCY_TO_TOMAN.USDT.toLocaleString()} تومان`}
                        {exFrom === 'IRR' && exTo === 'USDT' && `1 USDT ≈ ${CURRENCY_TO_TOMAN.USDT.toLocaleString()} تومان`}
                        {exFrom === 'AED' && exTo === 'IRR' && `1 AED ≈ ${CURRENCY_TO_TOMAN.AED.toLocaleString()} تومان`}
                        {exFrom === 'IRR' && exTo === 'AED' && `1 AED ≈ ${CURRENCY_TO_TOMAN.AED.toLocaleString()} تومان`}
                        {exFrom === 'USDT' && exTo === 'AED' && `1 USDT ≈ ${(CURRENCY_TO_TOMAN.USDT / CURRENCY_TO_TOMAN.AED).toFixed(2)} AED`}
                        {exFrom === 'AED' && exTo === 'USDT' && `1 AED ≈ ${(CURRENCY_TO_TOMAN.AED / CURRENCY_TO_TOMAN.USDT).toFixed(2)} USDT`}
                      </span>
                    </div>
                    <div className="flex justify-between font-black text-brand-dark pt-1 border-t border-line/40">
                      <span>{lt(locale, { fa: 'مبلغ تقریبی دریافتی:', en: 'Estimated to receive:', ar: 'المبلغ التقريبي المستلم:', zh: '预计到账：', ru: 'К получению:' })}</span>
                      <span className="font-mono text-sm">
                        {(() => {
                          const amt = Number(exAmount);
                          const fromRate = CURRENCY_TO_TOMAN[exFrom] ?? 1;
                          const toRate = CURRENCY_TO_TOMAN[exTo] ?? 1;
                          const received = (amt * fromRate) / toRate;
                          return `${received.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${exTo}`;
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                {exFrom === exTo && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs font-bold text-center">
                    {lt(locale, {
                      fa: 'ارز مبدا و مقصد یکسان است؛ لطفاً ارز دیگری را برای تبدیل انتخاب کنید.',
                      en: 'From and To currencies are the same. Please pick a different destination currency.',
                      ar: 'عملة المصدر والهدف متطابقتان، يرجى اختيار عملة أخرى.',
                      zh: '源货币与目标货币相同，请选择其他币种。',
                      ru: 'Валюты отправления и получения совпадают. Выберите другую валюту.',
                    })}
                  </div>
                )}

                <Button
                  onClick={doExchange}
                  disabled={exchanging || !exAmount || Number(exAmount) <= 0 || exFrom === exTo}
                  className="w-full h-12 bg-action hover:bg-action-hover text-ink font-black rounded-xl text-sm"
                >
                  {exchanging ? <Loader2 className="animate-spin" size={18} /> : t('exchange')}
                </Button>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="font-black text-xl text-ink mb-6">{t('transactions')}</h2>

            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-center text-sub py-8 text-sm font-bold">
                  {lt(locale, {
                    fa: 'هنوز تراکنشی ثبت نشده است.',
                    en: 'No transactions recorded yet.',
                    ar: 'لم تُسجَّل أي معاملات بعد.',
                    zh: '尚无交易记录。',
                    ru: 'Операций ещё не было.',
                  })}
                </p>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-line/70 bg-soft/50 hover:border-brand/30 transition-all gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                          tx.direction === 'CREDIT' ? 'bg-success/10 text-success' : 'bg-rose-warm/10 text-rose-warm'
                        }`}
                      >
                        {tx.direction === 'CREDIT' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-xs sm:text-sm text-ink truncate">
                          {tx.referenceType === 'BOOKING'
                            ? lt(locale, { fa: 'پرداخت رزرو سفر', en: 'Trip Booking Payment', ar: 'دفع حجز الرحلة', zh: '行程预订支付', ru: 'Оплата бронирования' })
                            : tx.referenceType === 'REFUND'
                            ? lt(locale, { fa: 'استرداد وجه رزرو', en: 'Booking Refund', ar: 'استرداد قيمة الحجز', zh: '预订退款', ru: 'Возврат средств' })
                            : tx.referenceType === 'FX_SPREAD' || tx.referenceType === 'WALLET_EXCHANGE'
                            ? lt(locale, { fa: 'تبدیل ارز کیف پول', en: 'Wallet Currency Exchange', ar: 'تحويل عملة المحفظة', zh: '钱包货币兑换', ru: 'Обмен валюты кошелька' })
                            : lt(locale, { fa: 'شارژ کیف پول', en: 'Wallet Top-up', ar: 'شحن المحفظة', zh: '钱包充值', ru: 'Пополнение кошелька' })}
                        </h3>
                        <span className="text-[10.5px] font-mono text-sub block">
                          {new Date(tx.createdAt).toISOString().slice(0, 10)} • #{tx.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    <div className="text-end ps-12 sm:ps-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                      <span className="text-[11px] text-sub sm:hidden">مبلغ:</span>
                      <span
                        className={`font-black text-sm sm:text-base font-mono num ${
                          tx.direction === 'CREDIT' ? 'text-success' : 'text-rose-warm'
                        }`}
                      >
                        {tx.direction === 'CREDIT' ? '+' : '-'}
                        {Number(tx.amount).toLocaleString(
                          lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                        )}{' '}
                        {tx.currency === 'IRR' ? lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' }) : tx.currency}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
