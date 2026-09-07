import { getAdminReferrals } from '@/actions/admin';
import { ReferralsClientPage } from './ReferralsClientPage';

export default async function AdminReferralsPage() {
  const result = await getAdminReferrals();
  const data = result.success && result.data ? result.data : [];

  return <ReferralsClientPage initialData={data} />;
}
