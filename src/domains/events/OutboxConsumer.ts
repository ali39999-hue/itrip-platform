import { prisma } from '@/lib/prisma';
import { getNotificationProvider } from './NotificationProvider';

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
   * Processes pending outbox events asynchronously
   */
  static async processPendingEvents(): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;

    try {
      // Recover events stranded in PROCESSING by a crash between
      // PROCESSING and PROCESSED updates.
      const staleCutoff = new Date(Date.now() - PROCESSING_STALE_MS);
      const recovered = await prisma.outboxEvent.updateMany({
        where: { status: 'PROCESSING', updatedAt: { lt: staleCutoff } },
        data: { status: 'PENDING' },
      });
      if (recovered.count > 0) {
        console.warn(`[Outbox] Recovered ${recovered.count} stale PROCESSING events`);
      }

      const pendingEvents = await prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        take: 20,
        orderBy: { createdAt: 'asc' },
      });

      if (pendingEvents.length === 0) {
        return 0;
      }

      let processedCount = 0;

      for (const event of pendingEvents) {
        try {
          // Mark as PROCESSING
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PROCESSING' },
          });

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
                include: { customer: true }
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
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: event.retryCount >= 3 ? 'FAILED' : 'PENDING',
              retryCount: { increment: 1 },
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
