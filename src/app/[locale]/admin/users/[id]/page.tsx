import { requirePermission, getTenantAuthContext } from '@/domains/identity/permission-service';
import { Customer360Service, Customer360AccessDeniedError } from '@/domains/identity/Customer360Service';
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

  // Tenant isolation is enforced inside the service; cross-tenant targets are
  // indistinguishable from missing ones (404, never 403).
  const rawData = await Customer360Service.getCustomer360(id, tenantCtx).catch((err) => {
    if (err instanceof Customer360AccessDeniedError) return null;
    throw err;
  });
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
