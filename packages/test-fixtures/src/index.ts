/**
 * @packages/test-fixtures
 *
 * Canonical test fixtures, mock data generators, and synthetic suppliers
 * for Vitest unit tests and Playwright E2E suites.
 */

export const MOCK_TEST_USER = {
  id: 'usr_test_fixture_01',
  name: 'Sara Radmanesh',
  email: 'sara.rad@example.com',
  phone: '+989123456789',
  role: 'CUSTOMER',
};

export const MOCK_FLIGHT_OFFER = {
  id: 'flt_thr_mhd_101',
  flightNumber: 'IR-452',
  airline: 'IranAir',
  origin: 'THR',
  destination: 'MHD',
  departureTime: '08:00',
  arrivalTime: '09:25',
  basePrice: 4_500_000,
  currency: 'IRR',
  availableSeats: 9,
};

export const MOCK_HOTEL_ROOM = {
  id: 'htl_espinas_deluxe',
  hotelName: 'Espinas Palace Tehran',
  roomType: 'Deluxe Suite with City View',
  city: 'Tehran',
  nightlyRate: 15_000_000,
  currency: 'IRR',
  availableRooms: 4,
};

export function generateIdempotencyKey(prefix: string = 'test'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
