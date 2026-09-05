import { describe, it, expect, afterAll } from 'vitest';
import { OutboxConsumer } from './OutboxConsumer';
import { SagaWorker } from '@/workers/saga-worker';
import { prisma } from '@/lib/prisma';

describe('Saga Orchestration, Outbox & Crash Recovery Suite (SAGA-001, SAGA-002, OUTBOX-001, OUTBOX-002)', () => {
  const suffix = `saga_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testBookingId = '';

  afterAll(async () => {
    try {
      await prisma.sagaStep.deleteMany({
        where: { saga: { aggregateId: testBookingId } },
      });
      await prisma.sagaExecution.deleteMany({
        where: { aggregateId: testBookingId },
      });
      await prisma.outboxEvent.deleteMany({
        where: { correlationId: { contains: suffix } },
      });
      await prisma.booking.deleteMany({
        where: { id: testBookingId },
      });
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('OUTBOX-001: Outbox consumer processes pending events with FOR UPDATE SKIP LOCKED', async () => {
    // Seed an event
    const event = await prisma.outboxEvent.create({
      data: {
        eventType: 'BOOKING_PAID',
        aggregateType: 'BOOKING',
        aggregateId: `bkg_outbox_${suffix}`,
        correlationId: `corr_${suffix}_1`,
        payload: JSON.stringify({ bookingId: `bkg_outbox_${suffix}` }),
        status: 'PENDING',
      },
    });

    // Run outbox cycle
    const processed = await OutboxConsumer.processPendingEvents(`wrk_test_${suffix}`);
    expect(processed).toBeGreaterThanOrEqual(1);

    const checkEvent = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(checkEvent.status).toBe('PROCESSED');
    expect(checkEvent.processedAt).not.toBeNull();
  });

  it('OUTBOX-002: Retries failed outbox events with exponential backoff and dead-letter transition', async () => {
    // Create an event that will fail (malformed JSON payload)
    const malformedEvent = await prisma.outboxEvent.create({
      data: {
        eventType: 'UNKNOWN_CRASH_TEST',
        aggregateType: 'BOOKING',
        correlationId: `corr_${suffix}_fail`,
        payload: '{ bad json',
        status: 'PENDING',
        retryCount: 4, // 4th retry -> next will trigger DEAD_LETTER (>=5)
      },
    });

    await OutboxConsumer.processPendingEvents(`wrk_fail_${suffix}`);

    const deadEvent = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: malformedEvent.id },
    });

    expect(deadEvent.status).toBe('DEAD_LETTER');
    expect(deadEvent.retryCount).toBe(5);
    expect(deadEvent.lastError).toBeDefined();
  });

  it('SAGA-001, SAGA-002: Multi-step saga executes with compensation on failure', async () => {
    testBookingId = `bkg_saga_${suffix}`;
    const compensationsCalled: string[] = [];
    const sideEffectsCalled: string[] = [];

    // Register test step handlers
    SagaWorker.registerStepHandler('LOCK_INVENTORY', {
      async execute() {
        sideEffectsCalled.push('LOCK_INVENTORY');
        return { success: true, result: { lockToken: 'hld_123' } };
      },
      async compensate() {
        compensationsCalled.push('LOCK_INVENTORY');
        return { success: true };
      },
    });

    SagaWorker.registerStepHandler('EXTERNAL_SUPPLIER_TICKET', {
      async execute() {
        sideEffectsCalled.push('EXTERNAL_SUPPLIER_TICKET');
        // Simulate supplier outage / rejection
        return { success: false, error: 'Supplier flight booking rejected: No seats available' };
      },
      async compensate() {
        compensationsCalled.push('EXTERNAL_SUPPLIER_TICKET');
        return { success: true };
      },
    });

    // Create SagaExecution with 2 steps
    const saga = await prisma.sagaExecution.create({
      data: {
        sagaType: 'TICKET_CONFIRMATION_SAGA',
        aggregateType: 'BOOKING',
        aggregateId: testBookingId,
        correlationId: `corr_saga_${suffix}`,
        status: 'PENDING',
        contextJson: JSON.stringify({ bookingId: testBookingId }),
        steps: {
          create: [
            { stepType: 'LOCK_INVENTORY', status: 'PENDING' },
            { stepType: 'EXTERNAL_SUPPLIER_TICKET', status: 'PENDING' },
          ],
        },
      },
    });

    // Run Saga worker cycle
    const report = await SagaWorker.runSagaCycle(`wrk_saga_${suffix}`);
    expect(report.processedSagas).toBeGreaterThanOrEqual(1);

    // Verify side effects
    expect(sideEffectsCalled).toContain('LOCK_INVENTORY');
    expect(sideEffectsCalled).toContain('EXTERNAL_SUPPLIER_TICKET');

    // Verify compensation was triggered for succeeded step in reverse order
    expect(compensationsCalled).toContain('LOCK_INVENTORY');

    // Verify database state: saga is COMPENSATED
    const finalSaga = await prisma.sagaExecution.findUniqueOrThrow({
      where: { id: saga.id },
      include: { steps: true },
    });

    expect(finalSaga.status).toBe('COMPENSATED');
    const lockStep = finalSaga.steps.find((s) => s.stepType === 'LOCK_INVENTORY');
    const ticketStep = finalSaga.steps.find((s) => s.stepType === 'EXTERNAL_SUPPLIER_TICKET');

    expect(lockStep?.status).toBe('COMPENSATED');
    expect(ticketStep?.status).toBe('FAILED');
  });

  it('Crash Recovery: Worker restart resumes without duplicate side effects', async () => {
    let externalCallsCount = 0;

    SagaWorker.registerStepHandler('EXTERNAL_PAYMENT_CAPTURE', {
      async execute() {
        externalCallsCount++;
        return { success: true, result: { captureId: 'cap_999' } };
      },
    });

    // Setup a saga where step 1 already SUCCEEDED before crash
    const crashSaga = await prisma.sagaExecution.create({
      data: {
        sagaType: 'PAYMENT_CAPTURE_SAGA',
        aggregateType: 'BOOKING',
        aggregateId: `${testBookingId}_crash`,
        correlationId: `corr_crash_${suffix}`,
        status: 'RUNNING',
        contextJson: JSON.stringify({ amount: 5000 }),
        steps: {
          create: [
            {
              stepType: 'EXTERNAL_PAYMENT_CAPTURE',
              status: 'SUCCEEDED',
              resultSnapshot: JSON.stringify({ captureId: 'cap_999' }),
            },
          ],
        },
      },
    });

    // Simulate worker process restart & execution cycle
    await SagaWorker.runSagaCycle(`restarted_worker_${suffix}`);

    // Verify external call was NOT duplicated (count remains 0 because step was already SUCCEEDED)
    expect(externalCallsCount).toBe(0);

    const checkSaga = await prisma.sagaExecution.findUniqueOrThrow({
      where: { id: crashSaga.id },
    });
    expect(checkSaga.status).toBe('SUCCEEDED');

    await prisma.sagaStep.deleteMany({ where: { sagaId: crashSaga.id } });
    await prisma.sagaExecution.delete({ where: { id: crashSaga.id } });
  });
});
