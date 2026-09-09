import { requirePermission, getTenantAuthContext, assertTenantAccess } from '@/domains/identity/permission-service';
import { TravelFileService } from '@/domains/erp/TravelFileService';
import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { toPlain } from '@/lib/serialize';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { ArrowRight, Briefcase } from 'lucide-react';
import { TravelFileWorkspaceClient } from './TravelFileWorkspaceClient';
import { ErpBadge } from '@/components/admin/erp-ui';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STEPS = ['PLANNING', 'BOOKED', 'IN_PROGRESS', 'COMPLETED'] as const;

function statusTone(status: string): 'green' | 'rose' | 'brand' | 'neutral' {
  if (status === 'COMPLETED') return 'green';
  if (status === 'CANCELLED') return 'rose';
  if (status === 'IN_PROGRESS' || status === 'BOOKED') return 'brand';
  return 'neutral';
}

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
    // toPlain: Prisma Decimals (booking totals, item prices) cannot cross the
    // Server → Client Component boundary as class instances.
    data = toPlain(
      await TravelFileService.getTravelFile(id, {
        userId: user.id,
        permissions: Array.from(tenantCtx.permissions),
        isSuperAdmin: tenantCtx.isSuperAdmin,
      })
    );
  } catch {
    notFound();
  }

  // Tenant security boundary check
  assertTenantAccess(tenantCtx, {
    organizationId: data.trip.organizationId || undefined,
    branchId: data.trip.branchId || undefined,
    customerId: data.customer.id,
  });

  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';
  const stepIndex = STEPS.indexOf(data.trip.status as (typeof STEPS)[number]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/travel-files"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-black text-sub shadow-elev-1 transition hover:border-brand/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowRight size={14} aria-hidden="true" className="rtl:rotate-180" />
          <span>{lt(locale, { fa: 'بازگشت به پرونده‌ها', en: 'Back to Travel Files', ar: 'العودة لقائمة الملفات', zh: '返回档案列表', ru: 'Назад к списку' })}</span>
        </Link>
        <ErpBadge tone={statusTone(data.trip.status)} dot>{data.trip.status}</ErpBadge>
      </div>

      {/* Dossier Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-elev-1">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-brand-dark via-brand to-mint-bright"
        />
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-deep text-mint-bright">
              <Briefcase size={21} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="mb-1 inline-block rounded-lg bg-deep px-2.5 py-1 font-mono text-[11px] font-black tracking-wider text-surface" dir="ltr">
                {data.trip.reference}
              </span>
              <h1 className="truncate text-xl font-black text-ink sm:text-2xl">{data.trip.title}</h1>
              <p className="mt-1 truncate text-[11px] font-medium text-sub" dir="ltr" title={data.trip.id}>
                ID: {data.trip.id}
              </p>
              {/* Status stepper */}
              {stepIndex >= 0 && (
                <ol className="mt-3 flex items-center gap-1" aria-label="Dossier progress">
                  {STEPS.map((s, i) => (
                    <li key={s} className="flex items-center gap-1">
                      <span
                        title={s}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          i <= stepIndex ? 'w-8 bg-brand' : 'w-4 bg-line',
                        )}
                      />
                    </li>
                  ))}
                  <span className="ms-2 text-[10px] font-black text-sub">{stepIndex + 1}/4</span>
                </ol>
              )}
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3 lg:flex lg:items-center">
            <div className="rounded-2xl bg-soft/60 px-4 py-3">
              <span className="block text-[10px] font-black tracking-wide text-sub uppercase">
                {lt(locale, { fa: 'ارزش کل', en: 'Gross value', ar: 'إجمالي القيمة', zh: '总价值', ru: 'Сумма' })}
              </span>
              <span className="num mt-0.5 block text-lg font-black text-brand-dark tabular-nums" dir="ltr">
                {data.summary.totalGrossAmount.toLocaleString(numFmt)} <span className="text-[10px] font-bold text-sub">{data.summary.currency}</span>
              </span>
            </div>
            <div className="rounded-2xl bg-success/8 px-4 py-3">
              <span className="block text-[10px] font-black tracking-wide text-sub uppercase">
                {lt(locale, { fa: 'دریافتی', en: 'Paid', ar: 'المدفوع', zh: '已收', ru: 'Оплачено' })}
              </span>
              <span className="num mt-0.5 block text-lg font-black text-success tabular-nums" dir="ltr">
                {data.summary.totalPaidAmount.toLocaleString(numFmt)} <span className="text-[10px] font-bold text-sub">{data.summary.currency}</span>
              </span>
            </div>
            {data.summary.hasBreachedSla && (
              <ErpBadge tone="rose" className="col-span-2 justify-center lg:col-span-1">SLA BREACHED</ErpBadge>
            )}
          </div>
        </div>
      </div>

      <TravelFileWorkspaceClient data={data} locale={locale} />
    </div>
  );
}
