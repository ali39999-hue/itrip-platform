import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface AccountingExportRow {
  entryNumber: string;
  jalaliDate: string;
  isoDate: string;
  fiscalPeriod: string;
  accountCode: string;
  accountName: string;
  entryDescription: string;
  lineDescription: string;
  debit: number | string | Prisma.Decimal;
  credit: number | string | Prisma.Decimal;
  currency: string;
  referenceType?: string | null;
  referenceId?: string | null;
  status?: string;
}

export const IRANIAN_ACCOUNTING_HEADERS = [
  'شماره سند',
  'تاریخ (شمسی)',
  'تاریخ (میلادی)',
  'دوره مالی',
  'کد حساب',
  'نام حساب',
  'شرح سند',
  'شرح ردیف',
  'بدهکار',
  'بستانکار',
  'واحد پول',
  'نوع منبع',
  'مرجع تراکنش',
  'وضعیت',
];

/**
 * Escapes CSV values against formula injection (RFC 4180 / OWASP CSV Injection):
 * Cells starting with '=', '+', '-', '@' or tab are prefixed with an apostrophe.
 * Adapted from aroux30/site reporting & accounting export engine.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();

  // Guard against spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Converts a Gregorian Date into a standardized Jalali date string (YYYY/MM/DD)
 * for Iranian accounting software import (Sepidar, Holoo, Mahak).
 */
export function formatAccountingJalaliDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find((p) => p.type === 'year')?.value || '';
  const m = parts.find((p) => p.type === 'month')?.value || '';
  const d = parts.find((p) => p.type === 'day')?.value || '';

  return `${y}/${m}/${d}`;
}

/**
 * Derives the 4-digit Jalali fiscal period (e.g. "1405").
 */
export function getFiscalYear(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'year')?.value || String(date.getFullYear());
}

/**
 * Builds a UTF-8 with BOM CSV document.
 * The leading BOM (﻿) guarantees that Microsoft Excel natively displays Persian
 * typography without requiring manual encoding selection.
 */
export function buildAccountingCsv(rows: AccountingExportRow[]): string {
  const BOM = '﻿';
  const headerLine = IRANIAN_ACCOUNTING_HEADERS.map(escapeCsvCell).join(',');

  const dataLines = rows.map((r) => {
    const debitVal = typeof r.debit === 'object' && 'toString' in r.debit ? r.debit.toString() : String(r.debit || 0);
    const creditVal = typeof r.credit === 'object' && 'toString' in r.credit ? r.credit.toString() : String(r.credit || 0);

    return [
      escapeCsvCell(r.entryNumber),
      escapeCsvCell(r.jalaliDate),
      escapeCsvCell(r.isoDate),
      escapeCsvCell(r.fiscalPeriod),
      escapeCsvCell(r.accountCode),
      escapeCsvCell(r.accountName),
      escapeCsvCell(r.entryDescription),
      escapeCsvCell(r.lineDescription),
      escapeCsvCell(debitVal),
      escapeCsvCell(creditVal),
      escapeCsvCell(r.currency),
      escapeCsvCell(r.referenceType || ''),
      escapeCsvCell(r.referenceId || ''),
      escapeCsvCell(r.status || 'POSTED'),
    ].join(',');
  });

  return `${BOM}${headerLine}\r\n${dataLines.join('\r\n')}`;
}

export class AccountingExportService {
  /**
   * Exports double-entry journal records from ChartOfAccounts & JournalEntry models
   * in standard Iranian accounting format (Sepidar / Holoo / Mahak).
   */
  static async exportJournalEntries(params?: {
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<{ csv: string; rowCount: number; fiscalPeriod: string }> {
    const limit = params?.limit ?? 1000;
    const where: Prisma.JournalEntryWhereInput = {};

    if (params?.fromDate || params?.toDate) {
      where.date = {};
      if (params.fromDate) where.date.gte = params.fromDate;
      if (params.toDate) where.date.lte = params.toDate;
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        account: true,
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    const rows: AccountingExportRow[] = [];
    const now = new Date();
    const currentFiscalYear = getFiscalYear(now);

    for (const entry of entries) {
      const jDate = formatAccountingJalaliDate(entry.date);
      const isoDate = entry.date.toISOString();
      const period = getFiscalYear(entry.date);

      for (const line of entry.lines) {
        rows.push({
          entryNumber: entry.entryNumber,
          jalaliDate: jDate,
          isoDate,
          fiscalPeriod: period,
          accountCode: line.account?.code || entry.account?.code || '1001',
          accountName: line.account?.name || entry.account?.name || 'حساب پیش‌فرض',
          entryDescription: entry.description,
          lineDescription: line.memo || entry.description,
          debit: line.debit,
          credit: line.credit,
          currency: line.currency || 'IRR',
          referenceType: entry.referenceType,
          referenceId: entry.referenceId,
          status: 'POSTED',
        });
      }
    }

    const csv = buildAccountingCsv(rows);
    return {
      csv,
      rowCount: rows.length,
      fiscalPeriod: currentFiscalYear,
    };
  }

  /**
   * Fallback export using LedgerEntry table grouped by groupId
   * for transactions posted directly to the general ledger kernel.
   */
  static async exportLedgerEntries(params?: {
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<{ csv: string; rowCount: number }> {
    const limit = params?.limit ?? 1000;
    const where: Prisma.LedgerEntryWhereInput = {};

    if (params?.fromDate || params?.toDate) {
      where.createdAt = {};
      if (params.fromDate) where.createdAt.gte = params.fromDate;
      if (params.toDate) where.createdAt.lte = params.toDate;
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        account: true,
      },
    });

    const rows: AccountingExportRow[] = entries.map((entry) => {
      const isDebit = entry.direction === 'DEBIT';
      const jDate = formatAccountingJalaliDate(entry.createdAt);
      const isoDate = entry.createdAt.toISOString();
      const period = getFiscalYear(entry.createdAt);

      return {
        entryNumber: `TX-${entry.groupId.slice(-8).toUpperCase()}`,
        jalaliDate: jDate,
        isoDate,
        fiscalPeriod: period,
        accountCode: entry.account?.ownerType || '2001',
        accountName: entry.account?.ownerType ? `حساب ${entry.account.ownerType}` : 'حساب دفترکل',
        entryDescription: `سند دفترکل گروه ${entry.groupId}`,
        lineDescription: `${entry.referenceType || 'تراکنش'} - شناسه: ${entry.referenceId || 'N/A'}`,
        debit: isDebit ? entry.amount : 0,
        credit: !isDebit ? entry.amount : 0,
        currency: entry.currency,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        status: 'POSTED',
      };
    });

    const csv = buildAccountingCsv(rows);
    return {
      csv,
      rowCount: rows.length,
    };
  }
}
