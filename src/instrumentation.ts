export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { HoldExpirationWorker } = await import('@/workers/hold-expiration-worker');
    const { OutboxConsumer } = await import('@/domains/events/OutboxConsumer');
    const { SagaWorker } = await import('@/workers/saga-worker');
    const { ReconciliationService } = await import('@/domains/ledger/ReconciliationService');

    // 1. Start background hold sweeper (runs every 60s)
    const sweeper = setInterval(async () => {
      try {
        const report = await HoldExpirationWorker.runSweep();
        if (report.sweptCount > 0) {
          console.log(`[Sweeper] Swept ${report.sweptCount} expired holds in ${report.durationMs}ms.`);
        }
      } catch (error) {
        console.error('[Sweeper] Error sweeping holds:', error);
      }
    }, 60000);
    if (sweeper.unref) sweeper.unref();

    // 2. Start background Outbox Event Consumer (runs every 10s)
    const consumer = setInterval(async () => {
      try {
        const processed = await OutboxConsumer.processPendingEvents();
        if (processed > 0) {
          console.log(`[Outbox Consumer] Dispatched ${processed} events.`);
        }
      } catch (error) {
        console.error('[Outbox Consumer] Error processing outbox events:', error);
      }
    }, 10000);
    if (consumer.unref) consumer.unref();

    // 3. Start background Saga Execution Worker (runs every 15s)
    const sagaInterval = setInterval(async () => {
      try {
        const res = await SagaWorker.runSagaCycle();
        if (res.processedSagas > 0) {
          console.log(`[Saga Worker] Processed ${res.processedSagas} sagas (completed: ${res.completedSteps}, failed: ${res.failedSteps}).`);
        }
      } catch (error) {
        console.error('[Saga Worker] Error processing sagas:', error);
      }
    }, 15000);
    if (sagaInterval.unref) sagaInterval.unref();

    // 4. Periodic ledger reconciliation health check (runs every 30 minutes)
    const reconciliationInterval = setInterval(async () => {
      try {
        const report = await ReconciliationService.reconcileLedger();
        if (!report.isBalanced || report.unbalancedGroupsCount > 0) {
          console.warn(
            `[Reconciliation Health Check] Ledger is UNBALANCED! ${report.unbalancedGroupsCount} groups mismatched.`,
            report.mismatches
          );
        } else {
          console.log(
            `[Reconciliation Health Check] Ledger balanced. Checked ${report.totalGroupsChecked} groups successfully.`
          );
        }
      } catch (error) {
        console.error('[Reconciliation Health Check] Error during ledger reconciliation:', error);
      }
    }, 30 * 60 * 1000);
    if (reconciliationInterval.unref) reconciliationInterval.unref();
  }
}
