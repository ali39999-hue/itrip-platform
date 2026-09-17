import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    travelDocument: { create: vi.fn(), findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import { decryptSensitive } from '@/lib/security/crypto-vault';
import { DocumentManagementService } from './DocumentManagementService';

describe('Document management round trip (database-free)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DocumentManagementService.clearPayloadStore();
  });

  it('persists a document number compatible with the shared PII vault', async () => {
    vi.mocked(prisma.travelDocument.create).mockResolvedValue({ id: 'doc-1', type: 'PASSPORT' } as never);
    await DocumentManagementService.storeDocument({
      travelerProfileId: 'profile-1', type: 'PASSPORT',
      documentNumber: 'TEST-PASSPORT-42', operatorId: 'operator-1',
    });
    const stored = vi.mocked(prisma.travelDocument.create).mock.calls[0][0].data.documentNumber;
    expect(stored).toMatch(/^enc:v1:/);
    expect(decryptSensitive(stored)).toBe('TEST-PASSPORT-42');
  });

  it('returns the decrypted document number for authorized retrieval', async () => {
    const { encryptSensitive } = await import('@/lib/security/crypto-vault');
    vi.mocked(prisma.travelDocument.findUnique).mockResolvedValue({
      id: 'doc-1', type: 'PASSPORT', documentNumber: encryptSensitive('TEST-PASSPORT-42'),
    } as never);
    const result = await DocumentManagementService.retrieveDocument({
      documentId: 'doc-1', userId: 'operator-1', permissions: ['traveler:pii:view'],
    });
    expect(result.documentNumber).toBe('TEST-PASSPORT-42');
  });
});
