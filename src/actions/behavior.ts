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
