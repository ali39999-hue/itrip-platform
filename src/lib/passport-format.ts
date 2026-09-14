/**
 * Canonical passport-number normalization & validation.
 *
 * Real-world passports (IRI and international) arrive with stray spaces,
 * dashes, lowercase letters or MRZ fillers (`<`) and must not be rejected:
 * IRI format is 1 letter + 8 digits (e.g. A12345678), older series 1 letter
 * + 6-7 digits; many international passports use 2 letters + 6-7 digits or
 * plain 6-9 digit booklets. Anything beyond that stays invalid.
 */
export function normalizePassportNo(raw: string): string {
  return (raw || '')
    .toUpperCase()
    .replace(/[<\s\u200c\-–—.]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

export function isValidPassportNo(raw: string): boolean {
  const p = normalizePassportNo(raw);
  if (p.length < 6 || p.length > 12) return false;
  // 1-2 leading letters + 6-9 digits (IRI + most international booklets),
  // or a plain 6-9 digit booklet, or 6-12 alphanumeric for the rest.
  return /^(?:[A-Z]{1,2}\d{6,9}|\d{6,9}|[A-Z0-9]{6,12})$/.test(p);
}
