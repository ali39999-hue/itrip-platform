import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateInvoiceParams {
  bookingId: string;
  customerId: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number | Prisma.Decimal;
    taxAmount?: number | Prisma.Decimal;
  }>;
  currency?: string;
  dueDays?: number;
}

export class InvoiceDomainService {
  /**
   * Generates a commercial invoice for confirmed bookings (FIN-006)
   */
  static async createInvoice(
    params: CreateInvoiceParams,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const currency = params.currency || 'IRR';
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    let totalNet = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);

    const formattedLines = params.lines.map((l) => {
      const uPrice = l.unitPrice instanceof Prisma.Decimal ? l.unitPrice : new Prisma.Decimal(l.unitPrice.toString());
      const tax = l.taxAmount ? (l.taxAmount instanceof Prisma.Decimal ? l.taxAmount : new Prisma.Decimal(l.taxAmount.toString())) : new Prisma.Decimal(0);
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

    return client.invoice.create({
      data: {
        invoiceNumber,
        bookingId: params.bookingId,
        customerId: params.customerId,
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
  }
}
