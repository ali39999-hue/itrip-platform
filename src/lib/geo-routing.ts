/**
 * Geo-Routing, Haversine Distance & Transit Buffer Calculator.
 * Adapted from Cairn / TrekForge spatial algorithms.
 */

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export const CITY_CENTROIDS: Record<string, GeoCoordinate> = {
  tehran: { lat: 35.6892, lng: 51.389 },
  istanbul: { lat: 41.0082, lng: 28.9784 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  tbilisi: { lat: 41.7151, lng: 44.8271 },
  moscow: { lat: 55.7558, lng: 37.6173 },
  muscat: { lat: 23.588, lng: 58.3829 },
  beijing: { lat: 39.9042, lng: 116.4074 },
  isfahan: { lat: 32.6546, lng: 51.668 },
  shiraz: { lat: 29.5918, lng: 52.5837 },
  kish: { lat: 26.5578, lng: 53.978 },
};

/**
 * Calculates straight-line distance in kilometers using the Haversine formula
 */
export function calculateHaversineDistance(
  coord1: GeoCoordinate,
  coord2: GeoCoordinate
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

export interface TransitBuffer {
  distanceKm: number;
  durationMinutes: number;
  mode: 'walking' | 'metro' | 'driving';
  label: { fa: string; en: string };
  isTightConnection: boolean;
}

/**
 * Computes realistic transit time with metropolitan traffic buffer
 */
export function estimateTransitBuffer(distanceKm: number): TransitBuffer {
  if (distanceKm <= 1.2) {
    const mins = Math.max(10, Math.round(distanceKm * 14));
    return {
      distanceKm,
      durationMinutes: mins,
      mode: 'walking',
      label: {
        fa: `${mins} دقیقه پیاده‌روی (${distanceKm} ک.م)`,
        en: `${mins} min walk (${distanceKm} km)`,
      },
      isTightConnection: false,
    };
  }

  if (distanceKm <= 6) {
    // 20-30 min metro or short cab ride
    const mins = Math.round(15 + distanceKm * 2.5);
    return {
      distanceKm,
      durationMinutes: mins,
      mode: 'metro',
      label: {
        fa: `${mins} دقیقه با مترو / تاکسی (${distanceKm} ک.م)`,
        en: `${mins} min via Metro / Cab (${distanceKm} km)`,
      },
      isTightConnection: false,
    };
  }

  // Over 6 km: traffic buffer
  const mins = Math.round(25 + distanceKm * 2.2);
  const isTight = mins > 50;

  return {
    distanceKm,
    durationMinutes: mins,
    mode: 'driving',
    label: {
      fa: `${mins} دقیقه جابجایی در ترافیک شهری (${distanceKm} ک.م)`,
      en: `${mins} min transit in city traffic (${distanceKm} km)`,
    },
    isTightConnection: isTight,
  };
}
