import { CITIES, type CityOption } from './data';

/** Resolve a free-text city query ('Tehran', 'تهران', or a CITIES id). */
export function resolveCityQuery(q: string | null | undefined): CityOption | undefined {
  if (!q) return undefined;
  const needle = q.trim().toLowerCase();
  return CITIES.find(
    (c) => c.id === needle || c.en.toLowerCase() === needle || c.fa === q.trim()
  );
}

/**
 * Flight labels embed the airport code: 'تهران (THR)'.
 * Render them in the active language for non-Persian locales.
 */
export function localizedAirportLabel(label: string, locale: string): string {
  if (locale === 'fa') return label;
  const code = /\(([A-Z]{3})\)/.exec(label)?.[1];
  const city = code ? CITIES.find((c) => c.airportCode === code) : undefined;
  return city ? `${city.nameEn} (${code})` : label;
}
