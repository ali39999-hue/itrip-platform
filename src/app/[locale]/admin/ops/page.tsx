import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { getAdminOpsData } from '@/actions/admin';
import { safeAuth } from '@/auth';
import { hasErpRole } from '@/domains/identity/permission-service';
import { redirect } from 'next/navigation';

export default async function AdminOpsPage() {
  const locale = await getLocale();
  const session = await safeAuth();
  
  // Relational RBAC gate (IAM-001): the legacy role string never grants access.
  const authorized = session ? await hasErpRole(session.user.id) : false;
  if (!session || !authorized) {
    redirect('/' + locale + '/account');
  }

  const { pendingEvents, stuckBookings } = await getAdminOpsData();

  const numFmt = locale === 'fa' ? 'fa-IR' : locale;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink">{lt(locale, { fa: 'مرکز عملیات و صف رویدادها', en: 'Action Center & Ops Queue', ar: 'مركز العمليات وقائمة المهام', zh: '操作中心与队列', ru: 'Центр операций и очередь' })}</h1>
          <p className="text-sm text-sub mt-1">{lt(locale, { fa: 'بررسی رویدادهای ناموفق، رزروهای معلق و خطاهای سیستمی', en: 'Review failed events, stuck bookings and system errors', ar: 'مراجعة الأحداث الفاشلة والحجوزات المعلقة وأخطاء النظام', zh: '查看失败事件、搁置预订及系统异常', ru: 'Просмотр сбойных событий и зависших бронирований' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Outbox Queue */}
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-line bg-rose-warm/5 flex items-center gap-2 text-rose-warm">
             <AlertCircle size={18} aria-hidden="true" />
             <h2 className="font-bold">{lt(locale, { fa: 'رویدادهای معلق / ناموفق (Outbox)', en: 'Failed / Pending Events (Outbox)', ar: 'الأحداث المعلقة / الفاشلة', zh: '待处理/失败事件', ru: 'Ожидающие/сбойные события' })}</h2>
          </div>
          <div className="p-0 flex-1 max-h-[520px] overflow-y-auto">
            {pendingEvents.length === 0 ? (
               <div className="p-8 text-center text-sub flex flex-col items-center">
                  <CheckCircle2 size={32} className="text-success mb-2 opacity-50" aria-hidden="true" />
                  <p>{lt(locale, { fa: 'همه رویدادها با موفقیت پردازش شده‌اند.', en: 'All events processed successfully.', ar: 'تمت معالجة جميع الأحداث بنجاح.', zh: '所有事件均已成功处理。', ru: 'Все события успешно обработаны.' })}</p>
               </div>
            ) : (
               <div className="divide-y divide-line">
                 {pendingEvents.map(event => (
                   <div key={event.id} className="p-4 hover:bg-soft/50 transition">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-bold text-sm text-ink break-all">{event.eventType}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${event.status === 'FAILED' ? 'bg-rose-warm/10 text-rose-warm' : 'bg-warning/10 text-warning'}`}>
                          {event.status}
                        </span>
                      </div>
                      <p className="text-xs text-sub font-mono truncate" dir="ltr">{event.payload}</p>
                      <p className="text-[10px] text-sub mt-2">{new Date(event.createdAt).toLocaleString(numFmt)}</p>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>

        {/* Stuck Bookings */}
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-line bg-warning/5 flex items-center gap-2 text-warning">
             <Clock size={18} aria-hidden="true" />
             <h2 className="font-bold">{lt(locale, { fa: 'رزروهای معلق / رها شده', en: 'Stuck Bookings (Abandoned Drafts)', ar: 'الحجوزات المعلقة', zh: '搁置预订', ru: 'Зависшие бронирования' })}</h2>
          </div>
          <div className="p-0 flex-1 max-h-[520px] overflow-y-auto">
            {stuckBookings.length === 0 ? (
               <div className="p-8 text-center text-sub flex flex-col items-center">
                  <CheckCircle2 size={32} className="text-success mb-2 opacity-50" aria-hidden="true" />
                  <p>{lt(locale, { fa: 'هیچ رزرو معلقی وجود ندارد.', en: 'No stuck bookings found.', ar: 'لا توجد حجوزات معلقة.', zh: '没有搁置的预订。', ru: 'Зависших бронирований нет.' })}</p>
               </div>
            ) : (
               <div className="divide-y divide-line">
                 {stuckBookings.map(booking => (
                   <div key={booking.id} className="p-4 hover:bg-soft/50 transition">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-bold text-sm text-ink" dir="ltr">{booking.reference}</span>
                        <span className="text-xs font-bold text-ink shrink-0" dir="ltr">{Number(booking.totalAmount).toLocaleString(numFmt)} {booking.currency}</span>
                      </div>
                      <p className="text-xs text-sub break-all">{lt(locale, { fa: 'شناسه مشتری:', en: 'Customer ID:', ar: 'رقم العميل:', zh: '客户ID：', ru: 'ID клиента:' })} {booking.customerId}</p>
                      <p className="text-[10px] text-sub mt-2">{lt(locale, { fa: 'تاریخ ایجاد:', en: 'Created at:', ar: 'تاريخ الإنشاء:', zh: '创建时间：', ru: 'Дата создания:' })} {new Date(booking.createdAt).toLocaleString(numFmt)}</p>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
