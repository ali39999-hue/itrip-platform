/**
 * GROUNDED-PLANNER.TEST.TS
 *
 * Verification test suite for Grounded AI Planner (Item 7 of roadmap).
 * Enforces zero price hallucination, domain model grounding, and verifiable metrics.
 */
import { describe, it, expect } from 'vitest';
import { PlannerGroundingService } from './PlannerGroundingService';

describe('Grounded AI Planner & Anti-Hallucination Engine', () => {
  describe('Quote & Pricing Boundary Enforcement', () => {
    it('detects variance when an AI agent invents or hallucinates a custom price', async () => {
      // Simulate validating a quote against an item that does not exist or has price variance
      const result = await PlannerGroundingService.validateOfferQuote({
        inventoryItemId: 'inv_non_existent',
        date: '2026-10-01',
        claimedPrice: 999_999,
      });

      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toContain('does not exist in canonical catalog');
    });

    it('generates deterministic signatures matching state parameters', () => {
      // Test signature generation logic
      const service = PlannerGroundingService as unknown as {
        generateSignature: (id: string, date: string, price: number, available: number) => string;
      };
      const sig1 = service.generateSignature('inv_1', '2026-10-01', 5000000, 10);
      const sig2 = service.generateSignature('inv_1', '2026-10-01', 5000000, 10);
      const sig3 = service.generateSignature('inv_1', '2026-10-01', 5000001, 10); // 1 unit diff

      expect(sig1).toBe(sig2);
      expect(sig1).not.toBe(sig3);
    });
  });

  describe('Itinerary Grounding Scoring', () => {
    it('returns score 1.0 and FULLY_GROUNDED for empty itineraries', async () => {
      const result = await PlannerGroundingService.groundItinerary([]);
      expect(result.grounded).toBe(true);
      expect(result.status).toBe('FULLY_GROUNDED');
      expect(result.groundingScore).toBe(1.0);
    });

    it('rejects unverified leg types that have no canonical backing contract', async () => {
      const result = await PlannerGroundingService.groundItinerary([
        {
          legId: 'leg_custom_balloon',
          type: 'HOT_AIR_BALLOON' as unknown as 'FLIGHT',
          date: '2026-10-02',
          targetName: 'Kish Island Balloon',
        },
      ]);

      expect(result.grounded).toBe(false);
      expect(result.status).toBe('UNGROUNDED');
      expect(result.unmatchedLegs[0].reason).toContain('requires canonical supplier contract verification');
    });
  });
});
