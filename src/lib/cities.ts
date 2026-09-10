import { CITIES, type CityOption } from './data';
import { normalizePersianText } from './iranian-commerce';

/**
 * Resolve a free-text city query ('Tehran', 'تهران', 'دبي', 'THR', or a CITIES id).
 * Supports typo-tolerant Persian/Arabic normalization and airport code lookup.
 */
export function resolveCityQuery(q: string | null | undefined): CityOption | undefined {
  if (!q) return undefined;
  const raw = q.trim();
  const needle = raw.toLowerCase();
  const normNeedle = normalizePersianText(raw);

  return CITIES.find(
    (c) =>
      c.id === needle ||
      c.airportCode.toLowerCase() === needle ||
      c.en.toLowerCase() === needle ||
      c.nameEn.toLowerCase() === needle ||
      c.fa === raw ||
      c.nameFa === raw ||
      normalizePersianText(c.fa) === normNeedle ||
      normalizePersianText(c.nameFa) === normNeedle
  );
}

/**
 * Flight labels embed the airport code: 'تهران (THR)'.
 * Render them in the active language for non-Persian locales.
 */
export function localizedAirportLabel(label: string, locale: string): string {
  if (locale === 'fa') return label;
  const match = label.match(/\(([A-Z]{3})\)/);
  const code = match?.[1];
  const city = code ? CITIES.find((c) => c.airportCode === code) : undefined;
  return city ? `${city.nameEn} (${code})` : label;
}
