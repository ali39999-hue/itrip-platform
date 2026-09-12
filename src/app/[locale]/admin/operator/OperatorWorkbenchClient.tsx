'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  ErpPageHeader,
  ErpSectionCard,
  ErpStatCard,
  ErpBadge,
  ErpEmptyState,
  erpFieldCls,
  erpLabelCls,
  erpPrimaryBtnCls,
} from '@/components/admin/erp-ui';
import { sendOperatorPushAction } from '@/actions/operator';
import {
  ListChecks,
  ShieldAlert,
  CalendarClock,
  TicketCheck,
  PlaneTakeoff,
  Building,
  ChevronLeft,
  BellRing,
  Loader2,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { lt } from '@/lib/lt';

interface QueueBooking {
  id: string;
  reference: string;
  status: string;
  paymentStatus?: string;
  ticketStatus?: string;
  travelDate?: string | null;
  totalAmount: unknown;
  currency: string;
  createdAt: string | Date;
  customer?: { name?: string | null; phone?: string | null } | null;
  items?: Array<{ title?: string | null; type?: string | null }>;
}

interface QueueException {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  entityType: string;
  entityId: string;
  slaDueAt?: string | Date | null;
  detectedAt: string | Date;
}

interface UpcomingBooking {
  id: string;
  reference: string;
  travelDate?: string | null;
  ticketStatus?: string;
  customer?: { name?: string | null } | null;
  items?: Array<{ title?: string | null; type?: string | null }>;
}

export interface OperatorWorkbenchData {
  queues: {
    needsAction: QueueBooking[];
    openExceptions: QueueException[];
    upcoming: UpcomingBooking[];
  };
  stats: {
    awaitingAction: number;
    openExceptions: number;
    confirmedToday: number;
    issuedToday: number;
  };
}

const SEVERITY_TONE: Record<string, 'rose' | 'gold' | 'brand' | 'neutral'> = {
  CRITICAL: 'rose',
  HIGH: 'rose',
  MEDIUM: 'gold',
  LOW: 'neutral',
};

function fmtAmount(v: unknown, currency: string) {
  const n = Number(v || 0);
  return `${n.toLocaleString('fa-IR')} ${currency === 'IRR' ? 'تومان' : currency}`;
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fa-IR');
  } catch {
    return String(d);
  }
}

export function OperatorWorkbenchClient({
  data,
  canNotify,
}: {
  data: OperatorWorkbenchData;
  canNotify: boolean;
}) {
  const locale = useLocale();
  const { queues, stats } = data;

  // ---- Push broadcast state (ops:notify) ----
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('');
  const [pushSegment, setPushSegment] = useState<'SUBSCRIBERS' | 'STAFF'>('SUBSCRIBERS');
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSendPush() {
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setPushSending(true);
    setPushResult(null);
    try {
      const res = await sendOperatorPushAction({
        title: pushTitle.trim(),
        body: pushBody.trim(),
        url: pushUrl.trim() || undefined,
        segment: pushSegment,
      });
      if (res.success) {
        setPushResult({
          ok: true,
          msg: lt(locale, {
            fa: `اعلان برای ${res.sent ?? 0} دستگاه ارسال شد.`,
            en: `Notification queued for ${res.sent ?? 0} devices.`,
            ar: `تم إرسال الإشعار إلى ${res.sent ?? 0} جهاز.`,
            zh: `已向 ${res.sent ?? 0} 台设备发送通知。`,
            ru: `Уведомление отправлено на ${res.sent ?? 0} устройств.`,
          }),
        });
        setPushTitle('');
        setPushBody('');
        setPushUrl('');
      } else {
        setPushResult({ ok: false, msg: res.error || 'ارسال ناموفق بود' });
      }
    } catch {
      setPushResult({ ok: false, msg: 'خطای غیرمنتظره در ارسال' });
    } finally {
      setPushSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'عملیات روزانه', en: 'Daily Operations', ar: 'العمليات اليومية', zh: '日常运营', ru: 'Ежедневные операции' })}
        title={lt(locale, { fa: 'میز کار اپراتور', en: 'Operator Workbench', ar: 'مكتب الموظف', zh: '运营工作台', ru: 'Пульт оператора' })}
        description={lt(locale, {
          fa: 'صف کار روزانه: رزروهای پرداخت‌شده در انتظار تایید و صدور، استثنائات باز و سفرهای نزدیک.',
          en: 'Your daily queue: paid bookings awaiting confirmation and issuing, open exceptions and imminent departures.',
          ar: 'قائمة العمل اليومية: الحجوزات المدفوعة في انتظار التأكيد والإصدار، والاستثناءات المفتوحة.',
          zh: '您的日常队列：等待确认和出票的已付款预订、未决异常和即将出发。',
          ru: 'Ваша ежедневная очередь: оплаченные бронирования, ожидающие подтверждения, открытые исключения и ближайшие выезды.',
        })}
        icon={<ListChecks size={20} aria-hidden="true" />}
        meta={
          <>
            <ErpBadge tone="gold" dot>
              {lt(locale, { fa: 'صف زنده', en: 'Live queue', ar: 'قائمة حية', zh: '实时队列', ru: 'Живая очередь' })}
            </ErpBadge>
            <ErpBadge tone="neutral">{fmtDate(new Date())}</ErpBadge>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ErpStatCard
          icon={<ListChecks size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'در انتظار اقدام', en: 'Awaiting action', ar: 'في انتظار الإجراء', zh: '等待处理', ru: 'Ожидают действия' })}
          value={stats.awaitingAction}
          tone="gold"
          href="/admin/bookings"
        />
        <ErpStatCard
          icon={<ShieldAlert size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'استثنائات باز', en: 'Open exceptions', ar: 'استثناءات مفتوحة', zh: '未决异常', ru: 'Открытые исключения' })}
          value={stats.openExceptions}
          tone="rose"
          href="/admin/exceptions"
        />
        <ErpStatCard
          icon={<CheckCircle2 size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'تاییدشده امروز', en: 'Confirmed today', ar: 'مؤكد اليوم', zh: '今日已确认', ru: 'Подтверждено сегодня' })}
          value={stats.confirmedToday}
          tone="green"
        />
        <ErpStatCard
          icon={<TicketCheck size={16} aria-hidden="true" />}
          label={lt(locale, { fa: 'بلیط صادرشده امروز', en: 'Issued today', ar: 'صدر اليوم', zh: '今日已出票', ru: 'Выдано сегодня' })}
          value={stats.issuedToday}
          tone="brand"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Queue: needs action */}
        <ErpSectionCard
          title={lt(locale, { fa: 'رزروهای نیازمند تایید و صدور', en: 'Bookings needing confirmation / issuing', ar: 'حجوزات تحتاج تأكيداً وإصداراً', zh: '需要确认/出票的预订', ru: 'Бронирования, требующие подтверждения' })}
          subtitle={lt(locale, { fa: 'پرداخت انجام شده؛ نوبت تایید اپراتور است', en: 'Payment captured; awaiting operator confirmation', ar: 'تم الدفع؛ بانتظار تأكيد الموظف', zh: '已付款；等待运营确认', ru: 'Оплата получена; ожидает подтверждения' })}
          icon={<PlaneTakeoff size={15} aria-hidden="true" />}
          actions={
            <Link href="/admin/bookings" className="text-[11px] font-black text-brand-dark hover:underline">
              {lt(locale, { fa: 'همه رزروها', en: 'All bookings', ar: 'كل الحجوزات', zh: '全部预订', ru: 'Все брони' })}
            </Link>
          }
        >
          {queues.needsAction.length === 0 ? (
            <ErpEmptyState
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              title={lt(locale, { fa: 'صف خالی است 🎉', en: 'Queue is clear 🎉', ar: 'القائمة فارغة 🎉', zh: '队列已清空 🎉', ru: 'Очередь пуста 🎉' })}
              description={lt(locale, { fa: 'هیچ رزرو پرداخت‌شده‌ای در انتظار تایید نیست.', en: 'No paid bookings are waiting for confirmation.', ar: 'لا حجوزات مدفوعة في الانتظار.', zh: '没有等待确认的已付款预订。', ru: 'Нет оплаченных броней в ожидании.' })}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line/60">
              {queues.needsAction.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-soft text-brand-dark">
                    {b.items?.[0]?.type === 'FLIGHT' ? <PlaneTakeoff size={15} aria-hidden="true" /> : <Building size={15} aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black text-ink" dir="ltr">
                      {b.reference}
                    </p>
                    <p className="truncate text-[11px] font-bold text-sub">
                      {b.customer?.name || '—'} · {b.items?.[0]?.title || b.status}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-end sm:block">
                    <p className="num text-[12px] font-black text-ink">{fmtAmount(b.totalAmount, b.currency)}</p>
                    <p className="text-[10px] font-bold text-sub">{fmtDate(b.travelDate)}</p>
                  </div>
                  <Link
                    href="/admin/bookings"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-soft text-brand-dark transition hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    aria-label={lt(locale, { fa: 'بررسی رزرو', en: 'Review booking', ar: 'مراجعة الحجز', zh: '查看预订', ru: 'Открыть бронь' })}
                  >
                    <ChevronLeft size={15} aria-hidden="true" className="rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ErpSectionCard>

        {/* Queue: open exceptions */}
        <ErpSectionCard
          title={lt(locale, { fa: 'استثنائات باز', en: 'Open exceptions', ar: 'استثناءات مفتوحة', zh: '未决异常', ru: 'Открытые исключения' })}
          subtitle={lt(locale, { fa: 'مرتب‌شده بر اساس شدت و SLA', en: 'Sorted by severity and SLA', ar: 'مرتبة حسب الخطورة', zh: '按严重程度排序', ru: 'По серьезности' })}
          icon={<ShieldAlert size={15} aria-hidden="true" />}
          actions={
            <Link href="/admin/exceptions" className="text-[11px] font-black text-brand-dark hover:underline">
              {lt(locale, { fa: 'مرکز استثنائات', en: 'Exception Center', ar: 'مركز الاستثناءات', zh: '异常中心', ru: 'Центр исключений' })}
            </Link>
          }
        >
          {queues.openExceptions.length === 0 ? (
            <ErpEmptyState
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              title={lt(locale, { fa: 'استثنائاتی باز نیست', en: 'No open exceptions', ar: 'لا استثناءات', zh: '没有未决异常', ru: 'Нет исключений' })}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line/60">
              {queues.openExceptions.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <ErpBadge tone={SEVERITY_TONE[e.severity] || 'neutral'} dot className="shrink-0">
                    {e.severity}
                  </ErpBadge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black text-ink">{e.title}</p>
                    <p className="truncate text-[11px] font-bold text-sub">
                      {e.type} · {fmtDate(e.detectedAt)}
                    </p>
                  </div>
                  <Link
                    href="/admin/exceptions"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-soft text-brand-dark transition hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    aria-label={lt(locale, { fa: 'بررسی استثنا', en: 'Review exception', ar: 'مراجعة الاستثناء', zh: '处理异常', ru: 'Открыть' })}
                  >
                    <ChevronLeft size={15} aria-hidden="true" className="rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ErpSectionCard>
      </div>

      {/* Upcoming departures */}
      <ErpSectionCard
        title={lt(locale, { fa: 'سفرهای نزدیک', en: 'Upcoming departures', ar: 'رحلات قادمة', zh: '即将出发', ru: 'Ближайшие выезды' })}
        subtitle={lt(locale, { fa: 'رزروهای تاییدشده با نزدیک‌ترین تاریخ سفر', en: 'Confirmed bookings with the nearest travel dates', ar: 'حجوزات مؤكدة بأقرب تواريخ', zh: '已确认且最近的预订', ru: 'Подтвержденные брони' })}
        icon={<CalendarClock size={15} aria-hidden="true" />}
      >
        {queues.upcoming.length === 0 ? (
          <ErpEmptyState
            icon={<CalendarClock size={22} aria-hidden="true" />}
            title={lt(locale, { fa: 'سفر نزدیکی ثبت نشده', en: 'No upcoming departures', ar: 'لا رحلات قادمة', zh: '没有即将出发的行程', ru: 'Нет ближайших выездов' })}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queues.upcoming.map((b) => (
              <div key={b.id} className="rounded-2xl border border-line bg-soft/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-black text-ink" dir="ltr">
                    {b.reference}
                  </span>
                  <ErpBadge tone={b.ticketStatus === 'ISSUED' ? 'green' : 'gold'}>
                    {b.ticketStatus === 'ISSUED'
                      ? lt(locale, { fa: 'بلیط صادر شد', en: 'Ticket issued', ar: 'صدرت التذكرة', zh: '已出票', ru: 'Билет выдан' })
                      : lt(locale, { fa: 'بلیط صادر نشده', en: 'Not issued', ar: 'لم تصدر', zh: '未出票', ru: 'Не выдан' })}
                  </ErpBadge>
                </div>
                <p className="mt-2 truncate text-[11.5px] font-bold text-sub">
                  {b.customer?.name || '—'} · {b.items?.[0]?.title || '—'}
                </p>
                <p className="num mt-1 text-[12px] font-black text-brand-dark">{fmtDate(b.travelDate)}</p>
              </div>
            ))}
          </div>
        )}
      </ErpSectionCard>

      {/* Push broadcast (ops:notify) */}
      {canNotify && (
        <ErpSectionCard
          title={lt(locale, { fa: 'اعلان فوری (پوش نوتیفیکیشن)', en: 'Instant push notification', ar: 'إشعار فوري', zh: '即时推送通知', ru: 'Мгновенное push-уведомление' })}
          subtitle={lt(locale, { fa: 'ارسال پیام به دستگاه‌های مشترک‌شده وب‌پوش', en: 'Send a message to subscribed web-push devices', ar: 'إرسال رسالة إلى الأجهزة المشتركة', zh: '向已订阅设备推送消息', ru: 'Отправить подписанным устройствам' })}
          icon={<BellRing size={15} aria-hidden="true" />}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={erpLabelCls} htmlFor="push-title">
                {lt(locale, { fa: 'عنوان', en: 'Title', ar: 'العنوان', zh: '标题', ru: 'Заголовок' })}
              </label>
              <input
                id="push-title"
                className={erpFieldCls}
                value={pushTitle}
                maxLength={60}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder={lt(locale, { fa: 'مثلاً: پروازهای نوروزی رسید', en: 'e.g. Nowruz flights are here', ar: 'مثال: رحلات نوروز وصلت', zh: '例如：诺鲁兹航班到了', ru: 'Например: рейсы на Навруз' })}
              />
            </div>
            <div>
              <label className={erpLabelCls} htmlFor="push-url">
                {lt(locale, { fa: 'لینک مقصد (اختیاری)', en: 'Target URL (optional)', ar: 'الرابط (اختياري)', zh: '目标链接（可选）', ru: 'Ссылка (опционально)' })}
              </label>
              <input
                id="push-url"
                className={erpFieldCls}
                dir="ltr"
                value={pushUrl}
                maxLength={300}
                onChange={(e) => setPushUrl(e.target.value)}
                placeholder="/flights"
              />
            </div>
            <div className="md:col-span-2">
              <label className={erpLabelCls} htmlFor="push-body">
                {lt(locale, { fa: 'متن پیام', en: 'Message body', ar: 'نص الرسالة', zh: '消息内容', ru: 'Текст сообщения' })}
              </label>
              <textarea
                id="push-body"
                className={`${erpFieldCls} min-h-[80px] resize-y`}
                value={pushBody}
                maxLength={280}
                onChange={(e) => setPushBody(e.target.value)}
              />
            </div>
            <div>
              <label className={erpLabelCls} htmlFor="push-segment">
                {lt(locale, { fa: 'مخاطب', en: 'Audience', ar: 'الجمهور', zh: '受众', ru: 'Аудитория' })}
              </label>
              <select
                id="push-segment"
                className={erpFieldCls}
                value={pushSegment}
                onChange={(e) => setPushSegment(e.target.value as 'SUBSCRIBERS' | 'STAFF')}
              >
                <option value="SUBSCRIBERS">
                  {lt(locale, { fa: 'همه مشترکان پوش', en: 'All push subscribers', ar: 'كل المشتركين', zh: '所有订阅者', ru: 'Все подписчики' })}
                </option>
                <option value="STAFF">
                  {lt(locale, { fa: 'همکاران داخلی (ERP)', en: 'Internal staff (ERP)', ar: 'الموظفون الداخليون', zh: '内部员工', ru: 'Сотрудники' })}
                </option>
              </select>
            </div>
            <div className="flex items-end justify-start gap-3">
              <button
                type="button"
                onClick={handleSendPush}
                disabled={pushSending || !pushTitle.trim() || !pushBody.trim()}
                className={`${erpPrimaryBtnCls} inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {pushSending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                {pushSending
                  ? lt(locale, { fa: 'در حال ارسال…', en: 'Sending…', ar: 'جارٍ الإرسال…', zh: '发送中…', ru: 'Отправка…' })
                  : lt(locale, { fa: 'ارسال اعلان', en: 'Send notification', ar: 'إرسال الإشعار', zh: '发送通知', ru: 'Отправить' })}
              </button>
              {pushResult && (
                <span className={`text-[11.5px] font-black ${pushResult.ok ? 'text-success' : 'text-rose-warm'}`} role="status">
                  {pushResult.msg}
                </span>
              )}
            </div>
          </div>
        </ErpSectionCard>
      )}
    </div>
  );
}
