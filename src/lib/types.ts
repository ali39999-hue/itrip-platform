import type { CountryId } from '@/lib/countries';

export type ServiceType = 'flights' | 'hotels' | 'tours' | 'transfers' | 'trains' | 'cip';

export interface Flight {
  id: string;
  airline: string;
  airlineEn: string;
  flightNo: string;
  departureTime: string;
  arrivalTime: string;
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  duration: string;
  price: number;
  seatsLeft: number;
  baggage: string;
  cabinClass: 'economy' | 'business';
  stops: number;
  ticketType?: 'charter' | 'systemic';
  aircraft?: string;
  refundable?: boolean;
}

export type HotelPropertyType = 'hotel' | 'apartment' | 'boutique' | 'villa';

export interface Hotel {
  id: string;
  countryId?: CountryId;
  name: string;
  nameEn: string;
  city: string;
  cityEn: string;
  stars: number;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  imageQuery: string;
  heroImage?: string;
  galleryImages?: string[];
  address?: string;
  description?: string;
  amenities: string[];
  distanceFromCenter: string;
  distanceFromCenterEn?: string;
  distanceKm?: number;
  nearestPoiName?: string;
  freeCancellation: boolean;
  roomTypes: RoomType[];
  propertyType?: HotelPropertyType;
  /**
   * Inventory provenance (transparency — never show live and catalog
   * results indistinguishably). Live supplier mappings set `'live'`;
   * static catalog entries leave it undefined (treated as catalog).
   */
  source?: 'live' | 'catalog';
}

export interface RoomType {
  id: string;
  name: string;
  capacity: number;
  breakfast: boolean;
  pricePerNight: number;
  available: number;
}

export interface TourItineraryDay {
  day: number;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  activities: string[];
  activitiesEn?: string[];
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  accommodation?: string;
  accommodationEn?: string;
  image?: string;
}

export interface TourDepartureDate {
  id: string;
  startDate: string;
  endDate: string;
  currency?: string;
  price: number;
  childPrice?: number | null;
  availableSeats: number;
  guaranteed: boolean;
}

export interface TourReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  commentEn?: string;
  travelType?: string;
}

export interface Tour {
  id: string;
  title: string;
  titleEn: string;
  city: string;
  cityEn?: string;
  country?: string;
  countryEn?: string;
  durationDays: number;
  durationNights?: number;
  currency?: string;
  price: number;
  childPrice?: number | null;
  originalPrice?: number | null;
  discountPercent?: number | null;
  rating: number;
  reviewsCount?: number;
  imageQuery: string;
  heroImage?: string;
  gallery?: string[];
  includes: string[];
  excludes?: string[];
  category:
    | 'cultural'
    | 'nature'
    | 'medical'
    | 'adventure'
    | 'signature'
    | 'pilgrimage'
    | 'desert'
    | 'coastal'
    | 'luxury'
    | 'family';
  summary?: string;
  summaryEn?: string;
  description?: string;
  descriptionEn?: string;
  highlights?: string[];
  highlightsEn?: string[];
  hotelName?: string;
  hotelStars?: number;
  transportType?: string;
  transportTypeEn?: string;
  groupSize?: string;
  groupSizeEn?: string;
  departureDates?: TourDepartureDate[];
  itinerary?: TourItineraryDay[];
  reviews?: TourReview[];
  guideLanguages?: string[];
  cancellationPolicy?: {
    freeUntilDays: number;
    description: string;
    descriptionEn?: string;
  };
}

export interface TransferOption {
  id: string;
  vehicleType: string;
  vehicleTypeEn: string;
  from: string;
  fromEn?: string;
  to: string;
  toEn?: string;
  price: number;
  capacity: number;
  luggage: number;
  durationMinutes: number;
}

export interface ServiceItem {
  id: string;
  slug: string;
  icon: string;
  href: string;
}

export interface BookingPassenger {
  firstNameFa: string;
  lastNameFa: string;
  firstNameEn: string;
  lastNameEn: string;
  passportNo: string;
  nationalId?: string;
  birthDate: string;
  /** Matches the canonical zod Gender and Prisma `gender String?` values. */
  gender: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface Booking {
  id: string;
  reference: string;
  type: ServiceType | 'visa' | 'esim' | 'insurance' | 'city-pass' | 'snapp' | 'interpreter' | 'travelogue';
  status:
    | 'DRAFT'
    | 'HELD'
    | 'PENDING_PAYMENT'
    | 'PAYMENT_CONFIRMED'
    | 'CONFIRMED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'REFUNDED'
    | 'EXPIRED'
    | 'FAILED'
    | 'pending_payment'
    | 'confirmed'
    | 'cancelled'
    | 'refunded';
  title: string;
  subtitle: string;
  amount: number;
  currency: 'IRR' | 'TOMAN' | 'USDT' | 'AED';
  createdAt: string;
  travelDate: string;
  passengers: BookingPassenger[];
  addOns: string[];
  paymentMethod?: 'wallet_irr' | 'wallet_usdt' | 'gateway_shetab' | 'alipay' | 'wechat';
  qrPayload?: string;
}

export interface KycProfile {
  // KYC wizard steps (name_info/identity/passport_scan) were removed when
  // enforcement moved to the checkout funnel — login only walks phone → otp.
  step: 'phone' | 'otp' | 'approved';
  phone?: string;
  firstNameFa?: string;
  lastNameFa?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  nationalId?: string;
  passportNo?: string;
  passportExpiry?: string;
}

export type TravelInsuranceZone =
  | 'ZONE_TURKEY_NEIGHBORS'
  | 'ZONE_GULF_MIDDLE_EAST'
  | 'ZONE_SCHENGEN_EUROPE'
  | 'ZONE_WORLD_EXCL_US_CA'
  | 'ZONE_WORLD_ALL';

export type InsuranceAgeBracket = '0-12' | '13-65' | '66-70' | '71-75' | '76-80' | '81+';

export type InsuranceCoverageLimitEur = 10000 | 30000 | 50000;

export interface InsuranceCompanyInfo {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string;
  logo: string;
  solvencyLevel: 1 | 2;
  rating: number;
  reviewsCount: number;
  instantIssuance: boolean;
  schengenApproved: boolean;
}

export interface AssistancePartnerInfo {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string;
  logo: string;
  country: string;
  supportPhone24h: string;
  farsiSupport: boolean;
  directHospitalSettlement: boolean;
}

export interface InsurancePlan {
  id: string;
  name: string;
  nameEn?: string;
  type: 'standard' | 'premium' | 'family';
  subtitle: string;
  subtitleEn?: string;
  price: number;
  priceLabel: string;
  coverageEur: number;
  features: { text: string; textEn?: string; included: boolean }[];
  company?: InsuranceCompanyInfo;
  assistance?: AssistancePartnerInfo;
  zone?: TravelInsuranceZone;
  schengenCompliant?: boolean;
  instantIssuance?: boolean;
  topPerksFa?: string[];
  topPerksEn?: string[];
}

export interface CipAirportOption {
  id: string;
  airportCode: string; // e.g. IKA, MHD, SYZ, TBZ, KIH, DXB
  airportNameFa: string;
  airportNameEn: string;
  cityFa: string;
  cityEn: string;
  countryCode: string;
  terminal: string;
  basePriceAdult: number; // in Toman
  basePriceGuest: number; // Accompanying guest / مشایعت‌کننده
  petServicePrice: number;
  wheelchairPrice: number;
  suite6hPrice: number;
  suite10hPrice: number;
  suiteOvernightPrice: number;
  descriptionFa: string;
  descriptionEn: string;
  featuresFa: string[];
  featuresEn: string[];
  image: string;
  gallery?: string[];
  rating: number;
  reviewsCount: number;
  isFlagship?: boolean;
}

export interface CipVehicleOption {
  id: string;
  nameFa: string;
  nameEn: string;
  category: 'sedan_economy' | 'sedan_luxury' | 'suv' | 'suv_luxury' | 'van' | 'vip';
  capacity: number;
  luggageCapacity: number;
  priceTehran: number; // in Toman
  priceSuburbs: number; // in Toman
  image: string;
}

