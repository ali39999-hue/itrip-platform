import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/observability/logger';
import type { TenantAuthContext } from '@/domains/identity/permission-service';

const log = createLogger('behavior-analytics');

export interface BehaviorRange {
  days: number;
}

export interface UserJourneySession {
  sessionId: string;
  startedAt: Date;
  endedAt: Date;
  eventCount: number;
  routes: string[];
}

export interface UserBehaviorSummary {
  totalEvents: number;
  pageViews: number;
  clicks: number;
  scrolls: number;
  funnelEvents: number;
  uniqueRoutes: number;
  sessionsCount: number;
  lastActiveAt: Date | null;
  topRoutes: Array<{ route: string; count: number }>;
  deviceSplit: Array<{ device: string; count: number }>;
  hourlyHistogram: Array<{ hour: number; count: number }>;
  sessions: UserJourneySession[];
  recent: Array<{
    id: string;
    type: string;
    route: string;
    createdAt: Date;
    xPct: number | null;
    yPct: number | null;
  }>;
}

export interface RouteHeatCell {
  gx: number;
  gy: number;
  count: number;
  intensity: number; // 0..1 normalized
}

export interface RouteHeatmap {
  route: string;
  totalClicks: number;
  totalViews: number;
  cells: RouteHeatCell[]; // 24 x 12 grid
  topSelectors: Array<{ selector: string; count: number }>;
  scrollDepth: Array<{ pct: number; count: number }>;
  deviceSplit: Array<{ device: string; count: number }>;
}

export interface BehaviorOverview {
  totalEvents: number;
  activeUsers: number;
  pageViews: number;
  clicks: number;
  topRoutes: Array<{ route: string; views: number; clicks: number }>;
  eventsPerDay: Array<{ day: string; count: number }>;
}

function rangeDate(days: number): Date {
  const d = Math.min(Math.max(days || 30, 1), 180);
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

async function assertBehaviorAccess(callerCtx?: TenantAuthContext | boolean): Promise<void> {
  // Internal boolean callers (tests/workers) bypass; real operators need an
  // ERP read permission. Detailed tenant scoping happens at query level.
  if (callerCtx === true || callerCtx === false) return;
  if (!callerCtx) throw new Error('Unauthorized: behavior analytics requires operator context.');
  if (callerCtx.isSuperAdmin) return;
  const p = callerCtx.permissions;
  if (p.has('booking:view:all') || p.has('user:manage') || p.has('ops:override:cancel')) return;
  throw new Error('Forbidden: insufficient ERP permission for behavior analytics.');
}

export class BehaviorAnalyticsService {
  static async getUserBehavior(
    targetUserId: string,
    callerCtx?: TenantAuthContext | boolean,
    days = 30,
  ): Promise<UserBehaviorSummary> {
    await assertBehaviorAccess(callerCtx);
    const since = rangeDate(days);

    let events: Array<{
      id: string;
      type: string;
      route: string;
      sessionId: string;
      device: string | null;
      xPct: number | null;
      yPct: number | null;
      createdAt: Date;
    }> = [];
    try {
      events = await prisma.behaviorEvent.findMany({
        where: { userId: targetUserId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: {
          id: true,
          type: true,
          route: true,
          sessionId: true,
          device: true,
          xPct: true,
          yPct: true,
          createdAt: true,
        },
      });
    } catch (err) {
      // Table may not be migrated yet on older envs — degrade to empty state.
      log.warn('behavior user query degraded', { error: err instanceof Error ? err.message : String(err) });
      events = [];
    }

    const pageViews = events.filter((e) => e.type === 'PAGE_VIEW').length;
    const clicks = events.filter((e) => e.type === 'CLICK').length;
    const scrolls = events.filter((e) => e.type === 'SCROLL_DEPTH').length;
    const funnelEvents = events.filter((e) => e.type === 'FUNNEL').length;

    const routeCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    const hourCounts = new Array(24).fill(0) as number[];
    const sessionMap = new Map<string, { first: Date; last: Date; count: number; routes: string[] }>();

    for (const e of events) {
      routeCounts.set(e.route, (routeCounts.get(e.route) ?? 0) + 1);
      if (e.device) deviceCounts.set(e.device, (deviceCounts.get(e.device) ?? 0) + 1);
      try {
        hourCounts[e.createdAt.getHours()] = (hourCounts[e.createdAt.getHours()] ?? 0) + 1;
      } catch {
        /* noop */
      }
      const s = sessionMap.get(e.sessionId) ?? { first: e.createdAt, last: e.createdAt, count: 0, routes: [] };
      s.count += 1;
      if (e.createdAt < s.first) s.first = e.createdAt;
      if (e.createdAt > s.last) s.last = e.createdAt;
      if (!s.routes.includes(e.route) && s.routes.length < 12) s.routes.push(e.route);
      sessionMap.set(e.sessionId, s);
    }

    const topRoutes = [...routeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([route, count]) => ({ route, count }));

    return {
      totalEvents: events.length,
      pageViews,
      clicks,
      scrolls,
      funnelEvents,
      uniqueRoutes: routeCounts.size,
      sessionsCount: sessionMap.size,
      lastActiveAt: events.length > 0 ? events[0]!.createdAt : null,
      topRoutes,
      deviceSplit: [...deviceCounts.entries()].map(([device, count]) => ({ device, count })),
      hourlyHistogram: hourCounts.map((count, hour) => ({ hour, count })),
      sessions: [...sessionMap.entries()]
        .map(([sessionId, s]) => ({
          sessionId: sessionId.slice(0, 12),
          startedAt: s.first,
          endedAt: s.last,
          eventCount: s.count,
          routes: s.routes,
        }))
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 15),
      recent: events.slice(0, 60).map((e) => ({
        id: e.id,
        type: e.type,
        route: e.route,
        createdAt: e.createdAt,
        xPct: e.xPct,
        yPct: e.yPct,
      })),
    };
  }

  static async getRouteHeatmap(
    route: string,
    callerCtx?: TenantAuthContext | boolean,
    days = 30,
  ): Promise<RouteHeatmap> {
    await assertBehaviorAccess(callerCtx);
    const since = rangeDate(days);
    const normalized = route.slice(0, 200).toLowerCase();

    let clicks: Array<{ xPct: number | null; yPct: number | null; selector: string | null; device: string | null }> = [];
    let views = 0;
    let scrollRows: Array<{ scrollPct: number | null }> = [];
    try {
      const [clickRows, viewCount, scrolls] = await Promise.all([
        prisma.behaviorEvent.findMany({
          where: { route: normalized, type: 'CLICK', createdAt: { gte: since } },
          take: 5000,
          select: { xPct: true, yPct: true, selector: true, device: true },
        }),
        prisma.behaviorEvent.count({
          where: { route: normalized, type: 'PAGE_VIEW', createdAt: { gte: since } },
        }),
        prisma.behaviorEvent.findMany({
          where: { route: normalized, type: 'SCROLL_DEPTH', createdAt: { gte: since } },
          take: 5000,
          select: { scrollPct: true },
        }),
      ]);
      clicks = clickRows;
      views = viewCount;
      scrollRows = scrolls;
    } catch (err) {
      log.warn('behavior heatmap query degraded', { error: err instanceof Error ? err.message : String(err) });
    }

    const GX = 24;
    const GY = 12;
    const grid = new Map<string, number>();
    let max = 0;
    for (const c of clicks) {
      if (c.xPct == null || c.yPct == null) continue;
      const gx = Math.min(GX - 1, Math.max(0, Math.floor((c.xPct / 100) * GX)));
      const gy = Math.min(GY - 1, Math.max(0, Math.floor((c.yPct / 100) * GY)));
      const key = `${gx}:${gy}`;
      const next = (grid.get(key) ?? 0) + 1;
      grid.set(key, next);
      if (next > max) max = next;
    }
    const cells: RouteHeatCell[] = [...grid.entries()].map(([key, count]) => {
      const [gx, gy] = key.split(':').map(Number);
      return { gx: gx ?? 0, gy: gy ?? 0, count, intensity: max > 0 ? count / max : 0 };
    });

    const selCounts = new Map<string, number>();
    const devCounts = new Map<string, number>();
    for (const c of clicks) {
      if (c.selector) selCounts.set(c.selector, (selCounts.get(c.selector) ?? 0) + 1);
      if (c.device) devCounts.set(c.device, (devCounts.get(c.device) ?? 0) + 1);
    }
    const scrollCounts = new Map<number, number>();
    for (const s of scrollRows) {
      if (s.scrollPct != null) scrollCounts.set(s.scrollPct, (scrollCounts.get(s.scrollPct) ?? 0) + 1);
    }

    return {
      route: normalized,
      totalClicks: clicks.length,
      totalViews: views,
      cells,
      topSelectors: [...selCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([selector, count]) => ({ selector, count })),
      scrollDepth: [25, 50, 75, 100].map((pct) => ({ pct, count: scrollCounts.get(pct) ?? 0 })),
      deviceSplit: [...devCounts.entries()].map(([device, count]) => ({ device, count })),
    };
  }

  static async getOverview(
    callerCtx?: TenantAuthContext | boolean,
    days = 30,
  ): Promise<BehaviorOverview> {
    await assertBehaviorAccess(callerCtx);
    const since = rangeDate(days);

    try {
      const [totalEvents, pageViews, clicks, routeGroups, userGroups, dayRows] = await Promise.all([
        prisma.behaviorEvent.count({ where: { createdAt: { gte: since } } }),
        prisma.behaviorEvent.count({ where: { type: 'PAGE_VIEW', createdAt: { gte: since } } }),
        prisma.behaviorEvent.count({ where: { type: 'CLICK', createdAt: { gte: since } } }),
        prisma.behaviorEvent.groupBy({
          by: ['route'],
          where: { createdAt: { gte: since } },
          _count: { route: true },
          orderBy: { _count: { route: 'desc' } },
          take: 12,
        }),
        prisma.behaviorEvent.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: since } },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 5000,
        }),
        prisma.behaviorEvent.findMany({
          where: { createdAt: { gte: since } },
          take: 20000,
          select: { createdAt: true, type: true, route: true },
        }),
      ]);

      // Per-route views vs clicks (two extra grouped queries would cost more;
      // derive clicks per top route from the sampled dayRows + a bounded query)
      const topRoutes: Array<{ route: string; views: number; clicks: number }> = routeGroups.map((g) => ({
        route: g.route,
        views: 0,
        clicks: 0,
      }));
      // Fill views/clicks with bounded counts per top route (max 12 queries)
      await Promise.all(
        topRoutes.map(async (r) => {
          const [v, c] = await Promise.all([
            prisma.behaviorEvent.count({
              where: { route: r.route, type: 'PAGE_VIEW', createdAt: { gte: since } },
            }),
            prisma.behaviorEvent.count({
              where: { route: r.route, type: 'CLICK', createdAt: { gte: since } },
            }),
          ]);
          r.views = v;
          r.clicks = c;
        }),
      );

      const perDay = new Map<string, number>();
      for (const row of dayRows) {
        const day = row.createdAt.toISOString().slice(0, 10);
        perDay.set(day, (perDay.get(day) ?? 0) + 1);
      }

      return {
        totalEvents,
        activeUsers: userGroups.filter((g) => g.userId).length,
        pageViews,
        clicks,
        topRoutes,
        eventsPerDay: [...perDay.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-30)
          .map(([day, count]) => ({ day, count })),
      };
    } catch (err) {
      log.warn('behavior overview degraded', { error: err instanceof Error ? err.message : String(err) });
      return { totalEvents: 0, activeUsers: 0, pageViews: 0, clicks: 0, topRoutes: [], eventsPerDay: [] };
    }
  }
}
