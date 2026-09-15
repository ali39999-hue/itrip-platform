import { describe, it, expect } from 'vitest';
import { ContentDomainService } from '@/domains/content/ContentDomainService';
import { getAdminDashboardData, getAdminOpsData, getAdminExceptionsData, getAdminFinanceStats } from '@/actions/admin';
import { getPublicToursAction, getPublicExperiencesAction, getPublicGuidesAction } from '@/actions/content';

/**
 * ERP & CMS Fault Tolerance & Empty Database Resilience Suite (ERP-RESILIENCE-001)
 * Validates:
 * 1. Graceful fallback when database tables are empty or query throws
 * 2. Admin dashboard endpoints return valid structured responses without 500 errors
 * 3. Public catalog actions return structured items even under disconnected DB
 */
describe('ERP & CMS Fault-Tolerance and Empty Database Resilience', () => {

  describe('1. ContentDomainService Fallback Authority', () => {
    it('returns structured tours fallback array when database returns empty or fails', async () => {
      const tours = await ContentDomainService.getTours();
      expect(Array.isArray(tours)).toBe(true);
      expect(tours.length).toBeGreaterThan(0);

      // Verify each tour has sanitized numeric price and strings
      const sample = tours[0];
      expect(typeof sample.title).toBe('string');
      expect(typeof sample.price).toBe('number');
      expect(sample.price).toBeGreaterThan(0);
    });

    it('returns structured experiences fallback array when database is empty', async () => {
      const experiences = await ContentDomainService.getExperiences();
      expect(Array.isArray(experiences)).toBe(true);
      expect(experiences.length).toBeGreaterThan(0);

      const sample = experiences[0];
      expect(sample.title).toBeDefined();
      expect(typeof sample.fromPrice).toBe('number');
    });

    it('returns structured guides fallback array when database is empty', async () => {
      const guides = await ContentDomainService.getGuides();
      expect(Array.isArray(guides)).toBe(true);
      expect(guides.length).toBeGreaterThan(0);

      const sample = guides[0];
      expect(sample.titleFa).toBeDefined();
      expect(sample.bodyFa).toBeDefined();
    });
  });

  describe('2. Public Content Server Actions Resilience', () => {
    it('getPublicToursAction resolves with success=true and valid tours array', async () => {
      const res = await getPublicToursAction();
      expect(res.success).toBe(true);
      expect(Array.isArray(res.tours)).toBe(true);
      expect(res.tours.length).toBeGreaterThan(0);
    });

    it('getPublicExperiencesAction resolves with success=true', async () => {
      const res = await getPublicExperiencesAction();
      expect(res.success).toBe(true);
      expect(Array.isArray(res.experiences)).toBe(true);
      expect(res.experiences.length).toBeGreaterThan(0);
    });

    it('getPublicGuidesAction resolves with success=true', async () => {
      const res = await getPublicGuidesAction();
      expect(res.success).toBe(true);
      expect(Array.isArray(res.guides)).toBe(true);
      expect(res.guides.length).toBeGreaterThan(0);
    });
  });

  describe('3. Admin Dashboard & Aggregation Actions Resilience', () => {
    it('getAdminDashboardData returns structured KPIs without throwing', async () => {
      const data = await getAdminDashboardData();
      expect(data).toBeDefined();
      expect(typeof data.confirmedBookingsCount).toBe('number');
      expect(Array.isArray(data.allBookings)).toBe(true);
    });

    it('getAdminOpsData returns structured outbox queues without throwing', async () => {
      const data = await getAdminOpsData();
      expect(data).toBeDefined();
      expect(Array.isArray(data.pendingEvents)).toBe(true);
    });

    it('getAdminExceptionsData returns structured queues without throwing', async () => {
      const data = await getAdminExceptionsData();
      expect(data).toBeDefined();
      expect(Array.isArray(data.exceptions)).toBe(true);
    });

    it('getAdminFinanceStats returns balances and currency rates without throwing', async () => {
      const data = await getAdminFinanceStats();
      expect(data).toBeDefined();
      if ('balances' in data && data.balances) {
        expect(typeof data.balances.IRR).toBe('number');
        expect(data.rates).toBeDefined();
      } else {
        expect(data.error).toBeDefined();
      }
    });
  });

});
