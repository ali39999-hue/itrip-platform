'use client';

import { useState } from 'react';
import { Wallet, RefreshCcw, Save, ShieldCheck, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { lt } from '@/lib/lt';
import { runLedgerReconciliation } from '@/actions/admin';
import type { ReconciliationReport } from '@/domains/ledger/ReconciliationService';

type Transaction = {
   id: string;
   description?: string;
   wallet?: string;
   resultWallet?: string;
   amount: number;
   resultAmount?: number;
   status: string;
};

export type DbTransaction = {
  id: string;
  referenceType?: string | null;
  referenceId?: string | null;
  amount: number | string | { toString(): string };
  account?: {
    ownerType?: string | null;
    currency?: string | null;
  } | null;
};

export function FinanceClientPage({
  locale,
  balances,
  inflow,
  outflow,
  transactions
}: {
  locale: string;
  balances: Record<string, number>;
  inflow: number;
  outflow: number;
  transactions: DbTransaction[];
}) {
  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

  const [rates, setRates] = useState({ USDT: '41800', AED: '1140', EUR: '45500' });
  const [saved, setSaved] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationReport, setReconciliationReport] = useState<ReconciliationReport | null>(null);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);

  function saveRates() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleReconciliation() {
    try {
      setReconciling(true);
      setReconciliationError(null);
      const report = await runLedgerReconciliation();
      setReconciliationReport(report);
    } catch (err: unknown) {
      setReconciliationError(err instanceof Error ? err.message : 'Failed to run reconciliation');
    } finally {
      setReconciling(false);
    }
  }

  // Transform db transactions to UI model
  const formattedTransactions: Transaction[] = transactions.map((t) => ({
    id: t.id,
    description: t.referenceType ? `${t.referenceType} - ${t.referenceId || ''}` : 'Transaction',
    wallet: t.account?.ownerType || undefined,
    resultWallet: t.account?.currency || undefined,
    amount: Number(t.amount.toString()) || 0,
    status: 'completed'
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{lt(locale, { fa: 'مدیریت مالی و خزانه‌داری', en: 'Finance & Treasury Management', ar: 'الإدارة المالية والخزينة', zh: '财务与国库管理', ru: 'Управление финансами и казначейством' })}</h1>
          <p className="text-sm text-sub mt-1">{lt(locale, { fa: 'نظارت بر ترازهای چند ارزی، تراکنش‌ها و تعیین نرخ تسویه', en: 'Multi-currency balances, transactions, and settlement exchange rates', ar: 'أرصدة متعددة العملات والمعاملات وأسعار صرف التسویه', zh: '多币种余额、交易记录及结算汇率监控', ru: 'Мультивалютные балансы, транзакции и курсы взаиморасчетов' })}</p>
        </div>
        <button
          type="button"
          onClick={handleReconciliation}
          disabled={reconciling}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-brand text-surface hover:bg-brand-2 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm shrink-0"
        >
          {reconciling ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck size={16} aria-hidden="true" />
          )}
          <span>{lt(locale, { fa: 'اجرای تطبیق مالی', en: 'Run Reconciliation', ar: 'تشغيل المطابقة المالية', zh: '执行对账', ru: 'Запустить сверку' })}</span>
        </button>
      </div>

      {reconciliationError && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          <span>{reconciliationError}</span>
        </div>
      )}

      {reconciliationReport && (
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                reconciliationReport.isBalanced
                  ? 'bg-success/15 text-success'
                  : 'bg-rose-500/15 text-rose-600'
              }`}>
                {reconciliationReport.isBalanced ? (
                  <>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>{lt(locale, { fa: 'تراز متوازن', en: 'Balanced', ar: 'متوازن', zh: '已平衡', ru: 'Сбалансировано' })}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} aria-hidden="true" />
                    <span>{lt(locale, { fa: 'عدم تطابق تراز', en: 'Unbalanced', ar: 'غير متوازن', zh: '不平衡', ru: 'Дисбаланс' })}</span>
                  </>
                )}
              </span>
              <span className="text-xs text-sub">
                {new Date(reconciliationReport.timestamp).toLocaleTimeString(numFmt)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-sub">
              <div>
                <span>{lt(locale, { fa: 'گروه‌های بررسی شده: ', en: 'Total groups checked: ', ar: 'إجمالي المجموعات المدققة: ', zh: '已核对分组：', ru: 'Проверено групп: ' })}</span>
                <b className="text-ink font-semibold" dir="ltr">{reconciliationReport.totalGroupsChecked.toLocaleString(numFmt)}</b>
              </div>
              <div>
                <span>{lt(locale, { fa: 'موارد عدم تطابق: ', en: 'Mismatches: ', ar: 'حالات عدم التطابق: ', zh: '不匹配项：', ru: 'Несоответствий: ' })}</span>
                <b className={`font-semibold ${reconciliationReport.unbalancedGroupsCount > 0 ? 'text-rose-600' : 'text-success'}`} dir="ltr">
                  {reconciliationReport.unbalancedGroupsCount.toLocaleString(numFmt)}
                </b>
              </div>
            </div>
          </div>

          {reconciliationReport.mismatches.length > 0 && (
            <div className="text-xs text-rose-600 space-y-1">
              <p className="font-semibold">{lt(locale, { fa: 'گروه‌های نامتوازن:', en: 'Unbalanced Groups:', ar: 'المجموعات غير المتطابقة:', zh: '不平衡分组：', ru: 'Несбалансированные группы:' })}</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {reconciliationReport.mismatches.map((m) => (
                  <div key={m.groupId} className="flex justify-between border-b border-line/50 pb-1" dir="ltr">
                    <span className="font-mono">{m.groupId}</span>
                    <span>Debit: {m.totalDebit} | Credit: {m.totalCredit} | Diff: {m.diff} {m.currency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {([
          ['IRR', lt(locale, { fa: 'صندوق ریالی', en: 'Rial Treasury', ar: 'خزينة الريال', zh: '里亚尔金库', ru: 'Риаловая казна' }), (balances?.IRR || 0).toLocaleString(numFmt), lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '托曼', ru: 'Toman' })],
          ['USDT', lt(locale, { fa: 'صندوق تتر', en: 'USDT Treasury', ar: 'خزينة التيثر', zh: 'USDT 金库', ru: 'USDT-казна' }), (balances?.USDT || 0).toLocaleString(numFmt), 'USDT'],
          ['AED', lt(locale, { fa: 'صندوق درهم', en: 'AED Treasury', ar: 'خزينة الدرهم', zh: '迪拉姆金库', ru: 'Дирхамовая казна' }), (balances?.AED || 0).toLocaleString(numFmt), 'AED'],
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
          <h2 className="font-bold text-ink mb-4">{lt(locale, { fa: 'ورودی / خروجی امروز', en: "Today's Inflow / Outflow", ar: 'التدفق الداخل / الخارج اليوم', zh: '今日流入/流出', ru: 'Приток / отток за сегодня' })}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-sub">{lt(locale, { fa: 'جمع شارژ کیف پول', en: 'Total wallet deposits', ar: 'إجمالي شحن المحفظة', zh: '钱包总充值', ru: 'Всего пополнений' })}</span>
              <b dir="ltr" className="text-success">{inflow.toLocaleString(numFmt)}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-sub">{lt(locale, { fa: 'جمع پرداخت و قفل وجه', en: 'Total payments & fund locks', ar: 'إجمالي المدفوعات وحجز الأموال', zh: '支付及锁定总额', ru: 'Платежи и блокировки' })}</span>
              <b dir="ltr" className="text-rose-warm">{outflow.toLocaleString(numFmt)}</b>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6">
          <h2 className="font-bold text-ink mb-4 flex items-center gap-2">
            <RefreshCcw size={17} aria-hidden="true" /> {lt(locale, { fa: 'مدیریت نرخ ارز (تومان)', en: 'Exchange Rates (Toman)', ar: 'إدارة أسعار الصرف (تومان)', zh: '汇率管理（托曼）', ru: 'Курс обмена (Toman)' })}
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
            <Save size={15} aria-hidden="true" /> {saved ? lt(locale, { fa: 'ذخیره شد (پیش‌نمایش)', en: 'Saved (Preview)', ar: 'تم الحفظ (معاينة)', zh: '已保存（预览）', ru: 'Сохранено (превью)' }) : lt(locale, { fa: 'ذخیره نرخ‌ها (دمو)', en: 'Save Rates (Demo)', ar: 'حفظ الأسعار (تجريبي)', zh: '保存汇率（演示）', ru: 'Сохранить курс (демо)' })}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-line overflow-x-auto">
        <p className="p-5 font-bold text-ink border-b border-line">{lt(locale, { fa: 'دفتر کل تراکنش‌ها', en: 'Transaction Ledger', ar: 'سجل المعاملات', zh: '总账记录', ru: 'Журнал транзакций' })}</p>
        {formattedTransactions.length === 0 ? (
          <p className="text-center text-sub py-12 text-sm">{lt(locale, { fa: 'تراکنشی ثبت نشده است', en: 'No transactions recorded', ar: 'لم يتم تسجيل أي معاملات', zh: '暂无交易记录', ru: 'Транзакций нет' })}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-soft text-sub text-xs">
              <tr>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'شرح', en: 'Description', ar: 'الوصف', zh: '描述', ru: 'Описание' })}</th>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'کیف پول', en: 'Wallet', ar: 'المحفظة', zh: '钱包', ru: 'Кошелек' })}</th>
                <th className="p-4 text-end font-medium">{lt(locale, { fa: 'مبلغ', en: 'Amount', ar: 'المبلغ', zh: '金额', ru: 'Сумма' })}</th>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'وضعیت', en: 'Status', ar: 'الحالة', zh: '状态', ru: 'Статус' })}</th>
              </tr>
            </thead>
            <tbody>
              {formattedTransactions.map((t) => (
                <tr key={t.id} className="border-t border-line hover:bg-soft/60">
                  <td className="p-4 text-ink">{t.description}</td>
                  <td className="p-4 text-sub" dir="ltr">{t.wallet}{t.resultWallet ? ` ➔ ${t.resultWallet}` : ''}</td>
                  <td className="p-4 text-end font-bold" dir="ltr">
                    {(t.resultAmount && t.resultWallet ? t.resultAmount : t.amount).toLocaleString(numFmt)}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {t.status === 'completed' ? lt(locale, { fa: 'تسویه شده', en: 'Settled', ar: 'مستوفى', zh: '已结清', ru: 'Закрыто' }) : lt(locale, { fa: 'قفل موقت', en: 'Temporarily Locked', ar: 'حجز مؤقت', zh: '临时锁定', ru: 'Временно заблокировано' })}
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
