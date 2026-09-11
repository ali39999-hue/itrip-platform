import { describe, it, expect } from 'vitest';
import {
  SearchRankingEngine,
  type RankableOffer,
} from './search-ranking';

describe('Section 28: Search Ranking & Multi-Signal Offer Evaluation', () => {
  const sampleOffers: RankableOffer[] = [
    {
      id: 'flight_cheap',
      price: 10_000_000,
      durationMinutes: 300, // 5 hours
      stops: 1,
      isRefundable: false,
      qualityScore: 7,
      isCharter: true,
    },
    {
      id: 'flight_fast',
      price: 18_000_000,
      durationMinutes: 150, // 2.5 hours non-stop
      stops: 0,
      isRefundable: true,
      qualityScore: 9,
      isCharter: false,
    },
    {
      id: 'flight_balanced',
      price: 12_000_000,
      durationMinutes: 180, // 3 hours non-stop
      stops: 0,
      isRefundable: true,
      qualityScore: 8.5,
      isCharter: false,
    },
  ];

  it('correctly assigns CHEAPEST badge to the lowest price flight', () => {
    const ranked = SearchRankingEngine.rankOffers(sampleOffers);
    const cheapOffer = ranked.find((r) => r.offer.id === 'flight_cheap');

    expect(cheapOffer).toBeDefined();
    expect(cheapOffer?.badge?.code).toBe('CHEAPEST');
    expect(cheapOffer?.badge?.label.fa).toContain('ارزان‌ترین نرخ');
  });

  it('correctly assigns BEST_VALUE to the optimal combination of price, time, and quality', () => {
    const ranked = SearchRankingEngine.rankOffers(sampleOffers);
    const bestValue = ranked.find((r) => r.badge?.code === 'BEST_VALUE');

    expect(bestValue).toBeDefined();
    // flight_balanced has near-minimum price and near-minimum duration + refundable
    expect(bestValue?.offer.id).toBe('flight_balanced');
  });

  it('evaluates single offer gracefully with a default badge', () => {
    const single = SearchRankingEngine.rankOffers([sampleOffers[0]]);
    expect(single.length).toBe(1);
    expect(single[0].compositeScore).toBe(100);
    expect(single[0].badge?.code).toBe('BEST_VALUE');
  });

  it('handles empty input gracefully', () => {
    const empty = SearchRankingEngine.rankOffers([]);
    expect(empty).toEqual([]);
  });
});
