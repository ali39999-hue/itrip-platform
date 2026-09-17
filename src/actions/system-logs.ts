'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import {
  ErrorTrackerService,
  ErrorLogFilter,
  ErrorSeverity,
  ErrorSource,
} from '@/domains/observability/ErrorTrackerService';

async function checkDiagnosticsAuth(): Promise<{ isAuthed: boolean; userId?: string }> {
  try {
    const session = await auth();
    if (session?.user) {
      const role = session.user.role;
      if (
        role === 'SUPER_ADMIN' ||
        role === 'ADMIN' ||
        role === 'OPS' ||
        role === 'OPERATOR' ||
        role === 'FINANCE'
      ) {
        return { isAuthed: true, userId: session.user.id };
      }

      const { isKnownAdminIdentifier } = await import('@/auth');
      if (session.user.email && isKnownAdminIdentifier(session.user.email)) {
        return { isAuthed: true, userId: session.user.id };
      }

      const { hasErpRole } = await import('@/domains/identity/permission-service');
      const hasRole = await hasErpRole(session.user.id);
      if (hasRole) return { isAuthed: true, userId: session.user.id };
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'test' || !session)
    ) {
      return { isAuthed: true, userId: 'dev-admin' };
    }

    return { isAuthed: false };
  } catch (err) {
    console.warn('[checkDiagnosticsAuth] Auth warning:', err);
    return { isAuthed: process.env.NODE_ENV !== 'production', userId: 'fallback-admin' };
  }
}

function safeParseLogMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : { value: parsed };
  } catch {
    return { raw };
  }
}

export async function getSystemLogsAction(filter: ErrorLogFilter = {}) {
  try {
    const { isAuthed } = await checkDiagnosticsAuth();
    if (!isAuthed) {
      return { success: false, error: 'Unauthorized', logs: [], total: 0, stats: null };
    }

    const [logsResult, stats] = await Promise.all([
      ErrorTrackerService.getLogs(filter),
      ErrorTrackerService.getStats(),
    ]);

    // Format logs serializable for client components
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
      metadata: safeParseLogMetadata(log.metadata),
      firstSeenAt: log.firstSeenAt.toISOString(),
      lastSeenAt: log.lastSeenAt.toISOString(),
      resolvedAt: log.resolvedAt ? log.resolvedAt.toISOString() : null,
    }));

    return {
      success: true,
      logs: sanitizedLogs,
      total: logsResult.total,
      page: logsResult.page,
      pageSize: logsResult.pageSize,
      totalPages: logsResult.totalPages,
      stats,
    };
  } catch (e: unknown) {
    console.error('getSystemLogsAction error:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to fetch diagnostic logs',
      logs: [],
      total: 0,
      stats: null,
    };
  }
}

export async function resolveSystemLogAction(id: string) {
  try {
    const { isAuthed, userId } = await checkDiagnosticsAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const ok = await ErrorTrackerService.resolveLog(id, userId);
    revalidatePath('/[locale]/admin/logs', 'page');
    return { success: ok };
  } catch (e: unknown) {
    console.error('resolveSystemLogAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to resolve error' };
  }
}

export async function resolveAllSystemLogsAction(level?: ErrorSeverity, source?: ErrorSource) {
  try {
    const { isAuthed } = await checkDiagnosticsAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const count = await ErrorTrackerService.resolveAll(level, source);
    revalidatePath('/[locale]/admin/logs', 'page');
    return { success: true, count };
  } catch (e: unknown) {
    console.error('resolveAllSystemLogsAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to resolve all errors' };
  }
}

export async function purgeOldSystemLogsAction(days = 30) {
  try {
    const { isAuthed } = await checkDiagnosticsAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const count = await ErrorTrackerService.purgeOldLogs(days);
    revalidatePath('/[locale]/admin/logs', 'page');
    return { success: true, count };
  } catch (e: unknown) {
    console.error('purgeOldSystemLogsAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to purge old logs' };
  }
}

export async function triggerTestSystemErrorAction(level: ErrorSeverity = 'ERROR') {
  try {
    const { isAuthed } = await checkDiagnosticsAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const logId = await ErrorTrackerService.generateTestError(level);
    revalidatePath('/[locale]/admin/logs', 'page');
    return { success: true, logId };
  } catch (e: unknown) {
    console.error('triggerTestSystemErrorAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to generate test error' };
  }
}
