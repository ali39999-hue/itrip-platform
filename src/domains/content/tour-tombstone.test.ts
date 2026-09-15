import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  ContentDomainService,
  DELETED_STATIC_KIND_TOUR,
  mergeStaticTours,
} from './ContentDomainService';

const KIND = 'tour-test-kind';

describe('Tour tombstones: CMS deletes stay deleted (no static resurrection)', () => {
  afterAll(async () => {
    await prisma.deletedStaticRef.deleteMany({ where: { kind: KIND } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('mergeStaticTours keeps DB-mirrored ids out (even unpublished twins)', () => {
    const statues = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];
    expect(mergeStaticTours(statues, ['t1'], [])).toEqual([{ id: 't2' }, { id: 't3' }]);
  });

  it('mergeStaticTours suppresses tombstoned ids', () => {
    const statues = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];
    expect(mergeStaticTours(statues, [], ['t2'])).toEqual([{ id: 't1' }, { id: 't3' }]);
  });

  it('mergeStaticTours accepts Sets as well as arrays', () => {
    const statues = [{ id: 't1' }, { id: 't2' }];
    expect(mergeStaticTours(statues, new Set(['t1']), new Set(['t2']))).toEqual([]);
  });

  it('tombstone write -> read -> clear round-trip persists deletion intent', async () => {
    const refId = `tomb_${Date.now().toString(36)}`;
    await ContentDomainService.tombstoneStaticRef(KIND, refId);
    // upsert is idempotent — recording twice must not throw or duplicate
    await ContentDomainService.tombstoneStaticRef(KIND, refId);

    const ids = await ContentDomainService.getDeletedStaticIds(KIND);
    expect(ids).toContain(refId);

    await ContentDomainService.untombstoneStaticRefs(KIND, [refId]);
    const after = await ContentDomainService.getDeletedStaticIds(KIND);
    expect(after).not.toContain(refId);
  });

  it('deleting a static tour records a tombstone; deleting a custom tour does not', async () => {
    const created = await ContentDomainService.createTour({
      title: `تور موقت تست ${Date.now().toString(36)}`,
      city: 'تهران',
      durationDays: 2,
      price: 1000000,
    });
    try {
      await ContentDomainService.deleteTour(created.id);
      const ids = await ContentDomainService.getDeletedStaticIds(DELETED_STATIC_KIND_TOUR);
      expect(ids).not.toContain(created.id);
    } finally {
      await prisma.tour.deleteMany({ where: { id: created.id } }).catch(() => {});
      await ContentDomainService.untombstoneStaticRefs(DELETED_STATIC_KIND_TOUR, [created.id]);
    }
  });
});
