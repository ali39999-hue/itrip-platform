import { requirePermission } from '@/domains/identity/permission-service';
import { OrganizationService } from '@/domains/identity/OrganizationService';
import { toPlain } from '@/lib/serialize';
import { OrganizationsClientPage } from './OrganizationsClientPage';

export const dynamic = 'force-dynamic';

export default async function AdminOrganizationsPage() {
  await requirePermission(['booking:view:all', 'ops:override:cancel']);

  const res = await OrganizationService.listOrganizations({ limit: 50 });
  const plainItems = toPlain(res.items);

  return (
    <OrganizationsClientPage
      initialItems={plainItems}
      initialTotal={res.total}
    />
  );
}
