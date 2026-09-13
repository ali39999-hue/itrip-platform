'use server';

import { z } from 'zod';
import { prisma, getTenantScopedPrisma } from '@/lib/prisma';
import { requirePermission, getTenantAuthContext } from '@/domains/identity/permission-service';
import { toPlain } from '@/lib/serialize';
import { PushDispatchService } from '@/domains/notify/PushDispatchService';

/**
 * Operator Workbench (پنل اپراتور) — the daily action queue for front-line
 * booking-processing staff. Read-only aggregation: paid bookings waiting for
 * supplier confirmation / ticketing, open operational exceptions and imminent
 * departures. Mutations stay in their canonical modules (travel-files,
 * exceptions, bookings) which enforce their own permissions.
 */
export async function getOperatorWorkbenchAction() {
  try {
    const user = await requirePermission('booking:view:all');
    const tenantCtx = await getTenantAuthContext(user.id);
    const db = getTenantScopedPrisma(tenantCtx.organizationId, tenantCtx.isSuperAdmin);

    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [needsAction, openExceptions, upcoming, awaitingCount, exceptionCount, confirmedToday, issuedToday] =
      await Promise.all([
        db.booking.findMany({
          where: { status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMING_SUPPLIER'] } },
          orderBy: { createdAt: 'asc' },
          take: 15,
          select: {
            id: true,
            reference: true,
            status: true,
            paymentStatus: true,
            ticketStatus: true,
            totalAmount: true,
            currency: true,
            travelDate: true,
            createdAt: true,
            customer: { select: { name: true, phone: true } },
            items: { take: 1, select: { id: true, type: true } },
          },
        }),
        prisma.operationalException.findMany({
          where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
          orderBy: { detectedAt: 'desc' },
          take: 12,
          select: {
            id: true,
            type: true,
            severity: true,
            status: true,
            title: true,
            entityType: true,
            entityId: true,
            slaDueAt: true,
            detectedAt: true,
          },
        }),
        db.booking.findMany({
          where: { status: 'CONFIRMED', travelDate: { not: null, gte: todayStr } },
          orderBy: { travelDate: 'asc' },
          take: 10,
          select: {
            id: true,
            reference: true,
            travelDate: true,
            ticketStatus: true,
            customer: { select: { name: true } },
            items: { take: 1, select: { id: true, type: true } },
          },
        }),
        db.booking.count({ where: { status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMING_SUPPLIER'] } } }),
        prisma.operationalException.count({
          where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
        }),
        db.booking.count({ where: { status: 'CONFIRMED', updatedAt: { gte: startOfToday } } }),
        db.booking.count({ where: { ticketStatus: 'ISSUED', updatedAt: { gte: startOfToday } } }),
      ]);

    return {
      success: true,
      data: toPlain({
        queues: {
          needsAction,
          openExceptions,
          upcoming,
        },
        stats: {
          awaitingAction: awaitingCount,
          openExceptions: exceptionCount,
          confirmedToday,
          issuedToday,
        },
      }),
    };
  } catch (err: unknown) {
    console.error('getOperatorWorkbenchAction error:', err);
    return { success: false as const, error: err instanceof Error ? err.message : 'Failed to load operator workbench' };
  }
}

const OperatorPushSchema = z.object({
  title: z.string().trim().min(2).max(60),
  body: z.string().trim().min(2).max(280),
  url: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine((v) => !v || v.startsWith('/'), { message: 'push url must be a relative in-app path' }),
  segment: z.enum(['SUBSCRIBERS', 'STAFF']).default('SUBSCRIBERS'),
});

/**
 * Manual push broadcast from the ERP (operator workbench / ops staff).
 * Requires the dedicated `ops:notify` permission. The URL is restricted to
 * relative in-app paths so a compromised ERP session can never turn the push
 * channel into an open-redirect / phishing vector.
 */
export async function sendOperatorPushAction(input: {
  title: string;
  body: string;
  url?: string;
  segment: 'SUBSCRIBERS' | 'STAFF';
}) {
  try {
    await requirePermission('ops:notify');
    const parsed = OperatorPushSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: 'پارامترهای اعلان معتبر نیستند' };
    }
    const { title, body, url, segment } = parsed.data;

    if (!PushDispatchService.isConfigured()) {
      return {
        success: false as const,
        error: 'پوش سرور پیکربندی نشده است (کلیدهای VAPID تنظیم نشده‌اند)',
      };
    }

    let targetUserIds: string[];
    if (segment === 'STAFF') {
      const staffRoles = ['SUPER_ADMIN', 'FINANCE', 'OPS', 'OPERATOR'];
      const staff = await prisma.user.findMany({
        where: { isActive: true, userRoles: { some: { role: { name: { in: staffRoles } } } } },
        select: { id: true },
        take: 500,
      });
      targetUserIds = staff.map((u) => u.id);
    } else {
      const subs = await prisma.pushSubscription.findMany({
        where: { isActive: true, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
        take: 500,
      });
      targetUserIds = subs.map((s) => s.userId as string);
    }

    if (targetUserIds.length === 0) {
      return { success: true as const, sent: 0 };
    }

    let sent = 0;
    for (const userId of targetUserIds) {
      const r = await PushDispatchService.sendToUser(userId, { title, body, url, tag: 'firuzo-broadcast' });
      sent += r.sent;
    }
    return { success: true as const, sent };
  } catch (err: unknown) {
    console.error('sendOperatorPushAction error:', err);
    return { success: false as const, error: err instanceof Error ? err.message : 'ارسال اعلان ناموفق بود' };
  }
}
