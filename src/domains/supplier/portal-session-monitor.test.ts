import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    operationalException: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

const { sendBale } = vi.hoisted(() => ({ sendBale: vi.fn() }));
vi.mock('@/domains/events/NotificationProvider', () => ({
  getNotificationProvider: () => ({ sendBale }),
}));

vi.mock('@/domains/erp/ExceptionCenterService', () => ({
  ExceptionCenterService: {
    createException: (...args: unknown[]) => prisma.operationalException.create(args[0]),
  },
}));

import {
  alertPortalSessionExpired,
  clearPortalSessionAlert,
  PARTO_SESSION_EXCEPTION_TYPE,
} from './PortalSessionMonitor';

describe('PortalSessionMonitor (plan §7 — session operations)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('creates a HIGH-severity exception and pings admins on a new incident', async () => {
    prisma.operationalException.findFirst.mockResolvedValue(null);
    prisma.operationalException.create.mockResolvedValue({ id: 'exc_1' });
    prisma.user.findMany.mockResolvedValue([{ baleId: '111' }, { baleId: '222' }]);

    await alertPortalSessionExpired({ routeKey: 'THR-MHD', detectedBy: 'refresh' });

    expect(prisma.operationalException.create).toHaveBeenCalledTimes(1);
    const payload = prisma.operationalException.create.mock.calls[0][0];
    expect(payload.type).toBe(PARTO_SESSION_EXCEPTION_TYPE);
    expect(payload.severity).toBe('HIGH');
    expect(payload.entityType).toBe('SUPPLIER');
    expect(payload.entityId).toBe('PARTO_PORTAL');
    expect(payload.description).toContain('parto-portal-capture.mjs login');

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ baleId: { not: null } }),
      })
    );
    expect(sendBale).toHaveBeenCalledTimes(2);
  });

  it('stays fully quiet while an incident is already open (no row, no Bale)', async () => {
    prisma.operationalException.findFirst.mockResolvedValue({ id: 'exc_open' });

    await alertPortalSessionExpired();

    expect(prisma.operationalException.create).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(sendBale).not.toHaveBeenCalled();
  });

  it('never throws when the alerting pipeline itself fails', async () => {
    prisma.operationalException.findFirst.mockRejectedValue(new Error('db down'));
    await expect(alertPortalSessionExpired()).resolves.toBeUndefined();
  });

  it('auto-resolves open incidents once the session works again', async () => {
    prisma.operationalException.findMany.mockResolvedValue([{ id: 'exc_1' }, { id: 'exc_2' }]);

    await clearPortalSessionAlert();

    expect(prisma.operationalException.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['exc_1', 'exc_2'] } },
      data: expect.objectContaining({ status: 'RESOLVED' }),
    });
  });

  it('auto-resolve is a no-op when nothing is open', async () => {
    prisma.operationalException.findMany.mockResolvedValue([]);

    await clearPortalSessionAlert();

    expect(prisma.operationalException.updateMany).not.toHaveBeenCalled();
  });
});
