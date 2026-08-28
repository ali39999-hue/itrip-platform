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

export interface Tour {
  id: string;
  title: string;
  titleEn: string;
  city: string;
  durationDays: number;
  price: number;
  rating: number;
  imageQuery: string;
  includes: string[];
  category: 'cultural' | 'nature' | 'medical' | 'adventure';
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
  step: 'phone' | 'otp' | 'identity' | 'passport_scan' | 'approved';
  phone?: string;
  firstNameFa?: string;
  lastNameFa?: string;
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
