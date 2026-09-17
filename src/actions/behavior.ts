'use server';

import { requirePermission, getTenantAuthContext } from '@/domains/identity/permission-service';
import { Customer360Service } from '@/domains/identity/Customer360Service';
import { BehaviorAnalyticsService } from '@/domains/behavior/BehaviorAnalyticsService';
import { toPlain } from '@/lib/serialize';

async function ctx() {
  const admin = await requirePermission(['booking:view:all', 'ops:override:cancel', 'user:manage']);
  return getTenantAuthContext(admin.id);
}

export async function getUserBehaviorAction(targetUserId: string, days = 30) {
  try {
    const tenantCtx = await ctx();
    await Customer360Service.assertCustomerAccess(targetUserId, tenantCtx);
    const data = await BehaviorAnalyticsService.getUserBehavior(targetUserId, tenantCtx, days);
    return { success: true as const, data: toPlain(data) };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : 'خطا' };
  }
}

export async function getRouteHeatmapAction(route: string, days = 30) {
  try {
    const tenantCtx = await ctx();
    const data = await BehaviorAnalyticsService.getRouteHeatmap(route, tenantCtx, days);
    return { success: true as const, data: toPlain(data) };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : 'خطا' };
  }
}

export async function getBehaviorOverviewAction(days = 30) {
  try {
    const tenantCtx = await ctx();
    const data = await BehaviorAnalyticsService.getOverview(tenantCtx, days);
    return { success: true as const, data: toPlain(data) };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : 'خطا' };
  }
}

export async function seedSampleBehaviorEventsAction() {
  try {
    await ctx();
    const { prisma } = await import('@/lib/prisma');
    const routes = ['/fa', '/fa/flights', '/fa/hotels', '/fa/tours'];
    const events: Array<{
      anonymousId: string;
      sessionId: string;
      type: string;
      route: string;
      locale: string;
      xPct: number | null;
      yPct: number | null;
      scrollPct: number | null;
      selector: string | null;
      device: string;
      createdAt: Date;
    }> = [];

    const now = Date.now();
    for (const route of routes) {
      for (let i = 0; i < 25; i++) {
        events.push({
          anonymousId: `anon_${Math.random().toString(36).slice(2, 8)}`,
          sessionId: `sess_${Math.random().toString(36).slice(2, 8)}`,
          type: 'PAGE_VIEW',
          route,
          locale: 'fa',
          xPct: null,
          yPct: null,
          scrollPct: null,
          selector: null,
          device: i % 3 === 0 ? 'mobile' : 'desktop',
          createdAt: new Date(now - Math.floor(Math.random() * 7 * 24 * 3600 * 1000)),
        });
      }

      for (let i = 0; i < 40; i++) {
        const x = Math.floor(Math.random() * 70) + 15;
        const y = Math.floor(Math.random() * 65) + 15;
        events.push({
          anonymousId: `anon_${Math.random().toString(36).slice(2, 8)}`,
          sessionId: `sess_${Math.random().toString(36).slice(2, 8)}`,
          type: 'CLICK',
          route,
          locale: 'fa',
          xPct: x,
          yPct: y,
          scrollPct: null,
          selector: 'button.search-cta',
          device: i % 2 === 0 ? 'desktop' : 'mobile',
          createdAt: new Date(now - Math.floor(Math.random() * 5 * 24 * 3600 * 1000)),
        });
      }

      for (const scrollPct of [25, 50, 75, 100]) {
        for (let i = 0; i < 10; i++) {
          events.push({
            anonymousId: `anon_${Math.random().toString(36).slice(2, 8)}`,
            sessionId: `sess_${Math.random().toString(36).slice(2, 8)}`,
            type: 'SCROLL_DEPTH',
            route,
            locale: 'fa',
            xPct: null,
            yPct: null,
            scrollPct,
            selector: null,
            device: 'desktop',
            createdAt: new Date(now - Math.floor(Math.random() * 3 * 24 * 3600 * 1000)),
          });
        }
      }
    }

    const res = await prisma.behaviorEvent.createMany({ data: events });
    return { success: true as const, count: res.count };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : 'خطا در ثبت نمونه داده' };
  }
}
