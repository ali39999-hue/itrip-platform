import { describe, it, expect } from 'vitest';
import {
  TripIntelligenceService,
  type ActiveTripContext,
} from './trip-intelligence';

describe('Section 16: Trip Intelligence & Proactive Travel Concierge', () => {
  it('detects boarding soon alert when departure is within 3 hours', () => {
    // 2 hours in future
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const dateStr = future.toISOString().slice(0, 10);
    const timeStr = `${String(future.getHours()).padStart(2, '0')}:${String(
      future.getMinutes()
    ).padStart(2, '0')}`;

    const ctx: ActiveTripContext = {
      bookingId: 'bk_test_1',
      reference: 'ITR-10023',
      destinationCity: 'استانبول',
      destinationCountry: 'turkey',
      travelDate: dateStr,
      departureTime: timeStr,
      flightNo: 'W5-1152',
    };

    const alerts = TripIntelligenceService.evaluateSignals(ctx);
    expect(alerts.some((a) => a.category === 'BOARDING_SOON')).toBe(true);
    expect(alerts.find((a) => a.category === 'BOARDING_SOON')?.severity).toBe('CRITICAL');
  });

  it('proactively triggers transfer rescheduling when flight is delayed and transfer was booked', () => {
    const ctx: ActiveTripContext = {
      bookingId: 'bk_test_transfer',
      reference: 'ITR-9988',
      destinationCity: 'دبی',
      destinationCountry: 'uae',
      travelDate: '2026-10-15',
      departureTime: '10:00',
      flightDelayMinutes: 45,
      hasTransferBooked: true,
      transferPickupTime: '13:00',
    };

    const alerts = TripIntelligenceService.evaluateSignals(ctx);
    const transferAlert = alerts.find((a) => a.category === 'TRANSFER_MISALIGN');

    expect(transferAlert).toBeDefined();
    expect(transferAlert?.severity).toBe('CRITICAL');
    expect(transferAlert?.action?.actionType).toBe('RESCHEDULE_TRANSFER');
    expect(transferAlert?.description.fa).toContain('۴۵ دقیقه تاخیر');
  });

  it('suggests saving voucher offline when trip is within 24 hours and not yet saved', () => {
    // 12 hours in future
    const future = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, '0');
    const d = String(future.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const timeStr = `${String(future.getHours()).padStart(2, '0')}:${String(
      future.getMinutes()
    ).padStart(2, '0')}`;

    const ctx: ActiveTripContext = {
      bookingId: 'bk_test_offline',
      reference: 'ITR-7766',
      destinationCity: 'استانبول',
      destinationCountry: 'turkey',
      travelDate: dateStr,
      departureTime: timeStr,
      isOfflineSaved: false,
    };

    const alerts = TripIntelligenceService.evaluateSignals(ctx);
    const offlineAlert = alerts.find((a) => a.category === 'OFFLINE_READY');

    expect(offlineAlert).toBeDefined();
    expect(offlineAlert?.action?.actionType).toBe('SAVE_OFFLINE');
  });

  it('includes destination currency recommendation for Turkey', () => {
    const ctx: ActiveTripContext = {
      bookingId: 'bk_test_fx',
      reference: 'ITR-5544',
      destinationCity: 'استانبول',
      destinationCountry: 'turkey',
      travelDate: '2026-11-01',
    };

    const alerts = TripIntelligenceService.evaluateSignals(ctx);
    const fxAlert = alerts.find((a) => a.category === 'CURRENCY_TIP');

    expect(fxAlert).toBeDefined();
    expect(fxAlert?.description.fa).toContain('دلار یا تتر');
  });
});
