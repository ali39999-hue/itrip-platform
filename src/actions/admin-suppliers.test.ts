/**
 * ADMIN-SUPPLIERS.TEST.TS
 *
 * Unit tests for admin supplier API actions: connectivity probes,
 * error handling, and multi-protocol handling.
 */
import { describe, it, expect, vi } from 'vitest';
import { testSupplierApiConnectionAction } from './admin-suppliers';

vi.mock('@/domains/identity/permission-service', () => ({
  requirePermission: vi.fn().mockResolvedValue(true),
}));

describe('Admin Supplier API Connection Action Suite', () => {
  it('successfully tests connectivity to a mock/demo travel supplier', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const res = await testSupplierApiConnectionAction({
      baseUrl: 'https://api.partocrs.com/mock',
      timeoutMs: 3000,
      protocol: 'SOAP_WSDL',
      apiKey: 'test_token_123',
    });

    expect(res.success).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.protocol).toBe('SOAP_WSDL');
    expect(res.message).toContain('200 OK');
  });

  it('rejects invalid or missing Base URL', async () => {
    const res = await testSupplierApiConnectionAction({
      baseUrl: '',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('نامعتبر است');
  });
});
