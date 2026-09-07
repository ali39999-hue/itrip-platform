import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';

export interface CreateInvoiceParams {
  bookingId: string;
  customerId: string;
  organizationId?: string | null;
  branchId?: string | null;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: Money | Prisma.Decimal | number | string; // MONEY-101: Money is canonical financial input
    taxAmount?: Money | Prisma.Decimal | number | string;
  }>;
  currency?: string;
  dueDays?: number;
}

export class InvoiceDomainService {
  /**
   * Generates a commercial invoice for confirmed bookings (FIN-006, MONEY-101, MONEY-104, IAM-103)
   */
  static async createInvoice(
    params: CreateInvoiceParams,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const firstLinePrice = params.lines[0]?.unitPrice;
    const detectedCurrency = firstLinePrice && typeof (firstLinePrice as Money).currency === 'string'
      ? (firstLinePrice as Money).currency
      : 'IRR';
    const currency = params.currency || detectedCurrency;
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    let totalNet = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);

    const toDecimal = (val: Money | Prisma.Decimal | number | string | undefined): Prisma.Decimal => {
      if (!val) return new Prisma.Decimal(0);
      if (typeof (val as Money).toDecimal === 'function') return (val as Money).toDecimal();
      if (val instanceof Prisma.Decimal) return val;
      return new Prisma.Decimal(val.toString());
    };

    const formattedLines = params.lines.map((l) => {
      const uPrice = toDecimal(l.unitPrice);
      const tax = toDecimal(l.taxAmount);
      const lineTotal = uPrice.mul(l.quantity);

      totalNet = totalNet.add(lineTotal);
      totalTax = totalTax.add(tax);

      return {
        description: l.description,
        quantity: l.quantity,
        unitPrice: uPrice,
        totalPrice: lineTotal,
        taxAmount: tax,
      };
    });

    const totalAmount = totalNet.add(totalTax);
    const dueAt = new Date(Date.now() + (params.dueDays || 7) * 24 * 60 * 60 * 1000);

    let orgId = params.organizationId;
    let brId = params.branchId;
    if (orgId === undefined && params.bookingId) {
      const bkg = await client.booking.findUnique({
        where: { id: params.bookingId },
        select: { organizationId: true, branchId: true },
      });
      if (bkg) {
        orgId = bkg.organizationId;
        brId = bkg.branchId;
      }
    }

    const invoice = await client.invoice.create({
      data: {
        invoiceNumber,
        bookingId: params.bookingId,
        customerId: params.customerId,
        organizationId: orgId || null,
        branchId: brId || null,
        netAmount: totalNet,
        taxAmount: totalTax,
        totalAmount,
        currency,
        status: 'ISSUED',
        dueAt,
        lines: {
          create: formattedLines,
        },
      },
      include: {
        lines: true,
      },
    });

    return {
      ...invoice,
      netMoney: new Money(invoice.netAmount, invoice.currency),
      taxMoney: new Money(invoice.taxAmount, invoice.currency),
      totalMoney: new Money(invoice.totalAmount, invoice.currency),
    };
  }
}
