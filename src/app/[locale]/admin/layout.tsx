import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { safeAuth } from '@/auth';
import { hasErpRole } from '@/domains/identity/permission-service';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  // Server-side authorization gate: ERP access is granted by the relational
  // RBAC chain (User → UserRole → Role), never by the legacy role string.
  const session = await safeAuth();
  const authorized = session ? await hasErpRole(session.user.id) : false;
  if (!session || !authorized) {
    redirect('/' + locale + '/auth');
  }

  return (
    <AdminShell userName={session.user.name || 'Admin'} role={session.user.role}>
      {children}
    </AdminShell>
  );
}
