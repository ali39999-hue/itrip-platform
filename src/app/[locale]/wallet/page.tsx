'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWallet } from '@/actions/booking';
import {
  Wallet as WalletIcon,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { lt } from '@/lib/lt';

export default function WalletPage() {
  const t = useTranslations('Wallet');
  const commonT = useTranslations('Common.aria');
  const locale = useLocale();

  const [wallet, setWallet] = useState<{ IRR: number; USDT: number; AED: number }>({
    IRR: 0,
    USDT: 0,
    AED: 0,
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

  const [depositAmount, setDepositAmount] = useState('');
  const [charging, setCharging] = useState(false);

  const [exFrom, setExFrom] = useState<'IRR' | 'USDT' | 'AED'>('IRR');
  const [exTo, setExTo] = useState<'IRR' | 'USDT' | 'AED'>('USDT');
  const [exAmount, setExAmount] = useState('');
  const [exMsg, setExMsg] = useState('');

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await getWallet();
        if (!active) return;
        if (res.success && res.balances) {
          setWallet(res.balances);
          setTransactions(res.transactions || []);
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
  }, []);

  function doExchange() {
    const amt = Number(exAmount);
    if (!amt || amt <= 0) return;
    setExMsg(
      lt(locale, {
        fa: 'تبدیل ارز با موفقیت انجام شد',
        en: 'Exchange completed successfully',
        ar: 'تم تحويل العملة بنجاح',
        zh: '货币兑换成功',
        ru: 'Обмен валюты выполнен',
      })
    );
    setExAmount('');
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

      {loading ? (
        <div className="p-16 flex items-center justify-center text-brand">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <>
          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl p-6 text-surface shadow-elev-2 relative overflow-hidden">
              <span className="text-xs font-black opacity-80 block mb-1">
                {lt(locale, { fa: 'IRR (تومان)', en: 'IRR (Toman)', ar: 'IRR (تومان)', zh: 'IRR (托曼)', ru: 'IRR (Томан)' })}
              </span>
              <span className="text-3xl font-black font-mono num block mb-4">
                {wallet.IRR.toLocaleString(
                  lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                )}
              </span>
              <span className="text-[11px] font-bold opacity-75">{t('primaryBalance')}</span>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-6 shadow-elev-1 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-sub block mb-1">USDT (Tether)</span>
                <span className="text-2xl font-black text-ink font-mono num block mb-1">
                  $
                  {wallet.USDT.toLocaleString(
                    lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                  )}
                </span>
              </div>
              <span className="text-[11px] font-bold text-sub">
                ≈ {(wallet.USDT * 60000).toLocaleString(
                  lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                )}{' '}
                {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
              </span>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-6 shadow-elev-1 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-sub block mb-1">
                  {lt(locale, { fa: 'AED (درهم امارات)', en: 'AED (Emirati Dirham)', ar: 'AED (درهم إماراتي)', zh: 'AED (阿联酋迪拉姆)', ru: 'AED (Дирхам ОАЭ)' })}
                </span>
                <span className="text-2xl font-black text-ink font-mono num block mb-1">
                  {lt(locale, { fa: 'درهم ', en: 'AED ', ar: 'د.إ ', zh: 'AED ', ru: 'AED ' })}
                  {wallet.AED.toLocaleString(
                    lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                  )}
                </span>
              </div>
              <span className="text-[11px] font-bold text-sub">
                ≈ {(wallet.AED * 16000).toLocaleString(
                  lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                )}{' '}
                {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
              </span>
            </div>
          </div>

          {/* Action Controls & Topup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Deposit / Topup */}
            <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="font-black text-xl text-ink mb-2">{t('deposit')}</h2>
              <p className="text-xs font-bold text-sub mb-6">
                {lt(locale, {
                  fa: 'افزایش موجودی ریالی از طریق کلیه کارت‌های عضو شتاب',
                  en: 'Top up your Rial balance instantly via Shetab cards',
                  ar: 'اشحن رصيدك بالريال فوراً عبر بطاقات شتاب',
                  zh: '通过 Shetab 银行卡即时充值里亚尔余额',
                  ru: 'Мгновенно пополните риалевый баланс картами Shetab',
                })}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, {
                      fa: 'مبلغ شارژ (تومان)',
                      en: 'Amount (Toman)',
                      ar: 'مبلغ الشحن (تومان)',
                      zh: '充值金额（图曼）',
                      ru: 'Сумма пополнения (томанов)',
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

                <div className="flex gap-2">
                  {[1000000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(String(amt))}
                      className="px-3 py-1.5 rounded-lg border border-line bg-soft text-xs font-bold text-sub hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      +{amt.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => {
                    const amt = Number(depositAmount);
                    if (amt > 0) {
                      setCharging(true);
                      setTimeout(() => {
                        setWallet((prev) => ({ ...prev, IRR: prev.IRR + amt }));
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
              <p className="text-xs font-bold text-sub mb-6">
                {lt(locale, {
                  fa: 'تبدیل آنی ارزها با نرخ لحظه‌ای بدون کارمزد اضافی',
                  en: 'Instant multi-currency exchange at live market rates',
                  ar: 'تحويل فوري للعملات بأسعار السوق الحية دون رسوم إضافية',
                  zh: '按实时汇率即时多币种兑换，无额外手续费',
                  ru: 'Мгновенный обмен валют по рыночному курсу без лишних комиссий',
                })}
              </p>

              {exMsg && (
                <div className="p-3 mb-4 rounded-xl bg-mint/50 border border-brand/20 text-brand-dark text-xs font-bold">
                  {exMsg}
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
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'مقدار مبدا', en: 'Amount', ar: 'المبلغ', zh: '金额', ru: 'Сумма' })}
                  </label>
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
                    className="flex justify-between items-center p-4 rounded-xl border border-line/60 bg-soft/40"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl grid place-items-center ${
                          tx.direction === 'CREDIT' ? 'bg-success/10 text-success' : 'bg-rose-warm/10 text-rose-warm'
                        }`}
                      >
                        {tx.direction === 'CREDIT' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-ink">
                          {tx.referenceType === 'BOOKING'
                            ? lt(locale, { fa: 'پرداخت رزرو سفر', en: 'Trip Booking Payment', ar: 'دفع حجز الرحلة', zh: '行程预订支付', ru: 'Оплата бронирования' })
                            : tx.referenceType === 'REFUND'
                            ? lt(locale, { fa: 'استرداد وجه رزرو', en: 'Booking Refund', ar: 'استرداد قيمة الحجز', zh: '预订退款', ru: 'Возврат средств' })
                            : lt(locale, { fa: 'شارژ کیف پول', en: 'Wallet Top-up', ar: 'شحن المحفظة', zh: '钱包充值', ru: 'Пополнение кошелька' })}
                        </h3>
                        <span className="text-[11px] font-mono text-sub">
                          {new Date(tx.createdAt).toISOString().slice(0, 10)} • #{tx.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    <div className="text-end">
                      <span
                        className={`font-black text-base font-mono num ${
                          tx.direction === 'CREDIT' ? 'text-success' : 'text-rose-warm'
                        }`}
                      >
                        {tx.direction === 'CREDIT' ? '+' : '-'}
                        {Number(tx.amount).toLocaleString(
                          lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                        )}{' '}
                        {tx.currency === 'IRR' ? lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' }) : tx.currency}
                      </span>
                      <span className="block text-[10.5px] text-sub">
                        {tx.direction === 'CREDIT'
                          ? lt(locale, { fa: 'واریز', en: 'Deposit / Inflow', ar: 'إيداع', zh: '入账', ru: 'Пополнение' })
                          : lt(locale, { fa: 'برداشت', en: 'Payment / Outflow', ar: 'سحب', zh: '支出', ru: 'Списание' })}
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
