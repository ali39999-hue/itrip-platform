import { describe, it, expect } from 'vitest';
import { TravelIngestionService } from './TravelIngestionService';
import { TravelProposalService } from '@/domains/pricing/TravelProposalService';
import { DynamicCurrencyCalculator } from '@/domains/currency/DynamicCurrencyCalculator';

describe('Wave 2 Architecture Extensions', () => {
  describe('TravelIngestionService (DaPlanStan / travel-itinerary-ai pattern)', () => {
    it('accurately parses airline booking SMS into structured travel legs', () => {
      const sms =
        'رزرو تایید شد. شماره PNR: W5-94812. پرواز هواپیمایی ماهان W5-1152 تاریخ 2026-09-20 ساعت 08:30 از فرودگاه تهران به استانبول. مسافر: علی رضایی. صندلی 14A.';

      const parsed = TravelIngestionService.parseRawConfirmation(sms);

      expect(parsed.serviceType).toBe('FLIGHT');
      expect(parsed.pnr).toBe('W5-94812');
      expect(parsed.airline).toBe('هواپیمایی ماهان');
      expect(parsed.flightNo).toBe('W5-1152');
      expect(parsed.travelDate).toBe('2026-09-20');
      expect(parsed.departureTime).toBe('08:30');
      expect(parsed.origin).toBe('THR');
      expect(parsed.destination).toBe('IST');
      expect(parsed.seat).toBe('14A');
      expect(parsed.confidenceScore).toBeGreaterThanOrEqual(0.7);
    });

    it('infers hotel service type from accommodation text', () => {
      const hotelText = 'رزرو هتل اسپیناس پالاس تهران تاریخ 2026-10-15 ساعت 14:00 شماره رزرو HT-8877';
      const parsed = TravelIngestionService.parseRawConfirmation(hotelText);
      expect(parsed.serviceType).toBe('HOTEL');
      expect(parsed.pnr).toBe('HT-8877');
    });
  });

  describe('TravelProposalService (Voyant / ExcursioX pattern)', () => {
    it('creates a formal proposal with markup and tax calculations', () => {
      const proposal = TravelProposalService.createProposal({
        clientName: 'شرکت فناوران نوین',
        clientCompany: 'Fannavaran Inc',
        destination: 'استانبول',
        departureDate: '2026-10-01',
        returnDate: '2026-10-05',
        paxCount: 4,
        agentMarkupPercent: 0.1, // 10%
        taxPercent: 0.09, // 9%
        currency: 'IRR',
        items: [
          {
            type: 'FLIGHT',
            title: 'پرواز رفت و برگشت ماهان',
            unitCost: 20_000_000,
            quantity: 4,
          },
          {
            type: 'HOTEL',
            title: 'هتل ۵ ستاره رادیسون بلو',
            unitCost: 15_000_000,
            quantity: 2,
            daysOrNights: 4,
          },
        ],
      });

      expect(proposal.proposalNumber).toMatch(/^PROP-2026-\d{4}$/);
      expect(proposal.subtotalAmount).toBeGreaterThan(0);
      expect(proposal.agentMarkupAmount).toBeGreaterThan(0);
      expect(proposal.taxAmount).toBeGreaterThan(0);
      expect(proposal.totalClientAmount).toBe(proposal.subtotalAmount + proposal.taxAmount);
      expect(proposal.items.length).toBe(2);
    });
  });

  describe('DynamicCurrencyCalculator (Spree Commerce & ShopVerse pattern)', () => {
    it('converts between Tomans and USD/USDT accurately', () => {
      // 90,000,000 Tomans at 90,000 IRT/USD = 1,000 USD
      const usd = DynamicCurrencyCalculator.convert(90_000_000, 'IRT', 'USD');
      expect(usd).toBe(1000);

      // 1,000 USD at 3.67 AED/USD = 3,670 AED
      const aed = DynamicCurrencyCalculator.convert(1000, 'USD', 'AED');
      expect(aed).toBe(3670);
    });

    it('formats display strings with localized currency symbols', () => {
      const faDisplay = DynamicCurrencyCalculator.formatDisplay(5000000, 'IRT', 'fa');
      expect(faDisplay).toContain('تومان');

      const usDisplay = DynamicCurrencyCalculator.formatDisplay(250, 'USD', 'en');
      expect(usDisplay).toBe('$250');
    });
  });
});
