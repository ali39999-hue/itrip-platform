import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PartoPortalProvider,
  PartoPortalSessionExpiredError,
  parseResultsHtml,
  portalOfferIdFromReference,
} from './adapters/PartoPortalProvider';
import { resolveFlightRefreshSource, portalRowsToCacheRows } from '@/services/flight-cache-service';

/**
 * Synthetic results page built from the markup contract discovered in the
 * portal bundles (parto_page.js): div.Results blocks containing .btnbook
 * data-url, .price_value, p.baggage-data and Persian badges. The parser is
 * calibrated against real captures via scripts/parto-portal-capture.mjs.
 */
function resultsHtmlFixture(): string {
  return `
  <html><body>
  <div class="Results" data-id="1">
    <img src="/img/ir.png" alt="ایران‌ایر">
    <span class="flight-no">IR-622</span>
    <div class="times"><span>06:30</span> <span>07:45</span></div>
    <p class="baggage-data" data-segindex="0">بار مجاز 20 کیلو</p>
    <span class="charter-badge">چارتر</span>
    <span class="seats">4 صندلی باقی مانده</span>
    <div class="price"><span class="price_value">2,150,000 تومان</span></div>
    <a class="btnbook" data-url="/Flight/Booking?searchId=881&amp;itin=0">انتخاب</a>
  </div>
  <div class="Results" data-id="2">
    <img src="/img/mahan.png" alt="ماهان‌ایر">
    <span class="flight-no">W5-112</span>
    <div class="times"><span>08:30</span> <span>11:45</span></div>
    <p class="baggage-data" data-segindex="0">بار مجاز 30 کیلو</p>
    <span class="seats">9 صندلی باقی مانده</span>
    <div class="price"><span class="price_value">۳,۲۵۰,۰۰۰</span></div>
    <a class="btnbook" data-url="/Flight/Booking?searchId=881&amp;itin=1">انتخاب</a>
  </div>
  <div class="Results" data-id="3">
    <div>بدون دکمه رزرو — بلوک بی‌کیفیت</div>
  </div>
  </body></html>`;
}

function loginPageHtml(): string {
  return `<form action="/Authenticate/Login" method="post">
    <input name="__RequestVerificationToken" type="hidden" value="CfDJ8_TOKEN_ABC" />
    <input name="MathCaptchaToken" value="cap_token" />
    <img src="data:image/png;base64,AAA" alt="captcha" />
  </form>`;
}

describe('Parto portal provider (scrape fallback — plan §7)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.PARTO_PORTAL_PRICE_UNIT = 'toman';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('parses server-rendered result blocks into offer rows (charter + systemic)', () => {
    const rows = parseResultsHtml(resultsHtmlFixture());

    expect(rows).toHaveLength(2);

    expect(rows[0].airlineName).toBe('ایران‌ایر');
    expect(rows[0].flightNumber).toBe('IR-622');
    expect(rows[0].departureTime.toISOString()).toContain('T06:30:00');
    expect(rows[0].arrivalTime.toISOString()).toContain('T07:45:00');
    expect(rows[0].durationMinutes).toBe(75);
    expect(rows[0].isCharter).toBe(true);
    expect(rows[0].seatsRemaining).toBe(4);
    expect(rows[0].baggage).toContain('20');
    expect(rows[0].fareReference).toContain('/Flight/Booking?searchId=881&itin=0');
    // toman → IRR ×10
    expect(rows[0].totalFare).toBe(21_500_000);
    expect(rows[0].currency).toBe('IRR');

    expect(rows[1].airlineName).toBe('ماهان‌ایر');
    expect(rows[1].flightNumber).toBe('W5-112');
    // Persian digits parse correctly
    expect(rows[1].totalFare).toBe(32_500_000);
    expect(rows[1].durationMinutes).toBe(195);
    expect(rows[1].isCharter).toBe(false);
  });

  it('keeps rial-priced portals untouched when PARTO_PORTAL_PRICE_UNIT=rial', () => {
    process.env.PARTO_PORTAL_PRICE_UNIT = 'rial';
    const rows = parseResultsHtml(resultsHtmlFixture());
    expect(rows[0].totalFare).toBe(2_150_000);
  });

  it('returns no rows for markup without usable result blocks', () => {
    expect(parseResultsHtml('<html><body>not found</body></html>')).toEqual([]);
  });

  it('offer id is reversible from the booking reference', () => {
    const id = portalOfferIdFromReference('/Flight/Booking?searchId=881&itin=0');
    expect(id).toContain('off_PARTO_PORTAL_');
    expect(Buffer.from(id.replace('off_PARTO_PORTAL_', ''), 'base64url').toString('utf8')).toBe(
      '/Flight/Booking?searchId=881&itin=0'
    );
  });

  it('detects session expiry on login redirect and raises the dedicated error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      text: () => Promise.resolve(loginPageHtml()),
    }));

    const provider = new PartoPortalProvider({ cookie: 'sid=abc; .ASPXAUTH=xyz' });
    await expect(provider.searchOneWay({ origin: 'THR', destination: 'MHD', departureDate: '2026-10-01' }))
      .rejects.toBeInstanceOf(PartoPortalSessionExpiredError);
  });

  it('extracts the anti-forgery token and posts the documented form fields', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fetchMock = vi.fn().mockImplementation((url: unknown, init?: { body?: unknown }) => {
      calls.push({ url: String(url), body: typeof init?.body === 'string' ? init.body : '' });
      if (String(url).endsWith('/Flight/Search')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { getSetCookie: () => ['ASP.NET_SessionId=keepme; path=/; HttpOnly'] },
          text: () => Promise.resolve(`<html>${loginPageHtml()}<form action="/Authenticate/Signout"></form></html>`),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { getSetCookie: () => [] },
        text: () => Promise.resolve(resultsHtmlFixture()),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new PartoPortalProvider({ cookie: 'sid=abc' });
    const outcome = await provider.searchOneWay({ origin: 'thr', destination: 'mhd', departureDate: '2026-10-01' });

    expect(outcome.offers).toHaveLength(2);

    const [formCall, postCall] = calls;
    expect(formCall.url).toBe('https://www.partocrs.ir/Flight/Search');
    expect(postCall.url).toBe('https://www.partocrs.ir/Flight/Search/Search');

    const body = new URLSearchParams(postCall.body);
    expect(body.get('__RequestVerificationToken')).toBe('CfDJ8_TOKEN_ABC');
    expect(body.get('OriginLocationCode')).toBe('THR,1');
    expect(body.get('DestinationLocationCode')).toBe('MHD,1');
    expect(body.get('DepartureDateTime')).toBe('2026-10-01');
    expect(body.get('FlightType')).toBe('OneWay');
    expect(body.get('CabinType')).toBe('1');
    expect(body.get('DirectFlight')).toBe('false');

    // Cookie header must merge the session cookie with form-page Set-Cookie updates.
    const postHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(postHeaders['Cookie']).toContain('sid=abc');
    expect(postHeaders['Cookie']).toContain('ASP.NET_SessionId=keepme');
  });

  it('source selection: portal wins when only its session is configured; none when nothing is', () => {
    delete process.env.PARTO_CRS_OFFICE_ID;
    delete process.env.PARTO_CRS_USERNAME;
    delete process.env.PARTO_CRS_PASSWORD;
    delete process.env.PARTO_PORTAL_COOKIE;
    process.env.PARTO_PORTAL_STATE_FILE = 'definitely-missing-file.json';
    // Ensure the default state file (cwd) does not exist either.
    delete process.env.PARTO_PORTAL_STATE_DIR;

    expect(resolveFlightRefreshSource()).toBeNull();

    process.env.PARTO_PORTAL_COOKIE = 'sid=abc';
    const source = resolveFlightRefreshSource();
    expect(source?.code).toBe('PARTO_PORTAL');
  });

  it('portal rows map into cache-ready rows anchored to the search date', () => {
    const rows = parseResultsHtml(resultsHtmlFixture());
    const cacheRows = portalRowsToCacheRows(
      rows,
      { routeKey: 'THR-MHD', originCode: 'THR', destinationCode: 'MHD' },
      '2026-10-01',
      '<html></html>'
    );

    expect(cacheRows).toHaveLength(2);
    expect(cacheRows[0].offerId).toContain('off_PARTO_PORTAL_');
    expect(cacheRows[0].departureTime.toISOString()).toContain('2026-10-01T06:30:00');
    expect(cacheRows[0].arrivalTime.toISOString()).toContain('2026-10-01T07:45:00');
    expect(cacheRows[0].totalFare).toBe(21_500_000);
    expect(cacheRows[0].ticketType).toBe('charter');
  });
});
