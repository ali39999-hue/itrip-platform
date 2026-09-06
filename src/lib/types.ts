export type ServiceType = 'flights' | 'hotels' | 'tours' | 'transfers' | 'trains';

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
}

export interface Hotel {
  id: string;
  name: string;
  nameEn: string;
  city: string;
  cityEn: string;
  stars: number;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  imageQuery: string;
  amenities: string[];
  distanceFromCenter: string;
  distanceFromCenterEn?: string;
  distanceKm?: number;
  nearestPoiName?: string;
  freeCancellation: boolean;
  roomTypes: RoomType[];
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
  price: number;
  childPrice?: number;
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
  price: number;
  childPrice?: number;
  rating: number;
  reviewsCount?: number;
  imageQuery: string;
  heroImage?: string;
  gallery?: string[];
  includes: string[];
  excludes?: string[];
  category: 'cultural' | 'nature' | 'medical' | 'adventure';
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
  to: string;
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
  gender: 'male' | 'female';
}

export interface Booking {
  id: string;
  reference: string;
  type: ServiceType | 'visa' | 'esim' | 'insurance' | 'city-pass' | 'snapp' | 'interpreter' | 'travelogue';
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'refunded';
  title: string;
  subtitle: string;
  amount: number;
  currency: 'IRR' | 'USDT' | 'AED';
  createdAt: string;
  travelDate: string;
  passengers: BookingPassenger[];
  addOns: string[];
  paymentMethod?: 'wallet_irr' | 'wallet_usdt' | 'gateway_shetab' | 'alipay' | 'wechat';
  qrPayload?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'exchange' | 'payment' | 'refund';
  wallet: 'IRR' | 'USDT' | 'AED';
  amount: number;
  resultAmount?: number;
  resultWallet?: 'IRR' | 'USDT' | 'AED';
  description: string;
  createdAt: string;
  status: 'completed' | 'locked' | 'failed';
}

export interface KycProfile {
  step: 'phone' | 'otp' | 'name_info' | 'identity' | 'passport_scan' | 'approved';
  phone?: string;
  firstNameFa?: string;
  lastNameFa?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  nationalId?: string;
  passportNo?: string;
  passportExpiry?: string;
}

export interface InsurancePlan {
  id: string;
  name: string;
  type: 'standard' | 'premium' | 'family';
  subtitle: string;
  price: number;
  priceLabel: string;
  coverageEur: number;
  features: { text: string; included: boolean }[];
}
