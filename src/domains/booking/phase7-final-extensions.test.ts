import { describe, it, expect } from 'vitest';
import {
  ExpenseSplitterService,
  TripMember,
  TripExpenseItem,
} from '@/domains/trips/ExpenseSplitterService';
import { PassportValidityGuard } from '@/domains/identity/PassportValidityGuard';
import { TravelMcpToolsService } from '@/domains/ai/travel-mcp-tools';

describe('Wave 3 Final Architecture Extensions', () => {
  describe('ExpenseSplitterService (TREK / JourniPlan pattern)', () => {
    it('calculates net balances and minimal settlement transfers accurately', () => {
      const members: TripMember[] = [
        { id: 'u1', name: 'Ali' },
        { id: 'u2', name: 'Sara' },
        { id: 'u3', name: 'Reza' },
      ];

      // Ali pays 3,000,000 for dinner (1M each)
      // Sara pays 1,500,000 for taxi (500k each)
      const expenses: TripExpenseItem[] = [
        {
          id: 'e1',
          title: 'Dinner',
          amount: 3_000_000,
          currency: 'IRR',
          payerId: 'u1',
          participantIds: ['u1', 'u2', 'u3'],
        },
        {
          id: 'e2',
          title: 'Taxi',
          amount: 1_500_000,
          currency: 'IRR',
          payerId: 'u2',
          participantIds: ['u1', 'u2', 'u3'],
        },
      ];

      const summary = ExpenseSplitterService.calculateSplit(members, expenses, 'IRR');

      expect(summary.totalSpent).toBe(4_500_000);
      // Average per person = 1,500,000
      // Ali: paid 3.0M, owed 1.5M -> net +1.5M (creditor)
      // Sara: paid 1.5M, owed 1.5M -> net 0 (even)
      // Reza: paid 0, owed 1.5M -> net -1.5M (debtor)
      expect(summary.memberBalances['u1'].netBalance).toBe(1_500_000);
      expect(summary.memberBalances['u2'].netBalance).toBe(0);
      expect(summary.memberBalances['u3'].netBalance).toBe(-1_500_000);

      // Reza must pay 1.5M to Ali
      expect(summary.settlements.length).toBe(1);
      expect(summary.settlements[0].fromId).toBe('u3');
      expect(summary.settlements[0].toId).toBe('u1');
      expect(summary.settlements[0].amount).toBe(1_500_000);
    });
  });

  describe('PassportValidityGuard (Travel-CRM pattern)', () => {
    it('rejects expired passport on travel date', () => {
      const res = PassportValidityGuard.verifyPassport({
        passportExpiryDate: '2026-05-01',
        travelDate: '2026-09-20',
      });
      expect(res.isValidForTravel).toBe(false);
      expect(res.status).toBe('EXPIRED');
    });

    it('rejects passport with less than 6 months (180 days) validity', () => {
      // 90 days of validity remaining
      const res = PassportValidityGuard.verifyPassport({
        passportExpiryDate: '2026-12-20',
        travelDate: '2026-09-20',
      });
      expect(res.isValidForTravel).toBe(false);
      expect(res.status).toBe('INSUFFICIENT_SIX_MONTHS');
      expect(res.remainingDays).toBeLessThan(180);
    });

    it('approves passport with sufficient (>180 days) validity', () => {
      // 300 days of validity
      const res = PassportValidityGuard.verifyPassport({
        passportExpiryDate: '2027-07-20',
        travelDate: '2026-09-20',
      });
      expect(res.isValidForTravel).toBe(true);
      expect(res.status).toBe('VALID');
      expect(res.remainingDays).toBeGreaterThanOrEqual(180);
    });
  });

  describe('TravelMcpToolsService (travel_planner pattern)', () => {
    it('registers standard MCP travel tools', () => {
      const tools = TravelMcpToolsService.getRegisteredTools();
      expect(tools.length).toBeGreaterThanOrEqual(3);
      expect(tools.some((t) => t.name === 'search_flights')).toBe(true);
      expect(tools.some((t) => t.name === 'search_hotels')).toBe(true);
      expect(tools.some((t) => t.name === 'estimate_trip_budget')).toBe(true);
    });

    it('dispatches and executes budget estimation tool', async () => {
      const res = await TravelMcpToolsService.executeTool('estimate_trip_budget', {
        destination: 'turkey',
        paxCount: 2,
        durationDays: 5,
        tier: 'balanced',
      });

      expect(res.success).toBe(true);
      const result = res.result as { totalEstimatedToman: number; breakdown: Record<string, number> };
      expect(result.totalEstimatedToman).toBeGreaterThan(0);
      expect(result.breakdown.stay).toBeGreaterThan(0);
    });
  });
});
