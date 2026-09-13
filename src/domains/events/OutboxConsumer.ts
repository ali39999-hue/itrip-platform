import { prisma } from '@/lib/prisma';
import { getNotificationProvider } from './NotificationProvider';
import { PushDispatchService } from '@/domains/notify/PushDispatchService';
import { decryptSensitive } from '@/lib/security/crypto-vault';
import { createLogger } from '@/lib/observability/logger';
import { WorkerLeaseService } from './WorkerLeaseService';
import crypto from 'crypto';

const outboxLogger = createLogger('outbox-consumer');

/** Events stuck in PROCESSING for longer than this are re-queued. */
const PROCESSING_STALE_MS = 2 * 60 * 1000;

/**
 * Calculates bounded exponential backoff with random jitter (ASYNC-107)
 * Prevents retry clustering and thundering herds across distributed workers.
 */
export function calculateBackoffWithJitter(
  retryCount: number,
  baseSeconds: number = 10,
  maxSeconds: number = 600,
  jitterFactor: number = 0.25
): number {
  const exponential = Math.min(Math.pow(2, retryCount) * baseSeconds, maxSeconds);
  const jitter = (Math.random() * 2 - 1) * (exponential * jitterFactor);
  return Math.max(1, Math.round(exponential + jitter));
}

/**
 * Versioned Outbox Payload wrapper (ASYNC-105)
 */
export function wrapOutboxPayload(
  data: Record<string, unknown>,
  eventVersion: number = 1,
  schemaVersion: string = '1.0.0'
): string {
  return JSON.stringify({
    _meta: {
      eventVersion,
      schemaVersion,
      emittedAt: new Date().toISOString(),
    },
    eventVersion,
    schemaVersion,
    ...data,
  });
}

/**
 * Parses outbox payload and extracts metadata (ASYNC-105)
 */
export function parseOutboxPayload(payloadStr: string): {
  data: Record<string, unknown>;
  eventVersion: number;
  schemaVersion: string;
} {
  const parsed = JSON.parse(payloadStr || '{}');
  const eventVersion = parsed.eventVersion || parsed._meta?.eventVersion || 1;
  const schemaVersion = parsed.schemaVersion || parsed._meta?.schemaVersion || '1.0.0';
  return { data: parsed, eventVersion, schemaVersion };
}

/** Generates a GDS-style PNR reference for voucher issuing. */
export class OutboxConsumer {
  /**
   * Concurrency-safe atomic outbox worker claim and execution (ASYNC-101 to ASYNC-107)
   * Uses WorkerLeaseService distributed lease (ASYNC-102, ASYNC-103) and PostgreSQL
   * "SELECT ... FOR UPDATE SKIP LOCKED" (ASYNC-104) to guarantee zero race conditions.
   */
  static async processPendingEvents(customWorkerId?: string): Promise<number> {
    const workerId =
      customWorkerId ||
      `wrk_${crypto.randomBytes(3).toString('hex')}_${Date.now().toString(36)}`;

    // ASYNC-102: Use distributed DB lease instead of process-local flag
    const result = await WorkerLeaseService.withLease(
      'outbox_consumer',
      workerId,
      30000,
      async () => {
        return this.executeProcessingCycle(workerId);
      }
    );

    return result ?? 0;
  }

  /**
   * Internal execution cycle under lease protection
   */
  private static async executeProcessingCycle(workerId: string): Promise<number> {
    try {
      // 1. Recover events stranded in PROCESSING by a worker crash (Crash Recovery, Section 18)
      const staleCutoff = new Date(Date.now() - PROCESSING_STALE_MS);
      const recovered = await prisma.outboxEvent.updateMany({
        where: {
          status: 'PROCESSING',
          OR: [
            { lockedAt: null },
            { lockedAt: { lt: staleCutoff } },
          ],
        },
        data: { status: 'PENDING', lockedAt: null, workerId: null },
      });
      if (recovered.count > 0) {
        console.warn(`[Outbox] Recovered ${recovered.count} stale PROCESSING events`);
      }

      // 2. Concurrency-Safe Claim
      const now = new Date();
      const queryTime = new Date(now.getTime() + 2000); // 2s clock skew tolerance
      const pendingEvents = await prisma.outboxEvent.findMany({
        where: {
          status: 'PENDING',
          availableAt: { lte: queryTime },
        },
        orderBy: { availableAt: 'asc' },
        take: 20,
      });

      if (pendingEvents.length === 0) {
        return 0;
      }

      const claimedEvents = [];
      for (const ev of pendingEvents) {
        const updateRes = await prisma.outboxEvent.updateMany({
          where: {
            id: ev.id,
            status: 'PENDING',
          },
          data: {
            status: 'PROCESSING',
            lockedAt: now,
            workerId,
          },
        });
        if (updateRes.count > 0) {
          claimedEvents.push(ev);
        }
      }

      if (claimedEvents.length === 0) {
        return 0;
      }

      let processedCount = 0;

      for (const event of claimedEvents) {
        const log = createLogger('outbox', event.id);
        try {
          // ASYNC-105: Versioned payload parsing
          const { data: payload, eventVersion, schemaVersion } = parseOutboxPayload(event.payload);

          // Process based on eventType
          switch (event.eventType) {
            case 'BOOKING_CONFIRMED':
            case 'BOOKING_PAID': {
              const bookingId = (payload.bookingId as string) || event.aggregateId;
              if (bookingId) {
                // Production truth: no supplier adapter is wired, so the
                // consumer must NOT mint a PNR (externalPnr stays empty until a
                // real provider confirms). The booking's own reference remains
                // the customer-facing tracking code.
                const booking = await prisma.booking.findUnique({
                  where: { id: bookingId },
                  select: { id: true, reference: true, externalPnr: true, customerId: true, travelDate: true },
                });
                if (booking) {
                  await prisma.auditLog.create({
                    data: {
                      action: 'BOOKING_CONFIRMED_PROCESSED',
                      resource: 'Booking',
                      resourceId: booking.id,
                      newData: JSON.stringify({
                        reference: booking.reference,
                        supplierPnrPresent: Boolean(booking.externalPnr),
                        eventVersion,
                        schemaVersion,
                      }),
                    },
                  });
                  outboxLogger.info('Booking confirmation event processed', {
                    bookingId: booking.id,
                    supplierPnrPresent: Boolean(booking.externalPnr),
                  });

                  // Web push to the traveler — never blocks the confirmation
                  // pipeline (push config gaps are logged, not thrown here).
                  if (booking.customerId) {
                    try {
                      await PushDispatchService.sendToUser(booking.customerId, {
                        title: 'رزرو شما تایید شد 🎉',
                        body: `رزرو ${booking.reference} قطعی شد و در «سفرهای من» قابل پیگیری است.`,
                        url: `/my-trips/${booking.id}`,
                        tag: `booking-${booking.id}`,
                      });
                    } catch (pushErr: unknown) {
                      outboxLogger.error('Booking confirmation push failed (non-blocking)', {
                        bookingId: booking.id,
                        error: pushErr instanceof Error ? pushErr.message : String(pushErr),
                      });
                    }
                  }
                }
              }
              break;
            }

            case 'REFUND_REQUESTED':
            case 'BOOKING_REFUNDED': {
              const notificationProvider = getNotificationProvider();
              const bookingId = (payload.bookingId as string) || event.aggregateId;
              const booking = bookingId
                ? await prisma.booking.findUnique({
                    where: { id: bookingId },
                    include: { customer: true },
                  })
                : null;

              if (booking?.customer?.phone) {
                await notificationProvider.sendSms(
                  booking.customer.phone,
                  `درخواست استرداد رزرو ${booking.reference || booking.id} ثبت گردید و در حال بررسی مالی است.`
                );
              } else if (booking?.customer?.email) {
                await notificationProvider.sendEmail(
                  booking.customer.email,
                  'اطلاعیه استرداد رزرو فیروزو',
                  `درخواست استرداد برای رزرو شماره ${booking.reference || booking.id} ثبت گردید.`
                );
              }

              if (booking?.customerId) {
                try {
                  await PushDispatchService.sendToUser(booking.customerId, {
                    title: event.eventType === 'BOOKING_REFUNDED' ? 'استرداد انجام شد 💸' : 'درخواست استرداد ثبت شد',
                    body: `وضعیت رزرو ${booking.reference || booking.id} به‌روزرسانی شد؛ جزئیات در «سفرهای من».`,
                    url: `/my-trips/${booking.id}`,
                    tag: `refund-${booking.id}`,
                  });
                } catch (pushErr: unknown) {
                  outboxLogger.error('Refund push failed (non-blocking)', {
                    bookingId: booking.id,
                    error: pushErr instanceof Error ? pushErr.message : String(pushErr),
                  });
                }
              }
              break;
            }

            case 'AUTH_OTP_REQUESTED': {
              const notificationProvider = getNotificationProvider();
              const identifier = payload.identifier as string;
              const channel = payload.channel as string;
              const codeEnc = payload.codeEnc as string;

              let code: string | undefined;
              if (codeEnc) {
                try {
                  code = decryptSensitive(String(codeEnc));
                } catch {
                  throw new Error('OTP delivery failed: could not decrypt one-time code from outbox payload');
                }
              }

              const otpMessage = `کد تایید ورود به فیروزو: ${code || '***'}\nاعتبار: ۵ دقیقه`;

              let delivery;
              if (channel === 'bale') {
                delivery = await notificationProvider.sendBale(
                  identifier,
                  otpMessage
                );
              } else if (channel === 'telegram') {
                delivery = await notificationProvider.sendTelegram(
                  identifier,
                  otpMessage
                );
              } else if (channel === 'whatsapp') {
                delivery = await notificationProvider.sendWhatsApp(
                  identifier,
                  otpMessage
                );
              } else if (channel === 'email' || (identifier && identifier.includes('@') && !identifier.startsWith('@'))) {
                delivery = await notificationProvider.sendEmail(
                  identifier,
                  'کد تایید ورود به فیروزو',
                  otpMessage
                );
              } else {
                delivery = await notificationProvider.sendSms(
                  identifier,
                  otpMessage
                );
              }

              if (!delivery.success) {
                throw new Error(`OTP delivery failed via ${delivery.provider}: ${delivery.error || 'unknown error'}`);
              }
              break;
            }

            case 'NOTIFICATION_DISPATCH': {
              const notificationProvider = getNotificationProvider();
              const phone = payload.phone as string;
              const email = payload.email as string;
              const content = (payload.content as string) || (payload.message as string) || '';
              const title = (payload.title as string) || 'اطلاعیه فیروزو';

              if (phone) {
                await notificationProvider.sendSms(phone, content);
              } else if (email) {
                await notificationProvider.sendEmail(email, title, content);
              }
              break;
            }

            // Deliberate web-push sends (ERP broadcast, lifecycle hooks that
            // emit this event). Unconfigured-in-production fails into the DLQ
            // so the delivery gap stays visible in /admin/ops.
            case 'PUSH_NOTIFICATION_DISPATCH': {
              const title = (payload.title as string) || 'اطلاعیه فیروزو';
              const body = (payload.body as string) || (payload.content as string) || '';
              const url = (payload.url as string) || '/my-trips';
              const tag = (payload.tag as string) || undefined;
              const targetUserId = payload.userId as string | undefined;
              const broadcast = payload.broadcast === true;

              if (!body) {
                throw new Error('PUSH_NOTIFICATION_DISPATCH payload has no body');
              }

              const report = broadcast
                ? await PushDispatchService.sendToSubscribers({ title, body, url, tag })
                : targetUserId
                  ? await PushDispatchService.sendToUser(targetUserId, { title, body, url, tag })
                  : { sent: 0, removed: 0, simulated: false };

              outboxLogger.info('Push dispatch processed', { ...report, targetUserId, broadcast });
              break;
            }

            default: {
              // ASYNC-106: Fail unknown event types so retry / DLQ logic triggers
              throw new Error(`UNKNOWN_EVENT_TYPE: Event type "${event.eventType}" has no registered consumer handler`);
            }
          }

          // Mark as PROCESSED
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: 'PROCESSED',
              processedAt: new Date(),
            },
          });
          processedCount++;
        } catch (eventErr: unknown) {
          const errorMessage = eventErr instanceof Error ? eventErr.message : String(eventErr);
          const nextRetry = (event.retryCount || 0) + 1;
          const isDeadLetter = nextRetry >= 5 || errorMessage.startsWith('UNKNOWN_EVENT_TYPE');
          log.error('Outbox event processing failed', {
            eventType: event.eventType,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            retry: nextRetry,
            deadLetter: isDeadLetter,
            error: errorMessage,
          });

          // ASYNC-107: Bounded exponential backoff with jitter
          const backoffSeconds = calculateBackoffWithJitter(nextRetry, 10, 600, 0.25);
          const nextAvailableAt = new Date(Date.now() + backoffSeconds * 1000);

          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: isDeadLetter ? 'DEAD_LETTER' : 'PENDING',
              retryCount: nextRetry,
              availableAt: nextAvailableAt,
              lockedAt: null,
              workerId: null,
              lastError: errorMessage,
            },
          });
        }
      }

      return processedCount;
    } catch (err) {
      console.error('[Outbox] Error in worker cycle:', err);
      return 0;
    }
  }
}
