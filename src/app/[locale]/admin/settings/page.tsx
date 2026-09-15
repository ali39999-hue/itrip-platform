import { getLocale } from 'next-intl/server';
import { safeAuth } from '@/auth';
import { hasErpRole } from '@/domains/identity/permission-service';
import { redirect } from 'next/navigation';
import {
  getSmsSettingsAction,
  getGeneralPlatformSettingsAction,
  getAdminBankCardsAction,
  getAdminCryptoWalletsAction,
} from '@/actions/admin-settings';
import { getAdminPaymentModeAction } from '@/actions/admin-payment-mode';
import { AdminSettingsClientPage } from './AdminSettingsClientPage';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const locale = await getLocale();
  const session = await safeAuth();

  const authorized = session ? await hasErpRole(session.user.id) : false;
  if (!session || !authorized) {
    redirect('/' + locale + '/auth');
  }

  const [smsRes, generalRes, bankCardsRes, cryptoWalletsRes, paymentModeRes] = await Promise.all([
    getSmsSettingsAction(),
    getGeneralPlatformSettingsAction(),
    getAdminBankCardsAction(),
    getAdminCryptoWalletsAction(),
    getAdminPaymentModeAction(),
  ]);

  return (
    <AdminSettingsClientPage
      initialSmsSettings={smsRes.settings}
      initialGeneralSettings={generalRes.settings}
      initialBankCards={bankCardsRes.cards}
      initialCryptoWallets={cryptoWalletsRes.wallets}
      recentSmsLogs={smsRes.recentLogs}
      initialPaymentMode={paymentModeRes.mode}
      locale={locale}
    />
  );
}
