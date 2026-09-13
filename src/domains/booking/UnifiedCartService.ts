import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { InventoryEngine } from '@/domains/inventory/InventoryEngine';
import { BookingApplicationService } from './BookingApplicationService';

export interface UnifiedCartItem {
  type: 'FLIGHT' | 'HOTEL' | 'TOUR' | 'TRANSFER' | 'VISA' | 'ESIM' | 'INSURANCE' | string;
  itemId: string;
  title: string;
  count: number; // Passenger or unit count
  nights?: number; // For hotel
  /** Display-only hint from the client. Money math always re-resolves the unit
   *  price server-side (catalog → InventoryItem.basePrice) — see resolveServerCartPricing. */
  unitPrice: number;
  travelDate: string; // YYYY-MM-DD
  inventoryItemId?: string; // Canonical DB inventory item id (optional)
  details?: Record<string, unknown>;
}

export interface CartPricingSummary {
  grossAmount: number;
  bundleDiscountPercent: number;
  bundleDiscountAmount: number;
  netAmount: number;
  currency: string;
  hasFlightHotelCombo: boolean;
  itemBreakdown: Array<{
    title: string;
    type: string;
    count: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface UnifiedDraftResult {
  success: boolean;
  bookingId?: string;
  reference?: string;
  totalAmount?: number;
  currency?: string;
  holdTokens?: string[];
  pricing?: CartPricingSummary;
  error?: string;
}

export class UnifiedCartService {
  /**
   * Resolves every cart line's unit price from server-authoritative sources:
   * catalog (via BookingApplicationService.resolveServerBasePrice) with a
   * fail-closed fallback to InventoryItem.basePrice when inventoryItemId is given.
   * The client-supplied unitPrice is never used for money math (price-authority guard).
   */
  static async resolveServerCartPricing(
    items: UnifiedCartItem[],
    currency: string
  ): Promise<
    | { ok: true; pricedItems: Array<UnifiedCartItem & { unitPrice: number }> }
    | { ok: false; error: string }
  > {
    const pricedItems: Array<UnifiedCartItem & { unitPrice: number }> = [];

    for (const item of items) {
      let unitPrice = await BookingApplicationService.resolveServerBasePrice(item.type, item.itemId);

      if (unitPrice === null && item.inventoryItemId) {
        const inv = await prisma.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
          select: { basePrice: true, currency: true },
        });
        if (inv) {
          if (inv.currency !== currency) {
            return {
              ok: false,
              error: `عدم تطابق ارز برای "${item.title}" (موجودی ${inv.currency}، سبد ${currency})`,
            };
          }
          unitPrice = Number(inv.basePrice);
        }
      }

      if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice < 0) {
        return {
          ok: false,
          error: `قیمت "${item.title}" در سرور قابل احراز نیست؛ سفارش رد شد (fail-closed).`,
        };
      }

      pricedItems.push({ ...item, unitPrice });
    }

    return { ok: true, pricedItems };
  }

  /**
   * Computes multi-product cart bundle pricing & cross-selling discounts.
   * Miracuves / Expedia style: 5% package discount applied when both Flight & Hotel are booked together.
   */
  static calculateCartPricing(
    items: UnifiedCartItem[],
    currency = 'IRR'
  ): CartPricingSummary {
    let gross = 0;
    const hasFlight = items.some((i) => i.type.toUpperCase() === 'FLIGHT');
    const hasHotel = items.some((i) => i.type.toUpperCase() === 'HOTEL');
    const hasCombo = hasFlight && hasHotel;

    const breakdown = items.map((item) => {
      const multiplier = item.type.toUpperCase() === 'HOTEL' ? (item.nights || 1) : 1;
      const subtotal = item.unitPrice * item.count * multiplier;
      gross += subtotal;
      return {
        title: item.title,
        type: item.type,
        count: item.count,
        unitPrice: item.unitPrice,
        subtotal,
      };
    });

    const discountPercent = hasCombo ? 0.05 : 0.0;
    const discountAmount = Math.round(gross * discountPercent);
    const net = gross - discountAmount;

    return {
      grossAmount: gross,
      bundleDiscountPercent: discountPercent,
      bundleDiscountAmount: discountAmount,
      netAmount: net,
      currency,
      hasFlightHotelCombo: hasCombo,
      itemBreakdown: breakdown,
    };
  }

  /**
   * All-or-Nothing Multi-Item Inventory Hold Coordinator (Lulan / Miracuves pattern).
   * Atomically acquires holds on all inventory items. If any single item is sold out,
   * it rolls back and releases all acquired tokens to prevent partial hold locking.
   */
  static async acquireAllOrNothingHolds(
    items: UnifiedCartItem[]
  ): Promise<{ success: boolean; holdTokens: string[]; error?: string }> {
    const acquiredTokens: string[] = [];

    for (const item of items) {
      if (!item.inventoryItemId) continue;

      const res = await InventoryEngine.createHold({
        inventoryItemId: item.inventoryItemId,
        date: item.travelDate,
        quantity: item.count,
        ttlMinutes: 15,
      });

      if (!res.success || !res.token) {
        // Rollback all previously acquired holds in this batch
        for (const token of acquiredTokens) {
          try {
            await InventoryEngine.releaseHold(token);
          } catch (relErr) {
            console.error(`Failed to rollback hold token ${token}:`, relErr);
          }
        }

        return {
          success: false,
          holdTokens: [],
          error: `موجودی "${item.title}" به اتمام رسیده است. (${res.error || 'Sold out'})`,
        };
      }

      acquiredTokens.push(res.token);
    }

    return {
      success: true,
      holdTokens: acquiredTokens,
    };
  }

  /**
   * Creates a multi-product consolidated Booking record with multiple BookingItems.
   */
  static async createMultiItemBooking(params: {
    actorId: string;
    items: UnifiedCartItem[];
    currency?: string;
    contactEmail?: string;
    contactPhone?: string;
    passengers?: Array<Record<string, unknown>>;
  }): Promise<UnifiedDraftResult> {
    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'Cart is empty' };
    }

    const currency = params.currency || 'IRR';

    // Price-authority guard (BUG-001): every line is priced server-side before
    // any hold is acquired — unpriceable carts fail closed without side effects.
    const priced = await this.resolveServerCartPricing(params.items, currency);
    if (!priced.ok) {
      return { success: false, error: priced.error };
    }
    const pricedItems = priced.pricedItems;

    const pricing = this.calculateCartPricing(pricedItems, currency);

    // Step 1: All-or-nothing hold acquisition
    const holdRes = await this.acquireAllOrNothingHolds(pricedItems);
    if (!holdRes.success) {
      return { success: false, error: holdRes.error };
    }

    const reference = `ITR-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL

    try {
      const booking = await prisma.$transaction(async (tx) => {
        const b = await tx.booking.create({
          data: {
            reference,
            customerId: params.actorId,
            status: 'HELD',
            paymentStatus: 'INITIATED',
            fulfillmentStatus: 'PENDING',
            ticketStatus: 'NOT_ISSUED',
            totalAmount: pricing.netAmount,
            currency,
            travelDate: pricedItems[0]?.travelDate || null,
            holdToken: holdRes.holdTokens[0] || null, // Primary token
            expiresAt,
          },
        });

        // Create individual BookingItems (sell price is the server-resolved price)
        for (const item of pricedItems) {
          const nights = item.type.toUpperCase() === 'HOTEL' ? (item.nights || 1) : 1;
          const sellPrice = item.unitPrice * item.count * nights;
          const netCost = Math.round(sellPrice * 0.9); // 10% platform gross margin
          const markup = sellPrice - netCost;

          const itemDetails = {
            title: item.title,
            type: item.type,
            travelDate: item.travelDate,
            count: item.count,
            nights: item.nights,
            passengers: params.passengers || [],
            contactEmail: params.contactEmail,
            contactPhone: params.contactPhone,
            ...(item.details || {}),
          };

          await tx.bookingItem.create({
            data: {
              bookingId: b.id,
              inventoryItemId: item.inventoryItemId || null,
              type: item.type,
              netCost,
              markup,
              taxAmount: 0,
              feeAmount: 0,
              sellPrice,
              details: JSON.stringify(itemDetails),
            },
          });
        }

        // Attach Price Snapshot
        await tx.priceSnapshot.create({
          data: {
            bookingId: b.id,
            baseAmount: pricing.grossAmount,
            discountAmount: pricing.bundleDiscountAmount,
            markupAmount: Math.round(pricing.netAmount * 0.1),
            serviceFee: 0,
            taxAmount: 0,
            sellPrice: pricing.netAmount,
            currency,
            breakdownJson: JSON.stringify(pricing),
          },
        });

        return b;
      });

      return {
        success: true,
        bookingId: booking.id,
        reference: booking.reference,
        totalAmount: Number(booking.totalAmount),
        currency: booking.currency,
        holdTokens: holdRes.holdTokens,
        pricing,
      };
    } catch (err: unknown) {
      // Rollback holds on DB failure
      for (const token of holdRes.holdTokens) {
        await InventoryEngine.releaseHold(token).catch(() => {});
      }
      console.error('createMultiItemBooking transaction error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create multi-item booking',
      };
    }
  }
}
