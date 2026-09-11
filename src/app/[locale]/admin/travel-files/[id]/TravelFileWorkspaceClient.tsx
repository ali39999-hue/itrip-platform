'use client';

import React, { useState, useTransition } from 'react';
import {
  Briefcase,
  User,
  Plane,
  Hotel,
  Clock,
  FileText,
  AlertTriangle,
  CreditCard,
  Receipt,
  RotateCcw,
  CheckCircle2,
  MessageSquare,
  Send,
  ExternalLink,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import {
  TravelFileDetailView,
  TimelineDomain,
  TimelineSeverity,
  TravelFileService,
} from '@/domains/erp/TravelFileService';
import {
  addTravelFileNote,
  assignTravelFileOperator,
  updateTravelFileStatus,
  issueTravelFileInvoice,
  triggerTravelFileRefund,
  resolveException,
} from '@/actions/admin';
import { lt } from '@/lib/lt';
import { ErpAlert, ErpTabs } from '@/components/admin/erp-ui';

export function TravelFileWorkspaceClient({
  data,
  locale,
}: {
  data: TravelFileDetailView;
  locale: string;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'exceptions' | 'payments' | 'actions'>('overview');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  // Timeline filtering states (ERP-107)
  const [selectedDomain, setSelectedDomain] = useState<TimelineDomain | 'ALL'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<TimelineSeverity | 'ALL'>('ALL');

  // Action states (ERP-102)
  const [noteText, setNoteText] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(data.trip.status);
  const [refundBookingId, setRefundBookingId] = useState(data.bookings[0]?.id || '');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundPenalty, setRefundPenalty] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');

  // Exception resolution state (ERP-103)
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  // Two-step refund arming: first tap arms, second tap executes.
  const [refundArmed, setRefundArmed] = useState(false);

  // Compute filtered timeline
  const filteredTimeline = TravelFileService.filterTimeline(data.timeline, {
    domains: selectedDomain === 'ALL' ? undefined : [selectedDomain],
    severity: selectedSeverity === 'ALL' ? undefined : [selectedSeverity],
  });

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    startTransition(async () => {
      try {
        await addTravelFileNote(data.trip.id, noteText.trim());
        setFeedback('Note recorded successfully in dossier timeline.');
        setNoteText('');
      } catch (err: unknown) {
        setFeedback(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleAssignOperator = () => {
    if (!operatorId.trim()) return;
    startTransition(async () => {
      try {
        await assignTravelFileOperator(data.trip.id, operatorId.trim());
        setFeedback(`Operator ${operatorId} successfully assigned.`);
        setOperatorId('');
      } catch (err: unknown) {
        setFeedback(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleUpdateStatus = () => {
    startTransition(async () => {
      try {
        await updateTravelFileStatus(data.trip.id, selectedStatus as 'PLANNING' | 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED');
        setFeedback(`Travel file status updated to ${selectedStatus}.`);
      } catch (err: unknown) {
        setFeedback(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleIssueInvoice = (bookingId: string) => {
    startTransition(async () => {
      try {
        const res = await issueTravelFileInvoice(data.trip.id, bookingId);
        setFeedback(`Invoice ${res.invoiceNumber} issued successfully.`);
      } catch (err: unknown) {
        setFeedback(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleTriggerRefund = () => {
    if (!refundBookingId || !refundReason.trim()) return;
    // First tap only arms the button — the money moves on the second tap.
    if (!refundArmed) {
      setRefundArmed(true);
      return;
    }
    setRefundArmed(false);
    startTransition(async () => {
      try {
        const res = await triggerTravelFileRefund(data.trip.id, refundBookingId, {
          amount: refundAmount > 0 ? refundAmount : undefined,
          penalty: refundPenalty > 0 ? refundPenalty : 0,
          reason: refundReason.trim(),
        });
        setFeedback(`Refund ${res.refundNumber} initiated for booking.`);
        setRefundReason('');
      } catch (err: unknown) {
        setFeedback(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  // Changing any refund input disarms the button again — the operator must
  // re-confirm exactly what they see.
  const disarmRefund = () => {
    if (refundArmed) setRefundArmed(false);
  };

  const handleResolveException = (excId: string) => {
    if (!resolutionText.trim()) return;
    startTransition(async () => {
      try {
        await resolveException(excId, resolutionText.trim());
        setFeedback('Exception resolved successfully.');
        setResolvingId(null);
        setResolutionText('');
      } catch (err: unknown) {
        setFeedback(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <ErpAlert tone="info" onDismiss={() => setFeedback(null)}>
          {feedback}
        </ErpAlert>
      )}

      <ErpTabs<'overview' | 'timeline' | 'exceptions' | 'payments' | 'actions'>
        ariaLabel="Dossier sections"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { id: 'overview', label: lt(locale, { fa: 'خلاصه و رزروها', en: 'Overview & Bookings', ar: 'نظرة عامة', zh: '概览与预订', ru: 'Обзор и брони' }), count: data.bookings.length, icon: <Briefcase size={14} aria-hidden="true" /> },
          { id: 'timeline', label: lt(locale, { fa: 'تایم‌لاین', en: 'Timeline', ar: 'الجدول الزمني', zh: '时间线', ru: 'Хронология' }), count: data.timeline.length, icon: <Clock size={14} aria-hidden="true" /> },
          { id: 'exceptions', label: lt(locale, { fa: 'استثنائات', en: 'Exceptions', ar: 'الاستثناءات', zh: '异常', ru: 'Исключения' }), count: data.summary.activeExceptionsCount, icon: <AlertTriangle size={14} aria-hidden="true" /> },
          { id: 'payments', label: lt(locale, { fa: 'پرداخت و فاکتور', en: 'Payments & Invoices', ar: 'المدفوعات والفواتير', zh: '支付与发票', ru: 'Платежи и счета' }), icon: <CreditCard size={14} aria-hidden="true" /> },
          { id: 'actions', label: lt(locale, { fa: 'عملیات و یادداشت', en: 'Actions & Notes', ar: 'الإجراءات', zh: '操作与附注', ru: 'Действия' }), icon: <MessageSquare size={14} aria-hidden="true" /> },
        ]}
      />

      {/* TAB 1: OVERVIEW & BOOKINGS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-ink flex items-center gap-2">
                  <Briefcase size={18} className="text-brand-dark" />
                  <span>{lt(locale, { fa: 'رزروها و خدمات پیوست‌شده', en: 'Booked Items & Services', ar: 'الخدمات المحجوزة', zh: '已预订服务', ru: 'Забронированные услуги' })}</span>
                </h3>
                <span className="text-xs font-bold text-sub">
                  {data.bookings.length} {lt(locale, { fa: 'رزرو', en: 'Bookings', ar: 'حجوزات', zh: '项', ru: 'броней' })}
                </span>
              </div>

              {data.bookings.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-soft/50 border border-line/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-brand-dark">{b.reference}</span>
                      {b.externalPnr && (
                        <span className="ms-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          PNR: {b.externalPnr}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-surface text-ink border border-line">
                        {b.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-soft text-sub">
                        Ticket: {b.ticketStatus}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {b.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs py-1 border-t border-line/40">
                        <div className="flex items-center gap-2">
                          {item.type === 'FLIGHT' ? (
                            <Plane size={14} className="text-brand-dark" />
                          ) : (
                            <Hotel size={14} className="text-brand-dark" />
                          )}
                          <span className="font-bold text-ink">{item.type}</span>
                          <span className="text-sub">({item.supplierName || 'Standard Supplier'})</span>
                        </div>
                        <span className="font-black text-ink">
                          {Number(item.sellPrice).toLocaleString()} {b.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Travelers Sidebar */}
          <div className="space-y-6">
            <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-ink flex items-center gap-2">
                <User size={18} className="text-brand-dark" />
                <span>{lt(locale, { fa: 'مشتری اصلی', en: 'Primary Customer', ar: 'العميل الرئيسي', zh: '主要客户', ru: 'Основной клиент' })}</span>
              </h3>
              <div className="space-y-2 text-xs text-sub">
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span>{lt(locale, { fa: 'نام:', en: 'Name:', ar: 'الاسم:', zh: '姓名:', ru: 'Имя:' })}</span>
                  <span className="font-black text-ink">{data.customer.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span>{lt(locale, { fa: 'شماره تماس:', en: 'Phone:', ar: 'الهاتف:', zh: '电话:', ru: 'Телефон:' })}</span>
                  <span className="font-bold text-ink" dir="ltr">{data.customer.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span>{lt(locale, { fa: 'ایمیل:', en: 'Email:', ar: 'البريد:', zh: '邮箱:', ru: 'Email:' })}</span>
                  <span className="font-bold text-ink truncate max-w-[150px]">{data.customer.email || 'N/A'}</span>
                </div>
                {data.customer.id && (
                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/admin/users/${data.customer.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-black text-brand-dark hover:underline"
                    >
                      <span>{lt(locale, { fa: 'مشاهده پروفایل ۳۶۰° مشتری', en: 'View Customer 360°' })}</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Travelers & Documents */}
            <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-ink flex items-center gap-2">
                <FileText size={18} className="text-brand-dark" />
                <span>{lt(locale, { fa: 'مسافران و اسناد سفر', en: 'Travelers & Documents', ar: 'المسافرون والوثائق', zh: '旅客与证件', ru: 'Пассажиры и документы' })}</span>
              </h3>
              {data.customer.travelerProfiles.length === 0 ? (
                <p className="text-xs text-sub">No separate traveler profile registered.</p>
              ) : (
                <div className="space-y-3">
                  {data.customer.travelerProfiles.map((tp) => (
                    <div key={tp.id} className="p-3 rounded-2xl bg-soft/50 border border-line/70 text-xs space-y-1.5">
                      <div className="font-black text-ink flex items-center justify-between">
                        <span>{tp.firstName} {tp.lastName}</span>
                        <span className="text-[10px] text-sub">{tp.nationality}</span>
                      </div>
                      {tp.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-[11px] text-sub pt-1 border-t border-line/40">
                          <span className="font-bold">{doc.type}:</span>
                          <span className="font-mono font-black text-ink">{doc.documentNumber}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMELINE & OPERATIONAL AUDIT (ERP-107) */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Domain & Severity Filter Bar */}
          <div className="bg-surface rounded-2xl border border-line p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-sub me-1">Domain:</span>
              {(['ALL', 'LIFECYCLE', 'PAYMENT', 'REFUND', 'INVENTORY', 'AUDIT', 'SUPPLIER'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDomain(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    selectedDomain === d
                      ? 'bg-brand-dark text-surface'
                      : 'bg-soft text-sub hover:text-ink'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-sub me-1">Severity:</span>
              {(['ALL', 'INFO', 'WARNING', 'CRITICAL'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSeverity(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    selectedSeverity === s
                      ? s === 'CRITICAL'
                        ? 'bg-rose-600 text-white'
                        : s === 'WARNING'
                        ? 'bg-amber-500 text-white'
                        : 'bg-brand-dark text-surface'
                      : 'bg-soft text-sub hover:text-ink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline List */}
          <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-3">
            {filteredTimeline.length === 0 ? (
              <p className="text-xs text-sub text-center py-8">No timeline events matching active filters.</p>
            ) : (
              filteredTimeline.map((item) => {
                const isCritical = item.severity === 'CRITICAL';
                const isWarning = item.severity === 'WARNING';
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
                      isCritical
                        ? 'bg-rose-50/60 border-rose-200'
                        : isWarning
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-soft/40 border-line/60'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                        isCritical ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-brand-dark'
                      }`}
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-ink">{item.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-line">
                            {item.domain}
                          </span>
                        </div>
                        <span className="text-sub text-[11px]">
                          {new Date(item.timestamp).toLocaleString(locale)}
                        </span>
                      </div>
                      {item.description && <p className="text-sub mt-1">{item.description}</p>}
                      {item.actor && (
                        <span className="inline-block text-[10px] text-brand-dark font-bold mt-1">
                          Actor: {item.actor}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EXCEPTIONS & SLA PANEL (ERP-103) */}
      {activeTab === 'exceptions' && (
        <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-ink flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span>{lt(locale, { fa: 'استثنائات فعال پرونده و پایش SLA', en: 'Active Exceptions & SLA Tracking', ar: 'الاستثناءات ومتابعة SLA', zh: '活跃异常与SLA监控', ru: 'Исключения и мониторинг SLA' })}</span>
            </h3>
            <span className="text-xs font-bold text-sub">
              {data.exceptions.length} Total Registered
            </span>
          </div>

          {data.exceptions.length === 0 ? (
            <div className="text-center py-8 text-sub text-xs space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
              <p className="font-bold text-ink">No operational exceptions for this travel file.</p>
              <p>All bookings, tickets, and payment validations are fully reconciled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.exceptions.map((exc) => {
                const isBreached = exc.slaStatus === 'BREACHED';
                const isWarning = exc.slaStatus === 'APPROACHING_BREACH';
                return (
                  <div
                    key={exc.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isBreached
                        ? 'bg-rose-50/80 border-rose-300'
                        : isWarning
                        ? 'bg-amber-50/80 border-amber-300'
                        : 'bg-soft/40 border-line/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-ink text-surface text-[11px] font-black">
                          {exc.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            exc.severity === 'CRITICAL' || exc.severity === 'HIGH'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {exc.severity}
                        </span>
                        <span className="font-bold text-xs text-ink">{exc.title}</span>
                      </div>

                      {/* SLA Countdown Badge */}
                      <div className="flex items-center gap-2">
                        {exc.slaDueAt && (
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                              isBreached
                                ? 'bg-rose-600 text-white'
                                : isWarning
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            <Clock size={12} />
                            {isBreached
                              ? `SLA BREACHED (${Math.abs(exc.slaRemainingMinutes || 0)}m ago)`
                              : `SLA Due in ${exc.slaRemainingMinutes}m`}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-surface border border-line">
                          {exc.status}
                        </span>
                      </div>
                    </div>

                    {exc.description && <p className="text-xs text-sub">{exc.description}</p>}

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-line/50">
                      <div className="flex items-center gap-2 text-sub">
                        <span>Owner:</span>
                        <span className="font-bold text-ink">{exc.ownerId || 'Unassigned'}</span>
                      </div>

                      {exc.status !== 'RESOLVED' && exc.status !== 'CLOSED' && (
                        <div className="flex items-center gap-2 ms-auto">
                          {resolvingId === exc.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={resolutionText}
                                onChange={(e) => setResolutionText(e.target.value)}
                                placeholder="Resolution notes..."
                                className="px-2.5 py-1 rounded-lg bg-surface border border-line text-xs font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => handleResolveException(exc.id)}
                                disabled={isPending || !resolutionText.trim()}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setResolvingId(null)}
                                className="px-2 py-1 text-sub hover:text-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingId(exc.id);
                                setResolutionText('');
                              }}
                              className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-200 transition"
                            >
                              Resolve Exception
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYMENTS & INVOICES */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payments Section */}
          <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-ink flex items-center gap-2">
              <CreditCard size={18} className="text-brand-dark" />
              <span>Payments ({data.payments.length})</span>
            </h3>
            {data.payments.length === 0 ? (
              <p className="text-xs text-sub">No payment records registered for this dossier.</p>
            ) : (
              <div className="space-y-3">
                {data.payments.map((p) => (
                  <div key={p.id} className="p-3.5 rounded-2xl bg-soft/50 border border-line/70 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">{p.method}</span>
                      <span className="font-black text-brand-dark">
                        {p.amount.toLocaleString()} {p.currency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sub text-[11px]">
                      <span>Status: {p.status}</span>
                      <span>{new Date(p.createdAt).toLocaleDateString(locale)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices Section */}
          <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-ink flex items-center gap-2">
              <Receipt size={18} className="text-brand-dark" />
              <span>Invoices ({data.invoices.length})</span>
            </h3>
            {data.invoices.length === 0 ? (
              <div className="space-y-3 text-xs text-sub">
                <p>No commercial invoices issued yet.</p>
                {data.bookings.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleIssueInvoice(b.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-surface font-bold hover:bg-brand-dark transition"
                  >
                    <Receipt size={13} />
                    <span>Issue Invoice for {b.reference}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data.invoices.map((inv) => (
                  <div key={inv.id} className="p-3.5 rounded-2xl bg-soft/50 border border-line/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-ink">{inv.invoiceNumber}</span>
                      <span className="font-black text-brand-dark">
                        {Number(inv.totalAmount).toLocaleString()} {inv.currency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sub text-[11px] pt-1 border-t border-line/40">
                      <span>Status: {inv.status} | {new Date(inv.issuedAt).toLocaleDateString(locale)}</span>
                      <Link
                        href={`/invoices/${inv.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] font-black text-brand-dark hover:underline"
                      >
                        <span>صورتحساب رسمی</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AUTHORIZED ACTIONS & NOTES (ERP-102) */}
      {activeTab === 'actions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Note & Status Actions */}
          <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-ink flex items-center gap-2">
              <MessageSquare size={18} className="text-brand-dark" />
              <span>Add Dossier Note</span>
            </h3>
            <div className="space-y-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter operational note for audit timeline..."
                rows={3}
                className="w-full p-3 rounded-xl bg-soft border border-line text-xs font-medium focus:outline-none focus:border-brand-dark"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={isPending || !noteText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-surface font-black text-xs hover:bg-brand-dark transition disabled:opacity-50"
              >
                <Send size={13} />
                <span>Save Note</span>
              </button>
            </div>

            <div className="pt-4 border-t border-line/60 space-y-3">
              <h4 className="text-xs font-black text-ink">Update Travel File Status</h4>
              <div className="flex items-center gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-soft border border-line text-xs font-bold"
                >
                  <option value="PLANNING">PLANNING</option>
                  <option value="BOOKED">BOOKED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={isPending || selectedStatus === data.trip.status}
                  className="px-4 py-2 rounded-xl bg-brand-dark text-surface font-black text-xs hover:bg-brand transition disabled:opacity-50"
                >
                  Update Status
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-line/60 space-y-3">
              <h4 className="text-xs font-black text-ink">Assign Operator</h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  placeholder="Operator ID..."
                  className="flex-1 px-3 py-2 rounded-xl bg-soft border border-line text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={handleAssignOperator}
                  disabled={isPending || !operatorId.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-dark text-surface font-black text-xs hover:bg-brand transition disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>

          {/* Refund & Invoice Triggers */}
          <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-ink flex items-center gap-2">
              <RotateCcw size={18} className="text-brand-dark" />
              <span>{lt(locale, { fa: 'استرداد وجه رزرو', en: 'Trigger Booking Refund', ar: 'استرداد مبلغ الحجز', zh: '触发订单退款', ru: 'Возврат по брони' })}</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-sub mb-1">Target Booking</label>
                <select
                  value={refundBookingId}
                  onChange={(e) => { setRefundBookingId(e.target.value); disarmRefund(); }}
                  className="w-full px-3 py-2 rounded-xl bg-soft border border-line text-xs font-bold"
                >
                  {data.bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.reference} ({Number(b.totalAmount).toLocaleString()} {b.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-sub mb-1">Refund Amount (0 for full)</label>
                  <input
                    type="number"
                    value={refundAmount || ''}
                    onChange={(e) => { setRefundAmount(Number(e.target.value)); disarmRefund(); }}
                    placeholder="Full amount"
                    className="w-full px-3 py-2 rounded-xl bg-soft border border-line text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-sub mb-1">Penalty Amount</label>
                  <input
                    type="number"
                    value={refundPenalty || ''}
                    onChange={(e) => { setRefundPenalty(Number(e.target.value)); disarmRefund(); }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-soft border border-line text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-sub mb-1">Reason / Authorization Note</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => { setRefundReason(e.target.value); disarmRefund(); }}
                  placeholder="e.g. Customer cancellation request under flexible policy"
                  className="w-full px-3 py-2 rounded-xl bg-soft border border-line text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerRefund}
                  disabled={isPending || !refundReason.trim()}
                  aria-live="polite"
                  title={refundArmed ? 'یک بار دیگر بزنید تا وجه واقعاً برگردد' : 'ابتدا مسلح می‌شود، با زدن دوباره اجرا می‌شود'}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-warm ${refundArmed ? 'bg-deep text-surface hover:bg-brand-dark' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                >
                  {refundArmed
                    ? lt(locale, { fa: 'مطمئنید؟ دوباره بزنید تا اجرا شود', en: 'Sure? Tap again to execute', ar: 'متأكد؟ اضغط مرة أخرى للتنفيذ', zh: '确定？再点一次执行', ru: 'Точно? Нажмите ещё раз' })
                    : lt(locale, { fa: 'ثبت استرداد مجاز', en: 'Trigger Authorized Refund', ar: 'تنفيذ الاسترداد المعتمد', zh: '触发授权退款', ru: 'Запустить возврат' })}
                </button>
                {refundArmed && !isPending && (
                  <button
                    type="button"
                    onClick={() => setRefundArmed(false)}
                    aria-label={lt(locale, { fa: 'انصراف از استرداد', en: 'Cancel refund', ar: 'إلغاء الاسترداد', zh: '取消退款', ru: 'Отменить возврат' })}
                    className="min-h-10 min-w-10 grid place-items-center rounded-xl border border-line text-sub hover:text-ink transition"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-sub">
                {lt(locale, { fa: 'استرداد دو مرحله‌ای است: بار اول فقط آماده می‌شود تا اشتباهی پول برنگردد.', en: 'Refund is two-step: the first tap only arms it, so money never moves by accident.', ar: 'الاسترداد من خطوتين: الضغطة الأولى للتجهيز فقط.', zh: '退款分两步：第一次点击仅为确认预备，防止误操作。', ru: 'Возврат в два шага: первое нажатие только готовит.' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
