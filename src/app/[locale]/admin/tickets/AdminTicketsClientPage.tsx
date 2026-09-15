'use client';

import { useState, useTransition } from 'react';
import {
  MessageSquareQuote, Search, Send, CheckCircle2, Clock,
  AlertCircle, ChevronRight, RefreshCw, User, Phone, Mail,
  Ticket, Tag, ArrowUpRight, ShieldCheck, CheckCheck
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { Input } from '@/components/ui/input';
import { ErpBadge, ErpEmptyState, ErpPageHeader, ErpSectionCard } from '@/components/admin/erp-ui';
import {
  getAdminTicketsAction,
  getTicketDetailsAction,
  addTicketReplyAction,
  updateAdminTicketStatusAction,
} from '@/actions/tickets';
import type {
  SupportTicketRecord,
  TicketSummaryItem,
  TicketStatus,
  TicketPriority,
} from '@/domains/tickets/TicketDomainService';

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: { fa: string; en: string }; tone: 'gold' | 'rose' | 'green' | 'neutral' | 'blue' }
> = {
  OPEN: { label: { fa: 'جدید / باز', en: 'Open' }, tone: 'rose' },
  IN_PROGRESS: { label: { fa: 'در حال بررسی', en: 'In Progress' }, tone: 'gold' },
  WAITING_USER: { label: { fa: 'منتظر پاسخ کاربر', en: 'Waiting Customer' }, tone: 'blue' },
  RESOLVED: { label: { fa: 'رسیدگی شده', en: 'Resolved' }, tone: 'green' },
  CLOSED: { label: { fa: 'بسته شده', en: 'Closed' }, tone: 'neutral' },
};

const PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: { fa: string; en: string }; tone: 'rose' | 'gold' | 'neutral' }
> = {
  URGENT: { label: { fa: 'فوری / بحرانی', en: 'Urgent' }, tone: 'rose' },
  HIGH: { label: { fa: 'اولویت بالا', en: 'High' }, tone: 'rose' },
  MEDIUM: { label: { fa: 'عادی', en: 'Medium' }, tone: 'gold' },
  LOW: { label: { fa: 'کم‌اهمیت', en: 'Low' }, tone: 'neutral' },
};

export function AdminTicketsClientPage({
  initialTickets,
  initialCounts,
  locale,
}: {
  initialTickets: TicketSummaryItem[];
  initialCounts: { total: number; open: number; inProgress: number; waitingUser: number; resolved: number };
  locale: string;
}) {
  const [tickets, setTickets] = useState<TicketSummaryItem[]>(initialTickets);
  const [counts, setCounts] = useState(initialCounts);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTickets[0]?.id || null
  );
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketRecord | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isPending, startTransition] = useTransition();

  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

  // Load ticket details on selection
  async function loadTicketDetails(id: string) {
    setSelectedTicketId(id);
    setLoadingDetails(true);
    const res = await getTicketDetailsAction(id);
    setLoadingDetails(false);
    if (res.success && res.ticket) {
      setSelectedTicket(res.ticket);
    }
  }

  // Reload ticket list with current filters
  function refreshList() {
    startTransition(async () => {
      const res = await getAdminTicketsAction({
        status: statusFilter,
        category: categoryFilter,
        search: search.trim() || undefined,
      });
      if (res.success) {
        setTickets(res.tickets);
        setCounts(res.counts);
      }
    });
  }

  // Handle staff reply
  async function handleSendReply() {
    if (!selectedTicketId || !replyText.trim()) return;
    setIsReplying(true);
    const res = await addTicketReplyAction(selectedTicketId, replyText.trim());
    setIsReplying(false);
    if (res.success) {
      setReplyText('');
      await loadTicketDetails(selectedTicketId);
      refreshList();
    }
  }

  // Handle status update
  async function handleStatusChange(newStatus: TicketStatus) {
    if (!selectedTicketId) return;
    const res = await updateAdminTicketStatusAction({
      ticketId: selectedTicketId,
      status: newStatus,
    });
    if (res.success) {
      await loadTicketDetails(selectedTicketId);
      refreshList();
    }
  }

  // Handle priority update
  async function handlePriorityChange(newPriority: TicketPriority) {
    if (!selectedTicketId) return;
    const res = await updateAdminTicketStatusAction({
      ticketId: selectedTicketId,
      priority: newPriority,
    });
    if (res.success) {
      await loadTicketDetails(selectedTicketId);
      refreshList();
    }
  }

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, {
          fa: 'عملیات · پشتیبانی و مشتریان',
          en: 'Operations · Support & Concierge',
          ar: 'العمليات · الدعم الفني',
          zh: '运营 · 客服支持',
          ru: 'Операции · Поддержка клиентов',
        })}
        title={lt(locale, {
          fa: 'میز کار تیکت‌های پشتیبانی',
          en: 'Support Tickets Desk',
          ar: 'مكتب تذاكر الدعم',
          zh: '客服工单工作台',
          ru: 'Пульт обращений поддержки',
        })}
        description={lt(locale, {
          fa: 'مدیریت و پاسخگویی به درخواست‌های مسافران، پیگیری استردادها و هماهنگی رزروها',
          en: 'Manage customer support requests, refund inquiries and flight/hotel coordination',
          ar: 'إدارة الردود على استفسارات المسافرين وتنسيق الحجوزات',
          zh: '管理旅客客服诉求、退订问询及行程协调',
          ru: 'Обработка обращений клиентов, запросов на возврат и координация',
        })}
        icon={<MessageSquareQuote size={20} aria-hidden="true" />}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <ErpBadge tone={counts.open > 0 ? 'rose' : 'green'} dot>
              {counts.open.toLocaleString(numFmt)} {lt(locale, { fa: 'باز / جدید', en: 'open', ar: 'مفتوحة', zh: '待处理', ru: 'новых' })}
            </ErpBadge>
            <ErpBadge tone={counts.waitingUser > 0 ? 'blue' : 'neutral'}>
              {counts.waitingUser.toLocaleString(numFmt)} {lt(locale, { fa: 'منتظر کاربر', en: 'waiting customer', ar: 'في انتظار العميل', zh: '等待回复', ru: 'ждут клиента' })}
            </ErpBadge>
            <ErpBadge tone="neutral">
              {counts.total.toLocaleString(numFmt)} {lt(locale, { fa: 'کل تیکت‌ها', en: 'total', ar: 'الإجمالي', zh: '全部工单', ru: 'всего' })}
            </ErpBadge>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-surface rounded-2xl border border-line shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refreshList()}
              placeholder={lt(locale, {
                fa: 'جستجو با شماره تیکت، نام مسافر، شماره تماس یا کد رزرو...',
                en: 'Search ticket #, passenger name, phone or booking ref...',
                ar: 'بحث برقم التذكرة أو الاسم أو الهاتف...',
                zh: '搜索工单号、旅客姓名、手机号或预订号...',
                ru: 'Поиск по номеру, имени, телефону или коду...',
              })}
              className="ps-9 h-10 text-xs rounded-xl"
            />
          </div>
          <button
            type="button"
            onClick={refreshList}
            disabled={isPending}
            className="h-10 px-3.5 rounded-xl bg-soft hover:bg-line/50 text-ink text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={isPending ? 'animate-spin' : ''} />
            <span>{lt(locale, { fa: 'اعمال فیلتر', en: 'Apply', ar: 'تطبيق', zh: '筛选', ru: 'Применить' })}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              startTransition(async () => {
                const res = await getAdminTicketsAction({
                  status: e.target.value,
                  category: categoryFilter,
                  search: search.trim() || undefined,
                });
                if (res.success) {
                  setTickets(res.tickets);
                  setCounts(res.counts);
                }
              });
            }}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink"
          >
            <option value="ALL">{lt(locale, { fa: 'همه وضعیت‌ها', en: 'All Statuses', ar: 'كل الحالات', zh: '全部状态', ru: 'Все статусы' })}</option>
            <option value="OPEN">{lt(locale, { fa: 'جدید / باز (OPEN)', en: 'Open', ar: 'مفتوحة', zh: '待处理', ru: 'Новые' })}</option>
            <option value="IN_PROGRESS">{lt(locale, { fa: 'در حال بررسی (IN_PROGRESS)', en: 'In Progress', ar: 'قيد المتابعة', zh: '处理中', ru: 'В работе' })}</option>
            <option value="WAITING_USER">{lt(locale, { fa: 'منتظر کاربر (WAITING_USER)', en: 'Waiting Customer', ar: 'في انتظار العميل', zh: '等待回复', ru: 'Ждут клиента' })}</option>
            <option value="RESOLVED">{lt(locale, { fa: 'رسیدگی شده (RESOLVED)', en: 'Resolved', ar: 'تم الحل', zh: '已解决', ru: 'Решенные' })}</option>
            <option value="CLOSED">{lt(locale, { fa: 'بسته شده (CLOSED)', en: 'Closed', ar: 'مغلقة', zh: '已关闭', ru: 'Закрытые' })}</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              startTransition(async () => {
                const res = await getAdminTicketsAction({
                  status: statusFilter,
                  category: e.target.value,
                  search: search.trim() || undefined,
                });
                if (res.success) {
                  setTickets(res.tickets);
                  setCounts(res.counts);
                }
              });
            }}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink"
          >
            <option value="ALL">{lt(locale, { fa: 'همه دسته‌ها', en: 'All Categories', ar: 'كل الفئات', zh: '全部分类', ru: 'Все категории' })}</option>
            <option value="FLIGHTS">{lt(locale, { fa: 'پرواز (FLIGHTS)', en: 'Flights', ar: 'طيران', zh: '机票', ru: 'Рейсы' })}</option>
            <option value="HOTELS">{lt(locale, { fa: 'هتل و اقامت (HOTELS)', en: 'Hotels', ar: 'فنادق', zh: '酒店', ru: 'Отели' })}</option>
            <option value="TOURS">{lt(locale, { fa: 'تور و بسته (TOURS)', en: 'Tours', ar: 'جولات', zh: '旅游', ru: 'Туры' })}</option>
            <option value="REFUNDS">{lt(locale, { fa: 'استرداد وجه (REFUNDS)', en: 'Refunds', ar: 'استرداد', zh: '退款', ru: 'Возвраты' })}</option>
            <option value="FINANCIAL">{lt(locale, { fa: 'مالی و کیف‌پول (FINANCIAL)', en: 'Financial', ar: 'مالي', zh: '财务', ru: 'Финансы' })}</option>
            <option value="GENERAL">{lt(locale, { fa: 'عمومی و سایر (GENERAL)', en: 'General', ar: 'عام', zh: '常规', ru: 'Общее' })}</option>
          </select>
        </div>
      </div>

      {/* Main Two-Column Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* Left Column: Tickets Queue List (5 cols) */}
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-line shadow-xs overflow-hidden">
          <div className="p-3.5 bg-soft/60 border-b border-line flex items-center justify-between text-xs font-black text-ink">
            <span>{lt(locale, { fa: 'صف درخواست‌ها', en: 'Tickets Queue', ar: 'قائمة التذاكر', zh: '工单列表', ru: 'Список заявок' })}</span>
            <span className="num font-bold text-sub tabular-nums">
              {tickets.length.toLocaleString(numFmt)}
            </span>
          </div>

          <div className="divide-y divide-line/60 max-h-[640px] overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-sub text-xs">
                <ErpEmptyState
                  icon={<CheckCircle2 size={26} className="text-success" aria-hidden="true" />}
                  title={lt(locale, { fa: 'تیکتی در این فیلتر وجود ندارد', en: 'No tickets match filter', ar: 'لا توجد تذاكر', zh: '没有符合条件的工单', ru: 'Нет обращений' })}
                />
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const statusCfg = STATUS_CONFIG[t.status] || { label: { fa: t.status, en: t.status }, tone: 'neutral' };
                const priorityCfg = PRIORITY_CONFIG[t.priority] || { label: { fa: t.priority, en: t.priority }, tone: 'neutral' };

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => loadTicketDetails(t.id)}
                    className={`w-full p-4 text-start transition flex flex-col gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-brand/10 border-s-4 border-brand'
                        : 'hover:bg-soft/70 border-s-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black text-brand-dark" dir="ltr">
                        {t.ticketNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <ErpBadge tone={priorityCfg.tone}>{lt(locale, priorityCfg.label)}</ErpBadge>
                        <ErpBadge tone={statusCfg.tone}>{lt(locale, statusCfg.label)}</ErpBadge>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-ink line-clamp-1">{t.subject}</h4>
                      <p className="text-[11px] text-sub truncate">{t.lastMessageSnippet}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-sub pt-1">
                      <span className="flex items-center gap-1 text-ink">
                        <User size={11} className="text-brand-dark" />
                        <span>{t.name}</span>
                        {t.bookingRef && (
                          <span className="font-mono text-brand-dark" dir="ltr">#{t.bookingRef}</span>
                        )}
                      </span>
                      <span dir="ltr">{new Date(t.updatedAt).toLocaleString(numFmt, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Workspace (7 cols) */}
        <div className="lg:col-span-7 bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col min-h-[640px]">
          {loadingDetails ? (
            <div className="flex-1 grid place-items-center p-12 text-sub text-xs">
              <RefreshCw size={24} className="animate-spin text-brand mb-2" />
              <span>{lt(locale, { fa: 'در حال دریافت اطلاعات گفتگو...', en: 'Loading thread...', ar: 'جارٍ التحميل...', zh: '加载对话中...', ru: 'Загрузка...' })}</span>
            </div>
          ) : !selectedTicket ? (
            <div className="flex-1 grid place-items-center p-12 text-center text-sub text-xs">
              <div>
                <MessageSquareQuote size={40} className="mx-auto mb-2 text-sub/40" />
                <p className="font-bold">{lt(locale, { fa: 'یک تیکت را از لیست انتخاب کنید', en: 'Select a ticket from the queue', ar: 'اختر تذكرة لعرضها', zh: '从列表中选择一个工单', ru: 'Выберите заявку' })}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              {/* Ticket Top Header & Actions Bar */}
              <div className="p-4 bg-soft/70 border-b border-line space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-black text-brand-dark" dir="ltr">
                        {selectedTicket.ticketNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand/10 text-brand-dark">
                        {selectedTicket.category}
                      </span>
                      {selectedTicket.bookingRef && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900" dir="ltr">
                          PNR: {selectedTicket.bookingRef}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-ink">{selectedTicket.subject}</h3>
                  </div>

                  {/* Status & Priority Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                      className="h-8 rounded-lg border border-line bg-surface px-2 text-xs font-black text-ink shadow-xs"
                    >
                      <option value="OPEN">🔴 OPEN (باز)</option>
                      <option value="IN_PROGRESS">🟡 IN_PROGRESS (در دست بررسی)</option>
                      <option value="WAITING_USER">🔵 WAITING_USER (منتظر مسافر)</option>
                      <option value="RESOLVED">🟢 RESOLVED (حل شده)</option>
                      <option value="CLOSED">⚪ CLOSED (بسته)</option>
                    </select>

                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                      className="h-8 rounded-lg border border-line bg-surface px-2 text-xs font-bold text-ink shadow-xs"
                    >
                      <option value="LOW">اولویت کم</option>
                      <option value="MEDIUM">اولویت عادی</option>
                      <option value="HIGH">اولویت بالا</option>
                      <option value="URGENT">فوری / اضطراری</option>
                    </select>
                  </div>
                </div>

                {/* Customer Contact Details Bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-sub border-t border-line/50 pt-2">
                  <span className="flex items-center gap-1.5 font-bold text-ink">
                    <User size={12} className="text-brand-dark" />
                    <span>{selectedTicket.name}</span>
                  </span>
                  {selectedTicket.phone && (
                    <a href={`tel:${selectedTicket.phone}`} className="flex items-center gap-1 font-mono hover:text-brand-dark" dir="ltr">
                      <Phone size={12} />
                      <span>{selectedTicket.phone}</span>
                    </a>
                  )}
                  {selectedTicket.email && (
                    <a href={`mailto:${selectedTicket.email}`} className="flex items-center gap-1 font-mono hover:text-brand-dark" dir="ltr">
                      <Mail size={12} />
                      <span>{selectedTicket.email}</span>
                    </a>
                  )}
                  <span className="ms-auto text-[10px] font-bold text-sub" dir="ltr">
                    ثبت: {new Date(selectedTicket.createdAt).toLocaleString(numFmt)}
                  </span>
                </div>
              </div>

              {/* Message Thread History */}
              <div className="flex-1 p-4 space-y-3 max-h-[420px] overflow-y-auto bg-soft/30">
                {selectedTicket.messages.map((m) => {
                  const isStaff = m.senderType === 'STAFF';
                  const isSys = m.senderType === 'SYSTEM';

                  if (isSys) {
                    return (
                      <div key={m.id} className="text-center text-[10px] text-sub font-mono py-1.5 px-3 bg-soft/80 rounded-xl border border-line/40 max-w-md mx-auto">
                        {m.message}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm font-medium ${
                          isStaff
                            ? 'bg-brand text-surface shadow-xs rounded-se-xs'
                            : 'bg-surface text-ink border border-line shadow-xs rounded-ss-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px] font-bold opacity-80 mb-1 border-b border-current/15 pb-1">
                          <span>{m.authorName} ({isStaff ? 'همکار پشتیبانی' : 'مسافر'})</span>
                          <span dir="ltr">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Staff Reply Box */}
              <div className="p-4 bg-surface border-t border-line space-y-2">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={lt(locale, {
                    fa: 'پاسخ رسمی پشتیبانی را اینجا بنویسید (پیامک و ایمیل اطلاع‌رسانی برای مسافر ارسال خواهد شد)...',
                    en: 'Type official staff response here (will notify customer via SMS/outbox)...',
                    ar: 'اكتب رد الدعم الفني هنا...',
                    zh: '在此输入官方客服回复（将通过短信和出站事件通知旅客）...',
                    ru: 'Напишите официальный ответ клиенту...',
                  })}
                  className="w-full p-3 rounded-xl border border-line text-xs sm:text-sm bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyText('سلام و احترام، درخواست شما با موفقیت به واحد صدور ارجاع گردید و تا دقایقی دیگر فایل نهایی ارسال می‌شود.')}
                      className="text-[10px] font-bold text-sub hover:text-brand-dark bg-soft px-2 py-1 rounded-lg border border-line"
                    >
                      + پیام آماده صدور
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyText('با سلام، استرداد وجه طبق ضوابط لغو انجام و مبلغ در حساب کیف پول شما شارژ گردید.')}
                      className="text-[10px] font-bold text-sub hover:text-brand-dark bg-soft px-2 py-1 rounded-lg border border-line"
                    >
                      + پیام آماده استرداد
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={isReplying || !replyText.trim()}
                    className="h-10 px-6 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black transition active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isReplying ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>{lt(locale, { fa: 'ارسال پاسخ و اطلاع‌رسانی به مسافر', en: 'Send Response to Customer', ar: 'إرسال الرد للمسافر', zh: '发送回复并通知旅客', ru: 'Отправить ответ клиенту' })}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
