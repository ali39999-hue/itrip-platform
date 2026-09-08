import { describe, it, expect } from 'vitest';
import { getAllTours, getTourById, getRelatedTours } from './tours-service';

describe('Tours Service & Detailed Data Suite', () => {
  it('returns all tours with rich detail data', () => {
    const tours = getAllTours();
    expect(tours.length).toBeGreaterThanOrEqual(4);

    tours.forEach((tour) => {
      expect(tour.id).toBeTruthy();
      expect(tour.title).toBeTruthy();
      expect(tour.titleEn).toBeTruthy();
      expect(tour.city).toBeTruthy();
      expect(tour.price).toBeGreaterThan(0);
      expect(tour.durationDays).toBeGreaterThan(0);
      expect(tour.rating).toBeGreaterThanOrEqual(4);
      expect(tour.includes.length).toBeGreaterThan(0);

      // Verify enriched properties
      expect(tour.itinerary).toBeDefined();
      expect(tour.itinerary!.length).toBe(tour.durationDays);
      expect(tour.departureDates).toBeDefined();
      expect(tour.departureDates!.length).toBeGreaterThan(0);
      expect(tour.gallery).toBeDefined();
      expect(tour.gallery!.length).toBeGreaterThan(0);
      expect(tour.reviews).toBeDefined();
      expect(tour.reviews!.length).toBeGreaterThan(0);
      expect(tour.hotelName).toBeTruthy();
      expect(tour.cancellationPolicy).toBeDefined();
    });
  });

  it('retrieves specific tour t1 with full daily itinerary', () => {
    const t1 = getTourById('t1');
    expect(t1).toBeDefined();
    expect(t1?.city).toBe('اصفهان');
    expect(t1?.durationDays).toBe(3);
    expect(t1?.itinerary?.length).toBe(3);

    // Verify first day itinerary
    const day1 = t1?.itinerary?.[0];
    expect(day1?.day).toBe(1);
    expect(day1?.title).toContain('نصف جهان');
    expect(day1?.activities.length).toBeGreaterThan(0);
  });

  it('retrieves specific tour t2 (Mashhad pilgrimage)', () => {
    const t2 = getTourById('t2');
    expect(t2).toBeDefined();
    expect(t2?.city).toBe('مشهد');
    expect(t2?.category).toBe('cultural');
    expect(t2?.hotelName).toContain('درویشی');
  });

  it('retrieves specific tour t3 (Istanbul medical checkup)', () => {
    const t3 = getTourById('t3');
    expect(t3).toBeDefined();
    expect(t3?.city).toBe('استانبول');
    expect(t3?.category).toBe('medical');
    expect(t3?.durationDays).toBe(5);
  });

  it('retrieves specific tour t4 (Georgia adventure)', () => {
    const t4 = getTourById('t4');
    expect(t4).toBeDefined();
    expect(t4?.category).toBe('adventure');
    expect(t4?.durationDays).toBe(6);
  });

  it('retrieves specific tour t5 (Isfahan 2.5-day VIP overland tour)', () => {
    const t5 = getTourById('t5');
    expect(t5).toBeDefined();
    expect(t5?.city).toBe('اصفهان');
    expect(t5?.durationDays).toBe(3);
    expect(t5?.durationNights).toBe(1);
    expect(t5?.price).toBe(9800000);
    expect(t5?.transportType).toContain('اتوبوس VIP');
    expect(t5?.itinerary?.length).toBe(3);
    expect(t5?.departureDates?.some((d) => d.startDate === '2026-09-16')).toBe(true);
  });

  it('returns undefined for non-existent tour id', () => {
    const missing = getTourById('non-existent-tour-999');
    expect(missing).toBeUndefined();
  });

  it('returns related tours excluding current tour', () => {
    const related = getRelatedTours('t1', 2);
    expect(related.length).toBe(2);
    expect(related.some((t) => t.id === 't1')).toBe(false);
  });
});
