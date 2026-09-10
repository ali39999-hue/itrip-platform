import { getLocale } from 'next-intl/server';
import { getAdminSettlementBatches, getAdminSuppliers } from '@/actions/admin';
import { SettlementsClientPage } from './SettlementsClientPage';

export default async function AdminSettlementsPage() {
  const locale = await getLocale();
  const [batchesRes, suppliers] = await Promise.all([
    getAdminSettlementBatches(),
    getAdminSuppliers(),
  ]);

  const batches = batchesRes.batches || [];

  return (
    <SettlementsClientPage
      locale={locale}
      initialBatches={batches}
      suppliers={suppliers}
    />
  );
}
