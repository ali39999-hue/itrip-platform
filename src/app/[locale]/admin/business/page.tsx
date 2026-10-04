import { getBusinessRequests } from '@/actions/business-ops';
import { requirePermission } from '@/domains/identity/permission-service';
import { BusinessOpsClientPage, type BusinessRequestRow } from './BusinessOpsClientPage';

export default async function AdminBusinessPage() {
  // Fail closed: only staff holding the review permission reach the operator queue.
  let allowed = true;
  try {
    await requirePermission('business:request:review');
  } catch {
    allowed = false;
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-border/80 bg-surface p-6">
        <h1 className="font-bold text-text-title">دسترسی غیرمجاز</h1>
        <p className="mt-2 text-sm text-text-muted">
          برای مشاهده صف درخواست‌های تور تخصصی به نقش کارشناس نیاز دارید.
        </p>
      </div>
    );
  }

  const result = await getBusinessRequests();
  const requests = (result.success && result.requests ? result.requests : []) as Array<{
    id: string;
    code: string;
    status: string;
    paxCount: number;
    totalAmount: number;
    depositAmount: number;
    grantAmount: number;
    paidAmount: number;
    createdAt: Date;
    company: { name: string; repName: string };
    departure: { departDate: Date; package: { title: string; destination: string } };
  }>;

  const rows: BusinessRequestRow[] = requests.map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    paxCount: r.paxCount,
    totalAmount: r.totalAmount,
    depositAmount: r.depositAmount,
    grantAmount: r.grantAmount,
    paidAmount: r.paidAmount,
    companyName: r.company?.name ?? '—',
    repName: r.company?.repName ?? '—',
    packageTitle: r.departure?.package?.title ?? '—',
    destination: r.departure?.package?.destination ?? '—',
    departDate: r.departure?.departDate ? new Date(r.departure.departDate).toISOString() : '',
    createdAt: new Date(r.createdAt).toISOString(),
  }));

  return <BusinessOpsClientPage rows={rows} />;
}
