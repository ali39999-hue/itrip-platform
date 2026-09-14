import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { OutboxConsumer } from './OutboxConsumer';

const MARKER = 'TEST_DLQ_REQUEUE';

describe('OutboxConsumer.requeueDeadLetters (ASYNC-109)', () => {
  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany({ where: { eventType: { startsWith: MARKER } } });
  });

  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({ where: { eventType: { startsWith: MARKER } } });
    await prisma.$disconnect();
  });

  it('requeues bounded dead letters; skips UNKNOWN_EVENT_TYPE and max-retry events', async () => {
    const base = {
      status: 'DEAD_LETTER',
      retryCount: 5,
      payload: JSON.stringify({}),
      availableAt: new Date(),
    };

    await prisma.outboxEvent.create({
      data: { ...base, eventType: `${MARKER}_retryable`, lastError: 'PUSH_NOTIFICATION_DISPATCH: channel timeout' },
    });
    await prisma.outboxEvent.create({
      data: {
        ...base,
        eventType: `${MARKER}_unknown`,
        lastError: 'UNKNOWN_EVENT_TYPE: Event type "NOPE" has no registered consumer handler',
      },
    });
    await prisma.outboxEvent.create({
      data: { ...base, retryCount: 8, eventType: `${MARKER}_maxed`, lastError: 'some transient error' },
    });

    const requeued = await OutboxConsumer.requeueDeadLetters(10, { olderThanMs: 0, eventTypePrefix: MARKER });

    expect(requeued).toBe(1);

    const rows = await prisma.outboxEvent.findMany({
      where: { eventType: { startsWith: MARKER } },
      select: { eventType: true, status: true },
    });
    const byType = new Map(rows.map((r) => [r.eventType, r.status]));
    expect(byType.get(`${MARKER}_retryable`)).toBe('PENDING');
    expect(byType.get(`${MARKER}_unknown`)).toBe('DEAD_LETTER');
    expect(byType.get(`${MARKER}_maxed`)).toBe('DEAD_LETTER');
  });

  it('caps requeue at the given limit', async () => {
    for (let i = 0; i < 5; i++) {
      await prisma.outboxEvent.create({
        data: {
          eventType: `${MARKER}_limit_${i}`,
          status: 'DEAD_LETTER',
          retryCount: 5,
          lastError: 'transient failure',
          payload: JSON.stringify({}),
          availableAt: new Date(),
        },
      });
    }

    const requeued = await OutboxConsumer.requeueDeadLetters(2, { olderThanMs: 0, eventTypePrefix: MARKER });
    expect(requeued).toBe(2);
  });
});
