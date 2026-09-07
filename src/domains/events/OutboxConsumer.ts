import { prisma } from '@/lib/prisma';
import { getNotificationProvider } from './NotificationProvider';
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
function generatePnr(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars[Math.floor(Math.random() * chars.length)];
  }
  return `FZ-${pnr}`;
}

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
        where: { status: 'PROCESSING', lockedAt: { lt: staleCutoff } },
        data: { status: 'PENDING', lockedAt: null, workerId: null },
      });
      if (recovered.count > 0) {
        console.warn(`[Outbox] Recovered ${recovered.count} stale PROCESSING events`);
      }

      // 2. Concurrency-Safe Claim using SELECT ... FOR UPDATE SKIP LOCKED (ASYNC-104)
      const claimedEvents: Array<{
        id: string;
        eventType: string;
        aggregateType: string | null;
        aggregateId: string | null;
        correlationId: string | null;
        payload: string;
        retryCount: number;
      }> = await prisma.$queryRaw`
        UPDATE "OutboxEvent"
        SET "status" = 'PROCESSING',
            "lockedAt" = NOW(),
            "workerId" = ${workerId}
        WHERE "id" IN (
          SELECT "id"
          FROM "OutboxEvent"
          WHERE "status" = 'PENDING'
            AND "availableAt" <= NOW()
          ORDER BY "availableAt" ASC
          LIMIT 20
          FOR UPDATE SKIP LOCKED
        )
        RETURNING "id", "eventType", "aggregateType", "aggregateId", "correlationId", "payload", "retryCount"
      `;

      if (!claimedEvents || claimedEvents.length === 0) {
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
                const booking = await prisma.booking.findUnique({
                  where: { id: bookingId },
                  select: { id: true, externalPnr: true },
                });
                if (booking && !booking.externalPnr) {
                  const pnr = generatePnr();
                  await prisma.booking.update({
                    where: { id: booking.id },
                    data: { externalPnr: pnr },
                  });
                  await prisma.auditLog.create({
                    data: {
                      action: 'VOUCHER_ISSUED',
                      resource: 'Booking',
                      resourceId: booking.id,
                      newData: JSON.stringify({ pnr, eventVersion, schemaVersion }),
                    },
                  });
                  outboxLogger.info('Issued voucher for booking', { pnr, bookingId: booking.id });
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
              if (channel === 'email' || (identifier && identifier.includes('@'))) {
                delivery = await notificationProvider.sendEmail(
                  identifier,
                  'کد تایید ورود به فیروزو',
                  otpMessage
                );
              } else if (channel === 'whatsapp') {
                delivery = await notificationProvider.sendWhatsApp(
                  identifier,
                  otpMessage
                );
              } else if (channel === 'telegram') {
                delivery = await notificationProvider.sendTelegram(
                  identifier,
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
