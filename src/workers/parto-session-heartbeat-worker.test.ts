import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { resolveFlightRefreshSource } = vi.hoisted(() => ({
  resolveFlightRefreshSource: vi.fn(),
}));
vi.mock('@/services/flight-cache-service', () => ({ resolveFlightRefreshSource }));

const { alertPortalSessionExpired, clearPortalSessionAlert } = vi.hoisted(() => ({
  alertPortalSessionExpired: vi.fn(),
  clearPortalSessionAlert: vi.fn(),
}));
vi.mock('@/domains/supplier/PortalSessionMonitor', () => ({
  alertPortalSessionExpired,
  clearPortalSessionAlert,
}));

import { PartoSessionHeartbeatWorker } from './parto-session-heartbeat-worker';

function fakeProvider(status: 'OK' | 'EXPIRED' | 'ERROR') {
  return { heartbeat: vi.fn().mockResolvedValue(status) };
}

describe('PartoSessionHeartbeatWorker (portal keep-alive — plan §7)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PARTO_PORTAL_KEEPALIVE;
    delete process.env.PARTO_PORTAL_KEEPALIVE_MINUTES;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('is a no-op when the active refresh source is not the portal', async () => {
    resolveFlightRefreshSource.mockReturnValue({ code: 'PARTO_CRS' });

    const report = await PartoSessionHeartbeatWorker.runPing('node_1', fakeProvider('OK'));

    expect(report.skipped).toBe('KEEPALIVE_NOT_ACTIVE');
    expect(alertPortalSessionExpired).not.toHaveBeenCalled();
    expect(clearPortalSessionAlert).not.toHaveBeenCalled();
  });

  it('skips when keep-alive is disabled by env', () => {
    process.env.PARTO_PORTAL_KEEPALIVE = 'off';
    resolveFlightRefreshSource.mockReturnValue({ code: 'PARTO_PORTAL' });

    expect(PartoSessionHeartbeatWorker.shouldRun()).toBe(false);
  });

  it('renews ops state on a healthy session (clears open alerts)', async () => {
    resolveFlightRefreshSource.mockReturnValue({ code: 'PARTO_PORTAL' });

    const report = await PartoSessionHeartbeatWorker.runPing('node_1', fakeProvider('OK'));

    expect(report.status).toBe('OK');
    expect(clearPortalSessionAlert).toHaveBeenCalledTimes(1);
    expect(alertPortalSessionExpired).not.toHaveBeenCalled();
  });

  it('raises the deduped session alert the moment the ping shows expiry', async () => {
    resolveFlightRefreshSource.mockReturnValue({ code: 'PARTO_PORTAL' });

    const report = await PartoSessionHeartbeatWorker.runPing('node_1', fakeProvider('EXPIRED'));

    expect(report.status).toBe('EXPIRED');
    expect(alertPortalSessionExpired).toHaveBeenCalledWith({ source: 'heartbeat', detectedBy: 'heartbeat' });
    expect(clearPortalSessionAlert).not.toHaveBeenCalled();
  });

  it('treats probe errors as retryable (no alert storm), never throws', async () => {
    resolveFlightRefreshSource.mockReturnValue({ code: 'PARTO_PORTAL' });

    const report = await PartoSessionHeartbeatWorker.runPing('node_1', fakeProvider('ERROR'));

    expect(report.status).toBe('ERROR');
    expect(alertPortalSessionExpired).not.toHaveBeenCalled();
  });

  it('keep-alive interval defaults to 10 minutes and clamps to >= 5', () => {
    expect(PartoSessionHeartbeatWorker.keepAliveIntervalMs()).toBe(10 * 60_000);

    process.env.PARTO_PORTAL_KEEPALIVE_MINUTES = '2';
    expect(PartoSessionHeartbeatWorker.keepAliveIntervalMs()).toBe(5 * 60_000);

    process.env.PARTO_PORTAL_KEEPALIVE_MINUTES = '15';
    expect(PartoSessionHeartbeatWorker.keepAliveIntervalMs()).toBe(15 * 60_000);
  });
});
