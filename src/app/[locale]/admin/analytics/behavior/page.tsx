import { requirePermission } from '@/domains/identity/permission-service';
import { BehaviorDashboardClient } from '@/components/behavior/BehaviorDashboardClient';

export const dynamic = 'force-dynamic';

export default async function BehaviorAnalyticsPage() {
  await requirePermission(['booking:view:all', 'ops:override:cancel', 'user:manage']);
  return <BehaviorDashboardClient />;
}
