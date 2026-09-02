import { InventoryEngine } from '@/domains/inventory/InventoryEngine';
import { OutboxConsumer } from '@/domains/events/OutboxConsumer';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 1. Start background hold sweeper (runs every 60s)
    setInterval(async () => {
      try {
        const count = await InventoryEngine.sweepExpiredHolds();
        if (count > 0) {
          console.log(`[Sweeper] Swept ${count} expired holds.`);
        }
      } catch (error) {
        console.error('[Sweeper] Error sweeping holds:', error);
      }
    }, 60000);

    // 2. Start background Outbox Event Consumer (runs every 10s)
    setInterval(async () => {
      try {
        const processed = await OutboxConsumer.processPendingEvents();
        if (processed > 0) {
          console.log(`[Outbox Consumer] Dispatched ${processed} events.`);
        }
      } catch (error) {
        console.error('[Outbox Consumer] Error processing outbox events:', error);
      }
    }, 10000);
  }
}
