'use client';

import { useState } from 'react';
import { useBookingStore } from '@/stores/booking-store';
import { Wallet, RefreshCcw, Save } from 'lucide-react';

export default function AdminFinancePage() {
  const transactions = useBookingStore((s) => s.transactions);
  const wallet = useBookingStore((s) => s.wallet);

  const [rates, setRates] = useState({ USDT: '41800', AED: '1140', EUR: '45500' });
  const [saved, setSaved] = useState(false);

  function saveRates() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inflow = transactions.filter((t) => t.type === 'deposit').reduce((a, t) => a + t.amount, 0);
  const outflow = transactions.filter((t) => t.type === 'payment' || t.type === 'withdraw').reduce((a, t) => a + t.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">مالی و تراکنش‌ها</h1>
        <p className="text-sm text-sub mt-1">دفتر کل، نرخ تبدیل و صندوق‌ها</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {([
          ['IRR', 'صندوق ریالی', wallet.IRR.toLocaleString(), 'تومان'],
          ['USDT', 'صندوق تتر', wallet.USDT.toLocaleString(), 'USDT'],
          ['AED', 'صندوق درهم', wallet.AED.toLocaleString(), 'AED'],
        ] as const).map(([k, title, val, unit]) => (
          <div key={k} className="bg-surface rounded-2xl border border-line p-5 shadow-sm">
            <p className="flex items-center gap-2 text-sm text-sub mb-2">
              <Wallet size={16} aria-hidden="true" /> {title}
            </p>
            <p className="text-xl font-bold text-ink" dir="ltr">{val} <span className="text-xs font-normal text-sub">{unit}</span></p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-surface rounded-2xl border border-line p-6">
          <h2 className="font-bold text-ink mb-4">ورودی / خروجی امروز</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-sub">جمع شارژ کیف پول</span>
              <b dir="ltr" className="text-success">{inflow.toLocaleString()}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-sub">جمع پرداخت و قفل وجه</span>
              <b dir="ltr" className="text-rose-warm">{outflow.toLocaleString()}</b>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6">
          <h2 className="font-bold text-ink mb-4 flex items-center gap-2">
            <RefreshCcw size={17} aria-hidden="true" /> مدیریت نرخ تبدیل (تومان)
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {(['USDT', 'AED', 'EUR'] as const).map((c) => (
              <label key={c} className="space-y-1.5">
                <span className="text-[11px] font-bold text-sub" dir="ltr">{c}</span>
                <input
                  type="number"
                  value={rates[c]}
                  onChange={(e) => setRates({ ...rates, [c]: e.target.value })}
                  className="w-full h-10 rounded-md border border-input px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
            ))}
          </div>
          <button
            onClick={saveRates}
            className={`w-full h-10 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              saved ? 'bg-success/20 text-success' : 'bg-brand hover:bg-brand-2 text-surface'
            }`}
          >
            <Save size={15} aria-hidden="true" /> {saved ? 'ذخیره شد' : 'ذخیره نرخ‌ها'}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-line overflow-hidden">
        <p className="p-5 font-bold text-ink border-b border-line">دفتر کل تراکنش‌ها</p>
        {transactions.length === 0 ? (
          <p className="text-center text-sub py-12 text-sm">تراکنشی ثبت نشده است</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-soft text-sub text-xs">
              <tr>
                <th className="p-4 text-start font-medium">شرح</th>
                <th className="p-4 text-start font-medium">کیف پول</th>
                <th className="p-4 text-end font-medium">مبلغ</th>
                <th className="p-4 text-start font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-line hover:bg-soft/60">
                  <td className="p-4 text-ink">{t.description}</td>
                  <td className="p-4 text-sub" dir="ltr">{t.wallet}{t.resultWallet ? ` → ${t.resultWallet}` : ''}</td>
                  <td className="p-4 text-end font-bold" dir="ltr">
                    {(t.resultAmount && t.resultWallet ? t.resultAmount : t.amount).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {t.status === 'completed' ? 'تسویه شد' : 'قفل موقت'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
