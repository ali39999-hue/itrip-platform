import { requirePermission } from '@/domains/identity/permission-service';
import { ErrorTrackerService } from '@/domains/observability/ErrorTrackerService';
import { getLocale } from 'next-intl/server';
import { SystemLogsClientPage } from './SystemLogsClientPage';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'مرکز وقایع و خطاهای سیستم | پنل مدیریت فیروزو',
  description: 'مانیتورینگ و عیب‌یابی لحظه‌ای خطاهای فنی، کرش‌های سرور و کلاینت',
};

export default async function SystemLogsPage() {
  await requirePermission(['audit:view', 'ops:override:cancel', 'booking:view:all']);
  const locale = await getLocale();

  const [logsResult, stats] = await Promise.all([
    ErrorTrackerService.getLogs({ page: 1, pageSize: 25 }),
    ErrorTrackerService.getStats(),
  ]);

  const sanitizedLogs = logsResult.logs.map((log) => ({
    id: log.id,
    fingerprint: log.fingerprint,
    level: log.level,
    source: log.source,
    message: log.message,
    stackTrace: log.stackTrace,
    endpoint: log.endpoint,
    method: log.method,
    statusCode: log.statusCode,
    occurrences: log.occurrences,
    status: log.status,
    userId: log.userId,
    userRole: log.userRole,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    metadata: log.metadata ? JSON.parse(log.metadata) : null,
    firstSeenAt: log.firstSeenAt.toISOString(),
    lastSeenAt: log.lastSeenAt.toISOString(),
    resolvedAt: log.resolvedAt ? log.resolvedAt.toISOString() : null,
  }));

  return (
    <SystemLogsClientPage
      initialLogs={sanitizedLogs}
      initialTotal={logsResult.total}
      initialStats={stats}
      locale={locale}
    />
  );
}
