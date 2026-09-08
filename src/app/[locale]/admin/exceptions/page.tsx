import { requirePermission } from '@/domains/identity/permission-service';
import { ExceptionCenterService } from '@/domains/erp/ExceptionCenterService';
import { getLocale } from 'next-intl/server';
import { ExceptionCenterClient } from './ExceptionCenterClient';

export const dynamic = 'force-dynamic';

export default async function ExceptionCenterPage() {
  await requirePermission(['booking:view:all', 'ops:override:cancel']);
  const locale = await getLocale();

  const [exceptions, stats] = await Promise.all([
    ExceptionCenterService.getExceptions(),
    ExceptionCenterService.getExceptionStats(),
  ]);

  return <ExceptionCenterClient exceptions={exceptions} stats={stats} locale={locale} />;
}
