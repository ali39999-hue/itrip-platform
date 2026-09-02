import { prisma } from '@/lib/prisma';

export class OutboxConsumer {
  private static isRunning = false;

  /**
   * Processes pending outbox events asynchronously
   */
  static async processPendingEvents(): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;

    try {
      const pendingEvents = await prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        take: 20,
        orderBy: { createdAt: 'asc' },
      });

      if (pendingEvents.length === 0) {
        this.isRunning = false;
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
            case 'BOOKING_PAID':
              // Simulate issuance of electronic tickets / GDS vouchers / notification
              console.log(`[Outbox] Issuing voucher and notification for booking ${payload.bookingId || payload.reference}`);
              break;

            case 'REFUND_REQUESTED':
            case 'BOOKING_REFUNDED':
              console.log(`[Outbox] Dispatching refund notification for booking ${payload.bookingId}`);
              break;

            case 'AUTH_OTP_REQUESTED':
              console.log(`[Outbox] Dispatching OTP message to ${payload.identifier} via ${payload.channel}`);
              break;

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
