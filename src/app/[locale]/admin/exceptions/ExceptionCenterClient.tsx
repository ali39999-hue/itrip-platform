'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Clock,
  UserCheck,
  Check,
  X,
  ShieldCheck,
  RefreshCw,
  Wallet,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { ERPDataGrid, ColumnDef } from '@/components/admin/ERPDataGrid';
import { ErpAlert, ErpHint, ErpPageHeader, ErpTabs } from '@/components/admin/erp-ui';
import { ExceptionStats } from '@/domains/erp/ExceptionCenterService';
import { assignException, resolveException } from '@/actions/admin';
import {
  retryTicketingRemediationAction,
  immediateRefundRemediationAction,
  syncPaymentStatusRemediationAction,
  pollSupplierPnrRemediationAction,
  getStaffOperatorsAction,
} from '@/actions/admin-exceptions';
import { lt } from '@/lib/lt';

export interface ExceptionItem {
  id: string;
  type: string;
  severity: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string | null;
  status: string;
  ownerId: string | null;
  slaDueAt: Date | null;
  detectedAt: Date;
  slaRemainingMinutes: number | null;
  isSlaBreached: boolean;
  slaStatus: 'ON_TRACK' | 'APPROACHING_BREACH' | 'BREACHED' | 'NO_SLA';
}

export function ExceptionCenterClient({
  exceptions,
  stats,
  locale,
}: {
  exceptions: ExceptionItem[];
  stats: ExceptionStats;
  locale: string;
}) {
  const [selectedQueue, setSelectedQueue] = useState<string>('ALL');
  const [isPending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [remediatingId, setRemediatingId] = useState<string | null>(null);
  const [operators, setOperators] = useState<Array<{ id: string; name: string | null; role: string }>>([]);

  useEffect(() => {
    getStaffOperatorsAction()
      .then((res) => {
        if (res.success && res.operators) {
          setOperators(res.operators);
        }
      })
      .catch(() => {});
  }, []);

  const filteredByQueue = exceptions.filter((exc) => {
    if (selectedQueue === 'ALL') return true;
    return exc.type === selectedQueue;
  });

  const handleResolve = (id: string) => {
    if (!resolutionText.trim()) return;
    startTransition(async () => {
      try {
        await resolveException(id, resolutionText.trim());
        setFeedback(lt(locale, { fa: 'مورد با موفقیت حل شد (RESOLVED).', en: 'Exception marked as RESOLVED.', ar: 'تم وضع علامة على الاستثناء كمحلول.', zh: '异常已标记为已解决。', ru: 'Исключение отмечено как решённое.' }));
        setResolvingId(null);
        setResolutionText('');
      } catch (err: unknown) {
        setFeedback(`${lt(locale, { fa: 'خطا در ثبت حل:', en: 'Failed to resolve:', ar: 'فشل الحل:', zh: '解决失败：', ru: 'Не удалось решить:' })} ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleAssign = (id: string) => {
    if (!selectedOwnerId.trim()) return;
    startTransition(async () => {
      try {
        await assignException(id, selectedOwnerId.trim());
        const opName = operators.find((o) => o.id === selectedOwnerId)?.name || selectedOwnerId;
        setFeedback(lt(locale, { fa: `مورد به ${opName} ارجاع شد.`, en: `Exception assigned to ${opName}.`, ar: `تم تعيين الاستثناء إلى ${opName}.`, zh: `异常已指派给 ${opName}。`, ru: `Исключение назначено: ${opName}.` }));
        setAssigningId(null);
        setSelectedOwnerId('');
      } catch (err: unknown) {
        setFeedback(`${lt(locale, { fa: 'خطا در ارجاع:', en: 'Failed to assign:', ar: 'فشل التعيين:', zh: '指派失败：', ru: 'Не удалось назначить:' })} ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleRemediate = async (
    id: string,
    actionType: 'retry' | 'refund' | 'sync' | 'poll'
  ) => {
    setRemediatingId(id);
    try {
      let res;
      if (actionType === 'retry') {
        res = await retryTicketingRemediationAction(id);
      } else if (actionType === 'refund') {
        const rReason = prompt('دلیل استرداد آنی به کیف پول را وارد کنید (اختیاری):') || undefined;
        res = await immediateRefundRemediationAction(id, rReason);
      } else if (actionType === 'sync') {
        res = await syncPaymentStatusRemediationAction(id);
      } else if (actionType === 'poll') {
        res = await pollSupplierPnrRemediationAction(id);
      }

      if (res?.success) {
        setFeedback(`✓ ${res.message}`);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setFeedback(`خطا: ${res?.message || 'عملیات ناموفق بود'}`);
      }
    } finally {
      setRemediatingId(null);
    }
  };

  const columns: ColumnDef<ExceptionItem>[] = [
    {
      key: 'type',
      header: lt(locale, { fa: 'صف / نوع', en: 'Queue / Type', ar: 'القائمة / النوع', zh: '队列/类型', ru: 'Очередь / тип' }),
      sortable: true,
      filterable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-ink text-surface text-[10px] font-black">
          {row.type}
        </span>
      ),
    },
    {
      key: 'severity',
      header: lt(locale, { fa: 'شدت', en: 'Severity', ar: 'الخطورة', zh: '严重程度', ru: 'Серьёзность' }),
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: `${lt(locale, { fa: 'بحرانی', en: 'Critical', ar: 'حرج', zh: '严重', ru: 'Критично' })} (CRITICAL)`, value: 'CRITICAL' },
        { label: `${lt(locale, { fa: 'بالا', en: 'High', ar: 'عالٍ', zh: '高', ru: 'Высокая' })} (HIGH)`, value: 'HIGH' },
        { label: `${lt(locale, { fa: 'متوسط', en: 'Medium', ar: 'متوسط', zh: '中', ru: 'Средняя' })} (MEDIUM)`, value: 'MEDIUM' },
        { label: `${lt(locale, { fa: 'کم', en: 'Low', ar: 'منخفض', zh: '低', ru: 'Низкая' })} (LOW)`, value: 'LOW' },
      ],
      render: (row) => {
        const isCritical = row.severity === 'CRITICAL' || row.severity === 'HIGH';
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              isCritical
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : row.severity === 'MEDIUM'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {row.severity}
          </span>
        );
      },
    },
    {
      key: 'slaStatus',
      header: lt(locale, { fa: 'شمارش SLA', en: 'SLA Countdown', ar: 'العد التنازلي لـSLA', zh: 'SLA倒计时', ru: 'Обратный отсчёт SLA' }),
      sortable: true,
      render: (row) => {
        if (!row.slaDueAt) {
          return <span className="text-sub text-[11px]">-</span>;
        }
        const isBreached = row.slaStatus === 'BREACHED';
        const isWarning = row.slaStatus === 'APPROACHING_BREACH';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
              isBreached
                ? 'bg-rose-600 text-white animate-pulse'
                : isWarning
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <Clock size={11} />
            {isBreached
              ? `BREACHED (${Math.abs(row.slaRemainingMinutes || 0)}m)`
              : `${row.slaRemainingMinutes}m remaining`}
          </span>
        );
      },
    },
    {
      key: 'title',
      header: lt(locale, { fa: 'عنوان و موجودیت', en: 'Title & Entity', ar: 'العنوان والكيان', zh: '标题与实体', ru: 'Название и сущность' }),
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 max-w-sm">
          <div className="font-bold text-ink">{row.title}</div>
          <div className="text-[11px] text-sub font-mono flex items-center gap-1.5">
            <span>{row.entityType}:</span>
            {row.entityType === 'BOOKING' || row.entityType === 'TRIP' ? (
              <Link
                href={`/admin/travel-files/${row.entityId}`}
                target="_blank"
                className="text-brand-dark hover:underline flex items-center gap-0.5 font-bold"
              >
                <span>{row.entityId.slice(0, 14)}…</span>
                <ExternalLink size={11} />
              </Link>
            ) : (
              <span>{row.entityId}</span>
            )}
          </div>
          {row.description && <p className="text-[11px] text-sub truncate">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'ownerId',
      header: lt(locale, { fa: 'مسئول', en: 'Owner', ar: 'المسؤول', zh: '负责人', ru: 'Ответственный' }),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {assigningId === row.id ? (
            <div className="flex items-center gap-1">
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                className="h-8 px-2 rounded-lg border border-line text-[11px] bg-surface text-ink"
              >
                <option value="">انتخاب کارشناس...</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name || op.id.slice(0, 8)} ({op.role})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAssign(row.id)}
                disabled={isPending || !selectedOwnerId}
                aria-label={lt(locale, { fa: 'تأیید ارجاع', en: 'Confirm assignment', ar: 'تأكيد التعيين', zh: '确认指派', ru: 'Подтвердить назначение' })}
                className="min-h-[44px] min-w-[44px] min-w-8 min-h-8 grid place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
              >
                <Check size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setAssigningId(null)}
                aria-label={lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                className="min-h-[44px] min-w-[44px] min-w-8 min-h-8 grid place-items-center rounded-lg text-sub hover:text-ink hover:bg-soft"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="font-medium text-[11px]">
                {operators.find((o) => o.id === row.ownerId)?.name ||
                  row.ownerId ||
                  lt(locale, { fa: 'بدون مسئول', en: 'Unassigned', ar: 'غير معين', zh: '未指派', ru: 'Не назначен' })}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAssigningId(row.id);
                  setSelectedOwnerId(row.ownerId || '');
                }}
                aria-label={lt(locale, { fa: 'ارجاع به اپراتور', en: 'Assign operator', ar: 'تعيين موظف', zh: '指派运营人员', ru: 'Назначить оператора' })}
                className="min-h-[44px] min-w-[44px] min-w-7 min-h-7 grid place-items-center rounded-lg text-sub hover:text-ink hover:bg-soft"
              >
                <UserCheck size={13} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: lt(locale, { fa: 'وضعیت', en: 'Status', ar: 'الحالة', zh: '状态', ru: 'Статус' }),
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: `${lt(locale, { fa: 'باز', en: 'Open', ar: 'مفتوح', zh: '待处理', ru: 'Открыت' })} (OPEN)`, value: 'OPEN' },
        { label: `${lt(locale, { fa: 'در حال بررسی', en: 'In progress', ar: 'قيد المعالجة', zh: '处理中', ru: 'В работе' })} (IN_PROGRESS)`, value: 'IN_PROGRESS' },
        { label: `${lt(locale, { fa: 'حل‌شده', en: 'Resolved', ar: 'محلول', zh: '已解决', ru: 'Решено' })} (RESOLVED)`, value: 'RESOLVED' },
      ],
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-surface border border-line">
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: lt(locale, { fa: 'اقدام عملیاتی و جبرانی', en: 'Remediation Actions', ar: 'الإجراءات', zh: '补救操作', ru: 'Действия' }),
      sortable: false,
      render: (row) => {
        if (row.status === 'RESOLVED' || row.status === 'CLOSED') {
          return <span className="text-[11px] text-emerald-600 font-bold">{lt(locale, { fa: 'حل شد', en: 'Resolved', ar: 'تم الحل', zh: '已解决', ru: 'Решено' })}</span>;
        }

        if (resolvingId === row.id) {
          return (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder={lt(locale, { fa: 'یادداشت حل', en: 'Resolution note', ar: 'ملاحظة الحل', zh: '解决备注', ru: 'Комментарий' })}
                aria-label={lt(locale, { fa: 'یادداشت حل', en: 'Resolution note', ar: 'ملاحظة الحل', zh: '解决备注', ru: 'Комментарий' })}
                className="w-28 min-h-9 px-2 rounded-lg border border-line text-[11px]"
              />
              <button
                type="button"
                onClick={() => handleResolve(row.id)}
                disabled={isPending || !resolutionText.trim()}
                className="min-h-9 px-2.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-50"
              >
                {lt(locale, { fa: 'ثبت', en: 'Save', ar: 'حفظ', zh: '保存', ru: 'Сохранить' })}
              </button>
              <button
                type="button"
                onClick={() => setResolvingId(null)}
                aria-label={lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                className="min-h-[44px] min-w-[44px] min-w-9 min-h-9 grid place-items-center rounded-lg text-sub hover:text-ink hover:bg-soft"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        }

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {row.type === 'TICKET_NOT_ISSUED' && (
              <button
                type="button"
                onClick={() => handleRemediate(row.id, 'retry')}
                disabled={Boolean(remediatingId) || isPending}
                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10.5px] font-black flex items-center gap-1 transition"
                title="تلاش مجدد برای صدور بلیت"
              >
                {remediatingId === row.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                <span>صدور مجدد</span>
              </button>
            )}

            {(row.type === 'TICKET_NOT_ISSUED' ||
              row.type === 'SUPPLIER_TIMEOUT' ||
              row.type === 'REFUND_TIMEOUT') && (
              <button
                type="button"
                onClick={() => handleRemediate(row.id, 'refund')}
                disabled={Boolean(remediatingId) || isPending}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10.5px] font-black flex items-center gap-1 transition"
                title="استرداد آنی به کیف پول مسافر"
              >
                <Wallet size={12} />
                <span>استرداد کیف پول</span>
              </button>
            )}

            {row.type === 'PAYMENT_MISMATCH' && (
              <button
                type="button"
                onClick={() => handleRemediate(row.id, 'sync')}
                disabled={Boolean(remediatingId) || isPending}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10.5px] font-black flex items-center gap-1 transition"
                title="تطبیق پرداخت با دفترکل"
              >
                <CheckCircle2 size={12} />
                <span>تطبیق پرداخت</span>
              </button>
            )}

            {row.type === 'SUPPLIER_TIMEOUT' && (
              <button
                type="button"
                onClick={() => handleRemediate(row.id, 'poll')}
                disabled={Boolean(remediatingId) || isPending}
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-[10.5px] font-black flex items-center gap-1 transition"
                title="استعلام آخرین وضعیت PNR از تامین‌کننده"
              >
                <RefreshCw size={12} />
                <span>استعلام PNR</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setResolvingId(row.id);
                setResolutionText('');
              }}
              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10.5px] font-black transition"
            >
              حل دستی
            </button>
          </div>
        );
      },
    },
  ];

  const queueTabs: Array<{ id: string; label: string; count: number }> = [
    { id: 'ALL', label: lt(locale, { fa: 'همه موارد', en: 'All Exceptions', ar: 'جميع الاستثناءات', zh: '全部异常', ru: 'Все исключения' }), count: stats.open },
    { id: 'TICKET_NOT_ISSUED', label: lt(locale, { fa: 'بلیط صادرنشده', en: 'Ticket Not Issued', ar: 'تذكرة غير صادرة', zh: '未出票', ru: 'Билет не выписан' }), count: stats.queueCounts.TICKET_NOT_ISSUED },
    { id: 'PAYMENT_MISMATCH', label: lt(locale, { fa: 'مغایرت پرداخت', en: 'Payment Mismatch', ar: 'عدم تطابق الدفع', zh: '支付不一致', ru: 'Расхождение платежа' }), count: stats.queueCounts.PAYMENT_MISMATCH },
    { id: 'SUPPLIER_TIMEOUT', label: lt(locale, { fa: 'تایم‌اوت تأمین‌کننده', en: 'Supplier Timeout', ar: 'انقطاع المورد', zh: '供应商超时', ru: 'Тайм-аут поставщика' }), count: stats.queueCounts.SUPPLIER_TIMEOUT },
    { id: 'REFUND_TIMEOUT', label: lt(locale, { fa: 'تأخیر استرداد', en: 'Refund Timeout', ar: 'تأخر الاسترداد', zh: '退款超时', ru: 'Задержка возврата' }), count: stats.queueCounts.REFUND_TIMEOUT },
    { id: 'PRICE_MISMATCH', label: lt(locale, { fa: 'مغایرت قیمت', en: 'Price Mismatch', ar: 'عدم تطابق السعر', zh: '价格不一致', ru: 'Расхождение цены' }), count: stats.queueCounts.PRICE_MISMATCH },
  ];

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'عملیات · پایش SLA و رفع خودکار', en: 'Operations · SLA & Auto-Remediation', ar: 'العمليات · مراقبة SLA', zh: '运营 · SLA监控与修复', ru: 'Операции · SLA и исправление' })}
        title={lt(locale, { fa: 'مرکز خطا و استثنائات عملیاتی', en: 'Operational Exception Center', ar: 'مركز الاستثناءات', zh: '异常中心', ru: 'Центр исключений' })}
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{lt(locale, { fa: 'صف‌بندی مغایرت‌ها، ارجاع به اپراتور، صدور مجدد و استرداد آنی به کیف پول تحت کنترل SLA', en: 'Queue discrepancies, assign operators, retry issuance and refund under SLA', ar: 'إدارة الاستثناءات والإصلاح الفوري', zh: '异常排队、指派与即时补救', ru: 'Очереди расхождений и немедленное исправление' })}</span>
            <ErpHint label={lt(locale, { fa: 'مهلت SLA چیست؟', en: 'What is the SLA deadline?', ar: 'ما هي مهلة SLA؟', zh: '什么是SLA期限？', ru: 'Что такое деدلاین SLA?' })}>
              {lt(locale, {
                fa: 'حداکثر زمان مجاز برای حل بحران مسافر (بحرانی: ۱۵ دقیقه، بالا: ۶۰ دقیقه، متوسط: ۲۴۰ دقیقه).',
                en: 'Maximum allowed resolution time (Critical: 15m, High: 60m, Medium: 240m).',
                ar: 'أقصى وقت مسموح به لحل مشكلة الراكب.',
                zh: '解决旅客问题的最长时限（严重：15分钟，高：60分钟，中：240分钟）。',
                ru: 'Максимальное время на решение проблемы пассажира.',
              })}
            </ErpHint>
          </span>
        }
        icon={<ShieldCheck size={20} />}
      />

      {feedback && (
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-teal-100 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {stats.breachedSlaCount > 0 && (
        <ErpAlert tone="error">
          {lt(locale, {
            fa: `هشدار نقض SLA: ${stats.breachedSlaCount} مورد از مهلت مقرر گذشته است!`,
            en: `SLA Breach Alert: ${stats.breachedSlaCount} exception(s) exceeded target SLA!`,
            ar: `تحذير تجاوز SLA: ${stats.breachedSlaCount} حالة تجاوزت الوقت!`,
            zh: `SLA违约警告：${stats.breachedSlaCount} 个异常已超时！`,
            ru: `Нарушение SLA: ${stats.breachedSlaCount} случаев превысили срок!`,
          })}
        </ErpAlert>
      )}

      {/* Queue tabs */}
      <ErpTabs
        options={queueTabs}
        value={selectedQueue}
        onChange={setSelectedQueue}
      />

      {/* Main exceptions table */}
      <ERPDataGrid<ExceptionItem>
        data={filteredByQueue}
        columns={columns}
        searchPlaceholder={lt(locale, { fa: 'جستجو در شناسه، عنوان یا مسئول…', en: 'Search ID, title, owner…', ar: 'بحث في المعرف أو العنوان…', zh: '搜索ID、标题或负责人…', ru: 'Поиск…' })}
        emptyStateMessage={lt(locale, { fa: 'هیچ مورد خطایی در این صف یافت نشد.', en: 'No exceptions in this queue.', ar: 'لا توجد استثناءات.', zh: '此队列中无异常。', ru: 'В этой очереди нет исключений.' })}
        defaultPageSize={20}
      />
    </div>
  );
}
