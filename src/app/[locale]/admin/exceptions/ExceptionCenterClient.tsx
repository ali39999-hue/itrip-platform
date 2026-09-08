'use client';

import React, { useState, useTransition } from 'react';
import {
  Clock,
  UserCheck,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';
import { ERPDataGrid, ColumnDef } from '@/components/admin/ERPDataGrid';
import { ErpAlert, ErpHint, ErpPageHeader, ErpTabs } from '@/components/admin/erp-ui';
import { ExceptionStats } from '@/domains/erp/ExceptionCenterService';
import { assignException, resolveException } from '@/actions/admin';
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
  const [ownerInput, setOwnerInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

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
    if (!ownerInput.trim()) return;
    startTransition(async () => {
      try {
        await assignException(id, ownerInput.trim());
        setFeedback(lt(locale, { fa: `مورد به ${ownerInput.trim()} ارجاع شد.`, en: `Exception assigned to ${ownerInput.trim()}.`, ar: `تم تعيين الاستثناء إلى ${ownerInput.trim()}.`, zh: `异常已指派给 ${ownerInput.trim()}。`, ru: `Исключение назначено: ${ownerInput.trim()}.` }));
        setAssigningId(null);
        setOwnerInput('');
      } catch (err: unknown) {
        setFeedback(`${lt(locale, { fa: 'خطا در ارجاع:', en: 'Failed to assign:', ar: 'فشل التعيين:', zh: '指派失败：', ru: 'Не удалось назначить:' })} ${err instanceof Error ? err.message : String(err)}`);
      }
    });
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
          <div className="text-[11px] text-sub font-mono">
            {row.entityType}: {row.entityId}
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
              <input
                type="text"
                value={ownerInput}
                onChange={(e) => setOwnerInput(e.target.value)}
                placeholder={lt(locale, { fa: 'شناسه مسئول', en: 'Owner ID', ar: 'معرف المسؤول', zh: '负责人ID', ru: 'ID ответственного' })}
                aria-label={lt(locale, { fa: 'شناسه مسئول', en: 'Owner ID', ar: 'معرف المسؤول', zh: '负责人ID', ru: 'ID ответственного' })}
                className="w-24 min-h-9 px-2 rounded-lg border border-line text-[11px]"
              />
              <button
                type="button"
                onClick={() => handleAssign(row.id)}
                disabled={isPending}
                aria-label={lt(locale, { fa: 'تأیید ارجاع', en: 'Confirm assignment', ar: 'تأكيد التعيين', zh: '确认指派', ru: 'Подтвердить назначение' })}
                className="min-w-9 min-h-9 grid place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50"
              >
                <Check size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setAssigningId(null)}
                aria-label={lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                className="min-w-9 min-h-9 grid place-items-center rounded-lg text-sub hover:text-ink hover:bg-soft"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="font-medium text-[11px]">{row.ownerId || lt(locale, { fa: 'بدون مسئول', en: 'Unassigned', ar: 'غير معين', zh: '未指派', ru: 'Не назначен' })}</span>
              <button
                type="button"
                onClick={() => {
                  setAssigningId(row.id);
                  setOwnerInput(row.ownerId || '');
                }}
                aria-label={lt(locale, { fa: 'ارجاع به اپراتور', en: 'Assign operator', ar: 'تعيين موظف', zh: '指派运营人员', ru: 'Назначить оператора' })}
                className="min-w-9 min-h-9 grid place-items-center rounded-lg text-sub hover:text-ink hover:bg-soft"
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
        { label: `${lt(locale, { fa: 'باز', en: 'Open', ar: 'مفتوح', zh: '待处理', ru: 'Открыт' })} (OPEN)`, value: 'OPEN' },
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
      header: lt(locale, { fa: 'اقدام', en: 'Actions', ar: 'الإجراءات', zh: '操作', ru: 'Действия' }),
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
                className="min-w-9 min-h-9 grid place-items-center rounded-lg text-sub hover:text-ink hover:bg-soft"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        }

        return (
          <button
            type="button"
            onClick={() => {
              setResolvingId(row.id);
              setResolutionText('');
            }}
            className="min-h-9 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition"
          >
            {lt(locale, { fa: 'حل کردن', en: 'Resolve', ar: 'حل', zh: '解决', ru: 'Решить' })}
          </button>
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
        eyebrow={lt(locale, { fa: 'عملیات · پایش SLA', en: 'Operations · SLA watch', ar: 'العمليات · مراقبة SLA', zh: '运营 · SLA监控', ru: 'Операции · SLA' })}
        title={lt(locale, { fa: 'مرکز خطا و استثنائات', en: 'Exception Center', ar: 'مركز الاستثناءات', zh: '异常中心', ru: 'Центр исключений' })}
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{lt(locale, { fa: 'صف‌بندی مغایرت‌ها، ارجاع به اپراتور و حل با اعمال SLA', en: 'Queue discrepancies, assign operators and resolve under SLA', ar: 'إدارة الاستثناءات وتعيين المشغلين', zh: '异常排队、指派与SLA解决', ru: 'Очереди расхождений и решение по SLA' })}</span>
            <ErpHint label={lt(locale, { fa: 'مهلت SLA چیست؟', en: 'What is the SLA deadline?', ar: 'ما هي مهلة SLA؟', zh: '什么是SLA期限？', ru: 'Что такое дедлайн SLA?' })}>
              {lt(locale, {
                fa: 'مهلت توافق‌شده برای حل هر خطا. وقتی شمارش معکوس تمام شود یعنی قول‌مان به مسافر عقب افتاده — اول قرمزها را ببندید!',
                en: 'The agreed time limit for fixing each issue. When the countdown runs out, our promise to the traveler is overdue — close the red ones first!',
                ar: 'المهلة المتفق عليها لحل كل مشكلة. عند انتهاء العد التنازلي تأخرنا عن وعدنا — ابدأ بالحمراء!',
                zh: '解决每个问题的约定时间内。倒计时结束意味着我们对旅客失约 — 先处理红色项！',
                ru: 'Согласованный срок решения каждой проблемы. Обратный отсчёт истёк — обещание нарушено: сначала красные!',
              })}
            </ErpHint>
          </span>
        }
        icon={<ShieldCheck size={20} aria-hidden="true" />}
      />

      {feedback && (
        <ErpAlert tone="info" onDismiss={() => setFeedback(null)} dismissLabel={lt(locale, { fa: 'بستن', en: 'Dismiss', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}>
          {feedback}
        </ErpAlert>
      )}

      <ErpTabs
        ariaLabel={lt(locale, { fa: 'صف‌های استثنا', en: 'Exception queues', ar: 'قوائم الاستثناءات', zh: '异常队列', ru: 'Очереди исключений' })}
        value={selectedQueue}
        onChange={setSelectedQueue}
        options={queueTabs.map((q) => ({ id: q.id, label: q.label, count: q.count }))}
      />

      {stats.breachedSlaCount > 0 && (
        <ErpAlert tone="error">
          {lt(locale, {
            fa: `${stats.breachedSlaCount} مورد از مهلت SLA عبور کرده‌اند و نیاز به اقدام فوری اپراتور دارند.`,
            en: `${stats.breachedSlaCount} exceptions have breached their SLA deadline and require immediate operator intervention.`,
            ar: `تجاوز ${stats.breachedSlaCount} استثناءً موعد SLA ويتطلب تدخلاً فوريًا.`,
            zh: `${stats.breachedSlaCount} 项异常已超过SLA期限，需要立即处理。`,
            ru: `${stats.breachedSlaCount} исключений нарушили SLA — требуется немедленное вмешательство.`,
          })}
        </ErpAlert>
      )}

      {/* Reusable ERPDataGrid for Exceptions (ERP-105) */}
      <ERPDataGrid<ExceptionItem>
        data={filteredByQueue}
        columns={columns}
        idAccessor={(row) => row.id}
        title={queueTabs.find((q) => q.id === selectedQueue)?.label ?? selectedQueue.replace(/_/g, ' ')}
        description={lt(locale, { fa: 'فیلتر، مرتب‌سازی و مدیریت مغایرت‌ها با اعمال SLA', en: 'Filter, sort and resolve discrepancies under SLA', ar: 'تصفية وترتيب الاستثناءات', zh: '筛选、排序并解决异常', ru: 'Фильтр и решение расхождений' })}
        savedViewStorageKey="exception_center_views"
      />
    </div>
  );
}
