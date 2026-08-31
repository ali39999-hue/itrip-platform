import { HOTELS } from '../data';
import type { Hotel } from '../types';

export interface HotelSearchFilters {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minStars?: number;
  freeCancel?: boolean;
}

export class HotelService {
  /**
   * Fetches a list of hotels based on the provided filters.
   * This method mimics a backend API call and can be replaced with an actual fetch() in production.
   */
  static async searchHotels(filters: HotelSearchFilters = {}): Promise<Hotel[]> {
    // Simulate network delay for realism in prototype
    await new Promise((resolve) => setTimeout(resolve, 400));

    let results = [...HOTELS];

    // Filter by text query (city or name)
    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.nameEn && h.nameEn.toLowerCase().includes(q)) ||
          h.city.toLowerCase().includes(q) ||
          (h.cityEn && h.cityEn.toLowerCase().includes(q))
      );
    }

    // You can implement remaining filters here...
    return results;
  }

  /**
   * Fetches the details of a single hotel by ID.
   */
  static async getHotelById(id: string): Promise<Hotel | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return HOTELS.find((h) => h.id === id) || null;
  }
}
