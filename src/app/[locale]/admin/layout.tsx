import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { safeAuth } from '@/auth';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  // Server-side authorization gate: a single source of truth (the signed
  // session), never the client localStorage store.
  const session = await safeAuth();
  if (!session || !['SUPER_ADMIN', 'FINANCE', 'OPS'].includes(session.user.role)) {
    redirect('/' + locale + '/auth');
  }

  return (
    <AdminShell userName={session.user.name || 'Admin'} role={session.user.role}>
      {children}
    </AdminShell>
  );
}
