import { prisma } from '@/lib/prisma';
import { createLogger, redactSensitiveData } from '@/lib/observability/logger';
import { createHash } from 'crypto';

const logger = createLogger('ErrorTrackerService');

export type ErrorSeverity = 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO';

export type ErrorSource =
  | 'SERVER_ACTION'
  | 'API_ROUTE'
  | 'DB_PRISMA'
  | 'CLIENT_REACT'
  | 'MIDDLEWARE'
  | 'CRON'
  | 'EXTERNAL_API'
  | 'SECURITY';

export type ErrorStatus = 'UNRESOLVED' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';

export interface CaptureErrorOptions {
  message: string;
  stackTrace?: string | null;
  level?: ErrorSeverity;
  source?: ErrorSource;
  endpoint?: string | null;
  method?: string | null;
  statusCode?: number | null;
  userId?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | unknown;
}

export interface ErrorLogFilter {
  page?: number;
  pageSize?: number;
  status?: ErrorStatus | 'ALL';
  level?: ErrorSeverity | 'ALL';
  source?: ErrorSource | 'ALL';
  query?: string;
  startDate?: string;
  endDate?: string;
}

export interface ErrorStats {
  total24h: number;
  unresolvedCount: number;
  criticalCount: number;
  sourcesBreakdown: Record<string, number>;
  levelsBreakdown: Record<string, number>;
  systemHealthScore: number;
}

let isSchemaEnsured = false;

/**
 * Ensures SystemErrorLog table exists in PostgreSQL even when migrations
 * were skipped or deferred on serverless environments (Neon/Vercel).
 */
export async function ensureErrorLogSchema(): Promise<void> {
  if (isSchemaEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        CREATE TABLE IF NOT EXISTS "SystemErrorLog" (
          "id" TEXT NOT NULL,
          "fingerprint" TEXT NOT NULL,
          "level" TEXT NOT NULL DEFAULT 'ERROR',
          "source" TEXT NOT NULL DEFAULT 'SERVER',
          "message" TEXT NOT NULL,
          "stackTrace" TEXT,
          "endpoint" TEXT,
          "method" TEXT,
          "statusCode" INTEGER,
          "occurrences" INTEGER NOT NULL DEFAULT 1,
          "status" TEXT NOT NULL DEFAULT 'UNRESOLVED',
          "userId" TEXT,
          "userRole" TEXT,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "metadata" TEXT,
          "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "resolvedAt" TIMESTAMP(3),
          "resolvedById" TEXT,
          CONSTRAINT "SystemErrorLog_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_fingerprint_idx" ON "SystemErrorLog"("fingerprint");
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_status_idx" ON "SystemErrorLog"("status");
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_level_idx" ON "SystemErrorLog"("level");
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_source_idx" ON "SystemErrorLog"("source");
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_lastSeenAt_idx" ON "SystemErrorLog"("lastSeenAt");
      END $$;
    `);
    isSchemaEnsured = true;
  } catch (err) {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SystemErrorLog" (
          "id" TEXT NOT NULL,
          "fingerprint" TEXT NOT NULL,
          "level" TEXT NOT NULL DEFAULT 'ERROR',
          "source" TEXT NOT NULL DEFAULT 'SERVER',
          "message" TEXT NOT NULL,
          "stackTrace" TEXT,
          "endpoint" TEXT,
          "method" TEXT,
          "statusCode" INTEGER,
          "occurrences" INTEGER NOT NULL DEFAULT 1,
          "status" TEXT NOT NULL DEFAULT 'UNRESOLVED',
          "userId" TEXT,
          "userRole" TEXT,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "metadata" TEXT,
          "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "resolvedAt" TIMESTAMP(3),
          "resolvedById" TEXT,
          CONSTRAINT "SystemErrorLog_pkey" PRIMARY KEY ("id")
        )
      `);
      isSchemaEnsured = true;
    } catch (fallbackErr) {
      console.warn('[ErrorTrackerService.ensureErrorLogSchema] Notice:', err, fallbackErr);
    }
  }
}

/**
 * Normalizes message and top stack trace to compute a deterministic deduplication fingerprint.
 */
export function computeErrorFingerprint(
  source: string,
  message: string,
  stack?: string | null,
  endpoint?: string | null,
): string {
  // Replace volatile values like UUIDs, ObjectIDs, dates, numbers with generic tokens
  const cleanMsg = message
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, ':uuid:')
    .replace(/c[a-z0-9]{24}/gi, ':cuid:')
    .replace(/\b\d{4,}\b/g, ':num:')
    .trim()
    .slice(0, 250);

  // Extract first meaningful application frame from stack trace
  let topFrame = '';
  if (stack) {
    const lines = stack.split('\n').map((l) => l.trim());
    const appLine = lines.find((l) => l.startsWith('at ') && (l.includes('src/') || l.includes('app/'))) || lines[1] || '';
    topFrame = appLine.replace(/:line \d+/i, '').replace(/:\d+:\d+/g, '');
  }

  const ep = endpoint ? endpoint.split('?')[0].trim() : '';
  const raw = `${source}:${ep}:${cleanMsg}:${topFrame}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export class ErrorTrackerService {
  /**
   * Captures an error, redacting any PII, computing fingerprint, and deduplicating
   * with existing unresolved errors within the last 7 days.
   */
  static async captureError(options: CaptureErrorOptions): Promise<string> {
    const {
      message,
      stackTrace = null,
      level = 'ERROR',
      source = 'SERVER_ACTION',
      endpoint = null,
      method = null,
      statusCode = null,
      userId = null,
      userRole = null,
      ipAddress = null,
      userAgent = null,
      metadata = null,
    } = options;

    if (!message || typeof message !== 'string') {
      return '';
    }

    await ensureErrorLogSchema();

    const fingerprint = computeErrorFingerprint(source, message, stackTrace, endpoint);

    // Sanitize metadata to guarantee no credentials or payment PII can leak
    let sanitizedMetadataJson: string | null = null;
    if (metadata !== null && metadata !== undefined) {
      try {
        const cleaned = redactSensitiveData(metadata);
        sanitizedMetadataJson = JSON.stringify(cleaned).slice(0, 8000);
      } catch {
        sanitizedMetadataJson = JSON.stringify({ note: 'Failed to serialize metadata' });
      }
    }

    // Log to standard JSON logger as well
    logger.error(`[${source}] ${message}`, {
      fingerprint,
      level,
      source,
      endpoint,
      userId,
      statusCode,
    });

    try {
      // Deduplication: look for an existing unresolved error with same fingerprint in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const existing = await prisma.systemErrorLog.findFirst({
        where: {
          fingerprint,
          status: 'UNRESOLVED',
          lastSeenAt: { gte: sevenDaysAgo },
        },
        orderBy: { lastSeenAt: 'desc' },
      });

      if (existing) {
        const updated = await prisma.systemErrorLog.update({
          where: { id: existing.id },
          data: {
            occurrences: { increment: 1 },
            lastSeenAt: new Date(),
            // Keep the latest stack trace or metadata if previous was null
            ...(existing.stackTrace === null && stackTrace ? { stackTrace } : {}),
            ...(existing.metadata === null && sanitizedMetadataJson ? { metadata: sanitizedMetadataJson } : {}),
          },
        });
        return updated.id;
      }

      // Create new error record
      const created = await prisma.systemErrorLog.create({
        data: {
          fingerprint,
          level,
          source,
          message: message.slice(0, 4000),
          stackTrace: stackTrace ? stackTrace.slice(0, 10000) : null,
          endpoint: endpoint ? endpoint.slice(0, 500) : null,
          method: method ? method.slice(0, 20) : null,
          statusCode: typeof statusCode === 'number' ? statusCode : null,
          occurrences: 1,
          status: 'UNRESOLVED',
          userId: userId ? String(userId).slice(0, 100) : null,
          userRole: userRole ? String(userRole).slice(0, 50) : null,
          ipAddress: ipAddress ? String(ipAddress).slice(0, 60) : null,
          userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
          metadata: sanitizedMetadataJson,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
      return created.id;
    } catch (dbErr) {
      console.warn('[ErrorTrackerService.captureError] Failed to persist error log:', dbErr);
      return '';
    }
  }

  /**
   * Fetches paginated logs matching filter criteria.
   */
  static async getLogs(filter: ErrorLogFilter = {}) {
    await ensureErrorLogSchema();

    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(100, Math.max(5, filter.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (filter.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }
    if (filter.level && filter.level !== 'ALL') {
      where.level = filter.level;
    }
    if (filter.source && filter.source !== 'ALL') {
      where.source = filter.source;
    }

    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { message: { contains: q, mode: 'insensitive' } },
        { endpoint: { contains: q, mode: 'insensitive' } },
        { userId: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filter.startDate || filter.endDate) {
      where.lastSeenAt = {
        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
      };
    }

    try {
      const [logs, total] = await Promise.all([
        prisma.systemErrorLog.findMany({
          where,
          orderBy: [{ lastSeenAt: 'desc' }, { occurrences: 'desc' }],
          skip,
          take: pageSize,
        }),
        prisma.systemErrorLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    } catch (err) {
      console.warn('[ErrorTrackerService.getLogs] Error fetching logs:', err);
      return {
        logs: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 1,
      };
    }
  }

  /**
   * Computes health metrics and diagnostic stats for the dashboard.
   */
  static async getStats(): Promise<ErrorStats> {
    await ensureErrorLogSchema();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const [allUnresolved, last24hLogs] = await Promise.all([
        prisma.systemErrorLog.findMany({
          where: { status: 'UNRESOLVED' },
          select: { level: true, source: true, occurrences: true },
        }),
        prisma.systemErrorLog.findMany({
          where: { lastSeenAt: { gte: oneDayAgo } },
          select: { level: true, source: true, occurrences: true },
        }),
      ]);

      let total24h = 0;
      const sourcesBreakdown: Record<string, number> = {};
      const levelsBreakdown: Record<string, number> = {};

      for (const log of last24hLogs) {
        total24h += log.occurrences;
        sourcesBreakdown[log.source] = (sourcesBreakdown[log.source] || 0) + log.occurrences;
        levelsBreakdown[log.level] = (levelsBreakdown[log.level] || 0) + log.occurrences;
      }

      const unresolvedCount = allUnresolved.reduce((acc, l) => acc + l.occurrences, 0);
      const criticalCount = allUnresolved
        .filter((l) => l.level === 'CRITICAL')
        .reduce((acc, l) => acc + l.occurrences, 0);

      // System Health score calculation:
      // 100 base, deductions: Critical = -20 each, Error = -2 each, capped between 0 and 100
      const errorCount = allUnresolved.filter((l) => l.level === 'ERROR').length;
      const deduction = criticalCount * 20 + errorCount * 2;
      const systemHealthScore = Math.max(0, Math.min(100, 100 - deduction));

      return {
        total24h,
        unresolvedCount,
        criticalCount,
        sourcesBreakdown,
        levelsBreakdown,
        systemHealthScore,
      };
    } catch (err) {
      console.warn('[ErrorTrackerService.getStats] Error computing stats:', err);
      return {
        total24h: 0,
        unresolvedCount: 0,
        criticalCount: 0,
        sourcesBreakdown: {},
        levelsBreakdown: {},
        systemHealthScore: 100,
      };
    }
  }

  /**
   * Marks a specific log as resolved.
   */
  static async resolveLog(id: string, resolvedById?: string): Promise<boolean> {
    await ensureErrorLogSchema();
    try {
      await prisma.systemErrorLog.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedById: resolvedById || null,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolves all unresolved logs, optionally filtered by level or source.
   */
  static async resolveAll(level?: ErrorSeverity, source?: ErrorSource): Promise<number> {
    await ensureErrorLogSchema();
    const where: Record<string, unknown> = { status: 'UNRESOLVED' };
    if (level) where.level = level;
    if (source) where.source = source;

    try {
      const result = await prisma.systemErrorLog.updateMany({
        where,
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
      return result.count;
    } catch {
      return 0;
    }
  }

  /**
   * Permanently deletes a single log by ID.
   */
  static async deleteLog(id: string): Promise<boolean> {
    await ensureErrorLogSchema();
    try {
      await prisma.systemErrorLog.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears all resolved logs immediately from the database.
   */
  static async clearResolvedLogs(): Promise<number> {
    await ensureErrorLogSchema();
    try {
      const result = await prisma.systemErrorLog.deleteMany({
        where: { status: 'RESOLVED' },
      });
      return result.count;
    } catch {
      return 0;
    }
  }

  /**
   * Clears all system logs completely (admin wipe).
   */
  static async clearAllLogs(level?: ErrorSeverity): Promise<number> {
    await ensureErrorLogSchema();
    const where: Record<string, unknown> = {};
    if (level) where.level = level;
    try {
      const result = await prisma.systemErrorLog.deleteMany({ where });
      return result.count;
    } catch {
      return 0;
    }
  }

  /**
   * Purges resolved or old logs past specified retention days.
   */
  static async purgeOldLogs(daysOlderThan = 30): Promise<number> {
    await ensureErrorLogSchema();
    const cutoff = new Date(Date.now() - daysOlderThan * 24 * 60 * 60 * 1000);
    try {
      const result = await prisma.systemErrorLog.deleteMany({
        where: {
          OR: [
            { status: 'RESOLVED', lastSeenAt: { lte: cutoff } },
            { lastSeenAt: { lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }, // Hard ceiling: 90 days
          ],
        },
      });
      return result.count;
    } catch {
      return 0;
    }
  }

  /**
   * Generates a sample diagnostic error to test the tracker in the UI.
   */
  static async generateTestError(
    level: ErrorSeverity = 'ERROR',
    source: ErrorSource = 'SERVER_ACTION',
  ): Promise<string> {
    const timestamp = new Date().toLocaleTimeString('fa-IR');
    const fakeErrors = [
      `[DiagnosticTest] Simulated payment gateway timeout on Ecardo Sandbox (TS: ${timestamp})`,
      `[DiagnosticTest] Simulated flight supplier seat lock race condition (TS: ${timestamp})`,
      `[DiagnosticTest] Simulated database advisory lock warning (TS: ${timestamp})`,
    ];
    const pickedMsg = fakeErrors[Math.floor(Math.random() * fakeErrors.length)];

    return this.captureError({
      message: pickedMsg,
      stackTrace: `Error: ${pickedMsg}\n    at triggerTestSystemErrorAction (src/actions/system-logs.ts:85:12)\n    at Object.handler (src/domains/observability/ErrorTrackerService.ts:255:7)`,
      level,
      source,
      endpoint: '/api/admin/diagnostics/test',
      method: 'POST',
      statusCode: level === 'CRITICAL' ? 503 : 500,
      metadata: {
        simulation: true,
        generatedAt: new Date().toISOString(),
        testPayload: {
          cardNumber: '6037-9971-1234-5678', // Will be safely redacted by PII engine
          token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        },
      },
    });
  }
}
