'use client';

import { useState } from 'react';
import {
  HandCoins, Plus, RefreshCw, CheckCircle2,
  Building2, Loader2, CreditCard, Wallet
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  createAdminSettlementBatch,
  executeAdminSettlementPayment,
  getAdminSettlementBatches,
} from '@/actions/admin';
import {
  ErpAlert, ErpBadge, ErpEmptyState, ErpModal,
  ErpPageHeader, ErpSectionCard, ErpStatCard,
  erpFieldCls, erpLabelCls, erpPrimaryBtnCls, erpGhostBtnCls,
} from '@/components/admin/erp-ui';

export interface SettlementBatchItem {
  id: string;
  batchNumber: string;
  supplierId: string;
  supplierName?: string;
  supplierType?: string;
  totalPayable: number;
  netSettlement: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface SupplierOption {
  id: string;
  name: string;
  type: string;
}

export function SettlementsClientPage({
  locale,
  initialBatches,
  suppliers,
}: {
  locale: string;
  initialBatches: SettlementBatchItem[];
  suppliers: SupplierOption[];
}) {
  const [batches, setBatches] = useState<SettlementBatchItem[]>(initialBatches);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; msg: string } | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'COMPLETED' | 'DISCREPANCY'>('ALL');

  // Creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('IRR');

  // Execution state (batchId being paid)
  const [executingId, setExecutingId] = useState<string | null>(null);

  async function refreshBatches() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await getAdminSettlementBatches();
      if (res.success) {
        setBatches(res.batches || []);
      } else {
        setFeedback({ tone: 'error', msg: res.error || 'خطا در بارگذاری دوره‌های تسویه' });
      }
    } catch (err) {
      setFeedback({ tone: 'error', msg: err instanceof Error ? err.message : 'خطای ارتباط با سرور' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierId || creating) return;
    setCreating(true);
    setFeedback(null);
    try {
      const res = await createAdminSettlementBatch({
        supplierId: selectedSupplierId,
        periodStart,
        periodEnd,
        currency,
      });

      if (res.success && res.batch) {
        setFeedback({
          tone: 'success',
          msg: lt(locale, {
            fa: `دوره تسویه ${res.batch.batchNumber} با موفقیت محاسبه و ثبت شد.`,
            en: `Settlement batch ${res.batch.batchNumber} generated successfully.`,
          }),
        });
        setShowCreateModal(false);
        await refreshBatches();
      } else {
        setFeedback({ tone: 'error', msg: res.error || 'خطا در ایجاد دوره تسویه' });
      }
    } catch (err) {
      setFeedback({ tone: 'error', msg: err instanceof Error ? err.message : 'خطای ارتباط با سرور' });
    } finally {
      setCreating(false);
    }
  }

  async function handleExecutePayment(batch: SettlementBatchItem) {
    if (executingId) return;
    setExecutingId(batch.id);
    setFeedback(null);
    try {
      const res = await executeAdminSettlementPayment(batch.id);
      if (res.success) {
        setFeedback({
          tone: 'success',
          msg: lt(locale, {
            fa: `تسویه‌حساب دوره ${batch.batchNumber} انجام شد و سند مالی در دفتر کل ثبت گردید.`,
            en: `Settlement payment for ${batch.batchNumber} completed and posted to ledger.`,
          }),
        });
        await refreshBatches();
      } else {
        setFeedback({ tone: 'error', msg: res.error || 'خطا در اجرای تسویه' });
      }
    } catch (err) {
      setFeedback({ tone: 'error', msg: err instanceof Error ? err.message : 'خطای ارتباط با سرور' });
    } finally {
      setExecutingId(null);
    }
  }

  const filteredBatches = batches.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  const totalOpen = batches.filter((b) => b.status === 'OPEN').reduce((s, b) => s + b.netSettlement, 0);
  const totalCompleted = batches.filter((b) => b.status === 'COMPLETED').reduce((s, b) => s + b.netSettlement, 0);

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'مالی · تسویه‌حساب', en: 'Finance · Settlements', ar: 'المالية · التسويات', zh: '财务 · 结算', ru: 'Финансы · Расчёты' })}
        title={lt(locale, { fa: 'تسویه‌حساب با تامین‌کنندگان (هتل و پرواز)', en: 'Supplier Settlements (Hotels & Flights)', ar: 'تسوية حسابات الموردين', zh: '供应商结算管理', ru: 'Расчёты с поставщиками' })}
        description={lt(locale, {
          fa: 'محاسبه دوره‌ای بدهی به ایرلاین‌ها و هتل‌ها، تطبیق با رزروهای قطعی و صدور اسناد پرداخت در دفتر کل',
          en: 'Periodic dues calculation for airlines and hotels, reconciliation with bookings, and ledger payout posting',
        })}
        icon={<HandCoins size={20} aria-hidden="true" />}
        actions={
          <>
            <button type="button" onClick={refreshBatches} className={erpGhostBtnCls}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              <span>{lt(locale, { fa: 'به‌روزرسانی', en: 'Refresh' })}</span>
            </button>
            <button type="button" onClick={() => setShowCreateModal(true)} className={erpPrimaryBtnCls}>
              <Plus size={15} aria-hidden="true" />
              <span>{lt(locale, { fa: 'دوره تسویه جدید', en: 'New Settlement Batch' })}</span>
            </button>
          </>
        }
      />

      {feedback && (
        <ErpAlert tone={feedback.tone} onDismiss={() => setFeedback(null)}>
          {feedback.msg}
        </ErpAlert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ErpStatCard
          icon={<Wallet size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'مجموع تسویه‌های باز (در انتظار پرداخت)', en: 'Open Payables' })}
          value={`${num(totalOpen, locale)} ریال`}
          hint={`${batches.filter((b) => b.status === 'OPEN').length} دوره`}
          tone="gold"
        />
        <ErpStatCard
          icon={<CreditCard size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'مجموع تسویه‌شده قطعی', en: 'Total Settled' })}
          value={`${num(totalCompleted, locale)} ریال`}
          tone="green"
        />
        <ErpStatCard
          icon={<Building2 size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'تعداد کل تامین‌کنندگان فعال', en: 'Active Suppliers' })}
          value={suppliers.length}
          tone="brand"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-black text-sub">{lt(locale, { fa: 'فیلتر وضعیت:', en: 'Filter:' })}</span>
        {(['ALL', 'OPEN', 'COMPLETED', 'DISCREPANCY'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              statusFilter === st ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-ink hover:bg-mint/40'
            }`}
          >
            {st === 'ALL'
              ? lt(locale, { fa: 'همه دوره‌ها', en: 'All' })
              : st === 'OPEN'
                ? lt(locale, { fa: 'باز (در انتظار)', en: 'Open' })
                : st === 'COMPLETED'
                  ? lt(locale, { fa: 'تسویه شده', en: 'Completed' })
                  : lt(locale, { fa: 'مغایرت‌دار', en: 'Discrepancy' })}
            {st !== 'ALL' && (
              <span className="ms-1.5 opacity-70">
                ({batches.filter((b) => b.status === st).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Batches List */}
      <ErpSectionCard
        title={lt(locale, { fa: 'فهرست اسناد و دوره‌های تسویه', en: 'Settlement Batches' })}
        subtitle={lt(locale, { fa: 'هر سند شامل تجمیع خالص بهای خدمات رزروهای قطعی آن دوره است', en: 'Each batch aggregates net payable costs for confirmed bookings' })}
        icon={<Building2 size={16} aria-hidden="true" />}
      >
        {filteredBatches.length === 0 ? (
          <ErpEmptyState
            icon={<HandCoins size={32} className="text-line" aria-hidden="true" />}
            title={lt(locale, { fa: 'هیچ دوره تسویه‌ای در این وضعیت یافت نشد', en: 'No settlement batches found' })}
            description={lt(locale, { fa: 'می‌توانید با دکمه «دوره تسویه جدید»، برای هتل یا ایرلاین مورد نظر دوره محاسبه کنید.', en: 'Click "New Settlement Batch" to generate one.' })}
            action={
              <button type="button" onClick={() => setShowCreateModal(true)} className={erpPrimaryBtnCls}>
                <Plus size={14} aria-hidden="true" />
                <span>{lt(locale, { fa: 'دوره تسویه جدید', en: 'New Settlement Batch' })}</span>
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-line bg-soft/50 text-sub font-black text-[11px]">
                <tr>
                  <th className="p-3 text-start">{lt(locale, { fa: 'شناسه دوره', en: 'Batch #' })}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'تامین‌کننده', en: 'Supplier' })}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'بازه زمانی', en: 'Period' })}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'مبلغ قابل پرداخت', en: 'Net Payable' })}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'وضعیت', en: 'Status' })}</th>
                  <th className="p-3 text-end">{lt(locale, { fa: 'عملیات مالی', en: 'Action' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredBatches.map((b) => {
                  const isOpen = b.status === 'OPEN';
                  const isCompleted = b.status === 'COMPLETED';

                  return (
                    <tr key={b.id} className="hover:bg-soft/30 transition">
                      <td className="p-3 font-mono font-black text-ink">{b.batchNumber}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-ink">{b.supplierName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-soft text-sub text-[10px] font-mono">
                            {b.supplierType}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-sub">
                        {b.periodStart.slice(0, 10)} ➔ {b.periodEnd.slice(0, 10)}
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-black text-ink text-sm">
                          {num(b.netSettlement, locale)}
                        </span>
                        <span className="ms-1 text-sub font-bold text-[10px]">{b.currency}</span>
                      </td>
                      <td className="p-3">
                        <ErpBadge tone={isOpen ? 'gold' : isCompleted ? 'green' : 'rose'}>
                          {isOpen
                            ? lt(locale, { fa: 'در انتظار پرداخت', en: 'Open / Pending' })
                            : isCompleted
                              ? lt(locale, { fa: 'تسویه شده', en: 'Settled' })
                              : lt(locale, { fa: 'مغایرت', en: 'Discrepancy' })}
                        </ErpBadge>
                      </td>
                      <td className="p-3 text-end">
                        {isOpen ? (
                          <button
                            type="button"
                            onClick={() => handleExecutePayment(b)}
                            disabled={executingId === b.id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-action hover:bg-action-hover text-ink px-3 py-1.5 font-black text-xs transition disabled:opacity-60 cursor-pointer shadow-xs"
                          >
                            {executingId === b.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CreditCard size={13} />
                            )}
                            <span>{lt(locale, { fa: 'پرداخت و ثبت سند', en: 'Execute Payout' })}</span>
                          </button>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-success font-black text-xs">
                            <CheckCircle2 size={14} />
                            <span>{lt(locale, { fa: 'سند مالی ثبت شده', en: 'Posted' })}</span>
                          </span>
                        ) : (
                          <span className="text-destructive font-black text-xs">
                            {lt(locale, { fa: 'نیازمند بررسی مغایرت', en: 'Needs Review' })}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ErpSectionCard>

      {/* Creation Modal */}
      {showCreateModal && (
        <ErpModal
          title={lt(locale, { fa: 'ایجاد دوره تسویه حساب جدید', en: 'Create New Settlement Batch' })}
          subtitle={lt(locale, { fa: 'سیستم تمامی رزروهای قطعی تامین‌کننده در این بازه را استعلام و فاکتور تجمیعی می‌سازد', en: 'Aggregates all confirmed bookings for this supplier into a settlement batch' })}
          onClose={() => setShowCreateModal(false)}
          footer={
            <>
              <button type="button" onClick={() => setShowCreateModal(false)} className={erpGhostBtnCls}>
                {lt(locale, { fa: 'انصراف', en: 'Cancel' })}
              </button>
              <button type="submit" form="create-settlement-form" disabled={creating} className={erpPrimaryBtnCls}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>{lt(locale, { fa: 'محاسبه و ایجاد سند', en: 'Generate Batch' })}</span>
              </button>
            </>
          }
        >
          <form id="create-settlement-form" onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className={erpLabelCls}>{lt(locale, { fa: 'انتخاب تامین‌کننده:', en: 'Supplier:' })}</label>
              <select
                className={erpFieldCls}
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={erpLabelCls}>{lt(locale, { fa: 'شروع دوره:', en: 'Period Start:' })}</label>
                <input
                  type="date"
                  className={erpFieldCls}
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={erpLabelCls}>{lt(locale, { fa: 'پایان دوره:', en: 'Period End:' })}</label>
                <input
                  type="date"
                  className={erpFieldCls}
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className={erpLabelCls}>{lt(locale, { fa: 'ارز تسویه:', en: 'Currency:' })}</label>
              <select
                className={erpFieldCls}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="IRR">IRR (ریال)</option>
                <option value="USDT">USDT (تتر)</option>
                <option value="AED">AED (درهم)</option>
              </select>
            </div>
          </form>
        </ErpModal>
      )}
    </div>
  );
}
