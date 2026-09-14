/**
 * Parto Portal Session Keep-Alive Worker (plan §7 — session operations)
 *
 * ASP.NET portal sessions die by sliding expiration. The hourly cache sweep
 * renews the cookie only when there is fresh demand to refresh — on a quiet
 * hour the session can lapse and an operator has to re-login. This worker
 * pings the dashboard every PARTO_PORTAL_KEEPALIVE_MINUTES (default 10) while
 * the portal is the active refresh source, and raises the (deduped) session
 * alert the moment the ping shows the session is dead.
 *
 * Skipped entirely when the official API is the active source (its session
 * renews per request) or when PARTO_PORTAL_KEEPALIVE=off.
 */

import { PartoPortalProvider } from '@/domains/supplier/adapters/PartoPortalProvider';
import { resolveFlightRefreshSource } from '@/services/flight-cache-service';
import {
  alertPortalSessionExpired,
  clearPortalSessionAlert,
} from '@/domains/supplier/PortalSessionMonitor';

export interface HeartbeatReport {
  skipped?: 'KEEPALIVE_NOT_ACTIVE';
  status?: 'OK' | 'EXPIRED' | 'ERROR';
  checkedAt: string;
}

export class PartoSessionHeartbeatWorker {
  static keepAliveEnabled(): boolean {
    return (process.env.PARTO_PORTAL_KEEPALIVE || 'on').toLowerCase() !== 'off';
  }

  static keepAliveIntervalMs(): number {
    const n = Number(process.env.PARTO_PORTAL_KEEPALIVE_MINUTES);
    const minutes = Number.isFinite(n) ? Math.max(5, Math.floor(n)) : 10;
    return minutes * 60_000;
  }

  /** Active only while portal scraping is the configured refresh source. */
  static shouldRun(): boolean {
    if (!this.keepAliveEnabled()) return false;
    return resolveFlightRefreshSource()?.code === 'PARTO_PORTAL';
  }

  static async runPing(
    workerNodeId: string,
    provider?: Pick<PartoPortalProvider, 'heartbeat'>
  ): Promise<HeartbeatReport> {
    if (!this.shouldRun()) {
      return { skipped: 'KEEPALIVE_NOT_ACTIVE', checkedAt: new Date().toISOString() };
    }

    try {
      const target = provider ?? new PartoPortalProvider();
      const status = await target.heartbeat();
      if (status === 'OK') {
        await clearPortalSessionAlert();
      } else if (status === 'EXPIRED') {
        console.error(
          `[PortalHeartbeat:${workerNodeId}] session EXPIRED — re-run scripts/parto-portal-capture.mjs login`
        );
        await alertPortalSessionExpired({ source: 'heartbeat', detectedBy: 'heartbeat' });
      } else {
        console.warn(`[PortalHeartbeat:${workerNodeId}] probe failed (network/HTTP error) — will retry next cycle`);
      }
      return { status, checkedAt: new Date().toISOString() };
    } catch (err) {
      console.warn(`[PortalHeartbeat:${workerNodeId}] unexpected heartbeat error:`, err);
      return { status: 'ERROR', checkedAt: new Date().toISOString() };
    }
  }
}
