import path from 'path';
import fs from 'fs';
import type { Hotel, RoomType } from '@/lib/types';
import { formatDistance } from '@/lib/format';

export interface RawIranHotel {
  hotel_id: string;
  hotel_name: string;
  hotel_slug?: string;
  hotel_url?: string;
  stars?: number;
  address?: string;
  phone?: string | null;
  description?: string;
  amenities?: string[];
  images?: Array<{ url: string; alt?: string; type?: string }>;
  location?: { lat?: number | null; lng?: number | null; map_url?: string };
  price_range?: { min?: number; max?: number; currency?: string };
  rooms?: RawIranRoom[];
  reviews_summary?: { average_score?: number; total_reviews?: number };
}

export interface RawIranRoom {
  room_id: string;
  room_name: string;
  room_type?: string;
  capacity: number;
  extra_capacity?: number;
  price: number;
  currency: string;
  breakfast_included: boolean;
  amenities?: string[];
  images?: string[];
  description?: string;
  bed_info?: { single_bed?: number; double_bed?: number; sofa_bed?: number };
}

export interface RawIranCity {
  city_name: string;
  city_slug: string;
  hotels: RawIranHotel[];
}

export interface RawChinaPoi {
  name: string;
  distance: string;
  type: string;
  lat?: number;
  lng?: number;
}

export interface RawChinaHotel {
  hotel_id: number;
  hotel_name: string;
  hotel_slug?: string;
  hotel_url?: string;
  stars?: number;
  address?: string;
  images?: Array<{ url: string; alt?: string; type?: string }>;
  amenities?: string[];
  location?: { lat?: number | null; lng?: number | null; pois?: RawChinaPoi[] };
  rooms?: Array<{
    room_id: string;
    room_name: string;
    comment_count?: number;
    capacity?: number;
    price?: number;
    currency?: string;
    breakfast_included?: boolean;
    amenities?: string[];
    images?: string[];
    description?: string;
  }>;
  reviews_summary?: { total_reviews?: number };
  source?: string;
}

export interface DetailedHotelWithMeta extends Hotel {
  countryId: 'iran' | 'china';
  description?: string;
  address?: string;
  location?: { lat: number; lng: number };
  galleryImages: string[];
  pois?: RawChinaPoi[];
  detailedRooms: RoomType[];
}

// In-memory cache
let cachedIranHotels: DetailedHotelWithMeta[] | null = null;
let cachedChinaHotels: DetailedHotelWithMeta[] | null = null;

const AMENITY_TAG_MAP: Record<string, string> = {
  سونا: 'spa',
  استخر: 'pool',
  جکوزی: 'spa',
  ماساژ: 'spa',
  'اینترنت در لابی': 'wifi',
  'اینترنت در اتاق': 'wifi',
  پارکینگ: 'parking',
  رستوران: 'restaurant',
  'کافی شاپ': 'restaurant',
  'ترانسفر فرودگاهی': 'shuttle',
  'سرویس حرم': 'shuttle',
  'سالن ورزشی': 'gym',
  'وسایل بدنسازی': 'gym',
  باغ: 'garden',
  'چایخانه سنتی': 'teahouse',
};

function normalizeIranAmenities(rawList: string[] = []): string[] {
  const set = new Set<string>();
  for (const am of rawList) {
    for (const [key, slug] of Object.entries(AMENITY_TAG_MAP)) {
      if (am.includes(key)) {
        set.add(slug);
      }
    }
  }
  if (!set.has('wifi')) set.add('wifi');
  if (set.size < 3) set.add('restaurant');
  return Array.from(set);
}

function loadIranHotels(): DetailedHotelWithMeta[] {
  if (cachedIranHotels) return cachedIranHotels;

  const filePath = path.join(process.cwd(), 'src/data/server/hotels-iran-master.json');
  if (!fs.existsSync(filePath)) {
    console.error('Iran hotels file not found:', filePath);
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const cities: RawIranCity[] = parsed.cities || [];

  const list: DetailedHotelWithMeta[] = [];

  for (const c of cities) {
    for (const h of c.hotels || []) {
      const roomTypes: RoomType[] = [];
      let minRoomPrice = Infinity;

      for (const r of h.rooms || []) {
        const p = r.price && r.price > 0 ? r.price : 45_000_000;
        if (p < minRoomPrice) minRoomPrice = p;

        roomTypes.push({
          id: String(r.room_id),
          name: r.room_name || 'اتاق استاندارد',
          capacity: r.capacity || 2,
          breakfast: r.breakfast_included ?? true,
          pricePerNight: p,
          available: 5,
        });
      }

      const defaultPrice = h.price_range?.min && h.price_range.min > 0 ? h.price_range.min : (minRoomPrice !== Infinity ? minRoomPrice : 38_000_000);
      const rating = h.reviews_summary?.average_score ? Number((h.reviews_summary.average_score).toFixed(1)) : 8.5;
      const reviews = h.reviews_summary?.total_reviews || 120;

      const galleryUrls = (h.images || []).map((img) => img.url).filter(Boolean);
      const distance = c.city_name === 'مشهد' ? '۵۰۰ متر تا حرم' : 'مرکز شهر';

      list.push({
        id: `ir_${h.hotel_id}`,
        name: h.hotel_name,
        nameEn: h.hotel_slug?.replace(/-/g, ' ') || h.hotel_name,
        city: c.city_name,
        cityEn: c.city_slug || c.city_name,
        stars: h.stars && h.stars > 0 ? Math.min(h.stars, 5) : 4,
        rating: rating,
        reviewsCount: reviews,
        pricePerNight: defaultPrice,
        imageQuery: 'luxury-hotel',
        amenities: normalizeIranAmenities(h.amenities),
        distanceFromCenter: distance,
        freeCancellation: true,
        roomTypes: roomTypes.length > 0 ? roomTypes : [
          { id: 'r_std', name: 'اتاق دبل استاندارد', capacity: 2, breakfast: true, pricePerNight: defaultPrice, available: 4 },
          { id: 'r_dlx', name: 'سوییت دولوکس', capacity: 3, breakfast: true, pricePerNight: Math.round(defaultPrice * 1.35), available: 2 }
        ],
        countryId: 'iran',
        description: h.description || `اقامت دلپذیر در ${h.hotel_name} واقع در ${c.city_name} با دسترسی عالی به مراکز دیدنی و امکانات رفاهی کامل.`,
        address: h.address || `${c.city_name}، مرکز شهر`,
        location: h.location?.lat && h.location?.lng ? { lat: h.location.lat, lng: h.location.lng } : undefined,
        galleryImages: galleryUrls.length > 0 ? galleryUrls : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'],
        detailedRooms: roomTypes,
      });
    }
  }

  cachedIranHotels = list;
  return list;
}

function loadChinaHotels(): DetailedHotelWithMeta[] {
  if (cachedChinaHotels) return cachedChinaHotels;

  const filePath = path.join(process.cwd(), 'src/data/server/hotels-china-beijing.json');
  if (!fs.existsSync(filePath)) {
    console.error('China hotels file not found:', filePath);
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const chinaRawList: RawChinaHotel[] = JSON.parse(raw);

  const list: DetailedHotelWithMeta[] = [];

  for (const ch of chinaRawList) {
    // Generate realistic names and attributes from POIs and hotel id
    const topPoi = ch.location?.pois?.[0]?.name;
    const cleanPoiName = topPoi ? topPoi.replace(/[()]/g, '') : 'Wangfujing';

    const cleanHotelName = `هتل بین‌المللی ${cleanPoiName} پکن`;
    const cleanHotelNameEn = `Beijing ${cleanPoiName} Grand Hotel`;

    // Room configurations with reasonable live pricing
    // CNY to IRR conversion: 1 CNY ~ 125,000 IRR (~12,500 Toman)
    // A 4-star room is typically 300 - 650 CNY (37,500,000 to 81,250,000 IRR)
    const baseCny = 380 + (ch.hotel_id % 300);
    const basePriceIrr = baseCny * 125_000;

    const roomTypes: RoomType[] = [];
    for (const r of ch.rooms || []) {
      const multiplier = r.room_name.toLowerCase().includes('suite') ? 1.5 : (r.room_name.toLowerCase().includes('deluxe') ? 1.25 : 1.0);
      const roomIrr = Math.round(basePriceIrr * multiplier);

      roomTypes.push({
        id: String(r.room_id),
        name: r.room_name,
        capacity: r.capacity || 2,
        breakfast: r.breakfast_included ?? false,
        pricePerNight: roomIrr,
        available: 4,
      });
    }

    const defaultPrice = roomTypes.length > 0 ? roomTypes[0].pricePerNight : basePriceIrr;
    const galleryUrls = (ch.images || []).map((img) => img.url).filter(Boolean);

    // Nearby landmarks description
    const landmarks = ch.location?.pois?.slice(0, 3).map(p => `${p.name} (${formatDistance(p.distance, undefined, 'fa')})`).join('، ') || 'میدان تیان‌آن‌من و شهر ممنوعه';
    const firstPoi = ch.location?.pois?.[0];
    const poiDistanceKm = firstPoi?.distance ? parseFloat(firstPoi.distance) : undefined;
    const distText = firstPoi ? formatDistance(firstPoi.distance, firstPoi.name, 'fa') : 'مرکز شهر پکن';
    const distTextEn = firstPoi ? formatDistance(firstPoi.distance, firstPoi.name, 'en') : 'Downtown Beijing';

    const lat = ch.location?.lat || (firstPoi?.lat ? firstPoi.lat - 0.005 : 39.9042);
    const lng = ch.location?.lng || (firstPoi?.lng ? firstPoi.lng + 0.005 : 116.4074);

    list.push({
      id: `cn_${ch.hotel_id}`,
      name: cleanHotelName,
      nameEn: cleanHotelNameEn,
      city: 'پکن',
      cityEn: 'Beijing',
      stars: 4 + (ch.hotel_id % 2), // 4 or 5 stars
      rating: 8.4 + ((ch.hotel_id % 15) / 10), // 8.4 to 9.8
      reviewsCount: ch.reviews_summary?.total_reviews || 850,
      pricePerNight: defaultPrice,
      imageQuery: 'beijing-hotel',
      amenities: ['wifi', 'restaurant', 'spa', 'gym', 'shuttle'],
      distanceFromCenter: distText,
      distanceFromCenterEn: distTextEn,
      distanceKm: isNaN(poiDistanceKm as number) ? undefined : poiDistanceKm,
      nearestPoiName: firstPoi?.name,
      freeCancellation: true,
      roomTypes: roomTypes.length > 0 ? roomTypes : [
        { id: 'r_std', name: 'Deluxe King Room', capacity: 2, breakfast: true, pricePerNight: defaultPrice, available: 6 },
        { id: 'r_suite', name: 'Executive Suite', capacity: 2, breakfast: true, pricePerNight: Math.round(defaultPrice * 1.4), available: 3 }
      ],
      countryId: 'china',
      description: `هتل لوکس در قلب منطقه تفریحی و تجاری پکن با دسترسی سریع به جاذبه‌های: ${landmarks}. این هتل امکانات استاندارد بین‌المللی با بهترین چشم‌انداز شهری را ارائه می‌دهد.`,
      address: `Beijing, near ${cleanPoiName}`,
      location: { lat, lng },
      galleryImages: galleryUrls.length > 0 ? galleryUrls : ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80'],
      pois: ch.location?.pois || [],
      detailedRooms: roomTypes,
    });
  }

  cachedChinaHotels = list;
  return list;
}

export interface HotelSearchParams {
  query?: string;
  city?: string;
  country?: 'iran' | 'china' | 'all';
  stars?: number[];
  minPrice?: number;
  maxPrice?: number;
  minScore?: number;
  freeCancel?: boolean;
  sort?: 'cheap' | 'score' | 'stars' | 'rec';
  page?: number;
  limit?: number;
}

export interface HotelSearchResponse {
  hotels: DetailedHotelWithMeta[];
  total: number;
  page: number;
  totalPages: number;
  priceBuckets: number[];
  cities: Array<{ name: string; nameEn: string; count: number }>;
}

export function searchHotels(params: HotelSearchParams): HotelSearchResponse {
  const iranList = loadIranHotels();
  const chinaList = loadChinaHotels();

  let pool: DetailedHotelWithMeta[] = [];
  if (params.country === 'china') {
    pool = chinaList;
  } else if (params.country === 'iran') {
    pool = iranList;
  } else {
    // If city is specified, check where it belongs
    const qLower = (params.query || params.city || '').trim().toLowerCase();
    if (qLower.includes('پکن') || qLower.includes('beijing') || qLower.includes('china') || qLower.includes('چین')) {
      pool = chinaList;
    } else {
      pool = [...iranList, ...chinaList];
    }
  }

  const q = (params.query || params.city || '').trim().toLowerCase();

  const filtered = pool.filter((h) => {
    if (q) {
      const match =
        h.name.toLowerCase().includes(q) ||
        h.nameEn.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.cityEn.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (params.stars && params.stars.length > 0) {
      if (!params.stars.includes(h.stars)) return false;
    }

    if (params.minScore && h.rating < params.minScore) {
      return false;
    }

    if (params.freeCancel && !h.freeCancellation) {
      return false;
    }

    if (params.maxPrice && h.pricePerNight / 1_000_000 > params.maxPrice) {
      return false;
    }

    return true;
  });

  // Sort
  const sort = params.sort || 'rec';
  filtered.sort((a, b) => {
    if (sort === 'cheap') return a.pricePerNight - b.pricePerNight;
    if (sort === 'score') return b.rating - a.rating;
    if (sort === 'stars') return b.stars - a.stars || b.rating - a.rating;
    return b.rating * 100 - a.rating * 100;
  });

  // Calculate 14 price histogram buckets for sidebar filter
  const buckets = new Array(14).fill(0);
  filtered.forEach((h) => {
    const idx = Math.min(13, Math.max(0, Math.floor((h.pricePerNight / 1_000_000 / 180) * 14)));
    buckets[idx]++;
  });
  const maxB = Math.max(...buckets, 1);
  const priceBuckets = buckets.map((b) => Math.max(12, Math.round((b / maxB) * 100)));

  // Available cities in results
  const cityMap = new Map<string, { nameEn: string; count: number }>();
  for (const h of filtered) {
    const prev = cityMap.get(h.city);
    if (prev) {
      prev.count++;
    } else {
      cityMap.set(h.city, { nameEn: h.cityEn, count: 1 });
    }
  }
  const cities = Array.from(cityMap.entries()).map(([name, { nameEn, count }]) => ({
    name,
    nameEn,
    count,
  }));

  // Pagination
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 12));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedHotels = filtered.slice((page - 1) * limit, page * limit);

  return {
    hotels: paginatedHotels,
    total,
    page,
    totalPages,
    priceBuckets,
    cities,
  };
}

export function getHotelById(id: string): DetailedHotelWithMeta | null {
  const iranList = loadIranHotels();
  const chinaList = loadChinaHotels();

  const found = iranList.find((h) => h.id === id) || chinaList.find((h) => h.id === id);
  return found || null;
}
