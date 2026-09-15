import { getLocale } from 'next-intl/server';
import { safeAuth } from '@/auth';
import { hasErpRole } from '@/domains/identity/permission-service';
import { redirect } from 'next/navigation';
import { getAdminTicketsAction } from '@/actions/tickets';
import { AdminTicketsClientPage } from './AdminTicketsClientPage';

export const dynamic = 'force-dynamic';

export default async function AdminTicketsPage() {
  const locale = await getLocale();
  const session = await safeAuth();

  const authorized = session ? await hasErpRole(session.user.id) : false;
  if (!session || !authorized) {
    redirect('/' + locale + '/auth');
  }

  const res = await getAdminTicketsAction();
  const initialTickets = res.success ? res.tickets : [];
  const initialCounts = res.success ? res.counts : { total: 0, open: 0, inProgress: 0, waitingUser: 0, resolved: 0 };

  return (
    <AdminTicketsClientPage
      initialTickets={initialTickets}
      initialCounts={initialCounts}
      locale={locale}
    />
  );
}
