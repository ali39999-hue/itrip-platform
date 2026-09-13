import type { Flight } from '@/lib/types';

function parseDurationMinutes(duration: string): number {
  const m = duration.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/);
  if (!m) return 120;
  return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
}

function minutesToHHmm(total: number): string {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * Planner preview flights only carry the outbound leg (THR → destination).
 * The return leg (destination → THR) is derived deterministically from the
 * outbound so round-trip plans show a realistic, stable return option.
 */
export function deriveReturnFlight(outbound: Flight): Flight {
  const [code, numStr] = outbound.flightNo.split('-');
  const nextNo = Number(numStr) + 1;
  const flightNo = Number.isFinite(nextNo) && numStr
    ? `${code}-${String(nextNo).padStart(numStr.length, '0')}`
    : outbound.flightNo;

  const seed = Number(outbound.flightNo.replace(/\D/g, '')) || 7;
  const depMin = 9 * 60 + 30 + (seed % 11) * 15; // 09:30 – 12:00 window
  const arrMin = depMin + parseDurationMinutes(outbound.duration);

  return {
    ...outbound,
    id: `${outbound.id}-rt`,
    flightNo,
    departureTime: minutesToHHmm(depMin),
    arrivalTime: minutesToHHmm(arrMin),
    origin: outbound.destination,
    destination: outbound.origin,
    originCity: outbound.destinationCity,
    destinationCity: outbound.originCity,
  };
}
