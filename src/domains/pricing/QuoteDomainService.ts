import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money, MoneyBreakdown } from '@/lib/finance';
import { QuoteStatus, QuoteStateMachine } from './QuoteStateMachine';
import { PriceSnapshotDomainService, RuleVersions } from './PriceSnapshotDomainService';
import crypto from 'crypto';

export interface QuoteAggregate {
  quoteNumber: string;
  bookingId?: string;
  supplierRef?: string;
  quoteHash: string;
  status: QuoteStatus;
  baseAmount: Money;
  markupAmount: Money;
  taxAmount: Money;
  sellPrice: Money;
  currency: string;
  expiresAt: Date;
  createdAt: Date;
  breakdown: MoneyBreakdown;
  ruleVersions: RuleVersions;
}

export interface CreateQuoteParams {
  bookingId?: string;
  supplierRef?: string;
  breakdown: MoneyBreakdown;
  ruleVersions?: RuleVersions;
  ttlMinutes?: number;
  expiresAt?: Date;
}

export class QuoteDomainService {
  public static readonly DEFAULT_TTL_MINUTES = 15;

  // In-memory registry for standalone quotes that precede booking creation
  private static quoteRegistry = new Map<string, QuoteAggregate>();

  /**
   * Computes SHA-256 fingerprint for a Quote aggregate (MONEY-106)
   */
  static computeQuoteHash(params: {
    quoteNumber: string;
    bookingId?: string;
    supplierRef?: string;
    baseAmount: string;
    markupAmount: string;
    taxAmount: string;
    sellPrice: string;
    currency: string;
    expiresAt: string;
    ruleVersions: RuleVersions;
  }): string {
    const raw = JSON.stringify({
      quoteNumber: params.quoteNumber,
      bookingId: params.bookingId,
      supplierRef: params.supplierRef,
      baseAmount: params.baseAmount,
      markupAmount: params.markupAmount,
      taxAmount: params.taxAmount,
      sellPrice: params.sellPrice,
      currency: params.currency.toUpperCase(),
      expiresAt: params.expiresAt,
      ruleVersions: params.ruleVersions,
    });
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Creates a canonical Quote aggregate with Money precision and cryptographic fingerprint (MONEY-106)
   */
  static async createQuote(
    params: CreateQuoteParams,
    tx?: Prisma.TransactionClient
  ): Promise<QuoteAggregate> {
    const ttlMinutes = params.ttlMinutes || QuoteDomainService.DEFAULT_TTL_MINUTES;
    const expiresAt = params.expiresAt || new Date(Date.now() + ttlMinutes * 60 * 1000);
    const createdAt = new Date();
    const currency = params.breakdown.currency.toUpperCase();

    const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const quoteNumber = `QTE-${dateStr}-${randomHex}`;

    const ruleVersions: RuleVersions = {
      taxRuleVersion: '2026-v2',
      pricingEngineVersion: '12-stage-v2',
      ...params.ruleVersions,
    };

    const quoteHash = this.computeQuoteHash({
      quoteNumber,
      bookingId: params.bookingId,
      supplierRef: params.supplierRef,
      baseAmount: params.breakdown.baseCost.toString(),
      markupAmount: params.breakdown.markupAmount.toString(),
      taxAmount: params.breakdown.taxAmount.toString(),
      sellPrice: params.breakdown.sellPrice.toString(),
      currency,
      expiresAt: expiresAt.toISOString(),
      ruleVersions,
    });

    const quote: QuoteAggregate = {
      quoteNumber,
      bookingId: params.bookingId,
      supplierRef: params.supplierRef,
      quoteHash,
      status: 'ACTIVE',
      baseAmount: params.breakdown.baseCost,
      markupAmount: params.breakdown.markupAmount,
      taxAmount: params.breakdown.taxAmount,
      sellPrice: params.breakdown.sellPrice,
      currency,
      expiresAt,
      createdAt,
      breakdown: params.breakdown,
      ruleVersions,
    };

    // If bookingId is provided, also persist canonical PriceSnapshot
    if (params.bookingId) {
      await PriceSnapshotDomainService.createPriceSnapshot(
        {
          bookingId: params.bookingId,
          breakdown: params.breakdown,
          ruleVersions: {
            ...ruleVersions,
            quoteNumber,
            quoteHash,
            quoteStatus: 'ACTIVE',
            supplierRef: params.supplierRef,
          },
          expiresAt,
        },
        tx
      );
    }

    // Register in aggregate registry
    this.quoteRegistry.set(quoteNumber, quote);

    return quote;
  }

  /**
   * Retrieves a quote by its canonical quoteNumber
   */
  static async getQuoteByNumber(
    quoteNumber: string,
    tx?: Prisma.TransactionClient
  ): Promise<QuoteAggregate | null> {
    const inMemory = this.quoteRegistry.get(quoteNumber);
    if (inMemory) {
      // Refresh status if expired in memory
      if (inMemory.status === 'ACTIVE' && this.isQuoteExpired(inMemory)) {
        inMemory.status = 'EXPIRED';
      }
      return inMemory;
    }

    // Try finding snapshot containing this quoteNumber
    const client = tx || prisma;
    const snapshot = await client.priceSnapshot.findFirst({
      where: {
        breakdownJson: { contains: quoteNumber },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!snapshot || !snapshot.breakdownJson) return null;

    try {
      const parsed = JSON.parse(snapshot.breakdownJson);
      const ruleVersions = parsed.ruleVersions || {};
      const status: QuoteStatus = ruleVersions.quoteStatus || 'ACTIVE';
      const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : new Date(snapshot.createdAt.getTime() + 15 * 60 * 1000);
      const currency = snapshot.currency;

      const quote: QuoteAggregate = {
        quoteNumber,
        bookingId: snapshot.bookingId,
        supplierRef: ruleVersions.supplierRef,
        quoteHash: ruleVersions.quoteHash || '',
        status: new Date() > expiresAt && status === 'ACTIVE' ? 'EXPIRED' : status,
        baseAmount: new Money(snapshot.baseAmount, currency),
        markupAmount: new Money(snapshot.markupAmount, currency),
        taxAmount: new Money(snapshot.taxAmount, currency),
        sellPrice: new Money(snapshot.sellPrice, currency),
        currency,
        expiresAt,
        createdAt: snapshot.createdAt,
        breakdown: {
          baseCost: new Money(snapshot.baseAmount, currency),
          supplierFee: Money.zero(currency),
          markupAmount: new Money(snapshot.markupAmount, currency),
          taxAmount: new Money(snapshot.taxAmount, currency),
          platformFee: new Money(snapshot.serviceFee, currency),
          discountAmount: new Money(snapshot.discountAmount, currency),
          roundingDelta: Money.zero(currency),
          sellPrice: new Money(snapshot.sellPrice, currency),
          currency,
        },
        ruleVersions,
      };

      this.quoteRegistry.set(quoteNumber, quote);
      return quote;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the latest quote for a booking
   */
  static async getLatestQuoteForBooking(
    bookingId: string,
    tx?: Prisma.TransactionClient
  ): Promise<QuoteAggregate | null> {
    const snapshot = await PriceSnapshotDomainService.getLatestSnapshot(bookingId, tx);
    if (!snapshot) return null;

    const quoteNumber = snapshot.ruleVersions.quoteNumber || `QTE-${snapshot.bookingId}-${snapshot.id.slice(0, 8)}`;
    const status: QuoteStatus = (snapshot.ruleVersions.quoteStatus as QuoteStatus) || (PriceSnapshotDomainService.isExpired(snapshot) ? 'EXPIRED' : 'ACTIVE');

    return {
      quoteNumber,
      bookingId: snapshot.bookingId,
      supplierRef: snapshot.ruleVersions.supplierRef,
      quoteHash: snapshot.ruleVersions.quoteHash || snapshot.snapshotHash,
      status,
      baseAmount: snapshot.baseAmount,
      markupAmount: snapshot.markupAmount,
      taxAmount: snapshot.taxAmount,
      sellPrice: snapshot.sellPrice,
      currency: snapshot.currency,
      expiresAt: snapshot.expiresAt,
      createdAt: snapshot.createdAt,
      breakdown: snapshot.breakdown,
      ruleVersions: snapshot.ruleVersions,
    };
  }

  /**
   * Transitions a quote to EXPIRED status via QuoteStateMachine (MONEY-107, MONEY-108)
   */
  static async expireQuote(
    quoteNumber: string,
    reason?: string,
    tx?: Prisma.TransactionClient
  ): Promise<QuoteAggregate> {
    const quote = await this.getQuoteByNumber(quoteNumber, tx);
    if (!quote) {
      throw new Error(`Quote not found: ${quoteNumber}`);
    }

    QuoteStateMachine.assertTransition(quote.status, 'EXPIRED');
    quote.status = 'EXPIRED';
    this.quoteRegistry.set(quoteNumber, quote);

    // If associated with a booking, update snapshot record
    if (quote.bookingId) {
      const client = tx || prisma;
      const snapshot = await client.priceSnapshot.findFirst({
        where: { bookingId: quote.bookingId },
        orderBy: { createdAt: 'desc' },
      });
      if (snapshot && snapshot.breakdownJson) {
        try {
          const parsed = JSON.parse(snapshot.breakdownJson);
          parsed.ruleVersions = {
            ...(parsed.ruleVersions || {}),
            quoteStatus: 'EXPIRED',
            expiredReason: reason || 'TTL window elapsed',
          };
          await client.priceSnapshot.update({
            where: { id: snapshot.id },
            data: { breakdownJson: JSON.stringify(parsed) },
          });
        } catch {
          // ignore
        }
      }
    }

    return quote;
  }

  /**
   * Replaces an existing quote with a newly calculated authoritative quote (MONEY-107, MONEY-109)
   */
  static async replaceQuote(
    oldQuoteNumber: string,
    newParams: CreateQuoteParams,
    tx?: Prisma.TransactionClient
  ): Promise<{ oldQuote: QuoteAggregate; newQuote: QuoteAggregate }> {
    const oldQuote = await this.getQuoteByNumber(oldQuoteNumber, tx);
    if (!oldQuote) {
      throw new Error(`Original quote not found for replacement: ${oldQuoteNumber}`);
    }

    QuoteStateMachine.assertTransition(oldQuote.status, 'REPLACED');
    oldQuote.status = 'REPLACED';
    this.quoteRegistry.set(oldQuoteNumber, oldQuote);

    // Create the new active quote
    const newQuote = await this.createQuote(
      {
        ...newParams,
        bookingId: newParams.bookingId || oldQuote.bookingId,
        supplierRef: newParams.supplierRef || oldQuote.supplierRef,
        ruleVersions: {
          taxRuleVersion: newParams.ruleVersions?.taxRuleVersion || '1.0.0',
          pricingEngineVersion: newParams.ruleVersions?.pricingEngineVersion || '1.2.0',
          ...(newParams.ruleVersions || {}),
          replacedQuoteNumber: oldQuoteNumber,
        },
      },
      tx
    );

    return { oldQuote, newQuote };
  }

  /**
   * Checks if quote is expired based on expiresAt timestamp
   */
  static isQuoteExpired(quote: QuoteAggregate): boolean {
    if (quote.status === 'EXPIRED') return true;
    return new Date() > new Date(quote.expiresAt);
  }

  /**
   * Cryptographically verifies quote integrity
   */
  static verifyQuoteIntegrity(quote: QuoteAggregate): boolean {
    const expected = this.computeQuoteHash({
      quoteNumber: quote.quoteNumber,
      bookingId: quote.bookingId,
      supplierRef: quote.supplierRef,
      baseAmount: quote.baseAmount.toString(),
      markupAmount: quote.markupAmount.toString(),
      taxAmount: quote.taxAmount.toString(),
      sellPrice: quote.sellPrice.toString(),
      currency: quote.currency,
      expiresAt: quote.expiresAt.toISOString(),
      ruleVersions: quote.ruleVersions,
    });
    return expected === quote.quoteHash;
  }
}
