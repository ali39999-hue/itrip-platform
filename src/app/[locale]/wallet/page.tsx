'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, RefreshCcw,
  Lock, Loader2, Coins, Filter, Languages, ArrowLeft
} from 'lucide-react';

const TYPE_FA: Record<string, string> = {
  deposit: 'شارژ کیف پول',
  withdraw: 'قفل وجه (Saga)',
  exchange: 'تبدیل ارز (Exchange)',
  payment: 'پرداخت رزرو',
  refund: 'بازگشت وجه استرداد',
};

export default function WalletPage() {
  const { wallet, transactions, deposit, exchange } = useBookingStore();

  const [depositAmount, setDepositAmount] = useState('');
  const [charging, setCharging] = useState(false);

  const [exFrom, setExFrom] = useState<'IRR' | 'USDT' | 'AED'>('IRR');
  const [exTo, setExTo] = useState<'IRR' | 'USDT' | 'AED'>('USDT');
  const [exAmount, setExAmount] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(30);
  const [exMsg, setExMsg] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Total balance equivalent (mock calc for display)
  const totalBalanceRial = wallet.IRR + (wallet.USDT * 60000) + (wallet.AED * 16000);

  function startLock() {
    if (timerRef.current) clearInterval(timerRef.current);
    setLocked(true);
    setLockTimer(30);
    timerRef.current = setInterval(() => {
      setLockTimer((v) => {
        if (v <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  function doExchange() {
    const amt = Number(exAmount);
    if (!amt || amt <= 0) {
      setExMsg('مبلغ نامعتبر است');
      return;
    }
    const ok = exchange(exFrom, exTo, amt);
    if (!ok) {
      setExMsg('تبدیل ممکن نیست یا موجودی کافی نیست');
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setExMsg('');
    setLocked(false);
    setExAmount('');
  }

  function chargeWallet() {
    const amt = Number(depositAmount);
    if (!amt || amt < 100000) {
      return;
    }
    setCharging(true);
    setTimeout(() => {
      deposit('IRR', amt, 'درگاه شتاب');
      setCharging(false);
      setDepositAmount('');
    }, 1200);
  }

  return (
    <div className="flex flex-col min-h-screen bg-soft text-ink font-sans pb-16">
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-10 flex flex-col gap-8">
        
        <header className="mb-4">
          <h1 className="font-black text-[32px] md:text-[40px] text-ink">کیف پول چند ارزی</h1>
          <p className="font-bold text-[16px] md:text-[18px] text-sub mt-2">مدیریت موجودی، تبدیل ارز و تاریخچه تراکنش‌ها به صورت لحظه‌ای.</p>
        </header>

        {/* پیوند سرویس مالی ↔ مترجم همراه (صرافی + مترجم معمولاً هم‌زمان لازم می‌شوند) */}
        <Link
          href="/interpreter"
          className="-mt-4 flex items-center justify-between gap-3 p-4 rounded-2xl bg-gold-soft/70 border border-gold/30 hover:border-gold transition group"
        >
          <span className="inline-flex items-center gap-2.5 text-[12.5px] font-black text-price">
            <Languages size={17} className="shrink-0" />
            صرافی یا کارت پیش‌پرداخت؟ مترجم همراه هم می‌تواند کنارتان باشد — مشاهده سرویس
          </span>
          <ArrowLeft size={16} className="text-price shrink-0 group-hover:-translate-x-1 transition-transform" />
        </Link>

        {/* Dashboard Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Total Balance Widget */}
          <div className="lg:col-span-8 bg-surface/70 backdrop-blur-md rounded-xl p-8 flex flex-col justify-between relative overflow-hidden border border-line shadow-sm group">
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBq75nRWnLsbOKsVTgTafYG-HEdBqkxD-qSTRYT-R6TxGTpdWAKbZ7sO6PYlViBVi5FY2b499YpamOnq8jjYgkP94s98c7tYkR22-aJscNxPSterQqEeFcGpbHaMh3lNyNzBR1PBRJLJ0SxWQWBasTpyJ6JjPa_knt0eNyw1SG-2OtvBb_LGfWurgKS3exllu5xoMCD8KLb8RZkCAEhCU7ZDND2n9EZ7QfdoB73CMxXALByMQbNcJI-2UQqTmTUCz2L-A')", backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <h2 className="font-bold text-[14px] text-sub mb-2">موجودی کل (معادل ریالی)</h2>
                <div className="font-black text-[32px] md:text-[40px] text-ink num">
                  {totalBalanceRial.toLocaleString('fa-IR')} <span className="text-[18px] text-sub font-bold">ریال</span>
                </div>
              </div>
              <div className="bg-brand/10 p-4 rounded-full text-brand shadow-sm">
                <WalletIcon size={32} />
              </div>
            </div>

            {/* Balances Chart */}
            <div className="relative z-10 mt-10">
              <h3 className="font-bold text-[14px] text-sub mb-4 text-start">ترکیب دارایی‌ها</h3>
              <div className="flex items-end justify-between h-32 gap-4 border-b border-line pb-3">
                {/* IRR */}
                <div className="flex flex-col items-center gap-3 w-1/3">
                  <div className="w-full bg-soft h-24 rounded-t relative overflow-hidden border border-line/50">
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-brand to-brand-dark rounded-t-sm transition-all duration-500" style={{ height: '75%' }}></div>
                  </div>
                  <span className="font-bold text-[13px] text-sub">ریال (IRR)</span>
                  <span className="font-black text-[12px] text-ink num">{wallet.IRR.toLocaleString()}</span>
                </div>
                {/* USDT */}
                <div className="flex flex-col items-center gap-3 w-1/3">
                  <div className="w-full bg-soft h-24 rounded-t relative overflow-hidden border border-line/50">
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-brand to-brand-dark rounded-t-sm transition-all duration-500" style={{ height: '40%' }}></div>
                  </div>
                  <span className="font-bold text-[13px] text-sub">تتر (USDT)</span>
                  <span className="font-black text-[12px] text-ink num">{wallet.USDT.toLocaleString()}</span>
                </div>
                {/* AED */}
                <div className="flex flex-col items-center gap-3 w-1/3">
                  <div className="w-full bg-soft h-24 rounded-t relative overflow-hidden border border-line/50">
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-brand to-brand-dark rounded-t-sm transition-all duration-500" style={{ height: '20%' }}></div>
                  </div>
                  <span className="font-bold text-[13px] text-sub">درهم (AED)</span>
                  <span className="font-black text-[12px] text-ink num">{wallet.AED.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* Quick Charge */}
            <div className="relative z-10 mt-6 bg-surface rounded-xl p-4 border border-line shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <span className="font-bold text-[14px] text-ink">شارژ سریع ریالی:</span>
              <Input 
                type="number" 
                value={depositAmount} 
                onChange={(e) => setDepositAmount(e.target.value)} 
                placeholder="مبلغ به تومان..." 
                className="flex-1 h-11 bg-soft border-line" 
              />
              <Button onClick={chargeWallet} disabled={charging} className="bg-brand hover:bg-brand/90 text-surface font-black px-6 h-11 w-full md:w-auto transition-colors">
                {charging ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'پرداخت با شتاب'}
              </Button>
            </div>
          </div>

          {/* Currency Exchange Widget */}
          <div className="lg:col-span-4 bg-surface rounded-xl p-6 shadow-sm border border-line flex flex-col">
            <h2 className="font-black text-[22px] text-ink mb-6 text-start">تبدیل ارز سریع</h2>
            
            <div className="flex flex-col gap-4 flex-1 relative">
              {/* From */}
              <div className="bg-soft rounded-xl p-4 border border-line/50 flex items-center justify-between">
                <div className="flex flex-col flex-1">
                  <label className="font-bold text-[12px] text-sub mb-2">پرداخت می‌کنید</label>
                  <Input 
                    type="number" 
                    value={exAmount} 
                    onChange={(e) => setExAmount(e.target.value)} 
                    className="bg-transparent border-none text-[24px] font-black text-ink p-0 w-full focus-visible:ring-0 shadow-none h-8 num" 
                    placeholder="0" 
                    dir="ltr" 
                  />
                </div>
                <select 
                  value={exFrom} 
                  onChange={(e) => setExFrom(e.target.value as 'IRR' | 'USDT' | 'AED')} 
                  className="bg-surface px-3 py-1.5 rounded-lg border border-line font-black text-[14px] text-ink min-w-[80px]"
                >
                  <option value="IRR">IRR</option>
                  <option value="USDT">USDT</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              
              {/* Swap Icon */}
              <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <button aria-label="جابجایی ارز"
                  onClick={() => { const temp = exFrom; setExFrom(exTo); setExTo(temp); }} 
                  className="bg-brand text-surface p-2.5 rounded-full shadow-sm hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <RefreshCcw size={18} />
                </button>
              </div>

              {/* To */}
              <div className="bg-soft rounded-xl p-4 border border-line/50 flex items-center justify-between">
                <div className="flex flex-col flex-1">
                  <label className="font-bold text-[12px] text-sub mb-2">دریافت می‌کنید</label>
                  <div className="text-[24px] font-black text-sub p-0 w-full h-8 flex items-center" dir="ltr">...</div>
                </div>
                <select 
                  value={exTo} 
                  onChange={(e) => setExTo(e.target.value as 'IRR' | 'USDT' | 'AED')} 
                  className="bg-surface px-3 py-1.5 rounded-lg border border-line font-black text-[14px] text-ink min-w-[80px]"
                >
                  <option value="USDT">USDT</option>
                  <option value="IRR">IRR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              
              <div className="flex justify-between items-center text-[12px] font-bold text-sub mt-2">
                <span>نرخ تقریبی:</span>
                <span dir="ltr">1 USDT ≈ 60,000 IRR</span>
              </div>
              
              {exMsg && <p className="text-rose-warm text-[12px] font-bold text-center mt-2">{exMsg}</p>}

              <div className="mt-auto pt-4">
                {!locked ? (
                  <Button onClick={startLock} className="w-full bg-flight text-surface py-3 h-12 rounded-lg font-black text-[15px] hover:bg-flight/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    <Coins size={18} className="ms-2" /> دریافت نرخ لحظه‌ای
                  </Button>
                ) : (
                  <Button onClick={doExchange} disabled={lockTimer === 0} className="w-full bg-action text-[#14201f] py-3 h-12 rounded-lg font-black text-[15px] hover:bg-action/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    {lockTimer > 0 ? (
                      <><Lock size={16} className="ms-2" /> تایید ({lockTimer} ثانیه)</>
                    ) : (
                      'منقضی شد — تلاش مجدد'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contextual Image Section */}
        <div className="w-full h-64 rounded-2xl overflow-hidden relative shadow-sm border border-line mt-4">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBq75nRWnLsbOKsVTgTafYG-HEdBqkxD-qSTRYT-R6TxGTpdWAKbZ7sO6PYlViBVi5FY2b499YpamOnq8jjYgkP94s98c7tYkR22-aJscNxPSterQqEeFcGpbHaMh3lNyNzBR1PBRJLJ0SxWQWBasTpyJ6JjPa_knt0eNyw1SG-2OtvBb_LGfWurgKS3exllu5xoMCD8KLb8RZkCAEhCU7ZDND2n9EZ7QfdoB73CMxXALByMQbNcJI-2UQqTmTUCz2L-A')" }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/90 via-brand/60 to-transparent flex items-center justify-start p-10 md:p-16">
            <div className="text-start text-surface max-w-lg">
              <h3 className="font-black text-[28px] md:text-[36px] mb-3 leading-tight text-surface drop-shadow-md">پرداخت‌های بین‌المللی<br/>آسان شد</h3>
              <p className="font-bold text-[15px] md:text-[17px] text-surface/90 drop-shadow">با کیف پول چند ارزی فیروز، هتل و پرواز خود را با هر ارزی به راحتی در سراسر جهان رزرو کنید.</p>
            </div>
          </div>
        </div>

        {/* Transaction Ledger */}
        <div className="bg-surface rounded-xl shadow-sm border border-line p-6 md:p-8 mt-4">
          <div className="flex justify-between items-center mb-8 border-b border-line pb-4">
            <h2 className="font-black text-[22px] text-ink">تاریخچه تراکنش‌ها</h2>
            <button className="flex items-center gap-2 text-sub hover:text-brand transition-colors font-black text-[14px]">
              فیلتر <Filter size={18} />
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {transactions.length === 0 ? (
              <p className="text-center text-sub font-bold text-[14px] py-10 bg-soft rounded-xl">تراکنشی یافت نشد.</p>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-surface rounded-xl hover:bg-soft transition-colors border border-line hover:border-brand/30 shadow-sm group">
                  
                  <div className="flex items-center gap-4 w-full md:w-1/3 mb-4 md:mb-0">
                    <div className={`p-3 rounded-full flex-shrink-0 ${
                        t.type === 'deposit' ? 'bg-success/10 text-success' :
                        t.type === 'exchange' ? 'bg-flight/10 text-flight' :
                        'bg-rose-warm/10 text-rose-warm'
                    }`}>
                      {t.type === 'deposit' ? <ArrowDownRight size={22} /> :
                       t.type === 'exchange' ? <RefreshCcw size={22} /> :
                       <ArrowUpRight size={22} />}
                    </div>
                    <div>
                      <p className="font-black text-[15px] text-ink">{TYPE_FA[t.type]}</p>
                      <p className="font-bold text-[12px] text-sub mt-1 num" dir="ltr">{new Date(t.createdAt).toLocaleString('fa-IR')}</p>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-1/3 text-start md:text-center mb-4 md:mb-0 flex justify-start md:justify-center">
                    <span className="inline-flex items-center gap-1.5 bg-soft px-3 py-1.5 rounded-lg text-[12px] font-bold text-sub border border-line">
                      <span className={`w-2 h-2 rounded-full ${t.status === 'completed' ? 'bg-success' : t.status === 'locked' ? 'bg-hotel' : 'bg-rose-warm'}`}></span>
                      {t.status === 'completed' ? 'موفق' : t.status === 'locked' ? 'قفل موقت' : 'ناموفق'}
                    </span>
                  </div>
                  
                  <div className="w-full md:w-1/3 text-start">
                    <p className={`font-black text-[18px] num ${t.type === 'deposit' ? 'text-success' : t.type === 'exchange' ? 'text-flight' : 'text-ink'}`} dir="ltr">
                      {t.type === 'deposit' ? '+' : t.type === 'exchange' ? '' : '-'} {t.amount.toLocaleString()} <span className="text-[13px] font-bold text-sub">{t.wallet}</span>
                    </p>
                    {t.resultAmount && (
                      <p className="font-bold text-[12px] text-sub mt-1 num" dir="ltr">
                        → {t.resultAmount.toLocaleString()} {t.resultWallet}
                      </p>
                    )}
                  </div>
                  
                </div>
              ))
            )}
          </div>
          
          {transactions.length > 0 && (
            <div className="mt-8 text-center">
              <button className="text-brand font-black text-[14px] hover:underline">مشاهده همه تراکنش‌ها</button>
            </div>
          )}
        </div>
        
      </main>
    </div>
  );
}
