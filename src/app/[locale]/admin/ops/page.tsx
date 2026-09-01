import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AdminOpsPage() {
  const locale = await getLocale();
  const session = await auth();
  
  if (!session || !['SUPER_ADMIN', 'OPS', 'FINANCE'].includes(session.user.role)) {
    redirect('/' + locale + '/account');
  }

  // Fetch pending / failed events from Outbox
  const pendingEvents = await prisma.outboxEvent.findMany({
    where: { status: { in: ['PENDING', 'FAILED'] } },
    orderBy: { createdAt: 'asc' }
  });

  // Fetch bookings that might need attention (e.g. DRAFT for too long, or PENDING_PAYMENT)
  const stuckBookings = await prisma.booking.findMany({
    where: { 
      status: 'DRAFT',
      createdAt: { lt: new Date(Date.now() - 1000 * 60 * 15) } // Older than 15 mins
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{lt(locale, { fa: 'مرکز عملیات و صف وظایف', en: 'Action Center & Ops Queue', ar: 'مركز العمليات وقائمة المهام', zh: '操作中心与任务队列', ru: 'Центр действий и очередь задач' })}</h1>
          <p className="text-sm text-sub mt-1">{lt(locale, { fa: 'بررسی رویدادهای ناموفق، رزروهای معلق و خطاهای سیستم', en: 'Review failed events, stuck bookings and system errors', ar: 'مراجعة الأحداث الفاشلة والحجوزات المعلقة وأخطاء النظام', zh: '检查失败的事件、卡住的预订和系统错误', ru: 'Просмотр неудачных событий, застрявших бронирований и системных ошибок' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Outbox Queue */}
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-line bg-rose-warm/5 flex items-center gap-2 text-rose-warm">
             <AlertCircle size={18} />
             <h2 className="font-bold">Failed / Pending Events (Outbox)</h2>
          </div>
          <div className="p-0 flex-1">
            {pendingEvents.length === 0 ? (
               <div className="p-8 text-center text-sub flex flex-col items-center">
                  <CheckCircle2 size={32} className="text-success mb-2 opacity-50" />
                  <p>All events processed successfully.</p>
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
             <h2 className="font-bold">Stuck Bookings (Abandoned Drafts)</h2>
          </div>
          <div className="p-0 flex-1">
            {stuckBookings.length === 0 ? (
               <div className="p-8 text-center text-sub flex flex-col items-center">
                  <CheckCircle2 size={32} className="text-success mb-2 opacity-50" />
                  <p>No stuck bookings found.</p>
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