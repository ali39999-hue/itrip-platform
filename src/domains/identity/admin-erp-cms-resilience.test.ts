import { describe, it, expect } from 'vitest';
import { isKnownAdminIdentifier, getAdminPhones, DEFAULT_ADMIN_PHONES } from '@/auth';
import { mergeStaticTours, ContentDomainService } from '@/domains/content/ContentDomainService';

describe('Admin ERP & CMS Resilience Suite', () => {
  it('identifies known admin identifiers accurately', () => {
    expect(isKnownAdminIdentifier('admin@firuzo.com')).toBe(true);
    expect(isKnownAdminIdentifier('ADMIN@FIRUZO.COM')).toBe(true);
    expect(isKnownAdminIdentifier('admin')).toBe(true);
    expect(isKnownAdminIdentifier('09120000000')).toBe(true);
    expect(isKnownAdminIdentifier('09123456789')).toBe(true);
    expect(isKnownAdminIdentifier('09304064124')).toBe(true);
    expect(isKnownAdminIdentifier('09127925583')).toBe(true);
    expect(isKnownAdminIdentifier('09105247414')).toBe(true);
    expect(isKnownAdminIdentifier('+989304064124')).toBe(true);
    expect(isKnownAdminIdentifier('09999999999')).toBe(false);
    expect(isKnownAdminIdentifier('customer@gmail.com')).toBe(false);
  });

  it('includes all default admin phones in getAdminPhones', () => {
    const phones = getAdminPhones();
    for (const p of DEFAULT_ADMIN_PHONES) {
      expect(phones).toContain(p);
    }
  });

  it('merges static tours cleanly with database tours without resurrecting tombstoned items', () => {
    const staticTours = [
      { id: 'tour-tehran-culture' },
      { id: 'tour-isfahan-heritage' },
      { id: 'tour-shiraz-poetry' },
    ];
    const dbIds = new Set(['tour-tehran-culture']);
    const tombstoned = new Set(['tour-shiraz-poetry']);

    const missing = mergeStaticTours(staticTours, dbIds, tombstoned);
    expect(missing).toEqual([{ id: 'tour-isfahan-heritage' }]);
  });

  it('handles ensureTourInDb for valid static tour id', async () => {
    const result = await ContentDomainService.ensureTourInDb('t1');
    expect(result).toBe(true);
  });

  it('handles ensureTourInDb safely for invalid id', async () => {
    const result = await ContentDomainService.ensureTourInDb('non-existent-tour-xyz');
    expect(result).toBe(false);
  });
});
