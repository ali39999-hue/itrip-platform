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
            ar: `تم حساب دورة التسوية ${res.batch.batchNumber} وترحيلها بنجاح.`, zh: `结算批次 ${res.batch.batchNumber} 已成功生成并入账。`, ru: `Пачка расчетов ${res.batch.batchNumber} успешно сформирована и проведена.`,
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
            ar: `تمت تسوية الدورة ${batch.batchNumber} وترحيل المستند المالي إلى دفتر الأستاذ.`, zh: `批次 ${batch.batchNumber} 的结算已完成并计入总账。`, ru: `Расчет по пачке ${batch.batchNumber} выполнен и проведен по главной книге.`,
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
          ar: 'الحساب الدوري للمستحقات على شركات الطيران والفنادق، والتسوية مع الحجوزات المؤكدة، وترحيل مستندات الدفع في دفتر الأستاذ', zh: '定期计算航空公司与酒店的应付款项，与确认预订对账，并在总账中登记付款凭证', ru: 'Периодический расчет задолженности перед авиакомпаниями и отелями, сверка с бронированиями и проведение выплат в главной книге',
          fa: 'محاسبه دوره‌ای بدهی به ایرلاین‌ها و هتل‌ها، تطبیق با رزروهای قطعی و صدور اسناد پرداخت در دفتر کل',
          en: 'Periodic dues calculation for airlines and hotels, reconciliation with bookings, and ledger payout posting',
        })}
        icon={<HandCoins size={20} aria-hidden="true" />}
        actions={
          <>
            <button type="button" onClick={refreshBatches} className={erpGhostBtnCls}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              <span>{lt(locale, { fa: 'به‌روزرسانی', en: 'Refresh' , ar: 'تحديث', zh: '刷新', ru: 'Обновить'})}</span>
            </button>
            <button type="button" onClick={() => setShowCreateModal(true)} className={erpPrimaryBtnCls}>
              <Plus size={15} aria-hidden="true" />
              <span>{lt(locale, { fa: 'دوره تسویه جدید', en: 'New Settlement Batch' , ar: 'دورة تسوية جديدة', zh: '新建结算批次', ru: 'Новая пачка расчетов'})}</span>
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
          label={lt(locale, { fa: 'مجموع تسویه‌های باز (در انتظار پرداخت)', en: 'Open Payables' , ar: 'إجمالي التسويات المفتوحة (قيد الدفع)', zh: '未结算应付总额', ru: 'Открытая кредиторская задолженность'})}
          value={`${num(totalOpen, locale)} ریال`}
          hint={`${batches.filter((b) => b.status === 'OPEN').length} دوره`}
          tone="gold"
        />
        <ErpStatCard
          icon={<CreditCard size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'مجموع تسویه‌شده قطعی', en: 'Total Settled' , ar: 'إجمالي المسدد نهائيًا', zh: '已结算总额', ru: 'Всего рассчитано'})}
          value={`${num(totalCompleted, locale)} ریال`}
          tone="green"
        />
        <ErpStatCard
          icon={<Building2 size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'تعداد کل تامین‌کنندگان فعال', en: 'Active Suppliers' , ar: 'عدد الموردين النشطين', zh: '活跃供应商数', ru: 'Активные поставщики'})}
          value={suppliers.length}
          tone="brand"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-black text-sub">{lt(locale, { fa: 'فیلتر وضعیت:', en: 'Filter:' , ar: 'تصفية الحالة:', zh: '状态筛选：', ru: 'Фильтр:'})}</span>
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
              ? lt(locale, { fa: 'همه دوره‌ها', en: 'All' , ar: 'جميع الدورات', zh: '全部批次', ru: 'Все'})
              : st === 'OPEN'
                ? lt(locale, { fa: 'باز (در انتظار)', en: 'Open' , ar: 'مفتوحة (قيد الانتظار)', zh: '未结（待处理）', ru: 'Открытые'})
                : st === 'COMPLETED'
                  ? lt(locale, { fa: 'تسویه شده', en: 'Completed' , ar: 'مسددة', zh: '已结算', ru: 'Рассчитанные'})
                  : lt(locale, { fa: 'مغایرت‌دار', en: 'Discrepancy' , ar: 'بها تباينات', zh: '存在差异', ru: 'С расхождениями'})}
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
        title={lt(locale, { fa: 'فهرست اسناد و دوره‌های تسویه', en: 'Settlement Batches' , ar: 'قائمة مستندات ودورات التسوية', zh: '结算凭证与批次列表', ru: 'Пачки расчетов'})}
        subtitle={lt(locale, { fa: 'هر سند شامل تجمیع خالص بهای خدمات رزروهای قطعی آن دوره است', en: 'Each batch aggregates net payable costs for confirmed bookings' , ar: 'كل مستند يتضمن تجميع صافي تكاليف الخدمات للحجوزات المؤكدة في تلك الدورة', zh: '每个批次汇总该期间已确认预订的净服务成本', ru: 'Каждая пачка агрегирует чистую стоимость услуг по подтвержденным бронированиям за период'})}
        icon={<Building2 size={16} aria-hidden="true" />}
      >
        {filteredBatches.length === 0 ? (
          <ErpEmptyState
            icon={<HandCoins size={32} className="text-line" aria-hidden="true" />}
            title={lt(locale, { fa: 'هیچ دوره تسویه‌ای در این وضعیت یافت نشد', en: 'No settlement batches found' , ar: 'لم يتم العثور على دورات تسوية في هذه الحالة', zh: '该状态下未找到结算批次', ru: 'Пачки расчетов в этом статусе не найдены'})}
            description={lt(locale, { fa: 'می‌توانید با دکمه «دوره تسویه جدید»، برای هتل یا ایرلاین مورد نظر دوره محاسبه کنید.', en: 'Click "New Settlement Batch" to generate one.' , ar: 'يمكنك من خلال زر «دورة تسوية جديدة» إنشاء دورة احتساب للفندق أو شركة الطيران المطلوبة.', zh: '点击“新建结算批次”可为指定酒店或航空公司生成结算批次。', ru: 'Нажмите «Новая пачка расчетов», чтобы сформировать период для нужного отеля или авиакомпании.'})}
            action={
              <button type="button" onClick={() => setShowCreateModal(true)} className={erpPrimaryBtnCls}>
                <Plus size={14} aria-hidden="true" />
                <span>{lt(locale, { fa: 'دوره تسویه جدید', en: 'New Settlement Batch' , ar: 'دورة تسوية جديدة', zh: '新建结算批次', ru: 'Новая пачка расчетов'})}</span>
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-line bg-soft/50 text-sub font-black text-[11px]">
                <tr>
                  <th className="p-3 text-start">{lt(locale, { fa: 'شناسه دوره', en: 'Batch #' , ar: 'معرف الدورة', zh: '批次编号', ru: '№ пачки'})}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'تامین‌کننده', en: 'Supplier' , ar: 'المورد', zh: '供应商', ru: 'Поставщик'})}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'بازه زمانی', en: 'Period' , ar: 'الفترة الزمنية', zh: '期间', ru: 'Период'})}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'مبلغ قابل پرداخت', en: 'Net Payable' , ar: 'المبلغ المستحق للدفع', zh: '应付净额', ru: 'К оплате (нетто)'})}</th>
                  <th className="p-3 text-start">{lt(locale, { fa: 'وضعیت', en: 'Status' , ar: 'الحالة', zh: '状态', ru: 'Статус'})}</th>
                  <th className="p-3 text-end">{lt(locale, { fa: 'عملیات مالی', en: 'Action' , ar: 'إجراء مالي', zh: '财务操作', ru: 'Действие'})}</th>
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
                            ? lt(locale, { fa: 'در انتظار پرداخت', en: 'Open / Pending' , ar: 'قيد الانتظار', zh: '待支付', ru: 'Ожидает оплаты'})
                            : isCompleted
                              ? lt(locale, { fa: 'تسویه شده', en: 'Settled' , ar: 'مسدد', zh: '已结算', ru: 'Рассчитана'})
                              : lt(locale, { fa: 'مغایرت', en: 'Discrepancy' , ar: 'تباين', zh: '差异', ru: 'Расхождение'})}
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
                            <span>{lt(locale, { fa: 'پرداخت و ثبت سند', en: 'Execute Payout' , ar: 'تنفيذ الدفع وترحيل المستند', zh: '执行付款并登记凭证', ru: 'Выполнить выплату'})}</span>
                          </button>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-success font-black text-xs">
                            <CheckCircle2 size={14} />
                            <span>{lt(locale, { fa: 'سند مالی ثبت شده', en: 'Posted' , ar: 'تم ترحيل المستند المالي', zh: '凭证已入账', ru: 'Проведено'})}</span>
                          </span>
                        ) : (
                          <span className="text-destructive font-black text-xs">
                            {lt(locale, { fa: 'نیازمند بررسی مغایرت', en: 'Needs Review' , ar: 'يتطلب مراجعة التباينات', zh: '需复核差异', ru: 'Требует проверки'})}
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
          title={lt(locale, { fa: 'ایجاد دوره تسویه حساب جدید', en: 'Create New Settlement Batch' , ar: 'إنشاء دورة تسوية جديدة', zh: '创建新结算批次', ru: 'Создать новую пачку расчетов'})}
          subtitle={lt(locale, { fa: 'سیستم تمامی رزروهای قطعی تامین‌کننده در این بازه را استعلام و فاکتور تجمیعی می‌سازد', en: 'Aggregates all confirmed bookings for this supplier into a settlement batch' , ar: 'يقوم النظام بالاستعلام عن جميع حجوزات المورد المؤكدة في هذه الفترة وبناء فاتورة تجميعية', zh: '系统将汇总该供应商在此期间的所有确认预订并生成合并结算单', ru: 'Система соберет все подтвержденные бронирования поставщика за период и сформирует сводный счет'})}
          onClose={() => setShowCreateModal(false)}
          footer={
            <>
              <button type="button" onClick={() => setShowCreateModal(false)} className={erpGhostBtnCls}>
                {lt(locale, { fa: 'انصراف', en: 'Cancel' , ar: 'إلغاء', zh: '取消', ru: 'Отмена'})}
              </button>
              <button type="submit" form="create-settlement-form" disabled={creating} className={erpPrimaryBtnCls}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>{lt(locale, { fa: 'محاسبه و ایجاد سند', en: 'Generate Batch' , ar: 'الحساب وإنشاء المستند', zh: '计算并生成批次', ru: 'Рассчитать и создать'})}</span>
              </button>
            </>
          }
        >
          <form id="create-settlement-form" onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className={erpLabelCls}>{lt(locale, { fa: 'انتخاب تامین‌کننده:', en: 'Supplier:' , ar: 'اختيار المورد:', zh: '选择供应商：', ru: 'Поставщик:'})}</label>
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
                <label className={erpLabelCls}>{lt(locale, { fa: 'شروع دوره:', en: 'Period Start:' , ar: 'بداية الفترة:', zh: '开始日期：', ru: 'Начало периода:'})}</label>
                <input
                  type="date"
                  className={erpFieldCls}
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={erpLabelCls}>{lt(locale, { fa: 'پایان دوره:', en: 'Period End:' , ar: 'نهاية الفترة:', zh: '结束日期：', ru: 'Конец периода:'})}</label>
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
              <label className={erpLabelCls}>{lt(locale, { fa: 'ارز تسویه:', en: 'Currency:' , ar: 'عملة التسوية:', zh: '结算货币：', ru: 'Валюта расчетов:'})}</label>
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
