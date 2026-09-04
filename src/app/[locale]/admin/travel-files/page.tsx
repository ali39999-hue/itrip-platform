import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/domains/identity/permission-service';
import { AdminShell } from '@/components/admin/AdminShell';
import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { Link } from '@/i18n/routing';
import { Briefcase, User, Calendar, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TravelFilesPage() {
  const user = await requirePermission(['booking:view:all', 'ops:override:cancel']);
  const locale = await getLocale();

  // Query Trips (Travel Files) with aggregated Bookings and Users
  const trips = await prisma.trip.findMany({
    include: {
      user: {
        select: { id: true, name: true, phone: true, email: true },
      },
      bookings: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <AdminShell userName={user.email || 'Admin'} role={user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-line shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-brand/10 text-brand-dark">
                <Briefcase size={20} />
              </span>
              <h1 className="text-xl font-black text-ink">
                {lt(locale, { fa: 'پرونده‌های جامع سفر (Travel Files)', en: 'Enterprise Travel Files', ar: 'ملفات السفر الشاملة', zh: '综合行程档案', ru: 'Комплексные файлы поездок' })}
              </h1>
            </div>
            <p className="text-xs text-sub font-medium mt-1">
              {lt(locale, {
                fa: 'مشاهده و مدیریت یکپارچه مشتری، پروازها، هتل‌ها، ترانسفرها و وضعیت مالی هر پرونده سفر (ERP v2)',
                en: 'Unified view of customers, flights, hotels, transfers, and ledger status per Travel File',
                ar: 'عرض موحد للعملاء والرحلات والفنادق والنقل وحالة الدفاتر لكل ملف سفر',
                zh: '统一查看客户、航班、酒店、接送及账目状态',
                ru: 'Единый обзор клиентов, рейсов, отелей, трансферов и статуса бухгалтерии'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-mint text-brand-dark text-xs font-black">
              {trips.length} {lt(locale, { fa: 'پرونده ثبت‌شده', en: 'Files Recorded', ar: 'ملف مسجل', zh: '已记录档案', ru: 'файлов зарегистрировано' })}
            </span>
          </div>
        </div>

        {/* Travel Files Grid / List */}
        {trips.length === 0 ? (
          <div className="bg-surface p-12 rounded-2xl border border-line text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-soft grid place-items-center mx-auto text-sub">
              <Briefcase size={24} />
            </div>
            <h3 className="text-base font-black text-ink">
              {lt(locale, { fa: 'هنوز پرونده سفری ثبت نشده است', en: 'No Travel Files yet', ar: 'لا توجد ملفات سفر حتى الآن', zh: '暂无行程档案', ru: 'Файлов поездок пока нет' })}
            </h3>
            <p className="text-xs text-sub max-w-md mx-auto">
              {lt(locale, {
                fa: 'با رزرو بسته‌های سفر تجمیعی توسط کاربران یا ثبت در پنل آژانس، پرونده‌های سفر به همراه کد پیگیری یکتا در اینجا نمایش می‌یابند.',
                en: 'When multi-item travel journeys are booked, their unified dossier and ledger timeline will appear here.',
                ar: 'عند حجز رحلات السفر المجمعة، ستظهر ملفاتها هنا.',
                zh: '当预订多项旅行行程时，其统一档案将在此显示。',
                ru: 'При бронировании комплексных поездок их единое досье появится здесь.'
              })}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map((trip) => {
              const totalItems = trip.bookings.reduce((sum, b) => sum + b.items.length, 0);
              return (
                <div key={trip.id} className="bg-surface p-5 rounded-2xl border border-line hover:border-brand/40 transition shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-brand-dark text-surface text-[11px] font-black tracking-wider mb-1">
                        {trip.reference}
                      </span>
                      <h3 className="text-base font-black text-ink">{trip.title}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-soft text-brand-dark">
                      {trip.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-sub py-2 border-y border-line/60">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-brand-dark" />
                      <span className="font-bold truncate">{trip.user?.name || trip.user?.email || 'Customer'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-brand-dark" />
                      <span>{trip.startDate || 'TBD'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sub">
                      {trip.bookings.length} {lt(locale, { fa: 'رزرو', en: 'Bookings', ar: 'حجوزات', zh: '项预订', ru: 'бронирований' })} ({totalItems} {lt(locale, { fa: 'آیتم', en: 'items', ar: 'عناصر', zh: '项目', ru: 'позиций' })})
                    </span>
                    <Link
                      href={`/admin/travel-files/${trip.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-surface font-black hover:bg-brand-dark transition"
                    >
                      <span>{lt(locale, { fa: 'مشاهده پرونده', en: 'Open Dossier', ar: 'فتح الملف', zh: '打开档案', ru: 'Открыть дело' })}</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
