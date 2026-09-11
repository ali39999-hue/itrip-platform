import path from 'path';
import fs from 'fs';
import type { Flight } from '@/lib/types';
import { resolveCityQuery } from '@/lib/cities';

export interface RawFlightRoute {
  origin: string;
  destination: string;
  origin_city_id?: number;
  destination_city_id?: number;
  flights: RawFlightItem[];
}

export interface RawFlightItem {
  flight_key: string;
  departure_time: string;
  arrival_time: string;
  origin_iata: string;
  origin_name: string;
  destination_iata: string;
  destination_name: string;
  price: {
    adult_sell_price: number;
    child_sell_price?: number;
    infant_sell_price?: number;
  };
  capacity: number;
  baggage: number;
  routes?: Array<{
    flight_number: string;
    flight_class: string;
    flight_type: string;
    airplane: string;
    airline: {
      name: string;
      latin_name: string;
      iata: string;
      logo?: string;
    };
  }>;
  is_foreign: boolean;
}

export interface FlightMasterFile {
  airports: Array<{
    id: number;
    name_fa: string;
    city_name: string;
    latin_name: string;
    iata: string;
  }>;
  airlines: Array<{
    iata: string;
    name_en: string;
    name_fa: string;
    logo: string;
  }>;
  routes: RawFlightRoute[];
}

// In-memory cached dataset
let cachedFlights: Flight[] | null = null;
let cachedAirports: FlightMasterFile['airports'] | null = null;
let cachedAirlines: FlightMasterFile['airlines'] | null = null;

function calculateDuration(depTime: string, arrTime: string): string {
  try {
    const d = new Date(depTime).getTime();
    const a = new Date(arrTime).getTime();
    if (isNaN(d) || isNaN(a)) return '1h 30m';
    let diffMinutes = Math.round((a - d) / 60000);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Next day arrival
    if (diffMinutes <= 0) diffMinutes = 90;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  } catch {
    return '1h 30m';
  }
}

function loadFlightsData(): { flights: Flight[]; airports: FlightMasterFile['airports']; airlines: FlightMasterFile['airlines'] } {
  if (cachedFlights && cachedAirports && cachedAirlines) {
    return { flights: cachedFlights, airports: cachedAirports, airlines: cachedAirlines };
  }

  const filePath = path.join(process.cwd(), 'src/data/server/flights-master.json');
  if (!fs.existsSync(filePath)) {
    console.error('Flights data file not found at:', filePath);
    return { flights: [], airports: [], airlines: [] };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed: FlightMasterFile = JSON.parse(raw);

  cachedAirports = parsed.airports || [];
  cachedAirlines = parsed.airlines || [];

  const airportMap = new Map<string, { nameFa: string; cityName: string; latinName: string }>();
  for (const a of cachedAirports) {
    airportMap.set(a.iata, { nameFa: a.name_fa, cityName: a.city_name, latinName: a.latin_name });
  }

  const normalizedFlights: Flight[] = [];
  let index = 1;

  for (const route of parsed.routes || []) {
    for (const f of route.flights || []) {
      const originInfo = airportMap.get(f.origin_iata);
      const destInfo = airportMap.get(f.destination_iata);

      const originCityFa = originInfo?.cityName || route.origin || f.origin_name;
      const destCityFa = destInfo?.cityName || route.destination || f.destination_name;

      const subRoute = f.routes?.[0];
      const airlineFa = subRoute?.airline?.name || 'هواپیمایی کیش ایر';
      const airlineEn = subRoute?.airline?.latin_name || 'Kish Air';
      const flightNumber = subRoute?.flight_number ? `${subRoute.airline?.iata || 'FL'}-${subRoute.flight_number}` : `IR-${f.flight_key.slice(-3)}`;

      // Time strings (HH:mm)
      const depTimeOnly = f.departure_time.includes(' ') ? f.departure_time.split(' ')[1].slice(0, 5) : f.departure_time.slice(11, 16);
      const arrTimeOnly = f.arrival_time.includes(' ') ? f.arrival_time.split(' ')[1].slice(0, 5) : f.arrival_time.slice(11, 16);

      const duration = calculateDuration(f.departure_time, f.arrival_time);
      const price = f.price?.adult_sell_price || 35_000_000;

      normalizedFlights.push({
        id: `fl_${f.flight_key}_${index++}`,
        airline: airlineFa,
        airlineEn: airlineEn,
        flightNo: flightNumber,
        departureTime: depTimeOnly,
        arrivalTime: arrTimeOnly,
        origin: `${originCityFa} (${f.origin_iata})`,
        destination: `${destCityFa} (${f.destination_iata})`,
        originCity: originCityFa,
        destinationCity: destCityFa,
        duration: duration,
        price: price, // in IRR (compatible with format.ts num(price, locale) and toman conversions)
        seatsLeft: f.capacity || 9,
        baggage: `${f.baggage || 20}kg`,
        cabinClass: subRoute?.flight_class?.toLowerCase().includes('business') ? 'business' : 'economy',
        stops: (f.routes?.length || 1) > 1 ? (f.routes!.length - 1) : 0,
        ticketType: (subRoute?.flight_type?.toLowerCase().includes('charter') || index % 3 === 0) ? 'charter' : 'systemic',
        aircraft: subRoute?.airplane || 'Airbus A320',
        refundable: !subRoute?.flight_type?.toLowerCase().includes('charter'),
      });
    }
  }

  cachedFlights = normalizedFlights;
  return { flights: cachedFlights, airports: cachedAirports, airlines: cachedAirlines };
}

/**
 * Resolves the authoritative sell price for a normalized flight id (`fl_*`).
 * The booking flow must price flights from the same live catalog the search
 * serves — not only the static seed list. Returns null when unknown so the
 * pricing engine can fail closed.
 */
export function getFlightPriceById(id: string): number | null {
  const { flights } = loadFlightsData();
  const flight = flights.find((f) => f.id === id);
  return flight ? flight.price : null;
}

export interface FlightSearchParams {
  country?: string;
  from?: string;
  to?: string;
  departDate?: string;
  airlines?: string[];
  stops?: number[];
  minPrice?: number;
  maxPrice?: number;
  ticketType?: 'charter' | 'systemic' | 'all';
  cabinClass?: 'economy' | 'business' | 'all';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'all';
  sort?: 'price' | 'fast' | 'time' | 'suggested';
  page?: number;
  limit?: number;
}

export interface FlightSearchResponse {
  flights: Flight[];
  total: number;
  page: number;
  totalPages: number;
  priceBounds: { min: number; max: number };
  airlineFacets: Array<{ name: string; minPrice: number }>;
  stopCounts: [number, number, number];
  ticketTypeCounts: { systemic: number; charter: number };
  cabinClassCounts: { economy: number; business: number };
  timeCounts: { morning: number; afternoon: number; evening: number; night: number };
}

export function searchFlights(params: FlightSearchParams): FlightSearchResponse {
  const { flights } = loadFlightsData();

  const fromLower = params.from?.trim().toLowerCase() || '';
  const toLower = params.to?.trim().toLowerCase() || '';

  const resolvedFrom = resolveCityQuery(params.from);
  const resolvedTo = resolveCityQuery(params.to);

  const fromNeedles = [
    fromLower,
    resolvedFrom?.fa?.toLowerCase(),
    resolvedFrom?.en?.toLowerCase(),
    resolvedFrom?.airportCode?.toLowerCase(),
  ].filter((s): s is string => Boolean(s));

  const toNeedles = [
    toLower,
    resolvedTo?.fa?.toLowerCase(),
    resolvedTo?.en?.toLowerCase(),
    resolvedTo?.airportCode?.toLowerCase(),
  ].filter((s): s is string => Boolean(s));

  // Country-aware pool scoping: if country parameter is passed and no destination specified
  const reqCountry = params.country?.toLowerCase();
  let scopedFlights = flights;
  if (reqCountry && !params.to) {
    if (reqCountry === 'iran') {
      const domestic = flights.filter((f) => ['مشهد', 'کیش', 'شیراز', 'اصفهان', 'تبریز'].some((c) => f.destinationCity.includes(c)));
      if (domestic.length > 0) scopedFlights = domestic;
    } else {
      const matchPattern =
        reqCountry === 'turkey' ? /استانبول|istanbul|آنتالیا|antalya|ازمیر|izmir|ist|ayt/i :
        reqCountry === 'uae' ? /دبی|dubai|ابوظبی|dxb|auh/i :
        reqCountry === 'georgia' ? /تفلیس|tbilisi|باتومی|batumi|tbs|bus/i :
        reqCountry === 'oman' ? /مسقط|muscat|صلاله|mct|sll/i :
        reqCountry === 'russia' ? /مسکو|moscow|svo|led/i :
        reqCountry === 'china' ? /پکن|beijing|pek|pvg/i : null;
      if (matchPattern) {
        const countryFlights = flights.filter((f) => matchPattern.test(`${f.destination} ${f.destinationCity}`));
        if (countryFlights.length > 0) scopedFlights = countryFlights;
      }
    }
  }

  // 1. Initial route pool filter
  const routePool = scopedFlights.filter((f) => {
    if (fromNeedles.length > 0) {
      const matchOrigin = fromNeedles.some(
        (n) => f.originCity.toLowerCase().includes(n) || f.origin.toLowerCase().includes(n)
      );
      if (!matchOrigin) return false;
    }
    if (toNeedles.length > 0) {
      const matchDest = toNeedles.some(
        (n) => f.destinationCity.toLowerCase().includes(n) || f.destination.toLowerCase().includes(n)
      );
      if (!matchDest) return false;
    }
    return true;
  });

  // Strict route filtering: if user queried a specific from/to, honor it without falling back to entire catalog
  const isFilteredSearch = fromNeedles.length > 0 || toNeedles.length > 0 || Boolean(reqCountry);
  const basePool = isFilteredSearch ? routePool : flights;

  // Calculate facets from route pool
  let minP = Infinity;
  let maxP = -Infinity;
  const airlineMinMap = new Map<string, number>();
  const stopCounts: [number, number, number] = [0, 0, 0];
  const ticketTypeCounts = { systemic: 0, charter: 0 };
  const cabinClassCounts = { economy: 0, business: 0 };
  const timeCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  for (const f of basePool) {
    if (f.price < minP) minP = f.price;
    if (f.price > maxP) maxP = f.price;

    const curr = airlineMinMap.get(f.airline) ?? Infinity;
    if (f.price < curr) airlineMinMap.set(f.airline, f.price);

    const sIdx = Math.min(f.stops, 2);
    stopCounts[sIdx]++;

    if (f.ticketType === 'charter') {
      ticketTypeCounts.charter++;
    } else {
      ticketTypeCounts.systemic++;
    }

    if (f.cabinClass === 'business') {
      cabinClassCounts.business++;
    } else {
      cabinClassCounts.economy++;
    }

    const hour = parseInt(f.departureTime.slice(0, 2), 10);
    if (!isNaN(hour)) {
      if (hour >= 6 && hour < 12) timeCounts.morning++;
      else if (hour >= 12 && hour < 18) timeCounts.afternoon++;
      else if (hour >= 18 && hour < 24) timeCounts.evening++;
      else timeCounts.night++;
    } else {
      timeCounts.morning++;
    }
  }

  if (minP === Infinity) {
    minP = 20_000_000;
    maxP = 150_000_000;
  }

  const airlineFacets = Array.from(airlineMinMap.entries()).map(([name, minPrice]) => ({
    name,
    minPrice,
  }));

  // 2. Facet filters (stops, airlines, price range, ticketType, cabinClass, timeOfDay)
  const filtered = basePool.filter((f) => {
    if (params.stops && params.stops.length > 0) {
      if (!params.stops.includes(Math.min(f.stops, 2))) return false;
    }
    if (params.airlines && params.airlines.length > 0) {
      if (!params.airlines.includes(f.airline)) return false;
    }
    if (params.minPrice !== undefined && f.price < params.minPrice) return false;
    if (params.maxPrice !== undefined && f.price > params.maxPrice) return false;
    if (params.ticketType && params.ticketType !== 'all') {
      if (f.ticketType !== params.ticketType) return false;
    }
    if (params.cabinClass && params.cabinClass !== 'all') {
      if (f.cabinClass !== params.cabinClass) return false;
    }
    if (params.timeOfDay && params.timeOfDay !== 'all') {
      const hour = parseInt(f.departureTime.slice(0, 2), 10);
      if (!isNaN(hour)) {
        if (params.timeOfDay === 'morning' && !(hour >= 6 && hour < 12)) return false;
        if (params.timeOfDay === 'afternoon' && !(hour >= 12 && hour < 18)) return false;
        if (params.timeOfDay === 'evening' && !(hour >= 18 && hour < 24)) return false;
        if (params.timeOfDay === 'night' && !(hour >= 0 && hour < 6)) return false;
      }
    }
    return true;
  });

  // 3. Sort
  function durationMinutes(d: string): number {
    const match = /(\d+)h\s*(\d*)m?/.exec(d);
    if (!match) return 90;
    const hours = parseInt(match[1] || '0', 10);
    const mins = parseInt(match[2] || '0', 10);
    return hours * 60 + mins;
  }

  const sort = params.sort || 'price';
  filtered.sort((a, b) => {
    if (sort === 'price') return a.price - b.price;
    if (sort === 'fast') return durationMinutes(a.duration) - durationMinutes(b.duration);
    if (sort === 'time') return a.departureTime.localeCompare(b.departureTime);
    // suggested: balanced ratio
    return a.price / durationMinutes(a.duration) - b.price / durationMinutes(b.duration);
  });

  // 4. Pagination
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedFlights = filtered.slice(startIndex, startIndex + limit);

  return {
    flights: paginatedFlights,
    total,
    page,
    totalPages,
    priceBounds: { min: minP, max: maxP },
    airlineFacets,
    stopCounts,
    ticketTypeCounts,
    cabinClassCounts,
    timeCounts,
  };
}
