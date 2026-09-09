import { getLocale } from 'next-intl/server';
import { listCardTransferReceipts } from '@/actions/receipts';
import { listCryptoPayments } from '@/actions/crypto-payments';
import { ReceiptsClientPage } from './ReceiptsClientPage';

export const dynamic = 'force-dynamic';

export default async function AdminReceiptsPage() {
  const locale = await getLocale();
  const [cardResult, cryptoResult] = await Promise.all([
    listCardTransferReceipts({ status: 'ALL', limit: 50 }),
    listCryptoPayments({ status: 'ALL', limit: 50 }),
  ]);

  return (
    <ReceiptsClientPage
      locale={locale}
      initialReceipts={cardResult.data || []}
      totalCount={cardResult.total || 0}
      initialCryptoReceipts={cryptoResult.data || []}
      totalCryptoCount={cryptoResult.total || 0}
    />
  );
}
