import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  GENESIS_INVOICE_HASH,
  computeInvoiceHash,
  verifyInvoiceHash,
  fiscalPeriodForJalali,
  InvoiceDomainService,
  canonicalInvoiceTotals,
} from './InvoiceDomainService';

describe('Invoice Tamper-Evident Hash Chain & Sequential Numbering Suite', () => {
  it('computes deterministic canonical totals independent of key insertion order', () => {
    const totals1 = {
      netAmount: new Prisma.Decimal('10000000'),
      taxAmount: new Prisma.Decimal('900000'),
      totalAmount: new Prisma.Decimal('10900000'),
      currency: 'IRR',
    };

    const totals2 = {
      currency: 'irr',
      totalAmount: '10900000',
      taxAmount: '900000',
      netAmount: '10000000',
    };

    expect(canonicalInvoiceTotals(totals1)).toBe(canonicalInvoiceTotals(totals2));
  });

  it('computes sha256 hash incorporating document number, timestamp, totals and previous hash', () => {
    const issuedAt = new Date('2026-03-21T08:00:00.000Z');
    const hash = computeInvoiceHash({
      invoiceNumber: 'INV-1405-000001',
      issuedAt,
      totals: {
        netAmount: '50000000',
        taxAmount: '4500000',
        totalAmount: '54500000',
        currency: 'IRR',
      },
      previousHash: GENESIS_INVOICE_HASH,
    });

    expect(hash).toHaveLength(64);
    expect(
      verifyInvoiceHash({
        invoiceNumber: 'INV-1405-000001',
        issuedAt,
        totals: {
          netAmount: '50000000',
          taxAmount: '4500000',
          totalAmount: '54500000',
          currency: 'IRR',
        },
        previousHash: GENESIS_INVOICE_HASH,
        expectedHash: hash,
      })
    ).toBe(true);

    // Tampering any field breaks the hash
    expect(
      verifyInvoiceHash({
        invoiceNumber: 'INV-1405-000001',
        issuedAt,
        totals: {
          netAmount: '50000001', // tampered
          taxAmount: '4500000',
          totalAmount: '54500000',
          currency: 'IRR',
        },
        previousHash: GENESIS_INVOICE_HASH,
        expectedHash: hash,
      })
    ).toBe(false);
  });

  it('verifies inalterable hash chain across consecutive invoices', () => {
    const chainInvoices = [
      {
        invoiceNumber: 'INV-1405-000001',
        issuedAt: new Date('2026-03-21T08:00:00.000Z'),
        netAmount: new Prisma.Decimal('10000000'),
        taxAmount: new Prisma.Decimal('900000'),
        totalAmount: new Prisma.Decimal('10900000'),
        currency: 'IRR',
      },
      {
        invoiceNumber: 'INV-1405-000002',
        issuedAt: new Date('2026-03-21T09:30:00.000Z'),
        netAmount: new Prisma.Decimal('25000000'),
        taxAmount: new Prisma.Decimal('2250000'),
        totalAmount: new Prisma.Decimal('27250000'),
        currency: 'IRR',
      },
      {
        invoiceNumber: 'INV-1405-000003',
        issuedAt: new Date('2026-03-21T11:15:00.000Z'),
        netAmount: new Prisma.Decimal('8000000'),
        taxAmount: new Prisma.Decimal('720000'),
        totalAmount: new Prisma.Decimal('8720000'),
        currency: 'IRR',
      },
    ];

    const result = InvoiceDomainService.verifyInvoiceHashChain(chainInvoices);
    expect(result.valid).toBe(true);
    expect(result.hashes).toHaveLength(3);
    // All hashes must be unique and non-empty
    expect(new Set(result.hashes).size).toBe(3);
  });

  it('resolves valid Jalali fiscal year (1404 / 1405)', () => {
    // Gregorian 2026-03-25 is Farvardin 1405
    const date1405 = new Date('2026-03-25T12:00:00Z');
    expect(fiscalPeriodForJalali(date1405)).toBe('1405');

    // Gregorian 2025-05-10 is Ordibehesht 1404
    const date1404 = new Date('2025-05-10T12:00:00Z');
    expect(fiscalPeriodForJalali(date1404)).toBe('1404');
  });
});
