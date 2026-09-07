import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money, MoneyBreakdown } from '@/lib/finance';
import crypto from 'crypto';

export interface RuleVersions {
  taxRuleVersion: string;
  pricingEngineVersion: string;
  markupRuleVersion?: string;
  commissionRuleVersion?: string;
  [key: string]: string | undefined;
}

export interface CanonicalPriceSnapshot {
  id: string;
  bookingId: string;
  baseAmount: Money;
  markupAmount: Money;
  serviceFee: Money;
  taxAmount: Money;
  discountAmount: Money;
  sellPrice: Money;
  currency: string;
  fxRate: Prisma.Decimal;
  baseCurrency: string;
  breakdown: MoneyBreakdown;
  ruleVersions: RuleVersions;
  expiresAt: Date;
  snapshotHash: string;
  createdAt: Date;
}

export interface CreatePriceSnapshotParams {
  bookingId: string;
  breakdown: MoneyBreakdown;
  ruleVersions?: RuleVersions;
  ttlMinutes?: number;
  expiresAt?: Date;
  fxRate?: Prisma.Decimal | number;
  baseCurrency?: string;
}

export class PriceSnapshotDomainService {
  public static readonly DEFAULT_TTL_MINUTES = 15;

  /**
   * Computes deterministic SHA-256 cryptographic hash of canonical price snapshot payload (MONEY-105)
   */
  static computeSnapshotHash(params: {
    bookingId: string;
    sellPrice: string;
    baseAmount: string;
    markupAmount: string;
    taxAmount: string;
    currency: string;
    ruleVersions: RuleVersions;
    expiresAt: string;
  }): string {
    const raw = JSON.stringify({
      bookingId: params.bookingId,
      sellPrice: params.sellPrice,
      baseAmount: params.baseAmount,
      markupAmount: params.markupAmount,
      taxAmount: params.taxAmount,
      currency: params.currency.toUpperCase(),
      ruleVersions: params.ruleVersions,
      expiresAt: params.expiresAt,
    });
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Creates and persists a canonical immutable PriceSnapshot (MONEY-105)
   */
  static async createPriceSnapshot(
    params: CreatePriceSnapshotParams,
    tx?: Prisma.TransactionClient
  ): Promise<CanonicalPriceSnapshot> {
    const client = tx || prisma;
    const ttlMinutes = params.ttlMinutes || PriceSnapshotDomainService.DEFAULT_TTL_MINUTES;
    const expiresAt = params.expiresAt || new Date(Date.now() + ttlMinutes * 60 * 1000);
    const currency = params.breakdown.currency.toUpperCase();

    const ruleVersions: RuleVersions = {
      taxRuleVersion: '2026-v2',
      pricingEngineVersion: '12-stage-v2',
      ...params.ruleVersions,
    };

    const snapshotHash = this.computeSnapshotHash({
      bookingId: params.bookingId,
      sellPrice: params.breakdown.sellPrice.toString(),
      baseAmount: params.breakdown.baseCost.toString(),
      markupAmount: params.breakdown.markupAmount.toString(),
      taxAmount: params.breakdown.taxAmount.toString(),
      currency,
      ruleVersions,
      expiresAt: expiresAt.toISOString(),
    });

    const breakdownJson = JSON.stringify({
      version: '2.0',
      breakdown: {
        baseCost: params.breakdown.baseCost.toString(),
        supplierFee: params.breakdown.supplierFee.toString(),
        markupAmount: params.breakdown.markupAmount.toString(),
        taxAmount: params.breakdown.taxAmount.toString(),
        platformFee: params.breakdown.platformFee.toString(),
        discountAmount: params.breakdown.discountAmount.toString(),
        roundingDelta: params.breakdown.roundingDelta.toString(),
        sellPrice: params.breakdown.sellPrice.toString(),
        currency,
        lines: (params.breakdown.lines || []).map((l) => ({
          description: l.description,
          amount: l.amount.toString(),
          category: l.category,
        })),
      },
      ruleVersions,
      expiresAt: expiresAt.toISOString(),
      snapshotHash,
    });

    const serviceFeeTotal = params.breakdown.platformFee.add(params.breakdown.supplierFee);
    const fxRate = params.fxRate
      ? (params.fxRate instanceof Prisma.Decimal ? params.fxRate : new Prisma.Decimal(params.fxRate.toString()))
      : new Prisma.Decimal('1.0');

    const created = await client.priceSnapshot.create({
      data: {
        bookingId: params.bookingId,
        baseAmount: params.breakdown.baseCost.toDecimal(),
        markupAmount: params.breakdown.markupAmount.toDecimal(),
        serviceFee: serviceFeeTotal.toDecimal(),
        taxAmount: params.breakdown.taxAmount.toDecimal(),
        discountAmount: params.breakdown.discountAmount.toDecimal(),
        sellPrice: params.breakdown.sellPrice.toDecimal(),
        currency,
        fxRate,
        baseCurrency: params.baseCurrency || currency,
        breakdownJson,
      },
    });

    return {
      id: created.id,
      bookingId: created.bookingId,
      baseAmount: new Money(created.baseAmount, currency),
      markupAmount: new Money(created.markupAmount, currency),
      serviceFee: new Money(created.serviceFee, currency),
      taxAmount: new Money(created.taxAmount, currency),
      discountAmount: new Money(created.discountAmount, currency),
      sellPrice: new Money(created.sellPrice, currency),
      currency,
      fxRate: created.fxRate,
      baseCurrency: created.baseCurrency || currency,
      breakdown: params.breakdown,
      ruleVersions,
      expiresAt,
      snapshotHash,
      createdAt: created.createdAt,
    };
  }

  /**
   * Retrieves latest canonical snapshot for a booking
   */
  static async getLatestSnapshot(
    bookingId: string,
    tx?: Prisma.TransactionClient
  ): Promise<CanonicalPriceSnapshot | null> {
    const client = tx || prisma;
    const row = await client.priceSnapshot.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });

    if (!row) return null;

    let expiresAt = new Date(row.createdAt.getTime() + PriceSnapshotDomainService.DEFAULT_TTL_MINUTES * 60 * 1000);
    let ruleVersions: RuleVersions = {
      taxRuleVersion: '2026-v2',
      pricingEngineVersion: '12-stage-v2',
    };
    let snapshotHash = '';

    if (row.breakdownJson) {
      try {
        const parsed = JSON.parse(row.breakdownJson);
        if (parsed.expiresAt) {
          expiresAt = new Date(parsed.expiresAt);
        }
        if (parsed.ruleVersions) {
          ruleVersions = parsed.ruleVersions;
        }
        if (parsed.snapshotHash) {
          snapshotHash = parsed.snapshotHash;
        }
      } catch {
        // Fallback to defaults if legacy JSON
      }
    }

    if (!snapshotHash) {
      snapshotHash = this.computeSnapshotHash({
        bookingId: row.bookingId,
        sellPrice: row.sellPrice.toString(),
        baseAmount: row.baseAmount.toString(),
        markupAmount: row.markupAmount.toString(),
        taxAmount: row.taxAmount.toString(),
        currency: row.currency,
        ruleVersions,
        expiresAt: expiresAt.toISOString(),
      });
    }

    const currency = row.currency;
    const breakdown: MoneyBreakdown = {
      baseCost: new Money(row.baseAmount, currency),
      supplierFee: Money.zero(currency),
      markupAmount: new Money(row.markupAmount, currency),
      taxAmount: new Money(row.taxAmount, currency),
      platformFee: new Money(row.serviceFee, currency),
      discountAmount: new Money(row.discountAmount, currency),
      roundingDelta: Money.zero(currency),
      sellPrice: new Money(row.sellPrice, currency),
      currency,
    };

    return {
      id: row.id,
      bookingId: row.bookingId,
      baseAmount: breakdown.baseCost,
      markupAmount: breakdown.markupAmount,
      serviceFee: breakdown.platformFee,
      taxAmount: breakdown.taxAmount,
      discountAmount: breakdown.discountAmount,
      sellPrice: breakdown.sellPrice,
      currency,
      fxRate: row.fxRate,
      baseCurrency: row.baseCurrency || currency,
      breakdown,
      ruleVersions,
      expiresAt,
      snapshotHash,
      createdAt: row.createdAt,
    };
  }

  /**
   * Verifies if a snapshot is expired (MONEY-108)
   */
  static isExpired(
    snapshot: CanonicalPriceSnapshot | { expiresAt?: Date; createdAt: Date; breakdownJson?: string | null }
  ): boolean {
    const now = new Date();
    if ('expiresAt' in snapshot && snapshot.expiresAt) {
      return now > new Date(snapshot.expiresAt);
    }

    if ('breakdownJson' in snapshot && snapshot.breakdownJson) {
      try {
        const parsed = JSON.parse(snapshot.breakdownJson);
        if (parsed.expiresAt) {
          return now > new Date(parsed.expiresAt);
        }
      } catch {
        // Continue to fallback
      }
    }

    // Default 15 minutes TTL from createdAt
    const ttlMs = PriceSnapshotDomainService.DEFAULT_TTL_MINUTES * 60 * 1000;
    return now.getTime() - new Date(snapshot.createdAt).getTime() > ttlMs;
  }

  /**
   * Cryptographically verifies snapshot integrity (tamper detection)
   */
  static verifyIntegrity(snapshot: CanonicalPriceSnapshot): boolean {
    const expected = this.computeSnapshotHash({
      bookingId: snapshot.bookingId,
      sellPrice: snapshot.sellPrice.toString(),
      baseAmount: snapshot.baseAmount.toString(),
      markupAmount: snapshot.markupAmount.toString(),
      taxAmount: snapshot.taxAmount.toString(),
      currency: snapshot.currency,
      ruleVersions: snapshot.ruleVersions,
      expiresAt: snapshot.expiresAt.toISOString(),
    });
    return expected === snapshot.snapshotHash;
  }
}
