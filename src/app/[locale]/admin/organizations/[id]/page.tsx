import { requirePermission } from '@/domains/identity/permission-service';
import { OrganizationService } from '@/domains/identity/OrganizationService';
import { notFound } from 'next/navigation';
import { toPlain } from '@/lib/serialize';
import { OrganizationDetailWorkspaceClient } from './OrganizationDetailWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requirePermission(['booking:view:all', 'ops:override:cancel']);

  const { id } = await params;
  const org = await OrganizationService.getOrganizationById(id);
  if (!org) {
    notFound();
  }

  const plainOrg = toPlain(org);

  return <OrganizationDetailWorkspaceClient initialOrg={plainOrg} />;
}
