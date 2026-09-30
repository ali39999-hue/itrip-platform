export type TourCategory =
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

export type HotelTier = 'ECO' | 'STD' | 'LUX';
export type PaymentMode = 'FULL' | 'DEPOSIT';

export interface TourYarQuizAnswers {
  /** Q1: Marital Status -> 'single' | 'married' */
  q1: 'single' | 'married';
  /** Q2: Children under 12 -> 'no_kids' | 'kids' */
  q2: 'no_kids' | 'kids';
  /** Q3: Companion Makeup -> 'solo' | 'friends' | 'family' | 'business' */
  q3: 'solo' | 'friends' | 'family' | 'business';
  /** Q4: Budget Tier -> 'budget_eco' | 'budget_std' | 'budget_lux' */
  q4: 'budget_eco' | 'budget_std' | 'budget_lux';
  /** Q5: Experiences (multi-select up to 3) -> 'nature' | 'cultural' | 'beach' | 'shopping' | 'adventure' | 'wellness' */
  q5: Array<'nature' | 'cultural' | 'beach' | 'shopping' | 'adventure' | 'wellness'>;
  /** Q6: Travel Rhythm -> 'fast_pace' | 'relaxed' */
  q6: 'fast_pace' | 'relaxed';
  /** Q7: Desired Duration -> 'short_trip' (3-5d) | 'medium_trip' (6-8d) | 'long_trip' (9+d) */
  q7: 'short_trip' | 'medium_trip' | 'long_trip';
  /** Q8: Accommodation Preference -> 'hostel' | 'std_hotel' | 'resort' */
  q8: 'hostel' | 'std_hotel' | 'resort';
}

export interface ScoredTour {
  tourId: string;
  matchPercentage: number;
  matchReasons: string[];
}

export interface TourHotelOptionDTO {
  id: string;
  name: string;
  nameEn?: string;
  tier: HotelTier;
  tierLabel: string;
  priceDelta: number;
  rating: number;
  stars: number;
  amenities: string[];
}

export interface TourAddonActivityDTO {
  id: string;
  dayNo: number;
  title: string;
  titleEn?: string;
  durationHours: number;
  price: number;
  currency: string;
}

export interface TourTravelerInput {
  firstNameLatin: string;
  lastNameLatin: string;
  passportNumber: string;
  passportExpiry: string; // YYYY-MM-DD
  birthDate?: string;     // YYYY-MM-DD
  type: 'ADULT' | 'CHILD';
}

export interface CreateTourBookingCommand {
  actorId: string;
  tourId: string;
  departureDateId: string;
  travelersCount: number;
  adultsCount: number;
  childrenCount: number;
  executionModel?: 'group' | 'private';
  hotelTier?: HotelTier;
  roomType?: string;
}

export interface CustomizeTourBookingCommand {
  actorId: string;
  bookingId: string;
  hotelOptionId?: string;
  hotelTier?: HotelTier;
  roomType?: string;
  addonActivityIds: string[];
}

export interface SubmitTourTravelersCommand {
  actorId: string;
  bookingId: string;
  travelers: TourTravelerInput[];
}

export interface PayTourBookingCommand {
  actorId: string;
  bookingId: string;
  paymentMode: PaymentMode;
  paymentMethod: 'wallet_irr' | 'gateway_shetab' | 'gateway_ecardo';
  idempotencyKey: string;
}

export interface PayTourRemainderCommand {
  actorId: string;
  bookingId: string;
  paymentMethod: 'wallet_irr' | 'gateway_shetab' | 'gateway_ecardo';
  idempotencyKey: string;
}
