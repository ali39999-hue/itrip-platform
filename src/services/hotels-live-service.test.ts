import { describe, it, expect } from 'vitest';
import { searchHotelsLive, mapEcardoOfferToHotel, getHotelByIdAsync } from './hotels-service';
import type { EcardoOffer } from '@/domains/supplier/adapters/EcardoTravelClient';

describe('searchHotelsLive & eCardo Hotel Normalizer Suite', () => {
  it('correctly normalizes an eCardo Travel hotel offer into DetailedHotelWithMeta', () => {
    const mockOffer: EcardoOffer = {
      id: 'master_json:hotel:129',
      service: 'hotel',
      provider_key: 'master_json',
      title: 'هتل خیام تهران',
      subtitle: 'تهران',
      badge: '2 ★',
      image_url: 'https://www.eghamat24.com/app/public/hotel_images/original/Tehran-Khayyam-02.jpg',
      pricing: {
        total_amount: 13340000,
        currency: 'IRR',
      },
      highlights: ['لابی', 'پذیرش 24 ساعته', 'آسانسور'],
      attributes: {
        city: 'تهران',
        address: 'تهران، میدان بهارستان',
        stars: 2,
        latitude: 35.687,
        longitude: 51.428,
      },
    };

    const hotel = mapEcardoOfferToHotel(mockOffer);

    expect(hotel.id).toBe('master_json:hotel:129');
    expect(hotel.name).toBe('هتل خیام تهران');
    expect(hotel.city).toBe('تهران');
    expect(hotel.cityEn).toBe('Tehran');
    expect(hotel.stars).toBe(2);
    expect(hotel.pricePerNight).toBe(13340000);
    expect(hotel.heroImage).toBe('https://www.eghamat24.com/app/public/hotel_images/original/Tehran-Khayyam-02.jpg');
    expect(hotel.amenities).toContain('لابی');
    expect(hotel.roomTypes.length).toBeGreaterThan(0);
    expect(hotel.location?.lat).toBe(35.687);
  });

  it('performs live hotel search and returns a valid HotelSearchResponse', async () => {
    const res = await searchHotelsLive({
      city: 'Tehran',
      country: 'iran',
      limit: 5,
    });

    expect(res).toBeDefined();
    expect(res.hotels).toBeDefined();
    expect(res.hotels.length).toBeGreaterThan(0);
    expect(res.total).toBeGreaterThan(0);
    expect(res.facets).toBeDefined();
  });

  it('resolves live eCardo hotel details asynchronously via getHotelByIdAsync', async () => {
    const hotel = await getHotelByIdAsync('master_json:hotel:129');
    expect(hotel).toBeDefined();
    if (hotel) {
      expect(hotel.id).toBe('master_json:hotel:129');
      expect(hotel.name).toContain('خیام');
      expect(hotel.stars).toBe(2);
      expect(hotel.pricePerNight).toBeGreaterThan(0);
      expect(hotel.amenities.length).toBeGreaterThan(0);
    }
  });
});
