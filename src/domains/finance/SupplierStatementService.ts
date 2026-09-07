import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';

export interface SupplierStatementLine {
  id: string;
  statementId?: string;
  statementNumber: string;
  supplierId: string;
  bookingReference: string;
  ticketNumber?: string;
  supplierPnr?: string;
  serviceDate: string; // YYYY-MM-DD
  netAmount: Money;
  taxAmount?: Money;
  commissionAmount?: Money;
  currency: string;
  description?: string;
  rawJson?: Record<string, unknown>;
}

export interface IngestSupplierStatementParams {
  supplierId: string;
  statementNumber: string;
  periodStart: Date;
  periodEnd: Date;
  currency?: string;
  rawLines: Array<Record<string, unknown>>;
}

export interface IngestStatementResult {
  statementId: string;
  statementNumber: string;
  supplierId: string;
  totalAmount: Money;
  linesCount: number;
  currency: string;
  status: string;
}

/**
 * Supplier Statement Service (SET-101)
 * Ingests and normalizes external supplier billing statements into canonical SupplierStatementLine domains.
 */
export class SupplierStatementService {
  /**
   * Normalizes a raw supplier line item into canonical SupplierStatementLine
   */
  static normalizeLine(
    raw: Record<string, unknown>,
    context: { supplierId: string; statementNumber: string; defaultCurrency?: string }
  ): SupplierStatementLine {
    const currency = String(raw.currency || context.defaultCurrency || 'IRR').toUpperCase();

    // Map common airline/GDS/hotel invoice field variations
    const bookingReference = String(
      raw.bookingReference || raw.booking_ref || raw.reference || raw.reservationNumber || raw.res_num || ''
    );
    const ticketNumber = raw.ticketNumber || raw.ticket_no || raw.eticket || raw.voucherNo;
    const supplierPnr = raw.supplierPnr || raw.pnr || raw.gdsRef || raw.bookingCode;
    const serviceDate = String(raw.serviceDate || raw.travelDate || raw.date || raw.flightDate || new Date().toISOString().slice(0, 10));

    const rawNet = raw.netAmount ?? raw.net_fare ?? raw.amount ?? raw.cost ?? 0;
    const netAmount = new Money(rawNet as number | string, currency);

    const rawTax = raw.taxAmount ?? raw.tax ?? raw.vat ?? 0;
    const taxAmount = rawTax ? new Money(rawTax as number | string, currency) : undefined;

    const rawCommission = raw.commissionAmount ?? raw.commission ?? 0;
    const commissionAmount = rawCommission ? new Money(rawCommission as number | string, currency) : undefined;

    const lineId = String(raw.id || `line_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);

    return {
      id: lineId,
      statementNumber: context.statementNumber,
      supplierId: context.supplierId,
      bookingReference,
      ticketNumber: ticketNumber ? String(ticketNumber) : undefined,
      supplierPnr: supplierPnr ? String(supplierPnr) : undefined,
      serviceDate,
      netAmount,
      taxAmount,
      commissionAmount,
      currency,
      description: raw.description ? String(raw.description) : undefined,
      rawJson: raw,
    };
  }

  /**
   * Ingests a full supplier statement, normalizing lines and persisting to database (SET-101)
   */
  static async ingestStatement(
    params: IngestSupplierStatementParams,
    tx?: Prisma.TransactionClient
  ): Promise<IngestStatementResult> {
    const client = tx || prisma;
    const currency = (params.currency || 'IRR').toUpperCase();

    // Normalize each raw statement line
    const normalizedLines = params.rawLines.map((raw) =>
      this.normalizeLine(raw, {
        supplierId: params.supplierId,
        statementNumber: params.statementNumber,
        defaultCurrency: currency,
      })
    );

    let totalAmount = Money.zero(currency);
    for (const line of normalizedLines) {
      totalAmount = totalAmount.add(line.netAmount);
    }

    // Persist to database
    const statement = await client.supplierStatement.upsert({
      where: { statementNumber: params.statementNumber },
      update: {
        totalAmount: totalAmount.toDecimal(),
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        rawJson: JSON.stringify(normalizedLines),
      },
      create: {
        statementNumber: params.statementNumber,
        supplierId: params.supplierId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        totalAmount: totalAmount.toDecimal(),
        currency,
        status: 'PENDING',
        rawJson: JSON.stringify(normalizedLines),
      },
    });

    return {
      statementId: statement.id,
      statementNumber: statement.statementNumber,
      supplierId: statement.supplierId,
      totalAmount,
      linesCount: normalizedLines.length,
      currency,
      status: statement.status,
    };
  }

  /**
   * Retrieves and parses normalized lines for a given statement
   */
  static async getStatementLines(statementId: string): Promise<SupplierStatementLine[]> {
    const statement = await prisma.supplierStatement.findUnique({
      where: { id: statementId },
    });

    if (!statement || !statement.rawJson) return [];

    try {
      const parsed = JSON.parse(statement.rawJson);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        ...item,
        netAmount: new Money(item.netAmount.amount || item.netAmount, item.currency || statement.currency),
        taxAmount: item.taxAmount ? new Money(item.taxAmount.amount || item.taxAmount, item.currency || statement.currency) : undefined,
        commissionAmount: item.commissionAmount ? new Money(item.commissionAmount.amount || item.commissionAmount, item.currency || statement.currency) : undefined,
      }));
    } catch {
      return [];
    }
  }
}
