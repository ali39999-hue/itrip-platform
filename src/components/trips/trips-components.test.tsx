// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
import { calculateTimeRemaining, TripCountdown } from './TripCountdown';
import { BaggagePill } from './BaggagePill';
import { EmergencySosCard } from './EmergencySosCard';
import { FareBrandedMatrix } from '@/components/flights/FareBrandedMatrix';
import { DestinationComparator } from '@/components/destinations/DestinationComparator';
import {
  saveVoucherOffline,
  getOfflineVouchers,
  getOfflineVoucherByRef,
} from '@/lib/offline-voucher';

describe('Phase 1: Trips & Boarding Pass Features', () => {
  describe('calculateTimeRemaining & TripCountdown', () => {
    it('calculates remaining time for a future date correctly', () => {
      // Create a date 2 days in the future
      const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000);
      const dateStr = future.toISOString().slice(0, 10);
      const timeStr = `${String(future.getHours()).padStart(2, '0')}:${String(
        future.getMinutes()
      ).padStart(2, '0')}`;

      const res = calculateTimeRemaining(dateStr, timeStr);
      expect(res.isPast).toBe(false);
      expect(res.days).toBeGreaterThanOrEqual(1);
    });

    it('identifies past dates correctly', () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateStr = past.toISOString().slice(0, 10);
      const res = calculateTimeRemaining(dateStr, '10:00');
      expect(res.isPast).toBe(true);
      expect(res.totalMs).toBe(0);
    });

    it('flags boarding soon when departure is under 3 hours', () => {
      const soon = new Date(Date.now() + 1.5 * 60 * 60 * 1000); // 1.5 hours
      const dateStr = soon.toISOString().slice(0, 10);
      const timeStr = `${String(soon.getHours()).padStart(2, '0')}:${String(
        soon.getMinutes()
      ).padStart(2, '0')}`;

      const res = calculateTimeRemaining(dateStr, timeStr);
      expect(res.isPast).toBe(false);
      expect(res.isBoardingSoon).toBe(true);
    });

    it('renders past trip message when trip is completed', () => {
      render(
        <TripCountdown targetDate="2020-01-01" targetTime="12:00" locale="fa" variant="card" />
      );
      expect(screen.getByText(/تاریخ این سفر به پایان رسیده است/)).toBeDefined();
    });
  });

  describe('BaggagePill component', () => {
    it('renders standard cabin and checked baggage allowances', () => {
      render(<BaggagePill cabinBaggage="7kg" checkedBaggage="30kg" locale="fa" />);
      expect(screen.getByText(/کابین: 7kg/)).toBeDefined();
      expect(screen.getByText(/بار: 30kg/)).toBeDefined();
    });

    it('displays warning style when there is no checked baggage', () => {
      render(<BaggagePill cabinBaggage="7kg" checkedBaggage="0kg" locale="fa" />);
      expect(screen.getByText(/بدون بار تحویلی/)).toBeDefined();
    });
  });

  describe('Offline Voucher Storage Utility', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('saves and retrieves an offline voucher snapshot', () => {
      const mockVoucher = {
        id: 'bk_123',
        reference: 'ITR-TEST-001',
        externalPnr: 'PNR999',
        status: 'CONFIRMED',
        serviceType: 'FLIGHT',
        title: 'تهران به استانبول',
        passengers: [{ firstName: 'Ali', lastName: 'Rezaei' }],
        totalAmount: 25000000,
        currency: 'IRR',
      };

      const ok = saveVoucherOffline(mockVoucher);
      expect(ok).toBe(true);

      const vouchers = getOfflineVouchers();
      expect(vouchers.length).toBe(1);
      expect(vouchers[0].reference).toBe('ITR-TEST-001');
      expect(vouchers[0].externalPnr).toBe('PNR999');

      const retrieved = getOfflineVoucherByRef('ITR-TEST-001');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('تهران به استانبول');
    });
  });

  describe('EmergencySosCard Component', () => {
    it('renders emergency hotline info and reference code', () => {
      render(<EmergencySosCard countryName="ترکیه" reference="ITR-99887" locale="fa" />);
      expect(screen.getByText(/پشتیبانی اضطراری و SOS در طول سفر/)).toBeDefined();
    });
  });

  describe('FareBrandedMatrix Component (FlyNext pattern)', () => {
    it('renders multiple fare tiers with baggage inclusions', () => {
      render(<FareBrandedMatrix basePrice={20_000_000} locale="fa" />);
      expect(screen.getByText(/اکونومی پایه \(لایت\)/)).toBeDefined();
      expect(screen.getByText(/اکونومی استاندارد/)).toBeDefined();
      expect(screen.getByText(/بیزینس فلکس اختصاصی/)).toBeDefined();
    });
  });

  describe('DestinationComparator Component (Voyage-AI pattern)', () => {
    it('renders side-by-side comparison of destinations', () => {
      render(<DestinationComparator locale="fa" defaultDest1="istanbul" defaultDest2="dubai" />);
      expect(screen.getByText(/موتور هوشمند مقایسه دو مقصد گردشگری/)).toBeDefined();
      expect(screen.getAllByText(/برآورد هزینه روزانه:/).length).toBe(2);
    });
  });
});
