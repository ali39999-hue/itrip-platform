/**
 * Parto Portal Provider — authenticated portal scraping (fallback when the
 * official API is not granted; docs/PARTO_LIVE_INTEGRATION_PLAN.fa.md §7).
 *
 * Flow (reverse-engineered from live capture + portal bundles, 2026-09-08/12):
 *  1. Session: the human logs into www.partocrs.ir once (the login is protected
 *     by a math captcha — an intentional anti-automation control we do NOT
 *     bypass). The session cookie is captured by scripts/parto-portal-capture.mjs
 *     into PARTO_PORTAL_COOKIE (or a Playwright storageState file).
 *  2. GET  {base}/Flight/Search            → results page form carrying the
 *     __RequestVerificationToken anti-forgery token (302 to /Authenticate when
 *     the session has expired).
 *  3. POST {base}/Flight/Search/Search     → form-urlencoded search; the
 *     response renders the itineraries server-side into div.Results blocks
 *     (price_value / btnbook data-url / baggage-data markup from parto_page.js).
 *  4. parseResultsHtml() extracts tolerant offer rows; the raw HTML is kept for
 *     audit + parser calibration.
 *
 * All datetimes/labels are best-effort: charter badge via «چارتر», times as the
 * first two HH:mm tokens per block, prices via the price_value element with the
 * configured unit (PARTO_PORTAL_PRICE_UNIT, default toman → ×10 → IRR).
 */

import { readFileSync } from 'fs';
import { join, resolve, sep, isAbsolute } from 'path';

export const PARTO_PORTAL_SUPPLIER_CODE = 'PARTO_PORTAL';

export class PartoPortalSessionExpiredError extends Error {
  constructor() {
    super('PARTO_PORTAL_SESSION_EXPIRED: portal session cookie invalid — re-run parto-portal-capture login');
    this.name = 'PartoPortalSessionExpiredError';
  }
}

export interface PortalOfferRow {
  fareReference: string; // booking data-url fragment (stable per result block)
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  departureTime: Date; // UTC-shifted Tehran wall-clock
  arrivalTime: Date;
  durationMinutes: number | null;
  seatsRemaining: number;
  baseFare: number;
  totalFare: number;
  totalTax: number;
  currency: string;
  baggage: string | null;
  isCharter: boolean;
  refundable: boolean;
  cabinClass: 'ECONOMY' | 'BUSINESS';
  stops: number;
}

export interface PortalSearchOutcome {
  offers: PortalOfferRow[];
  rawHtml: string;
}

const DEFAULT_BASE_URL = 'https://www.partocrs.ir';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';

/** Directory roots a storageState file may live in (cwd tree + explicit override). */
function allowedStateRoots(): string[] {
  const roots = [resolve(/*turbopackIgnore: true*/ process.cwd())];
  const override = process.env.PARTO_PORTAL_STATE_DIR;
  if (override && isAbsolute(override)) roots.push(resolve(/*turbopackIgnore: true*/ override));
  return roots.map((r) => r + sep);
}

function stateFilePath(): string | null {
  const configured = process.env.PARTO_PORTAL_STATE_FILE || join(process.cwd(), '.parto-portal-state.json');
  const normalized = resolve(/*turbopackIgnore: true*/ configured);
  // Path-safety: reject traversal outside the allowed roots.
  const allowed = allowedStateRoots().some((root) => normalized.startsWith(root));
  if (!allowed) return null;
  return normalized;
}

function allowedPortalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'www.partocrs.ir' || h === 'partocrs.ir';
}

/** Stable per-offer id from the booking reference found in the results markup. */
export function portalOfferIdFromReference(reference: string): string {
  return `off_${PARTO_PORTAL_SUPPLIER_CODE}_${Buffer.from(reference, 'utf8').toString('base64url')}`;
}

export class PartoPortalProvider {
  private readonly baseUrl: string;
  private readonly cookie: string;

  constructor(options?: { cookie?: string; baseUrl?: string }) {
    this.baseUrl = (options?.baseUrl || process.env.PARTO_PORTAL_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.cookie = options?.cookie || PartoPortalProvider.cookieFromEnvOrStateFile() || '';

    const parsed = new URL(this.baseUrl);
    if (parsed.protocol !== 'https:' || !allowedPortalHost(parsed.hostname)) {
      throw new Error(`FAIL_CLOSED: Parto portal base URL host is not allowed: ${parsed.hostname}`);
    }
    if (process.env.NODE_ENV === 'production' && !this.cookie) {
      throw new Error('FAIL_CLOSED: Parto portal session cookie missing in production environment');
    }
  }

  static isConfigured(): boolean {
    return Boolean(process.env.PARTO_PORTAL_COOKIE || PartoPortalProvider.cookieFromStateFile());
  }

  /** Raw Cookie header from env, else from the Playwright storageState file. */
  static cookieFromEnvOrStateFile(): string | null {
    const direct = process.env.PARTO_PORTAL_COOKIE;
    if (direct) return direct;
    return PartoPortalProvider.cookieFromStateFile();
  }

  static cookieFromStateFile(): string | null {
    const stateFile = stateFilePath();
    if (!stateFile) return null;
    try {
      const state = JSON.parse(readFileSync(/*turbopackIgnore: true*/ stateFile, 'utf8'));
      const parts: string[] = [];
      for (const cookie of state.cookies ?? []) {
        if (!cookie?.name || cookie.value === undefined) continue;
        parts.push(`${cookie.name}=${cookie.value}`);
      }
      return parts.length > 0 ? parts.join('; ') : null;
    } catch {
      return null;
    }
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      'User-Agent': UA,
      'Cookie': this.cookie,
      'Accept-Language': 'fa,en;q=0.8',
      ...extra,
    };
  }

  /**
   * One one-way search. Fetches the form page for a fresh anti-forgery token,
   * then posts the search form and parses the server-rendered results.
   */
  async searchOneWay(params: {
    origin: string;
    destination: string;
    departureDate: string; // YYYY-MM-DD
  }): Promise<PortalSearchOutcome> {
    const formUrl = `${this.baseUrl}/Flight/Search`;
    const formRes = await fetch(formUrl, {
      method: 'GET',
      headers: this.headers({ 'Referer': `${this.baseUrl}/Dashboard/Home` }),
      redirect: 'manual',
    });

    if (formRes.status === 302 || formRes.status === 401) {
      throw new PartoPortalSessionExpiredError();
    }
    if (!formRes.ok) {
      throw new Error(`PARTO_PORTAL_HTTP_${formRes.status}: form page fetch failed`);
    }

    const setCookies = this.collectSetCookies(formRes);
    const formHtml = await formRes.text();
    if (!formHtml.includes('/Authenticate/Signout') && formHtml.toLowerCase().includes('/authenticate')) {
      // Some deployments answer 200 with the login view when the cookie is dead.
      throw new PartoPortalSessionExpiredError();
    }

    const token = this.extractVerificationToken(formHtml);
    if (!token) {
      throw new Error('PARTO_PORTAL_PARSE: __RequestVerificationToken not found on search form page');
    }

    const orgCode = params.origin.includes(',') ? params.origin.toUpperCase() : `${params.origin.toUpperCase()},1`;
    const dstCode = params.destination.includes(',') ? params.destination.toUpperCase() : `${params.destination.toUpperCase()},1`;

    const body = new URLSearchParams({
      'OriginLocationCode': orgCode,
      'DestinationLocationCode': dstCode,
      'DepartureDateTime': params.departureDate,
      'DepartureDateTimeR': '',
      'AdultCount': '1',
      'ChildCount': '0',
      'InfantCount': '0',
      'CabinType': '1',
      'VendorPreferenceCodes': '',
      'VendorExcludeCodes': '',
      'FlightType': 'OneWay',
      '__RequestVerificationToken': token,
      'DirectFlight': 'false',
    });

    const searchRes = await fetch(`${this.baseUrl}/Flight/Search/Search`, {
      method: 'POST',
      headers: this.headers({
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': formUrl,
        'Origin': this.baseUrl,
        ...(setCookies.length > 0 ? { 'Cookie': [this.cookie, ...setCookies].join('; ') } : {}),
      }),
      body: body.toString(),
      redirect: 'manual',
    });

    if (searchRes.status === 401) {
      throw new PartoPortalSessionExpiredError();
    }
    if (!searchRes.ok && searchRes.status !== 302) {
      throw new Error(`PARTO_PORTAL_HTTP_${searchRes.status}: search post failed`);
    }

    let searchId: string | null = null;
    let searchHtml = '';
    if (searchRes.status === 302) {
      const loc = searchRes.headers.get('location') || '';
      const m = loc.match(/SearchResult\/(\d+)/);
      if (m) searchId = m[1];
    } else if (searchRes.status === 200) {
      searchHtml = await searchRes.text();
      const rqMatch = searchHtml.match(/name="rq"[^>]*value="([^"]+)"/);
      const rvMatch = searchHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
      if (rqMatch) {
        const processForm = new URLSearchParams({
          rq: rqMatch[1],
          __RequestVerificationToken: rvMatch ? rvMatch[1] : token,
        });
        const processRes = await fetch(`${this.baseUrl}/Flight/Search/SearchProcess`, {
          method: 'POST',
          headers: this.headers({
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Referer': `${this.baseUrl}/Flight/Search/Search`,
            'Origin': this.baseUrl,
            ...(setCookies.length > 0 ? { 'Cookie': [this.cookie, ...setCookies].join('; ') } : {}),
          }),
          body: processForm.toString(),
          redirect: 'manual',
        });
        if (processRes.status === 302) {
          const loc = processRes.headers.get('location') || '';
          const m = loc.match(/SearchResult\/(\d+)/);
          if (m) searchId = m[1];
        }
      }
    }

    // Step 4: If searchId extracted, fetch clean structured JSON from SearchResultData
    if (searchId) {
      const dataRes = await fetch(`${this.baseUrl}/Flight/Search/SearchResultData/${searchId}`, {
        method: 'GET',
        headers: this.headers({
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/Flight/Search/SearchResult/${searchId}`,
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          ...(setCookies.length > 0 ? { 'Cookie': [this.cookie, ...setCookies].join('; ') } : {}),
        }),
      });

      if (dataRes.ok) {
        try {
          const jsonData = (await dataRes.json()) as Record<string, unknown>;
          const jsonOffers = parseSearchResultDataJson(jsonData);
          if (jsonOffers.length > 0) {
            return { offers: jsonOffers, rawHtml: JSON.stringify(jsonData).slice(0, 1000) };
          }
        } catch {
          // fall through to HTML parser fallback
        }
      }
    }

    const resultsHtml = searchHtml || '';
    const offers = parseResultsHtml(resultsHtml);
    return { offers, rawHtml: resultsHtml };
  }

  private collectSetCookies(res: Response): string[] {
    const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    return raw.map((c) => c.split(';')[0]).filter(Boolean);
  }

  private extractVerificationToken(html: string): string | null {
    const patterns = [
      /name="__RequestVerificationToken"[^>]*value="([^"]+)"/,
      /value="([^"]+)"[^>]*name="__RequestVerificationToken"/,
    ];
    for (const pattern of patterns) {
      const m = html.match(pattern);
      if (m?.[1]) return m[1];
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Results JSON parser (direct structured extraction from /SearchResultData/{id})
// ---------------------------------------------------------------------------

export function parseSearchResultDataJson(data: Record<string, unknown>): PortalOfferRow[] {
  const itineraries = (data?.['PricedItineraries'] || []) as Array<Record<string, unknown>>;
  const airlinesMap = new Map<string, string>();
  const viewData = (data?.['ViewData'] || {}) as Record<string, unknown>;
  const validatingAirlines = (viewData['ValidatingAirlines'] || []) as Array<Record<string, unknown>>;
  for (const a of validatingAirlines) {
    if (a?.['Iata'] && a?.['NameFa']) {
      airlinesMap.set(String(a['Iata']).toUpperCase(), String(a['NameFa']));
    }
  }

  const rows: PortalOfferRow[] = [];
  for (const item of itineraries) {
    const segments = (item['FlightSegments'] || []) as Array<Record<string, unknown>>;
    const firstSeg = segments[0];
    if (!firstSeg) continue;

    const airlineCode = String(firstSeg['MarketingAirline'] || item['ValidatingAirlineCode'] || 'XX').toUpperCase();
    const airlineName = airlinesMap.get(airlineCode) || String(firstSeg['OperatingAirline'] || airlineCode);
    const rawNum = firstSeg['FlightNumber'] ? String(firstSeg['FlightNumber']).trim() : '';
    const flightNumber = rawNum.includes('-') ? rawNum : `${airlineCode}-${rawNum || '000'}`;

    const depIso = String(firstSeg['DepartureDateTime'] || '');
    const arrIso = String(firstSeg['ArrivalDateTime'] || '');
    if (!depIso || !arrIso) continue;

    const departureTime = new Date(`${depIso.slice(0, 19)}Z`);
    const arrivalTime = new Date(`${arrIso.slice(0, 19)}Z`);

    let durationMinutes: number | null = null;
    if (firstSeg['Duration'] && typeof firstSeg['Duration'] === 'string') {
      const parts = firstSeg['Duration'].split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        durationMinutes = parts[0] * 60 + parts[1];
      }
    }
    if (!durationMinutes) {
      durationMinutes = Math.max(30, Math.round((arrivalTime.getTime() - departureTime.getTime()) / 60000));
    }

    const dataAttr = (item['DataAttribute'] || {}) as Record<string, unknown>;
    const perAdult = (dataAttr['PerAdult'] || {}) as Record<string, unknown>;
    const baseFare = Number(perAdult['BaseFare'] || item['TotalFare'] || 0);
    const totalFare = Number(perAdult['TotalFare'] || item['TotalFare'] || 0);
    const totalTax = Number(perAdult['Tax'] || 0);
    if (totalFare <= 0) continue;

    rows.push({
      fareReference: String(item['FareSourceCode'] || `ref_${rows.length + 1}`),
      airlineCode,
      airlineName,
      flightNumber,
      departureTime,
      arrivalTime,
      durationMinutes,
      seatsRemaining: Number(firstSeg['SeatsRemaining']) || 9,
      baseFare,
      totalFare,
      totalTax,
      currency: 'IRR',
      baggage: firstSeg['Baggage'] ? String(firstSeg['Baggage']) : null,
      isCharter: firstSeg['IsCharter'] === true || dataAttr['Charter'] === true,
      refundable: item['NonRefundableType'] !== 1,
      cabinClass: firstSeg['CabinType'] === 3 ? 'BUSINESS' : 'ECONOMY',
      stops: Number(firstSeg['StopQuantity']) || 0,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Results HTML parser (tolerant — calibrated against real captures over time)
// ---------------------------------------------------------------------------

function decodeNumericEntities(text: string): string {
  return text
    .replace(/&#x2B;/gi, '+')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html: string): string {
  return decodeNumericEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function digitsOnly(text: string): number {
  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  const normalized = text.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)));
  const cleaned = normalized.replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : 0;
}

/**
 * Price unit of the agent portal. The portal shows agent prices; agents
 * conventionally see Toman — verify with the first real capture
 * (scripts/parto-portal-capture.mjs probe) and set PARTO_PORTAL_PRICE_UNIT=rial
 * if the raw page proves Rial.
 */
function toIrr(rawPrice: number): number {
  const unit = (process.env.PARTO_PORTAL_PRICE_UNIT || 'toman').toLowerCase();
  return unit === 'rial' ? rawPrice : rawPrice * 10;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

/** Split the results page into per-itinerary blocks. */
function resultBlocks(html: string): string[] {
  const marker = /class="[^"]*\bResults\b[^"]*"/g;
  const starts: number[] = [];
  for (const m of html.matchAll(marker)) starts.push(m.index);
  if (starts.length === 0) return [];

  const blocks: string[] = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : Math.min(html.length, starts[i] + 20_000);
    blocks.push(html.slice(starts[i], end));
  }
  return blocks;
}

export function parseResultsHtml(html: string): PortalOfferRow[] {
  const rows: PortalOfferRow[] = [];
  const blocks = resultBlocks(html);

  for (const block of blocks) {
    const text = stripTags(block);

    // Booking reference: the book button carries the itinerary URL.
    const bookingUrl = firstMatch(block, [
      /class="[^"]*btnbook[^"]*"[^>]*data-url="([^"]+)"/i,
      /class="[^"]*btnbook[^"]*"[^>]*href="([^"]+)"/i,
      /data-url="([^"]*(?:Book|Reserve|Select)[^"]*)"/i,
    ]);
    if (!bookingUrl) continue; // not a usable itinerary block

    const priceRaw = firstMatch(block, [
      /class="[^"]*price_value[^"]*"[^>]*>([^<]+)</i,
      /data-price="([^"]+)"/i,
    ]);
    const totalFareRaw = priceRaw ? digitsOnly(priceRaw) : 0;
    if (totalFareRaw <= 0) continue;

    // Times: first two HH:mm tokens in the block (dep, arr).
    const times = [...text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].slice(0, 2);
    if (times.length < 2) continue;
    const depMin = Number(times[0][1]) * 60 + Number(times[0][2]);
    const arrMin = Number(times[1][1]) * 60 + Number(times[1][2]);
    const durationMinutes = arrMin >= depMin ? arrMin - depMin : 24 * 60 - depMin + arrMin;

    // Airline: prefer an img alt/title, fall back to «هواپیمایی X» in the text.
    const airlineName =
      firstMatch(block, [/<img[^>]*alt="([^"]{2,40})"[^>]*>/i, /<img[^>]*title="([^"]{2,40})"[^>]*>/i]) ||
      firstMatch(text, [/هواپیمایی\s+([^\s،]{2,20})/]) ||
      'نامشخص';
    const flightNumber = firstMatch(text, [/\b([A-Z][A-Z0-9][- ]?\d{3,4})\b/]) || '';

    const seatsMatch = text.match(/(\d+)\s*(?:صندلی|ظرفیت|نفر)/);
    const baggage = firstMatch(block, [/class="[^"]*baggage-data[^"]*"[^>]*>([^<]+)</i]);

    const todayIso = new Date().toISOString().slice(0, 10);
    rows.push({
      fareReference: decodeNumericEntities(bookingUrl),
      airlineCode: (flightNumber.split('-')[0] || 'XX').toUpperCase(),
      airlineName,
      flightNumber: flightNumber || `XX-${rows.length + 1}`,
      departureTime: new Date(`${todayIso}T${String(Math.floor(depMin / 60)).padStart(2, '0')}:${String(depMin % 60).padStart(2, '0')}:00Z`),
      arrivalTime: new Date(`${todayIso}T${String(Math.floor(arrMin / 60)).padStart(2, '0')}:${String(arrMin % 60).padStart(2, '0')}:00Z`),
      durationMinutes,
      seatsRemaining: seatsMatch ? Number(seatsMatch[1]) : 9,
      baseFare: toIrr(totalFareRaw),
      totalFare: toIrr(totalFareRaw),
      totalTax: 0,
      currency: 'IRR',
      baggage: baggage ? stripTags(baggage) : null,
      isCharter: /چارتر|charter/i.test(text),
      refundable: !/غیرقابل استرداد|غیر قابل استرداد/.test(text),
      cabinClass: /بیزینس|business/i.test(text) ? 'BUSINESS' : 'ECONOMY',
      stops: Math.max(0, [...text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].length - 2),
    });
  }

  return rows;
}
