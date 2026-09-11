import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { InvoiceDomainService } from './InvoiceDomainService';

describe('InvoiceDomainService - Statutory Invoicing Suite', () => {
  const suffix = `inv_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let userAId = '';
  let userBId = '';
  let bookingId = '';
  let invoiceId = '';

  beforeAll(async () => {
    const userA = await prisma.user.create({
      data: {
        email: `inva_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'بهرام راد',
        firstNameFa: 'بهرام',
        lastNameFa: 'راد',
        nationalId: '0055443322',
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: `invb_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'کاربر غیرمجاز',
      },
    });
    userBId = userB.id;

    const booking = await prisma.booking.create({
      data: {
        customerId: userAId,
        reference: `BKG-INV-${suffix}`,
        status: 'CONFIRMED',
        totalAmount: 21_800_000,
        currency: 'IRR',
        items: {
          create: [
            {
              type: 'FLIGHT',
              netCost: 18_000_000,
              markup: 2_000_000,
              sellPrice: 20_000_000,
              taxAmount: 1_800_000,
              details: JSON.stringify({ title: 'پرواز رفت و برگشت مشهد' }),
            },
          ],
        },
      },
    });
    bookingId = booking.id;
  });

  afterAll(async () => {
    try {
      if (invoiceId) {
        await prisma.invoiceLine.deleteMany({ where: { invoiceId } });
        await prisma.invoice.deleteMany({ where: { id: invoiceId } });
      }
      if (bookingId) {
        await prisma.bookingItem.deleteMany({ where: { bookingId } });
        await prisma.booking.deleteMany({ where: { id: bookingId } });
      }
      if (userAId || userBId) {
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
      }
    } catch {
      // Ignore
    }
  });

  it('creates an invoice with lines, net, and VAT tax calculation', async () => {
    const inv = await InvoiceDomainService.createInvoice({
      bookingId,
      customerId: userAId,
      currency: 'IRR',
      lines: [
        {
          description: 'بلیط رفت و برگشت مشهد - کلاس بیزینس',
          quantity: 1,
          unitPrice: 20_000_000,
          taxAmount: 1_800_000, // 9% VAT
        },
      ],
    });

    expect(inv).toBeDefined();
    expect(inv.id).toBeDefined();
    expect(Number(inv.netAmount)).toBe(20_000_000);
    expect(Number(inv.taxAmount)).toBe(1_800_000);
    expect(Number(inv.totalAmount)).toBe(21_800_000);
    invoiceId = inv.id;
  });

  it('retrieves invoice by ID and verifies owner access', async () => {
    const inv = await InvoiceDomainService.getInvoiceById(invoiceId, userAId);
    expect(inv).toBeDefined();
    expect(inv?.id).toBe(invoiceId);
    expect(inv?.lines.length).toBe(1);
  });

  it('rejects cross-user access to invoice (IDOR protection)', async () => {
    await expect(
      InvoiceDomainService.getInvoiceById(invoiceId, userBId)
    ).rejects.toThrow();
  });

  it('generates official statutory tax invoice data snapshot', async () => {
    const taxData = await InvoiceDomainService.getOfficialTaxInvoiceData(invoiceId, userAId);
    expect(taxData).toBeDefined();

    // Seller legal info
    expect(taxData?.seller.nationalId).toBe('14009876543');
    expect(taxData?.seller.legalName).toContain('فیروزه');

    // Buyer info
    expect(taxData?.buyer.name).toBe('بهرام راد');
    expect(taxData?.buyer.nationalId).toBe('0055443322');

    // Fiscal numbers
    expect(taxData?.invoice.fiscalSerial).toMatch(/^TX-\d{4}-/);
    expect(taxData?.invoice.issuedAtJalali).toBeDefined();
    expect(taxData?.invoice.totalAmount).toBe(21_800_000);
    expect(taxData?.invoice.totalInWordsFa).toContain('تومان');
    expect(taxData?.qrCodePayload).toContain('firuzo.com/verify-invoice');
  });

  it('converts amounts into Persian words accurately', () => {
    // 21,800,000 Rials = 2,180,000 Tomans
    const words = InvoiceDomainService.numberToPersianWords(21_800_000, 'IRR');
    expect(words).toContain('دو میلیون');
    expect(words).toContain('یکصد و هشتاد هزار تومان');
  });
});
