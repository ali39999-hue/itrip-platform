'use client';

import { useState } from 'react';
import { Wallet, RefreshCcw, Save, ShieldCheck, Loader2, Landmark, ArrowDownToLine, ArrowUpFromLine, ReceiptText } from 'lucide-react';
import { lt } from '@/lib/lt';
import { runLedgerReconciliation } from '@/actions/admin';
import type { ReconciliationReport } from '@/domains/ledger/ReconciliationService';
import { ErpAlert, ErpBadge, ErpHint, ErpPageHeader, ErpSectionCard, ErpStatCard, erpFieldCls, erpLabelCls } from '@/components/admin/erp-ui';
import { ERPDataGrid, ColumnDef } from '@/components/admin/ERPDataGrid';

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

type LedgerRow = {
  id: string;
  description: string;
  wallet: string;
  amount: number;
  status: string;
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

  const rows: LedgerRow[] = transactions.map((t) => ({
    id: t.id,
    description: t.referenceType ? `${t.referenceType}${t.referenceId ? ` · ${t.referenceId.slice(0, 8)}` : ''}` : 'Transaction',
    wallet: [t.account?.ownerType, t.account?.currency].filter(Boolean).join(' · ') || '—',
    amount: Number(t.amount.toString()) || 0,
    status: 'completed',
  }));

  const ledgerColumns: ColumnDef<LedgerRow>[] = [
    {
      key: 'description',
      header: lt(locale, { fa: 'شرح', en: 'Description', ar: 'الوصف', zh: '描述', ru: 'Описание' }),
      sortable: true,
      csvAccessor: (r) => r.description,
      render: (r) => (
        <span className="block min-w-40 max-w-72">
          <span className="block truncate font-black text-ink" dir="ltr">{r.description}</span>
          <span className="block truncate font-mono text-[10px] text-sub" dir="ltr">{r.id.slice(0, 12)}…</span>
        </span>
      ),
    },
    {
      key: 'wallet',
      header: lt(locale, { fa: 'کیف پول', en: 'Wallet', ar: 'المحفظة', zh: '钱包', ru: 'Кошелек' }),
      sortable: true,
      csvAccessor: (r) => r.wallet,
      render: (r) => <span className="font-bold text-sub" dir="ltr">{r.wallet}</span>,
    },
    {
      key: 'amount',
      header: lt(locale, { fa: 'مبلغ', en: 'Amount', ar: 'المبلغ', zh: '金额', ru: 'Сумма' }),
      sortable: true,
      accessor: (r) => r.amount,
      csvAccessor: (r) => r.amount,
      render: (r) => (
        <span className="num font-black text-ink tabular-nums" dir="ltr">{r.amount.toLocaleString(numFmt)}</span>
      ),
    },
    {
      key: 'status',
      header: lt(locale, { fa: 'وضعیت', en: 'Status', ar: 'الحالة', zh: '状态', ru: 'Статус' }),
      sortable: true,
      filterable: true,
      filterOptions: [{ label: 'Settled', value: 'completed' }],
      csvAccessor: (r) => r.status,
      render: () => (
        <ErpBadge tone="green">{lt(locale, { fa: 'تسویه شده', en: 'Settled', ar: 'مستوفى', zh: '已结清', ru: 'Закрыто' })}</ErpBadge>
      ),
    },
  ];

  const net = inflow - outflow;

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'مالی · خزانه‌داری', en: 'Finance · Treasury', ar: 'المالية · الخزينة', zh: '财务 · 资金', ru: 'Финансы · Казна' })}
        title={lt(locale, { fa: 'مدیریت مالی و خزانه‌داری', en: 'Finance & Treasury Management', ar: 'الإدارة المالية والخزينة', zh: '财务与国库管理', ru: 'Управление финансами и казначейством' })}
        description={lt(locale, { fa: 'ترازهای چندارزی، جریان امروز، نرخ تسویه و دفتر کل', en: 'Multi-currency balances, today’s flow, settlement rates and ledger', ar: 'الأرصدة والمعاملات وأسعار الصرف', zh: '多币种余额、今日流水、结算汇率与总账', ru: 'Балансы, потоки, курсы и журнал' })}
        icon={<Landmark size={20} aria-hidden="true" />}
        actions={
          <button
            type="button"
            onClick={handleReconciliation}
            disabled={reconciling}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-deep px-4 py-2.5 text-xs font-black text-surface shadow-elev-1 transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            {reconciling ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}
            <span>{lt(locale, { fa: 'اجرای تطبیق مالی', en: 'Run Reconciliation', ar: 'تشغيل المطابقة', zh: '执行对账', ru: 'Запустить сверку' })}</span>
          </button>
        }
      />

      {reconciliationError && (
        <ErpAlert tone="error" onDismiss={() => setReconciliationError(null)}>{reconciliationError}</ErpAlert>
      )}

      {reconciliationReport && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-elev-1">
          <div className="p-4">
            <ErpAlert tone={reconciliationReport.isBalanced ? 'success' : 'error'}>
              {reconciliationReport.isBalanced
                ? lt(locale, { fa: `تراز متوازن است · ${reconciliationReport.totalGroupsChecked.toLocaleString(numFmt)} گروه بررسی شد`, en: `Balanced · ${reconciliationReport.totalGroupsChecked} groups checked`, ar: 'متوازن', zh: '已平衡', ru: 'Сбалансировано' })
                : lt(locale, { fa: `در ${reconciliationReport.unbalancedGroupsCount.toLocaleString(numFmt)} گروه مغایرت هست — جزئیات را پایین ببینید`, en: `${reconciliationReport.unbalancedGroupsCount} unbalanced groups — details below`, ar: 'توجد فروقات — التفاصيل أدناه', zh: '存在不平衡分组 — 详情如下', ru: 'Есть несбалансированные группы — детали ниже' })}
            </ErpAlert>
          </div>
          {reconciliationReport.mismatches.length > 0 && (
            <details className="group border-t border-line/70">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-black text-ink transition hover:bg-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
                <span>
                  {lt(locale, { fa: `مشاهده ${reconciliationReport.mismatches.length.toLocaleString(numFmt)} گروه نامتوازن`, en: `View ${reconciliationReport.mismatches.length} unbalanced groups`, ar: 'عرض المجموعات غير المتوازنة', zh: '查看不平衡分组', ru: 'Показать несбалансированные группы' })}
                </span>
                <span aria-hidden="true" className="rounded-lg bg-soft px-2 py-1 text-[10px] text-sub transition group-open:rotate-180">▼</span>
              </summary>
              <ul className="max-h-56 space-y-1 overflow-y-auto border-t border-line/60 bg-soft/30 p-3">
                {reconciliationReport.mismatches.map((m) => (
                  <li key={m.groupId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/60 bg-surface px-3 py-2 text-[11px]">
                    <code className="font-mono font-black text-ink" dir="ltr">{m.groupId}</code>
                    <span className="num font-bold text-sub tabular-nums" dir="ltr">
                      Debit {m.totalDebit} · Credit {m.totalCredit} · <b className="text-rose-warm">Δ {m.diff} {m.currency}</b>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <ErpStatCard icon={<Wallet size={17} aria-hidden="true" />} label={lt(locale, { fa: 'صندوق ریالی (تومان)', en: 'Rial treasury (Toman)', ar: 'خزينة الريال', zh: '里亚尔金库', ru: 'Риаловая казна' })} value={(balances?.IRR || 0).toLocaleString(numFmt)} tone="brand" />
        <ErpStatCard icon={<Wallet size={17} aria-hidden="true" />} label={lt(locale, { fa: 'صندوق تتر (USDT)', en: 'USDT treasury', ar: 'خزينة التيثر', zh: 'USDT 金库', ru: 'USDT-казна' })} value={(balances?.USDT || 0).toLocaleString(numFmt)} tone="violet" />
        <ErpStatCard icon={<ArrowDownToLine size={17} aria-hidden="true" />} label={lt(locale, { fa: 'ورودی امروز', en: 'Today’s inflow', ar: 'التدفق الداخل اليوم', zh: '今日流入', ru: 'Приток сегодня' })} value={inflow.toLocaleString(numFmt)} tone="green" />
        <ErpStatCard icon={<ArrowUpFromLine size={17} aria-hidden="true" />} label={lt(locale, { fa: 'خالص امروز (ورودی−خروجی)', en: 'Today’s net', ar: 'الصافي اليوم', zh: '今日净额', ru: 'Нетто сегодня' })} value={net.toLocaleString(numFmt)} tone={net >= 0 ? 'green' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ErpSectionCard
          className="lg:col-span-3"
          title={lt(locale, { fa: 'جریان امروز', en: 'Today’s flow', ar: 'تدفق اليوم', zh: '今日流水', ru: 'Потоки сегодня' })}
          subtitle={lt(locale, { fa: 'شارژ کیف‌پول در برابر پرداخت و قفل وجه', en: 'Deposits vs payments & locks', ar: 'الشحن مقابل المدفوعات', zh: '充值 vs 支付与锁定', ru: 'Пополнения vs платежи' })}
          icon={<ReceiptText size={16} aria-hidden="true" />}
        >
          {(() => {
            const total = Math.max(1, inflow + outflow);
            const inPct = Math.round((inflow / total) * 100);
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sub">{lt(locale, { fa: 'شارژ کیف‌پول', en: 'Wallet deposits', ar: 'شحن المحفظة', zh: '钱包充值', ru: 'Пополнения' })}</span>
                  <b dir="ltr" className="num text-sm font-black text-success tabular-nums">{inflow.toLocaleString(numFmt)}</b>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-soft" role="img" aria-label={`${inPct}% inflow`}>
                  <div className="h-full rounded-full bg-gradient-to-l from-brand-dark via-brand to-mint-bright transition-all" style={{ width: `${inPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sub">{lt(locale, { fa: 'پرداخت و قفل وجه', en: 'Payments & locks', ar: 'المدفوعات والحجز', zh: '支付及锁定', ru: 'Платежи и блокировки' })}</span>
                  <b dir="ltr" className="num text-sm font-black text-rose-warm tabular-nums">{outflow.toLocaleString(numFmt)}</b>
                </div>
              </div>
            );
          })()}
        </ErpSectionCard>

        <ErpSectionCard
          className="lg:col-span-2"
          title={lt(locale, { fa: 'نرخ ارز تسویه (تومان)', en: 'Settlement FX rates (Toman)', ar: 'أسعار الصرف (تومان)', zh: '结算汇率（托曼）', ru: 'Курсы (Toman)' })}
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span>{lt(locale, { fa: 'مبنای تبدیل بدهی ارزی به تومان', en: 'Basis for converting FX dues to Toman', ar: 'أساس تحويل المستحقات للعملة المحلية', zh: '外币欠款折算基础', ru: 'База пересчёта в томаны' })}</span>
              <ErpHint label={lt(locale, { fa: 'این نرخ‌ها واقعی‌اند؟', en: 'Are these rates live?', ar: 'هل هذه الأسعار حقيقية؟', zh: '这些汇率是实时的吗？', ru: 'Курсы настоящие?' })}>
                {lt(locale, {
                  fa: 'فعلاً تمرینی است: ذخیره واقعی انجام نمی‌شود و روی سندی اثر نمی‌گذارد. برای اتصال به نرخ رسمی به تیم فنی بگویید.',
                  en: 'Practice mode for now: nothing is really saved and no document is affected. Ask the tech team to connect the official rate feed.',
                  ar: 'وضع تجريبي حاليًا: لا يتم حفظ شيء فعليًا. اطلب من الفريق التقني ربط الأسعار الرسمية.',
                  zh: '目前为练习模式：不会真正保存，也不影响任何单据。如需对接官方汇率请联系技术团队。',
                  ru: 'Пока тренировка: ничего не сохраняется и ни на что не влияет. Подключение курса — к техкоманде.',
                })}
              </ErpHint>
            </span>
          }
          icon={<RefreshCcw size={16} aria-hidden="true" />}
          actions={
            <ErpBadge tone={saved ? 'green' : 'neutral'}>
              {saved
                ? lt(locale, { fa: 'ذخیره شد', en: 'Saved', ar: 'تم الحفظ', zh: '已保存', ru: 'Сохранено' })
                : lt(locale, { fa: 'پیش‌نمایش', en: 'Preview', ar: 'معاينة', zh: '预览', ru: 'Превью' })}
            </ErpBadge>
          }
        >
          <div className="grid grid-cols-3 gap-2.5">
            {(['USDT', 'AED', 'EUR'] as const).map((c) => (
              <div key={c}>
                <label className={erpLabelCls} htmlFor={`fx-${c}`} dir="ltr">{c}</label>
                <input
                  id={`fx-${c}`}
                  type="number"
                  value={rates[c]}
                  onChange={(e) => setRates({ ...rates, [c]: e.target.value })}
                  className={erpFieldCls}
                  dir="ltr"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveRates}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-deep px-4 py-2.5 text-xs font-black text-surface transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Save size={14} aria-hidden="true" />
            {lt(locale, { fa: 'ذخیره نرخ‌ها (دمو)', en: 'Save rates (demo)', ar: 'حفظ الأسعار (تجريبي)', zh: '保存汇率（演示）', ru: 'Сохранить (демо)' })}
          </button>
        </ErpSectionCard>
      </div>

      <ERPDataGrid<LedgerRow>
        data={rows}
        columns={ledgerColumns}
        idAccessor={(r) => r.id}
        title={lt(locale, { fa: 'دفتر کل تراکنش‌ها', en: 'Transaction ledger', ar: 'سجل المعاملات', zh: '总账记录', ru: 'Журнал транзакций' })}
        description={lt(locale, { fa: 'آخرین اسناد دفتری ثبت‌شده در دیتابیس', en: 'Latest ledger entries in the database', ar: 'أحدث قيود الدفتر', zh: '数据库中的最新总账记录', ru: 'Последние записи журнала' })}
        searchPlaceholder={lt(locale, { fa: 'جستجوی شرح یا کیف‌پول… ( / )', en: 'Search description or wallet… ( / )', ar: 'ابحث في الوصف…', zh: '搜索描述或钱包…', ru: 'Поиск по описанию…' })}
        defaultPageSize={15}
        emptyStateMessage={lt(locale, { fa: 'تراکنشی ثبت نشده است', en: 'No transactions recorded', ar: 'لم يتم تسجيل أي معاملات', zh: '暂无交易记录', ru: 'Транзакций нет' })}
        savedViewStorageKey="erp_finance_views"
      />
    </div>
  );
}
