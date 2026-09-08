import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { AlertCircle, Clock, CheckCircle2, Activity, Inbox } from 'lucide-react';
import { getAdminOpsData } from '@/actions/admin';
import { safeAuth } from '@/auth';
import { hasErpRole } from '@/domains/identity/permission-service';
import { redirect } from 'next/navigation';
import { ErpBadge, ErpEmptyState, ErpHint, ErpPageHeader, ErpSectionCard } from '@/components/admin/erp-ui';

export default async function AdminOpsPage() {
  const locale = await getLocale();
  const session = await safeAuth();

  // Relational RBAC gate (IAM-001): the legacy role string never grants access.
  const authorized = session ? await hasErpRole(session.user.id) : false;
  if (!session || !authorized) {
    redirect('/' + locale + '/auth');
  }

  const { pendingEvents, stuckBookings } = await getAdminOpsData();
  const numFmt = locale === 'fa' ? 'fa-IR' : locale;

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'عملیات · صف‌ها', en: 'Operations · Queues', ar: 'العمليات · القوائم', zh: '运营 · 队列', ru: 'Операции · Очереди' })}
        title={lt(locale, { fa: 'مرکز عملیات و صف رویدادها', en: 'Action Center & Ops Queue', ar: 'مركز العمليات وقائمة المهام', zh: '操作中心与队列', ru: 'Центр операций и очередь' })}
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{lt(locale, { fa: 'رویدادهای ناموفق، رزروهای معلق و خطاهای سیستمی', en: 'Failed events, stuck bookings and system errors', ar: 'الأحداث الفاشلة والحجوزات المعلقة', zh: '失败事件、搁置预订及系统异常', ru: 'Сбойные события и зависшие бронирования' })}</span>
            <ErpHint label={lt(locale, { fa: 'اوت‌باکس چیست؟', en: 'What is the Outbox?', ar: 'ما هو الـOutbox؟', zh: '什么是 Outbox？', ru: 'Что такое Outbox?' })}>
              {lt(locale, {
                fa: 'صندوق خروجی رویدادها: هر بلیط، پیامک یا اعلانی که باید ارسال می‌شده ولی هنوز نرفته، اینجا می‌ماند تا سیستم دوباره تلاش کند.',
                en: 'The event outbox: every ticket, SMS or notification that should have gone out but hasn’t yet waits here for retry.',
                ar: 'صندوق الأحداث الصادرة: كل تذكرة أو رسالة لم تُرسل بعد تنتظر هنا لإعادة المحاولة.',
                zh: '待发事件箱：所有应发未发的票据、短信或通知都会在此等待重试。',
                ru: 'Исходящая очередь событий: всё, что должно было отправиться, но не ушло, ждёт здесь повтора.',
              })}
            </ErpHint>
          </span>
        }
        icon={<Activity size={20} aria-hidden="true" />}
        meta={
          <>
            <ErpBadge tone={pendingEvents.length > 0 ? 'rose' : 'green'} dot>
              {pendingEvents.length.toLocaleString(numFmt)} {lt(locale, { fa: 'رویداد معلق', en: 'pending events', ar: 'أحداث معلقة', zh: '个待处理事件', ru: 'событий' })}
            </ErpBadge>
            <ErpBadge tone={stuckBookings.length > 0 ? 'gold' : 'green'} dot>
              {stuckBookings.length.toLocaleString(numFmt)} {lt(locale, { fa: 'رزرو معلق', en: 'stuck bookings', ar: 'حجوزات معلقة', zh: '个搁置预订', ru: 'зависших' })}
            </ErpBadge>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <ErpSectionCard
          title={lt(locale, { fa: 'رویدادهای معلق / ناموفق', en: 'Failed / Pending Events', ar: 'الأحداث المعلقة / الفاشلة', zh: '待处理/失败事件', ru: 'Ожидающие/сбойные события' })}
          subtitle="Outbox"
          icon={<AlertCircle size={16} className="text-rose-warm" aria-hidden="true" />}
          actions={<ErpBadge tone={pendingEvents.length ? 'rose' : 'green'}>{pendingEvents.length.toLocaleString(numFmt)}</ErpBadge>}
          padded={false}
          bodyClassName="max-h-[540px] overflow-y-auto"
        >
          {pendingEvents.length === 0 ? (
            <ErpEmptyState
              icon={<CheckCircle2 size={26} className="text-success" aria-hidden="true" />}
              title={lt(locale, { fa: 'صفر رویداد معلق', en: 'All events processed', ar: 'تمت معالجة جميع الأحداث', zh: '所有事件均已处理', ru: 'Все события обработаны' })}
            />
          ) : (
            <ul className="divide-y divide-line/60">
              {pendingEvents.map((event) => (
                <li key={event.id} className="px-5 py-4 transition hover:bg-soft/50">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <span className="break-all font-mono text-xs font-black text-ink" dir="ltr">{event.eventType}</span>
                    <ErpBadge tone={event.status === 'FAILED' ? 'rose' : 'gold'}>{event.status}</ErpBadge>
                  </div>
                  <p className="truncate font-mono text-[11px] text-sub" dir="ltr" title={event.payload}>{event.payload}</p>
                  <p className="num mt-1.5 text-[10px] font-bold text-sub tabular-nums">{new Date(event.createdAt).toLocaleString(numFmt)}</p>
                </li>
              ))}
            </ul>
          )}
        </ErpSectionCard>

        <ErpSectionCard
          title={lt(locale, { fa: 'رزروهای معلق / رها شده', en: 'Stuck Bookings', ar: 'الحجوزات المعلقة', zh: '搁置预订', ru: 'Зависшие бронирования' })}
          subtitle={lt(locale, { fa: 'پیش‌نویس‌های رها شده', en: 'Abandoned drafts', ar: 'مسودات مهجورة', zh: '废弃草稿', ru: 'Брошенные черновики' })}
          icon={<Clock size={16} className="text-price" aria-hidden="true" />}
          actions={<ErpBadge tone={stuckBookings.length ? 'gold' : 'green'}>{stuckBookings.length.toLocaleString(numFmt)}</ErpBadge>}
          padded={false}
          bodyClassName="max-h-[540px] overflow-y-auto"
        >
          {stuckBookings.length === 0 ? (
            <ErpEmptyState
              icon={<Inbox size={26} aria-hidden="true" />}
              title={lt(locale, { fa: 'رزرو معلقی وجود ندارد', en: 'No stuck bookings', ar: 'لا توجد حجوزات معلقة', zh: '没有搁置的预订', ru: 'Зависших бронирований нет' })}
            />
          ) : (
            <ul className="divide-y divide-line/60">
              {stuckBookings.map((booking) => (
                <li key={booking.id} className="px-5 py-4 transition hover:bg-soft/50">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-black text-brand-dark" dir="ltr">{booking.reference}</span>
                    <span className="num shrink-0 text-xs font-black text-ink tabular-nums" dir="ltr">
                      {Number(booking.totalAmount).toLocaleString(numFmt)} {booking.currency}
                    </span>
                  </div>
                  <p className="break-all text-[11px] font-medium text-sub">
                    {lt(locale, { fa: 'مشتری:', en: 'Customer:', ar: 'العميل:', zh: '客户：', ru: 'Клиент:' })} <span className="font-mono" dir="ltr">{booking.customerId.slice(0, 12)}…</span>
                  </p>
                  <p className="num mt-1 text-[10px] font-bold text-sub tabular-nums">
                    {lt(locale, { fa: 'ایجاد:', en: 'Created:', ar: 'الإنشاء:', zh: '创建：', ru: 'Создано:' })} {new Date(booking.createdAt).toLocaleString(numFmt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ErpSectionCard>
      </div>
    </div>
  );
}
