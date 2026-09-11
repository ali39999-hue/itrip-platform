import { InvoiceDomainService } from '@/domains/finance/InvoiceDomainService';
import { safeAuth } from '@/auth';
import { hasErpRole } from '@/domains/identity/permission-service';
import { notFound } from 'next/navigation';
import { toPlain } from '@/lib/serialize';
import { OfficialTaxInvoiceDocument } from './OfficialTaxInvoiceDocument';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  const session = await safeAuth();
  let callerUserId: string | undefined;

  if (session?.user?.id) {
    const isStaff = await hasErpRole(session.user.id);
    if (!isStaff) {
      callerUserId = session.user.id;
    }
  }

  const taxData = await InvoiceDomainService.getOfficialTaxInvoiceData(id, callerUserId);
  if (!taxData) {
    notFound();
  }

  const plainData = toPlain(taxData);

  return <OfficialTaxInvoiceDocument invoiceData={plainData} />;
}
