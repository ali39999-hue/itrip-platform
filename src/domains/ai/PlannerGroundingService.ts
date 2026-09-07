import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface GroundedOffer {
  inventoryItemId: string;
  supplierId: string;
  supplierName: string;
  type: 'FLIGHT_SEAT' | 'HOTEL_ROOM' | 'TOUR_SLOT' | string;
  title: string;
  date: string;
  canonicalPrice: number;
  currency: string;
  availableCapacity: number;
  groundingSignature: string; // HMAC or hash proving verification against DB state
  isVerified: boolean;
}

export interface GroundingResult<T = GroundedOffer> {
  grounded: boolean;
  status: 'FULLY_GROUNDED' | 'PARTIALLY_GROUNDED' | 'UNGROUNDED';
  groundingScore: number; // 0.0 to 1.0
  offers: T[];
  rejectionReasons: string[];
}

export interface ItineraryLegInput {
  legId: string;
  type: 'FLIGHT' | 'HOTEL' | 'TOUR';
  targetName?: string;
  date: string;
  claimedPrice?: number;
  capacityNeeded?: number;
}

export class PlannerGroundingService {
  /**
   * Generates a grounding signature for a canonical DB inventory snapshot
   */
  private static generateSignature(
    inventoryItemId: string,
    date: string,
    price: number,
    capacity: number
  ): string {
    const secret = process.env.AUTH_SECRET || 'planner-grounding-secret';
    return crypto
      .createHmac('sha256', secret)
      .update(`${inventoryItemId}:${date}:${price}:${capacity}`)
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Grounds flight recommendations strictly on real canonical inventory & allotments (AI-101)
   */
  static async groundFlightOffer(params: {
    destination?: string;
    origin?: string;
    date: string;
    seatsNeeded?: number;
  }): Promise<GroundingResult<GroundedOffer>> {
    const seatsNeeded = params.seatsNeeded ?? 1;
    const rejections: string[] = [];

    const items = await prisma.inventoryItem.findMany({
      where: {
        type: 'FLIGHT_SEAT',
        ...(params.destination
          ? { name: { contains: params.destination, mode: 'insensitive' } }
          : {}),
      },
      include: {
        supplier: true,
        allotments: {
          where: {
            date: params.date,
            stopSell: false,
          },
        },
      },
    });

    const validOffers: GroundedOffer[] = [];

    for (const item of items) {
      const allotment = item.allotments[0];
      if (!allotment) {
        rejections.push(`No active flight allotment found for item "${item.name}" on ${params.date}`);
        continue;
      }

      const available = allotment.total - allotment.booked;
      if (available < seatsNeeded) {
        rejections.push(
          `Insufficient flight seats for "${item.name}" on ${params.date}: needed ${seatsNeeded}, available ${available}`
        );
        continue;
      }

      const price = Number(item.basePrice);
      const signature = this.generateSignature(item.id, params.date, price, available);

      validOffers.push({
        inventoryItemId: item.id,
        supplierId: item.supplierId,
        supplierName: item.supplier.name,
        type: item.type,
        title: item.name,
        date: params.date,
        canonicalPrice: price,
        currency: item.currency,
        availableCapacity: available,
        groundingSignature: signature,
        isVerified: true,
      });
    }

    const grounded = validOffers.length > 0;
    return {
      grounded,
      status: grounded ? 'FULLY_GROUNDED' : 'UNGROUNDED',
      groundingScore: grounded ? 1.0 : 0.0,
      offers: validOffers,
      rejectionReasons: rejections,
    };
  }

  /**
   * Grounds hotel recommendations strictly on real canonical hotel inventory & allotments (AI-101)
   */
  static async groundHotelOffer(params: {
    hotelName?: string;
    checkIn: string;
    roomsNeeded?: number;
  }): Promise<GroundingResult<GroundedOffer>> {
    const roomsNeeded = params.roomsNeeded ?? 1;
    const rejections: string[] = [];

    const items = await prisma.inventoryItem.findMany({
      where: {
        type: 'HOTEL_ROOM',
        ...(params.hotelName
          ? { name: { contains: params.hotelName, mode: 'insensitive' } }
          : {}),
      },
      include: {
        supplier: true,
        allotments: {
          where: {
            date: params.checkIn,
            stopSell: false,
          },
        },
      },
    });

    const validOffers: GroundedOffer[] = [];

    for (const item of items) {
      const allotment = item.allotments[0];
      if (!allotment) {
        rejections.push(`No active hotel allotment found for room "${item.name}" on ${params.checkIn}`);
        continue;
      }

      const available = allotment.total - allotment.booked;
      if (available < roomsNeeded) {
        rejections.push(
          `Insufficient hotel rooms for "${item.name}" on ${params.checkIn}: needed ${roomsNeeded}, available ${available}`
        );
        continue;
      }

      const price = Number(item.basePrice);
      const signature = this.generateSignature(item.id, params.checkIn, price, available);

      validOffers.push({
        inventoryItemId: item.id,
        supplierId: item.supplierId,
        supplierName: item.supplier.name,
        type: item.type,
        title: item.name,
        date: params.checkIn,
        canonicalPrice: price,
        currency: item.currency,
        availableCapacity: available,
        groundingSignature: signature,
        isVerified: true,
      });
    }

    const grounded = validOffers.length > 0;
    return {
      grounded,
      status: grounded ? 'FULLY_GROUNDED' : 'UNGROUNDED',
      groundingScore: grounded ? 1.0 : 0.0,
      offers: validOffers,
      rejectionReasons: rejections,
    };
  }

  /**
   * Validates an AI-suggested quote against canonical DB authority.
   * Rejects hallucinations where claimedPrice does not match basePrice or stopSell is active.
   */
  static async validateOfferQuote(params: {
    inventoryItemId: string;
    date: string;
    claimedPrice: number;
    currency?: string;
  }): Promise<{
    valid: boolean;
    canonicalPrice: number;
    variance: number;
    availableCapacity: number;
    rejectionReason?: string;
  }> {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: params.inventoryItemId },
      include: {
        allotments: {
          where: { date: params.date },
        },
      },
    });

    if (!item) {
      return {
        valid: false,
        canonicalPrice: 0,
        variance: 0,
        availableCapacity: 0,
        rejectionReason: `Inventory item ${params.inventoryItemId} does not exist in canonical catalog.`,
      };
    }

    const canonicalPrice = Number(item.basePrice);
    const variance = Math.abs(canonicalPrice - params.claimedPrice);

    const allotment = item.allotments[0];
    if (!allotment || allotment.stopSell) {
      return {
        valid: false,
        canonicalPrice,
        variance,
        availableCapacity: 0,
        rejectionReason: `No open allotments or stopSell is active for date ${params.date}.`,
      };
    }

    const availableCapacity = allotment.total - allotment.booked;
    if (availableCapacity <= 0) {
      return {
        valid: false,
        canonicalPrice,
        variance,
        availableCapacity: 0,
        rejectionReason: `Inventory exhausted (0 available) on ${params.date}.`,
      };
    }

    if (variance > 0) {
      return {
        valid: false,
        canonicalPrice,
        variance,
        availableCapacity,
        rejectionReason: `Claimed price (${params.claimedPrice} ${params.currency || 'IRR'}) does not match canonical database price (${canonicalPrice} ${item.currency}).`,
      };
    }

    return {
      valid: true,
      canonicalPrice,
      variance: 0,
      availableCapacity,
    };
  }

  /**
   * Evaluates and grounds a full multi-leg itinerary plan from an AI agent or planner.
   */
  static async groundItinerary(
    legs: ItineraryLegInput[]
  ): Promise<{
    grounded: boolean;
    status: 'FULLY_GROUNDED' | 'PARTIALLY_GROUNDED' | 'UNGROUNDED';
    groundingScore: number;
    groundedLegs: Array<{ legId: string; offer: GroundedOffer }>;
    unmatchedLegs: Array<{ legId: string; reason: string }>;
  }> {
    if (legs.length === 0) {
      return {
        grounded: true,
        status: 'FULLY_GROUNDED',
        groundingScore: 1.0,
        groundedLegs: [],
        unmatchedLegs: [],
      };
    }

    const groundedLegs: Array<{ legId: string; offer: GroundedOffer }> = [];
    const unmatchedLegs: Array<{ legId: string; reason: string }> = [];

    for (const leg of legs) {
      if (leg.type === 'FLIGHT') {
        const res = await this.groundFlightOffer({
          destination: leg.targetName,
          date: leg.date,
          seatsNeeded: leg.capacityNeeded,
        });
        if (res.offers.length > 0) {
          groundedLegs.push({ legId: leg.legId, offer: res.offers[0] });
        } else {
          unmatchedLegs.push({
            legId: leg.legId,
            reason: res.rejectionReasons[0] || 'No flight inventory grounded',
          });
        }
      } else if (leg.type === 'HOTEL') {
        const res = await this.groundHotelOffer({
          hotelName: leg.targetName,
          checkIn: leg.date,
          roomsNeeded: leg.capacityNeeded,
        });
        if (res.offers.length > 0) {
          groundedLegs.push({ legId: leg.legId, offer: res.offers[0] });
        } else {
          unmatchedLegs.push({
            legId: leg.legId,
            reason: res.rejectionReasons[0] || 'No hotel inventory grounded',
          });
        }
      } else {
        // Unrecognized or general tour leg
        unmatchedLegs.push({
          legId: leg.legId,
          reason: `Leg type "${leg.type}" requires canonical supplier contract verification.`,
        });
      }
    }

    const total = legs.length;
    const matchedCount = groundedLegs.length;
    const groundingScore = Number((matchedCount / total).toFixed(2));

    let status: 'FULLY_GROUNDED' | 'PARTIALLY_GROUNDED' | 'UNGROUNDED' = 'UNGROUNDED';
    if (groundingScore === 1.0) {
      status = 'FULLY_GROUNDED';
    } else if (groundingScore > 0) {
      status = 'PARTIALLY_GROUNDED';
    }

    return {
      grounded: status === 'FULLY_GROUNDED',
      status,
      groundingScore,
      groundedLegs,
      unmatchedLegs,
    };
  }
}
