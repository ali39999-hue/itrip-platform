import { requirePermission, getTenantAuthContext, assertTenantAccess } from '@/domains/identity/permission-service';
import { TravelFileService } from '@/domains/erp/TravelFileService';
import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { ArrowLeft, AlertOctagon } from 'lucide-react';
import { TravelFileWorkspaceClient } from './TravelFileWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function TravelFileDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(['booking:view:all', 'ops:override:cancel']);
  const tenantCtx = await getTenantAuthContext(user.id);
  const locale = await getLocale();

  let data;
  try {
    data = await TravelFileService.getTravelFile(id, {
      userId: user.id,
      permissions: Array.from(tenantCtx.permissions),
      isSuperAdmin: tenantCtx.isSuperAdmin,
    });
  } catch {
    notFound();
  }

  // Tenant security boundary check
  assertTenantAccess(tenantCtx, {
    organizationId: data.trip.organizationId || undefined,
    branchId: data.trip.branchId || undefined,
    customerId: data.customer.id,
  });

  return (
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
          {data.trip.status}
        </span>
      </div>

      {/* Dossier Header Card */}
      <div className="bg-surface p-6 rounded-3xl border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-brand-dark text-surface text-xs font-black tracking-wider">
              {data.trip.reference}
            </span>
            <h1 className="text-xl md:text-2xl font-black text-ink">{data.trip.title}</h1>
          </div>
          <p className="text-xs text-sub font-medium">
            {lt(locale, { fa: 'شناسه یکتای سیستمی پرونده:', en: 'System Dossier ID:', ar: 'معرف الملف:', zh: '档案编号:', ru: 'ID дела:' })}{' '}
            <code className="text-ink font-bold">{data.trip.id}</code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t md:border-t-0 md:border-s border-line pt-4 md:pt-0 md:ps-6">
          <div>
            <span className="block text-[11px] font-bold text-sub uppercase">
              {lt(locale, { fa: 'ارزش کل پرونده', en: 'Total Gross Value', ar: 'إجمالي القيمة', zh: '总价值', ru: 'Общая сумма' })}
            </span>
            <span className="text-xl font-black text-brand-dark">
              {data.summary.totalGrossAmount.toLocaleString()} <span className="text-xs font-bold">{data.summary.currency}</span>
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-bold text-sub uppercase">
              {lt(locale, { fa: 'دریافتی ناخالص', en: 'Paid / Captured', ar: 'المدفوع', zh: '已支付', ru: 'Оплачено' })}
            </span>
            <span className="text-xl font-black text-emerald-600">
              {data.summary.totalPaidAmount.toLocaleString()} <span className="text-xs font-bold">{data.summary.currency}</span>
            </span>
          </div>

          {data.summary.hasBreachedSla && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-black">
              <AlertOctagon size={14} />
              <span>SLA Breached</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Workspace with Consolidated Tabs & Actions */}
      <TravelFileWorkspaceClient data={data} locale={locale} />
    </div>
  );
}
