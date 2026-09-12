import webpush from 'web-push';
import { createLogger } from '@/lib/observability/logger';
import { prisma } from '@/lib/prisma';

/**
 * Web Push dispatch service (پوش نوتیفیکیشن).
 *
 * Delivers RFC 8291 encrypted push messages to subscribed browsers via the
 * VAPID keys configured in env. Delivery failures that mean "the subscription
 * is dead" (404/410) deactivate the row so the table never accumulates ghosts.
 *
 * Convention follows NotificationProvider: in non-production runtimes with no
 * VAPID configuration the service simulates delivery (dev convenience); in
 * production a missing configuration FAILS CLOSED (`isConfigured() === false`
 * and deliver() throws), letting callers decide whether to retry into the DLQ
 * (outbox) or surface a config error (ERP actions).
 */

const logger = createLogger('push-dispatch');

export interface PushPayload {
  title: string;
  body: string;
  /** Relative in-app path opened on notification click. */
  url?: string;
  tag?: string;
}

export interface PushSendReport {
  sent: number;
  removed: number;
  simulated: boolean;
}

let configured = false;

function vapidKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

function ensureConfigured(): boolean {
  if (configured) return true;
  const keys = vapidKeys();
  if (!keys) return false;
  webpush.setVapidDetails(
    process.env.WEB_PUSH_CONTACT || 'mailto:support@firuzo.com',
    keys.publicKey,
    keys.privateKey,
  );
  configured = true;
  return true;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export class PushDispatchService {
  static isConfigured(): boolean {
    return vapidKeys() !== null;
  }

  static async sendToUser(userId: string, payload: PushPayload): Promise<PushSendReport> {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
      take: 20,
    });
    return this.deliver(subscriptions, payload);
  }

  static async sendToSubscribers(payload: PushPayload, limit = 500): Promise<PushSendReport> {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { isActive: true },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
    return this.deliver(subscriptions, payload);
  }

  private static async deliver(
    subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
    payload: PushPayload,
  ): Promise<PushSendReport> {
    if (subscriptions.length === 0) {
      return { sent: 0, removed: 0, simulated: false };
    }

    if (!ensureConfigured()) {
      if (isProduction()) {
        // Fail closed — caller (outbox consumer) retries then DLQs so the gap is visible.
        throw new Error('Web push is not configured (VAPID keys missing) in production');
      }
      logger.info('Web push simulated (dev, VAPID unconfigured)', {
        count: subscriptions.length,
        title: payload.title,
      });
      return { sent: subscriptions.length, removed: 0, simulated: true };
    }

    const json = JSON.stringify({ ...payload });
    let sent = 0;
    let removed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            json,
            { TTL: 3600 },
          );
          sent++;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription
              .update({ where: { id: sub.id }, data: { isActive: false } })
              .catch(() => {});
            removed++;
          } else {
            logger.warn('Push delivery failed', {
              endpoint: sub.endpoint.slice(0, 60),
              statusCode,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }),
    );

    return { sent, removed, simulated: false };
  }
}
