'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useBookingStore } from '@/stores/booking-store';
import { Wallet, RefreshCcw, Save } from 'lucide-react';
import { lt } from '@/lib/lt';

export default function AdminFinancePage() {
  const locale = useLocale();
  const transactions = useBookingStore((s) => s.transactions);
  const wallet = useBookingStore((s) => s.wallet);
  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

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
        <h1 className="text-2xl font-bold text-ink">{lt(locale, { fa: 'مالی و تراکنش‌ها', en: 'Finance & Transactions', ar: 'المالية والمعاملات', zh: '财务与交易', ru: 'Финансы и операции' })}</h1>
        <p className="text-sm text-sub mt-1">{lt(locale, { fa: 'دفتر کل، نرخ تبدیل و صندوق‌ها', en: 'General ledger, exchange rates and treasuries', ar: 'دفتر الأستاذ وأسعار الصرف والخزائن', zh: '总账、汇率与金库', ru: 'Главная книга, курсы и казна' })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {([
          ['IRR', lt(locale, { fa: 'صندوق ریالی', en: 'Rial Treasury', ar: 'خزينة الريال', zh: '里亚尔金库', ru: 'Риалевая казна' }), wallet.IRR.toLocaleString(numFmt), lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Toman' })],
          ['USDT', lt(locale, { fa: 'صندوق تتر', en: 'USDT Treasury', ar: 'خزينة التيثر', zh: 'USDT 金库', ru: 'USDT-казна' }), wallet.USDT.toLocaleString(numFmt), 'USDT'],
          ['AED', lt(locale, { fa: 'صندوق درهم', en: 'AED Treasury', ar: 'خزينة الدرهم', zh: '迪拉姆金库', ru: 'Дирхамная казна' }), wallet.AED.toLocaleString(numFmt), 'AED'],
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
          <h2 className="font-bold text-ink mb-4">{lt(locale, { fa: 'ورودی / خروجی امروز', en: "Today's Inflow / Outflow", ar: 'التدفق الوارد / الصادر اليوم', zh: '今日流入 / 流出', ru: 'Приход / расход за сегодня' })}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-sub">{lt(locale, { fa: 'جمع شارژ کیف پول', en: 'Total wallet deposits', ar: 'إجمالي شحن المحفظة', zh: '钱包充值合计', ru: 'Всего пополнений' })}</span>
              <b dir="ltr" className="text-success">{inflow.toLocaleString(numFmt)}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-sub">{lt(locale, { fa: 'جمع پرداخت و قفل وجه', en: 'Total payments & fund locks', ar: 'إجمالي المدفوعات وحجز الأموال', zh: '支付与冻结合计', ru: 'Платежи и блокировки' })}</span>
              <b dir="ltr" className="text-rose-warm">{outflow.toLocaleString(numFmt)}</b>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6">
          <h2 className="font-bold text-ink mb-4 flex items-center gap-2">
            <RefreshCcw size={17} aria-hidden="true" /> {lt(locale, { fa: 'مدیریت نرخ تبدیل (تومان)', en: 'Exchange Rates (Toman)', ar: 'إدارة أسعار الصرف (تومان)', zh: '汇率管理（图曼）', ru: 'Курсы обмена (Toman)' })}
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
            <Save size={15} aria-hidden="true" /> {saved ? lt(locale, { fa: 'ذخیره شد', en: 'Saved', ar: 'تم الحفظ', zh: '已保存', ru: 'Сохранено' }) : lt(locale, { fa: 'ذخیره نرخ‌ها', en: 'Save Rates', ar: 'حفظ الأسعار', zh: '保存汇率', ru: 'Сохранить курсы' })}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-line overflow-x-auto">
        <p className="p-5 font-bold text-ink border-b border-line">{lt(locale, { fa: 'دفتر کل تراکنش‌ها', en: 'Transaction Ledger', ar: 'سجل المعاملات', zh: '交易总账', ru: 'Журнал операций' })}</p>
        {transactions.length === 0 ? (
          <p className="text-center text-sub py-12 text-sm">{lt(locale, { fa: 'تراکنشی ثبت نشده است', en: 'No transactions recorded', ar: 'لم تُسجَّل أي معاملات', zh: '暂无交易记录', ru: 'Операций нет' })}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-soft text-sub text-xs">
              <tr>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'شرح', en: 'Description', ar: 'الوصف', zh: '描述', ru: 'Описание' })}</th>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'کیف پول', en: 'Wallet', ar: 'المحفظة', zh: '钱包', ru: 'Кошелёк' })}</th>
                <th className="p-4 text-end font-medium">{lt(locale, { fa: 'مبلغ', en: 'Amount', ar: 'المبلغ', zh: '金额', ru: 'Сумма' })}</th>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'وضعیت', en: 'Status', ar: 'الحالة', zh: '状态', ru: 'Статус' })}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-line hover:bg-soft/60">
                  <td className="p-4 text-ink">{t.description}</td>
                  <td className="p-4 text-sub" dir="ltr">{t.wallet}{t.resultWallet ? ` → ${t.resultWallet}` : ''}</td>
                  <td className="p-4 text-end font-bold" dir="ltr">
                    {(t.resultAmount && t.resultWallet ? t.resultAmount : t.amount).toLocaleString(numFmt)}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {t.status === 'completed' ? lt(locale, { fa: 'تسویه شد', en: 'Settled', ar: 'مُسوّى', zh: '已结算', ru: 'Сверено' }) : lt(locale, { fa: 'قفل موقت', en: 'Temporarily Locked', ar: 'حجز مؤقت', zh: '临时冻结', ru: 'Временно заблокировано' })}
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
