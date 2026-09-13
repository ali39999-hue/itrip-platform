import { getOperatorWorkbenchAction } from '@/actions/operator';
import { getTenantAuthContext } from '@/domains/identity/permission-service';
import { OperatorWorkbenchClient } from './OperatorWorkbenchClient';

export default async function AdminOperatorPage() {
  const [result, ctx] = await Promise.all([
    getOperatorWorkbenchAction(),
    getTenantAuthContext().catch(() => null),
  ]);

  const canNotify = ctx ? ctx.isSuperAdmin || ctx.permissions.has('ops:notify') : false;

  if (!result.success) {
    return (
      <div className="rounded-2xl border border-rose-warm/30 bg-rose-warm/10 p-6 text-sm font-bold text-rose-warm">
        {result.error || 'خطا در بارگذاری میز کار اپراتور'}
      </div>
    );
  }

  return <OperatorWorkbenchClient data={result.data} canNotify={canNotify} />;
}
