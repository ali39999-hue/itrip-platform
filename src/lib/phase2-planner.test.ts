import { describe, it, expect } from 'vitest';
import {
  checkScheduleConflict,
  inferVenueSchedule,
  timeToMinutes,
} from './itinerary-time-utils';
import {
  calculateHaversineDistance,
  estimateTransitBuffer,
  CITY_CENTROIDS,
} from './geo-routing';
import {
  classifyVenueSetting,
  getDestinationDailyWeather,
} from './weather-planner';

describe('Phase 2: Smart Planner Algorithms & Spatial Scheduling', () => {
  describe('Itinerary Time & Operating Hours Conflict Detector', () => {
    it('correctly converts HH:mm to minutes from midnight', () => {
      expect(timeToMinutes('09:30')).toBe(570);
      expect(timeToMinutes('18:00')).toBe(1080);
      expect(timeToMinutes('00:00')).toBe(0);
    });

    it('infers museum hours and flags evening slot conflict', () => {
      const schedule = inferVenueSchedule('culture', 'موزه کاخ گلستان');
      expect(schedule.closeTime).toBe('17:30');

      // Slot 3 is Evening (19:00 - 23:00), should conflict with 17:30 closing
      const conflict = checkScheduleConflict(3, 'culture', 'موزه کاخ گلستان');
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.type).toBe('CLOSED_DURING_SLOT');
      expect(conflict.suggestedSlot).toBe(1); // Recommends morning
    });

    it('infers nightlife/dinner hours and flags morning slot conflict', () => {
      const conflict = checkScheduleConflict(1, 'nightlife', 'تور شبانه و رستوران ساحلی');
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.suggestedSlot).toBe(3); // Recommends evening
    });

    it('permits all-day parks and nature spots in any slot', () => {
      const conflict = checkScheduleConflict(3, 'nature', 'پارک جنگلی و ساحل آزاد');
      expect(conflict.hasConflict).toBe(false);
    });
  });

  describe('Geo-Routing & Transit Buffer Calculator', () => {
    it('calculates Haversine distance between cities accurately', () => {
      const tehran = CITY_CENTROIDS.tehran;
      const isfahan = CITY_CENTROIDS.isfahan;
      const dist = calculateHaversineDistance(tehran, isfahan);

      // Tehran to Isfahan straight line is ~340 km
      expect(dist).toBeGreaterThan(300);
      expect(dist).toBeLessThan(400);
    });

    it('assigns walking mode for short distances (under 1.2 km)', () => {
      const buffer = estimateTransitBuffer(0.8);
      expect(buffer.mode).toBe('walking');
      expect(buffer.durationMinutes).toBeGreaterThanOrEqual(10);
      expect(buffer.isTightConnection).toBe(false);
    });

    it('assigns metro mode for intermediate metropolitan distances', () => {
      const buffer = estimateTransitBuffer(4.5);
      expect(buffer.mode).toBe('metro');
      expect(buffer.durationMinutes).toBeGreaterThanOrEqual(20);
      expect(buffer.isTightConnection).toBe(false);
    });

    it('flags tight connection for long distance cross-city transit', () => {
      const buffer = estimateTransitBuffer(18); // 18 km across city
      expect(buffer.mode).toBe('driving');
      expect(buffer.durationMinutes).toBeGreaterThan(50);
      expect(buffer.isTightConnection).toBe(true);
    });
  });

  describe('Weather-Aware Activity Planner', () => {
    it('classifies cultural and museum venues as indoor', () => {
      expect(classifyVenueSetting('culture', 'موزه توپکاپی')).toBe('indoor');
      expect(classifyVenueSetting('museum', 'موزه ملی ایران')).toBe('indoor');
    });

    it('classifies yacht, safari and nature as outdoor', () => {
      expect(classifyVenueSetting('yacht', 'تور قایق تفریحی تنگه بسفر')).toBe('outdoor');
      expect(classifyVenueSetting('nature', 'سافاری کویر مرنجاب')).toBe('outdoor');
    });

    it('generates consistent destination daily weather conditions', () => {
      const w1 = getDestinationDailyWeather('turkey', 1);
      expect(w1.tempC).toBeGreaterThan(10);
      expect(w1.conditionFa).toBeDefined();

      const w2 = getDestinationDailyWeather('turkey', 2);
      expect(w2.isRainy).toBe(true); // Demonstrates rainy weather flag on day 2
    });
  });
});
