import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

async function getOpsData() {
  const cutoffTime = new Date(Date.now() - 1000 * 60 * 15);
  const [pendingEvents, stuckBookings] = await Promise.all([
    prisma.outboxEvent.findMany({
      where: { status: { in: ['PENDING', 'FAILED'] } },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.booking.findMany({
      where: { 
        status: 'DRAFT',
        createdAt: { lt: cutoffTime }
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return { pendingEvents, stuckBookings };
}

export default async function AdminOpsPage() {
  const locale = await getLocale();
  const session = await auth();
  
  if (!session || !['SUPER_ADMIN', 'OPS', 'FINANCE'].includes(session.user.role)) {
    redirect('/' + locale + '/account');
  }

  const { pendingEvents, stuckBookings } = await getOpsData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{lt(locale, { fa: 'مرکز عملیات و صف رویدادها', en: 'Action Center & Ops Queue', ar: 'مركز العمليات وقائمة المهام', zh: '操作中心与队列', ru: 'Центр операций и очередь' })}</h1>
          <p className="text-sm text-sub mt-1">{lt(locale, { fa: 'بررسی رویدادهای ناموفق، رزروهای معلق و خطاهای سیستمی', en: 'Review failed events, stuck bookings and system errors', ar: 'مراجعة الأحداث الفاشلة والحجوزات المعلقة وأخطاء النظام', zh: '查看失败事件、搁置预订及系统异常', ru: 'Просмотр сбойных событий и зависших бронирований' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Outbox Queue */}
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-line bg-rose-warm/5 flex items-center gap-2 text-rose-warm">
             <AlertCircle size={18} />
             <h2 className="font-bold">{lt(locale, { fa: 'رویدادهای معلق / ناموفق (Outbox)', en: 'Failed / Pending Events (Outbox)', ar: 'الأحداث المعلقة / الفاشلة', zh: '待处理/失败事件', ru: 'Ожидающие/сбойные события' })}</h2>
          </div>
          <div className="p-0 flex-1">
            {pendingEvents.length === 0 ? (
               <div className="p-8 text-center text-sub flex flex-col items-center">
                  <CheckCircle2 size={32} className="text-success mb-2 opacity-50" />
                  <p>{lt(locale, { fa: 'همه رویدادها با موفقیت پردازش شده‌اند.', en: 'All events processed successfully.', ar: 'تمت معالجة جميع الأحداث بنجاح.', zh: '所有事件均已成功处理。', ru: 'Все события успешно обработаны.' })}</p>
               </div>
            ) : (
               <div className="divide-y divide-line">
                 {pendingEvents.map(event => (
                   <div key={event.id} className="p-4 hover:bg-soft/50 transition">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-ink">{event.eventType}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${event.status === 'FAILED' ? 'bg-rose-warm/10 text-rose-warm' : 'bg-warning/10 text-warning'}`}>
                          {event.status}
                        </span>
                      </div>
                      <p className="text-xs text-sub font-mono truncate">{event.payload}</p>
                      <p className="text-[10px] text-sub mt-2">{new Date(event.createdAt).toLocaleString()}</p>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>

        {/* Stuck Bookings */}
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-line bg-warning/5 flex items-center gap-2 text-warning">
             <Clock size={18} />
             <h2 className="font-bold">{lt(locale, { fa: 'رزروهای معلق / رها شده', en: 'Stuck Bookings (Abandoned Drafts)', ar: 'الحجوزات المعلقة', zh: '搁置预订', ru: 'Зависшие бронирования' })}</h2>
          </div>
          <div className="p-0 flex-1">
            {stuckBookings.length === 0 ? (
               <div className="p-8 text-center text-sub flex flex-col items-center">
                  <CheckCircle2 size={32} className="text-success mb-2 opacity-50" />
                  <p>{lt(locale, { fa: 'هیچ رزرو معلقی وجود ندارد.', en: 'No stuck bookings found.', ar: 'لا توجد حجوزات معلقة.', zh: '没有搁置的预订。', ru: 'Зависших бронирований нет.' })}</p>
               </div>
            ) : (
               <div className="divide-y divide-line">
                 {stuckBookings.map(booking => (
                   <div key={booking.id} className="p-4 hover:bg-soft/50 transition">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-ink">{booking.reference}</span>
                        <span className="text-xs font-bold text-ink">{Number(booking.totalAmount).toLocaleString()} {booking.currency}</span>
                      </div>
                      <p className="text-xs text-sub">Customer ID: {booking.customerId}</p>
                      <p className="text-[10px] text-sub mt-2">Created at: {new Date(booking.createdAt).toLocaleString()}</p>
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
