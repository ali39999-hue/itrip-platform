import { InventoryEngine } from '@/domains/inventory/InventoryEngine';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Start background sweeper
    setInterval(async () => {
      try {
        const count = await InventoryEngine.sweepExpiredHolds();
        if (count > 0) {
          console.log(`[Sweeper] Swept ${count} expired holds.`);
        }
      } catch (error) {
        console.error('[Sweeper] Error sweeping holds:', error);
      }
    }, 60000); // Run every 60 seconds
  }
}
