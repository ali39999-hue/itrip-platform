import { requirePermission, getTenantAuthContext } from '@/domains/identity/permission-service';
import { Customer360Service } from '@/domains/identity/Customer360Service';
import { notFound } from 'next/navigation';
import { toPlain } from '@/lib/serialize';
import { Customer360WorkspaceClient } from './Customer360WorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function Customer360Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  // Authorization: requires ERP operator permissions
  const currentUser = await requirePermission(['booking:view:all', 'ops:override:cancel']);
  const tenantCtx = await getTenantAuthContext(currentUser.id);

  const rawData = await Customer360Service.getCustomer360(id, tenantCtx);
  if (!rawData) {
    notFound();
  }

  const plainData = toPlain(rawData);
  const canViewPii =
    tenantCtx.isSuperAdmin || tenantCtx.permissions.has('traveler:pii:view');

  return (
    <Customer360WorkspaceClient
      customerData={plainData}
      canViewPii={canViewPii}
    />
  );
}
