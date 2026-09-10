import { getLocale } from 'next-intl/server';
import { getAdminUsers } from '@/actions/admin-users';
import { UsersClientPage } from './UsersClientPage';

export default async function AdminUsersPage() {
  const locale = await getLocale();
  const res = await getAdminUsers({ limit: 50 });

  return (
    <UsersClientPage
      locale={locale}
      initialUsers={res.users || []}
      initialTotal={res.total || 0}
    />
  );
}
