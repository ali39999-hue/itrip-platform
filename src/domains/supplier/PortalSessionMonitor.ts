/**
 * Portal Session Monitor (plan §7 — session operations)
 *
 * When the scraped Parto portal session dies, scraping keeps failing until an
 * operator re-captures it with scripts/parto-portal-capture.mjs. This module
 * makes that failure VISIBLE and self-healing in the records:
 *  - alertPortalSessionExpired(): creates ONE Exception Center record
 *    (type SUPPLIER_SESSION_EXPIRED, deduped while an open one exists) and
 *    pings admins on Bale (best-effort, per-user baleId).
 *  - clearPortalSessionAlert(): auto-resolves the open record once a refresh
 *    or keep-alive heartbeat proves the session works again.
 *
 * Every call is best-effort: monitoring must never break the refresh path.
 */

import { prisma } from '@/lib/prisma';
import { ExceptionCenterService } from '@/domains/erp/ExceptionCenterService';
import { getNotificationProvider } from '@/domains/events/NotificationProvider';

export const PARTO_SESSION_EXCEPTION_TYPE = 'SUPPLIER_SESSION_EXPIRED';
export const PARTO_SESSION_ENTITY = { entityType: 'SUPPLIER', entityId: 'PARTO_PORTAL' } as const;

const OPEN_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] as const;

export interface SessionExpiredDetail {
  source?: string;
  routeKey?: string;
  detectedBy?: 'refresh' | 'heartbeat' | 'sweep';
}

const RUNBOOK =
  'Run `node scripts/parto-portal-capture.mjs login` on the operator machine ' +
  '(solve the captcha manually), then update PARTO_PORTAL_COOKIE / the state file. ' +
  'docs/PARTO_LIVE_INTEGRATION_PLAN.fa.md §7.';

export async function alertPortalSessionExpired(detail?: SessionExpiredDetail): Promise<void> {
  try {
    const existing = await prisma.operationalException.findFirst({
      where: {
        type: PARTO_SESSION_EXCEPTION_TYPE,
        ...PARTO_SESSION_ENTITY,
        status: { in: [...OPEN_STATUSES] },
      },
      select: { id: true },
    });

    if (existing) return; // incident already tracked — stay quiet until resolved

    await ExceptionCenterService.createException({
      type: PARTO_SESSION_EXCEPTION_TYPE,
      severity: 'HIGH',
      entityType: PARTO_SESSION_ENTITY.entityType,
      entityId: PARTO_SESSION_ENTITY.entityId,
      title: 'Parto portal session expired — flight cache refresh halted',
      description:
        `Live flight refresh detected an invalid portal session` +
        `${detail?.routeKey ? ` (route ${detail.routeKey})` : ''}` +
        `${detail?.detectedBy ? ` via ${detail.detectedBy}` : ''}. ` +
        `Cached offers keep serving until their TTL expires, then searches fall back to static. ` +
        RUNBOOK,
      // The cache keeps serving stale rows, so the business impact window is the TTL.
      slaMinutes: 120,
    });

    // Bale ping fires only on the incident transition (new exception), so an
    // ongoing outage never spams the admins on every refresh attempt.
    await notifyPortalAdmins(detail);
  } catch (err) {
    console.warn('[PortalSessionMonitor] failed to record session-expiry alert:', err);
  }
}

export async function clearPortalSessionAlert(): Promise<void> {
  try {
    const open = await prisma.operationalException.findMany({
      where: {
        type: PARTO_SESSION_EXCEPTION_TYPE,
        ...PARTO_SESSION_ENTITY,
        status: { in: [...OPEN_STATUSES] },
      },
      select: { id: true },
    });
    if (open.length === 0) return;

    await prisma.operationalException.updateMany({
      where: { id: { in: open.map((e) => e.id) } },
      data: {
        status: 'RESOLVED',
        resolution: 'Portal session restored automatically (refresh/keep-alive succeeded).',
        closedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn('[PortalSessionMonitor] failed to auto-resolve session alert:', err);
  }
}

async function notifyPortalAdmins(detail?: SessionExpiredDetail): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: {
        isActive: true,
        baleId: { not: null },
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'OPS'] },
      },
      select: { baleId: true },
    });
    if (admins.length === 0) return;

    const provider = getNotificationProvider();
    const text =
      `⚠️ [Firuzo Ops] سشن پورتال پارتو منقضی شد` +
      `${detail?.routeKey ? ` (مسیر ${detail.routeKey})` : ''}.\n` +
      `بروزرسانی کش پرواز متوقف است تا ورود مجدد: parto-portal-capture login`;

    await Promise.allSettled(
      admins
        .filter((a): a is { baleId: string } => Boolean(a.baleId))
        .map((a) => provider.sendBale(a.baleId, text))
    );
  } catch (err) {
    console.warn('[PortalSessionMonitor] admin Bale notification failed:', err);
  }
}
