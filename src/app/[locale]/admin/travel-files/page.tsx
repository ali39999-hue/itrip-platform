import { getAdminTravelFiles } from '@/actions/admin';
import { requirePermission } from '@/domains/identity/permission-service';
import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { Link } from '@/i18n/routing';
import { Briefcase, User, Calendar, ArrowUpLeft } from 'lucide-react';
import { ErpBadge, ErpEmptyState, ErpPageHeader, ErpSectionCard } from '@/components/admin/erp-ui';

export const dynamic = 'force-dynamic';

function statusTone(status: string): 'green' | 'rose' | 'brand' | 'neutral' {
  if (status === 'COMPLETED') return 'green';
  if (status === 'CANCELLED') return 'rose';
  if (status === 'IN_PROGRESS' || status === 'BOOKED') return 'brand';
  return 'neutral';
}

export default async function TravelFilesPage() {
  await requirePermission(['booking:view:all', 'ops:override:cancel']);
  const locale = await getLocale();
  const { trips } = await getAdminTravelFiles();
  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow="ERP v2 · Dossier"
        title={lt(locale, { fa: 'پرونده‌های سفر', en: 'Travel Files', ar: 'ملفات السفر', zh: '行程档案', ru: 'Файлы поездок' })}
        description={lt(locale, {
          fa: 'نمای یکپارچه مشتری، پروازها، هتل‌ها، ترانسفرها و وضعیت مالی هر پرونده',
          en: 'Unified view of customers, flights, hotels, transfers and ledger per file',
          ar: 'عرض موحد للعملاء والرحلات والفنادق لكل ملف',
          zh: '统一查看客户、航班、酒店及账目状态',
          ru: 'Единый обзор клиентов, рейсов, отелей и бухгалтерии',
        })}
        icon={<Briefcase size={20} aria-hidden="true" />}
        meta={
          <ErpBadge tone="brand">
            {trips.length.toLocaleString(numFmt)} {lt(locale, { fa: 'پرونده ثبت‌شده', en: 'files recorded', ar: 'ملف مسجل', zh: '个档案', ru: 'файлов' })}
          </ErpBadge>
        }
      />

      {trips.length === 0 ? (
        <ErpSectionCard>
          <ErpEmptyState
            icon={<Briefcase size={26} aria-hidden="true" />}
            title={lt(locale, { fa: 'هنوز پرونده سفری ثبت نشده است', en: 'No travel files yet', ar: 'لا توجد ملفات سفر', zh: '暂无行程档案', ru: 'Файлов поездок пока нет' })}
            description={lt(locale, {
              fa: 'با رزرو بسته‌های تجمیعی توسط کاربران، پرونده‌ها با کد پیگیری یکتا اینجا نمایش داده می‌شوند.',
              en: 'When multi-item journeys are booked, their unified dossiers appear here.',
              ar: 'عند حجز الرحلات المجمعة ستظهر ملفاتها هنا.',
              zh: '预订多项行程后，其统一档案将在此显示。',
              ru: 'При бронировании комплексных поездок досье появятся здесь.',
            })}
          />
        </ErpSectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {trips.map((trip) => {
            const totalItems = (trip.bookings || []).reduce((sum: number, b: { items?: unknown[] }) => sum + (b.items?.length || 0), 0);
            return (
              <article key={trip.id} className="group flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-elev-1 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-elev-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="mb-1.5 inline-block rounded-lg bg-deep px-2.5 py-1 font-mono text-[11px] font-black tracking-wider text-surface" dir="ltr">
                      {trip.reference}
                    </span>
                    <h3 className="truncate text-[15px] font-black text-ink">{trip.title}</h3>
                  </div>
                  <ErpBadge tone={statusTone(trip.status)}>{trip.status}</ErpBadge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-line/60 py-2.5 text-xs font-bold text-sub">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <User size={13} className="shrink-0 text-brand-dark" aria-hidden="true" />
                    <span className="truncate">{trip.user?.phone || trip.user?.name || trip.user?.email || 'Customer'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={13} className="shrink-0 text-brand-dark" aria-hidden="true" />
                    <span className="tabular-nums">{trip.startDate || 'TBD'}</span>
                  </span>
                  <span className="ms-auto tabular-nums">
                    {(trip.bookings?.length || 0).toLocaleString(numFmt)} {lt(locale, { fa: 'رزرو', en: 'bookings', ar: 'حجوزات', zh: '项预订', ru: 'броней' })} · {totalItems.toLocaleString(numFmt)} {lt(locale, { fa: 'آیتم', en: 'items', ar: 'عناصر', zh: '项目', ru: 'позиций' })}
                  </span>
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    href={`/admin/travel-files/${trip.id}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-deep px-4 py-2 text-xs font-black text-surface shadow-elev-1 transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span>{lt(locale, { fa: 'مشاهده پرونده', en: 'Open dossier', ar: 'فتح الملف', zh: '打开档案', ru: 'Открыть дело' })}</span>
                    <ArrowUpLeft size={13} aria-hidden="true" className="rtl:rotate-90" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
