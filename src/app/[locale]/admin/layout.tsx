import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { safeAuth } from '@/auth';
import { hasErpRole, getTenantAuthContext } from '@/domains/identity/permission-service';
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

  // Relational permissions drive the nav visibility inside the shell; the
  // middleware plus per-action requirePermission remain the real enforcement.
  let permissions: string[] = [];
  let role = session.user.role;
  try {
    const ctx = await getTenantAuthContext(session.user.id);
    permissions = Array.from(ctx.permissions);
    role = ctx.role;
  } catch {
    // Fail closed to an empty permission set — nav falls back to unscoped items only.
  }

  return (
    <AdminShell userName={session.user.name || 'Admin'} role={role} permissions={permissions}>
      {children}
    </AdminShell>
  );
}
