import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeErrorFingerprint,
  ErrorTrackerService,
  ensureErrorLogSchema,
} from './ErrorTrackerService';
import { prisma } from '@/lib/prisma';

describe('ErrorTrackerService - Observability & Diagnostics', () => {
  beforeEach(async () => {
    await ensureErrorLogSchema();
    // Clean up previous test logs
    try {
      await prisma.systemErrorLog.deleteMany({
        where: {
          endpoint: { contains: 'test-observability' },
        },
      });
    } catch {
      // Table might be freshly initialized
    }
  });

  describe('Fingerprint Generation & Normalization', () => {
    it('produces identical fingerprints for errors with varying UUIDs or numeric IDs', () => {
      const msg1 = 'Tour update failed for id 12345678-1234-1234-1234-123456789abc with code 500';
      const msg2 = 'Tour update failed for id 87654321-4321-4321-4321-cba987654321 with code 500';
      const stack = 'Error: Fail\n    at updateTour (src/domains/content/ContentDomainService.ts:100:15)';

      const fp1 = computeErrorFingerprint('SERVER_ACTION', msg1, stack, '/api/tours/update');
      const fp2 = computeErrorFingerprint('SERVER_ACTION', msg2, stack, '/api/tours/update');

      expect(fp1).toBe(fp2);
    });

    it('produces different fingerprints for completely distinct errors', () => {
      const fp1 = computeErrorFingerprint('SERVER_ACTION', 'Connection timeout to gateway', null, '/pay');
      const fp2 = computeErrorFingerprint('SERVER_ACTION', 'Invalid user credentials', null, '/login');

      expect(fp1).not.toBe(fp2);
    });
  });

  describe('Error Ingestion & Deduplication', () => {
    it('captures an error and redacts sensitive PII in metadata', async () => {
      const logId = await ErrorTrackerService.captureError({
        message: 'Test PII Redaction Error',
        level: 'ERROR',
        source: 'SERVER_ACTION',
        endpoint: '/api/test-observability/pii',
        metadata: {
          userPhone: '09121234567',
          password: 'SecretSuperPassword123!',
          cardNumber: '6037-9911-2233-4455',
          safeField: 'HelloWorld',
        },
      });

      expect(logId).toBeTruthy();

      const record = await prisma.systemErrorLog.findUnique({
        where: { id: logId },
      });

      expect(record).not.toBeNull();
      expect(record?.message).toBe('Test PII Redaction Error');

      const parsedMeta = record?.metadata ? JSON.parse(record.metadata) : {};
      expect(parsedMeta.password).toBe('[REDACTED]');
      expect(parsedMeta.cardNumber).toContain('****');
      expect(parsedMeta.safeField).toBe('HelloWorld');
    });

    it('deduplicates identical errors and increments occurrences', async () => {
      const endpoint = '/api/test-observability/dedup';
      const message = 'Unique repetitive database lock timeout';

      const id1 = await ErrorTrackerService.captureError({
        message,
        level: 'WARN',
        source: 'DB_PRISMA',
        endpoint,
      });

      const id2 = await ErrorTrackerService.captureError({
        message,
        level: 'WARN',
        source: 'DB_PRISMA',
        endpoint,
      });

      // Both invocations return the same record ID because of deduplication
      expect(id1).toBe(id2);

      const record = await prisma.systemErrorLog.findUnique({
        where: { id: id1 },
      });

      expect(record?.occurrences).toBe(2);
      expect(record?.status).toBe('UNRESOLVED');
    });

    it('allows resolving an error log and excludes it from active deductions', async () => {
      const id = await ErrorTrackerService.captureError({
        message: 'Transient supplier network blip',
        level: 'CRITICAL',
        source: 'EXTERNAL_API',
        endpoint: '/api/test-observability/resolve',
      });

      const resolved = await ErrorTrackerService.resolveLog(id, 'admin-tester');
      expect(resolved).toBe(true);

      const updated = await prisma.systemErrorLog.findUnique({
        where: { id },
      });
      expect(updated?.status).toBe('RESOLVED');
      expect(updated?.resolvedById).toBe('admin-tester');
      expect(updated?.resolvedAt).not.toBeNull();
    });

    it('computes diagnostic stats accurately', async () => {
      await ErrorTrackerService.captureError({
        message: 'Stats calculation test error',
        level: 'CRITICAL',
        source: 'SECURITY',
        endpoint: '/api/test-observability/stats',
      });

      const stats = await ErrorTrackerService.getStats();
      expect(stats.total24h).toBeGreaterThanOrEqual(1);
      expect(stats.criticalCount).toBeGreaterThanOrEqual(1);
      expect(stats.systemHealthScore).toBeLessThanOrEqual(100);
    });
  });
});
