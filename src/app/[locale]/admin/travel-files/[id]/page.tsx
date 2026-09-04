import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/domains/identity/permission-service';
import { AdminShell } from '@/components/admin/AdminShell';
import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import {
  Briefcase, User, Plane, Hotel, ArrowLeft,
  Clock, FileText
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TravelFileDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(['booking:view:all', 'ops:override:cancel']);
  const locale = await getLocale();

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          travelerProfiles: {
            include: { documents: true },
          },
        },
      },
      bookings: {
        include: {
          items: {
            include: {
              inventoryItem: {
                include: { supplier: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!trip) {
    notFound();
  }

  const allBookings = trip.bookings;
  const totalAmount = allBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

  return (
    <AdminShell userName={user.email || 'Admin'} role={user.role}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/travel-files"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sub hover:text-brand-dark transition"
          >
            <ArrowLeft size={14} />
            <span>{lt(locale, { fa: 'بازگشت به لیست پرونده‌ها', en: 'Back to Travel Files', ar: 'العودة لقائمة الملفات', zh: '返回档案列表', ru: 'Назад к списку' })}</span>
          </Link>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-brand text-surface">
            {trip.status}
          </span>
        </div>

        {/* Dossier Header Card */}
        <div className="bg-surface p-6 rounded-3xl border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-brand-dark text-surface text-xs font-black tracking-wider">
                {trip.reference}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-ink">{trip.title}</h1>
            </div>
            <p className="text-xs text-sub font-medium">
              {lt(locale, { fa: 'شناسه یکتای سیستمی پرونده:', en: 'System Dossier ID:', ar: 'معرف الملف:', zh: '档案编号:', ru: 'ID дела:' })} <code className="text-ink font-bold">{trip.id}</code>
            </p>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-s border-line pt-4 md:pt-0 md:ps-6">
            <div>
              <span className="block text-[11px] font-bold text-sub uppercase">
                {lt(locale, { fa: 'ارزش کل پرونده', en: 'Total Value', ar: 'إجمالي القيمة', zh: '总价值', ru: 'Общая сумма' })}
              </span>
              <span className="text-xl font-black text-brand-dark">
                {totalAmount.toLocaleString()} <span className="text-xs font-bold">{trip.bookings[0]?.currency || 'IRR'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Booked Items & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bookings Section */}
            <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-ink flex items-center gap-2">
                  <Briefcase size={18} className="text-brand-dark" />
                  <span>{lt(locale, { fa: 'خدمات و رزروهای پرونده', en: 'Booked Items & Services', ar: 'الخدمات المحجوزة', zh: '已预订服务', ru: 'Забронированные услуги' })}</span>
                </h3>
                <span className="text-xs font-bold text-sub">{allBookings.length} {lt(locale, { fa: 'رزرو', en: 'Bookings', ar: 'حجوزات', zh: '项', ru: 'броней' })}</span>
              </div>

              {allBookings.map((b) => (
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
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-surface text-ink border border-line">
                      {b.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {b.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs py-1 border-t border-line/40">
                        <div className="flex items-center gap-2">
                          {item.type === 'FLIGHT' ? <Plane size={14} className="text-brand-dark" /> : <Hotel size={14} className="text-brand-dark" />}
                          <span className="font-bold text-ink">{item.type}</span>
                          <span className="text-sub">({item.inventoryItem?.name || item.inventoryItem?.supplier?.name || 'Standard Service'})</span>
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

            {/* Timeline & Audit Logs */}
            <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-ink flex items-center gap-2">
                <Clock size={18} className="text-brand-dark" />
                <span>{lt(locale, { fa: 'تاریخچه و تایم‌لاین عملیاتی', en: 'Dossier Timeline & Audit', ar: 'الجدول الزمني للعمليات', zh: '操作时间线', ru: 'Хронология операций' })}</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-soft/40">
                  <span className="w-2 h-2 rounded-full bg-brand-dark mt-1.5 shrink-0" />
                  <div>
                    <span className="font-black text-ink">{lt(locale, { fa: 'ایجاد پرونده سفر', en: 'Travel File Created', ar: 'تم إنشاء الملف', zh: '档案已创建', ru: 'Файл поездки создан' })}</span>
                    <p className="text-sub mt-0.5">{new Date(trip.createdAt).toLocaleString(locale)}</p>
                  </div>
                </div>
                {allBookings.map((b) => (
                  <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl bg-soft/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-black text-ink">{b.reference} — {b.status}</span>
                      <p className="text-sub mt-0.5">{new Date(b.createdAt).toLocaleString(locale)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Customer & Traveler Profiles */}
          <div className="space-y-6">
            <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-ink flex items-center gap-2">
                <User size={18} className="text-brand-dark" />
                <span>{lt(locale, { fa: 'اطلاعات مشتری اصلی', en: 'Primary Customer', ar: 'العميل الرئيسي', zh: '主要客户', ru: 'Основной клиент' })}</span>
              </h3>
              <div className="space-y-2 text-xs text-sub">
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span>{lt(locale, { fa: 'نام:', en: 'Name:', ar: 'الاسم:', zh: '姓名:', ru: 'Имя:' })}</span>
                  <span className="font-black text-ink">{trip.user.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span>{lt(locale, { fa: 'شماره تماس:', en: 'Phone:', ar: 'الهاتف:', zh: '电话:', ru: 'Телефон:' })}</span>
                  <span className="font-bold text-ink" dir="ltr">{trip.user.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span>{lt(locale, { fa: 'ایمیل:', en: 'Email:', ar: 'البريد:', zh: '邮箱:', ru: 'Email:' })}</span>
                  <span className="font-bold text-ink truncate max-w-[150px]">{trip.user.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Travelers & Documents */}
            <div className="bg-surface rounded-3xl border border-line p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-ink flex items-center gap-2">
                <FileText size={18} className="text-brand-dark" />
                <span>{lt(locale, { fa: 'مسافران و اسناد سفر', en: 'Travelers & Documents', ar: 'المسافرون والوثائق', zh: '旅客与证件', ru: 'Пассажиры и документы' })}</span>
              </h3>
              {trip.user.travelerProfiles.length === 0 ? (
                <p className="text-xs text-sub">{lt(locale, { fa: 'پروفایل مسافر مجزایی ثبت نشده است.', en: 'No separate traveler profile registered.', ar: 'لم يتم تسجيل ملف مسافر منفصل.', zh: '暂无独立旅客档案。', ru: 'Отдельный профиль не зарегистрирован.' })}</p>
              ) : (
                <div className="space-y-3">
                  {trip.user.travelerProfiles.map((tp) => (
                    <div key={tp.id} className="p-3 rounded-2xl bg-soft/50 border border-line/70 text-xs space-y-1.5">
                      <div className="font-black text-ink flex items-center justify-between">
                        <span>{tp.firstName} {tp.lastName}</span>
                        <span className="text-[10px] text-sub">{tp.nationality}</span>
                      </div>
                      {tp.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-[11px] text-sub pt-1 border-t border-line/40">
                          <span className="font-bold">{doc.type}:</span>
                          <span className="font-black text-ink">{doc.documentNumber}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
