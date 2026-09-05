import { prisma } from '@/lib/prisma';
import { getNotificationProvider } from './NotificationProvider';
import crypto from 'crypto';

/** Events stuck in PROCESSING for longer than this are re-queued. */
const PROCESSING_STALE_MS = 2 * 60 * 1000;

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
  private static isRunning = false;

  /**
   * Concurrency-safe atomic outbox worker claim and execution (OUTBOX-001, OUTBOX-002)
   * Uses PostgreSQL "SELECT ... FOR UPDATE SKIP LOCKED" to guarantee zero race conditions across worker instances.
   */
  static async processPendingEvents(customWorkerId?: string): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;

    const workerId = customWorkerId || `worker_${crypto.randomBytes(3).toString('hex')}_${Date.now().toString(36)}`;

    try {
      // 1. Recover events stranded in PROCESSING by a crash (Crash Recovery, Section 18)
      const staleCutoff = new Date(Date.now() - PROCESSING_STALE_MS);
      const recovered = await prisma.outboxEvent.updateMany({
        where: { status: 'PROCESSING', lockedAt: { lt: staleCutoff } },
        data: { status: 'PENDING', lockedAt: null, workerId: null },
      });
      if (recovered.count > 0) {
        console.warn(`[Outbox] Recovered ${recovered.count} stale PROCESSING events`);
      }

      // 2. Concurrency-Safe Claim using SELECT ... FOR UPDATE SKIP LOCKED (Section 19)
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
        try {
          const payload = JSON.parse(event.payload || '{}');

          // Process based on eventType
          switch (event.eventType) {
            case 'BOOKING_CONFIRMED':
            case 'BOOKING_PAID': {
              // Voucher issuing: stamp the booking with a GDS reference once.
              if (payload.bookingId) {
                const booking = await prisma.booking.findUnique({
                  where: { id: payload.bookingId },
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
                      newData: JSON.stringify({ pnr }),
                    },
                  });
                  console.log(`[Outbox] Issued voucher ${pnr} for booking ${booking.id}`);
                }
              }
              break;
            }

            case 'REFUND_REQUESTED':
            case 'BOOKING_REFUNDED': {
              const notificationProvider = getNotificationProvider();
              const bookingId = payload.bookingId;
              const booking = bookingId ? await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { customer: true },
              }) : null;

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
              const { identifier, channel, code } = payload;
              const otpMessage = `کد تایید ورود به فیروزو: ${code || '***'}\nاعتبار: ۵ دقیقه`;

              if (channel === 'email' || (identifier && identifier.includes('@'))) {
                await notificationProvider.sendEmail(
                  identifier,
                  'کد تایید ورود به فیروزو',
                  otpMessage
                );
              } else {
                await notificationProvider.sendSms(
                  identifier,
                  otpMessage
                );
              }
              break;
            }

            default:
              console.log(`[Outbox] Processed generic event ${event.eventType}`);
              break;
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
          console.error(`[Outbox] Failed processing event ${event.id}:`, eventErr);
          const errorMessage = eventErr instanceof Error ? eventErr.message : String(eventErr);
          const nextRetry = (event.retryCount || 0) + 1;
          const isDeadLetter = nextRetry >= 5;

          // Exponential backoff: 2^retry * 10 seconds (10s, 20s, 40s, 80s)
          const backoffSeconds = Math.min(Math.pow(2, nextRetry) * 10, 600);
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
    } finally {
      this.isRunning = false;
    }
  }
}
