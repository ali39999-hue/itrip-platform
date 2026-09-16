/**
 * Parto portal session capture & search probe (human-in-the-loop).
 *
 * Usage (from itrip-platform/):
 *   node scripts/parto-portal-capture.mjs login
 *       Opens a real browser; YOU log in manually (solve the math captcha —
 *       it is an intentional anti-automation control, we never bypass it).
 *       Agency credentials are auto-filled from env (PARTO_OFFICE_ID /
 *       PARTO_USERNAME / PARTO_PASSWORD, or PARTO_CRS_* — loaded from .env);
 *       they are NEVER hardcoded in this repository (public repo — secret
 *       hygiene, see the SMSWBS lesson).
 *       On success the session is saved to .parto-portal-state.json and the
 *       equivalent Cookie header is printed for PARTO_PORTAL_COOKIE.
 *
 *   node scripts/parto-portal-capture.mjs check
 *       Verifies the saved session can open /Flight/Search (no login redirect).
 *
 *   node scripts/parto-portal-capture.mjs search THR MHD 2026-10-01 [2026-10-08]
 *       One search with the saved session (4th arg = return date → TwoWay).
 *       Dumps the raw results HTML for parser calibration.
 *
 *   node scripts/parto-portal-capture.mjs probe THR MHD 2026-10-01 [2026-10-08]
 *       Like search, but ALSO captures the structured /SearchResultData/{id}
 *       JSON when the XHR engine is reachable — the calibration source for
 *       parseSearchResultDataJson() in PartoPortalProvider.
 *
 * Env: PARTO_PORTAL_BASE_URL (default https://www.partocrs.ir),
 *      PARTO_PORTAL_STATE_FILE (default ./.parto-portal-state.json)
 */

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// Minimal .env loader (this script runs outside Next.js).
function loadDotEnv() {
  for (const candidate of ['.env', '.env.local']) {
    const file = resolve(candidate);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}
loadDotEnv();

const BASE = (process.env.PARTO_PORTAL_BASE_URL || 'https://www.partocrs.ir').replace(/\/+$/, '');
if (!/^https:\/\/(www\.)?partocrs\.ir$/.test(BASE)) {
  console.error('blocked: PARTO_PORTAL_BASE_URL must be https://www.partocrs.ir');
  process.exit(1);
}
const STATE_FILE = process.env.PARTO_PORTAL_STATE_FILE || resolve('.parto-portal-state.json');
const OUT_DIR = resolve('api_hunt/portal_bundles');
mkdirSync(OUT_DIR, { recursive: true });

const [command, ...args] = process.argv.slice(2);

function agencyCredentials() {
  // Env-only (direct or the shared Parto CRS API vars) — no literal secrets in source.
  return {
    officeId: process.env.PARTO_OFFICE_ID || process.env.PARTO_CRS_OFFICE_ID || '',
    username: process.env.PARTO_USERNAME || process.env.PARTO_CRS_USERNAME || '',
    password: process.env.PARTO_PASSWORD || process.env.PARTO_CRS_PASSWORD || '',
  };
}

async function login() {
  const creds = agencyCredentials();
  console.log('Opening the Parto login page in a visible browser…');
  if (creds.officeId && creds.username) {
    console.log('→ Agency credentials auto-filled from env; solve the captcha and click Login.');
  } else {
    console.log('→ Credentials not found in env (PARTO_OFFICE_ID / PARTO_USERNAME / PARTO_PASSWORD) — type them manually.');
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/Authenticate?ReturnUrl=%2FDashboard%2FHome`, { waitUntil: 'domcontentloaded' });

  try {
    const officeInput = page.locator('#Signin_OfficeId, input[name="Signin.OfficeId"]');
    await officeInput.waitFor({ timeout: 5000 });
    if (creds.officeId) await officeInput.fill(creds.officeId);

    const userInput = page.locator('#Signin_UserName, input[name="Signin.UserName"]');
    if (creds.username) await userInput.fill(creds.username);

    const passInput = page.locator('#Signin_Password, input[name="Signin.Password"]');
    if (creds.password) await passInput.fill(creds.password);

    // Focus the math captcha input so the user can immediately type the number
    const captchaInput = page.locator('#Login input[name="MathCaptchaAnswer"], input[name="MathCaptchaAnswer"]').first();
    if (await captchaInput.count()) {
      await captchaInput.focus();
      console.log('✔ Form filled from env and captcha field focused. Type the captcha on your screen and press Enter.');
    }
  } catch (err) {
    console.log('Notice: form auto-fill could not find all fields, please fill manually:', err.message);
  }

  try {
    await page.waitForURL(/\/(Dashboard|Profile|Home)/i, { timeout: 5 * 60_000 });
  } catch {
    console.error('Login was not detected within 5 minutes — aborting without saving anything.');
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(1500); // let the dashboard settle + cookies finalize
  const state = await context.storageState({ path: STATE_FILE });
  const cookies = state.cookies ?? [];
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  console.log(`\n✔ Session saved to ${STATE_FILE} (${cookies.length} cookies)`);
  console.log('\nEquivalent Cookie header (optional alternative to the state file):\n');
  console.log(`PARTO_PORTAL_COOKIE="${cookieHeader}"`);
  console.log('\nNote: sessions expire — when /Flight/Search starts redirecting to login, re-run this command.');

  await browser.close();
}

async function newContextWithState() {
  if (!existsSync(STATE_FILE)) {
    console.error(`No session state at ${STATE_FILE} — run the "login" command first.`);
    process.exit(1);
  }
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STATE_FILE, viewport: { width: 1280, height: 900 } });
  return { browser, context };
}

async function openSearchPage(context) {
  const page = await context.newPage();
  const res = await page.goto(`${BASE}/Flight/Search`, { waitUntil: 'domcontentloaded' });
  if (page.url().toLowerCase().includes('/authenticate') || res?.status() === 302) {
    throw new Error('SESSION_EXPIRED: portal redirected to login — re-run the "login" command.');
  }
  return page;
}

async function check() {
  const { browser, context } = await newContextWithState();
  try {
    const page = await openSearchPage(context);
    const hasForm = await page.locator('form#searchForm').count();
    console.log(`✔ Session OK — search form present: ${hasForm > 0 ? 'yes' : 'NO (inspect page)'}`);
    await browser.close();
  } catch (err) {
    await browser.close();
    console.error(err.message);
    process.exit(1);
  }
}

function validateArgs(origin, destination, date, returnDate) {
  if (!/^[A-Za-z]{3}$/.test(origin || '') || !/^[A-Za-z]{3}$/.test(destination || '')) {
    console.error('origin/destination must be 3-letter IATA codes, e.g. THR MHD');
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    console.error('date must be YYYY-MM-DD');
    process.exit(1);
  }
  if (returnDate && !/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
    console.error('return date must be YYYY-MM-DD');
    process.exit(1);
  }
}

async function runSearch(origin, destination, date, returnDate, { wantJson = false } = {}) {
  validateArgs(origin, destination, date, returnDate);
  const { browser, context } = await newContextWithState();
  try {
    const page = await openSearchPage(context);
    const isRoundTrip = Boolean(returnDate);

    await page.evaluate(({ org, dst, dep, ret, roundTrip }) => {
      const setVal = (name, value) => {
        const el = document.querySelector(`[name="${name}"]`);
        if (el) el.value = value;
      };
      const flightTypeBtn = document.querySelector(roundTrip ? '#RoundTrip' : '#OneWay');
      if (flightTypeBtn) flightTypeBtn.click();
      const flightType = document.querySelector('#FlightType') || document.querySelector('[name="FlightType"]');
      if (flightType) flightType.value = roundTrip ? 'RoundTrip' : 'OneWay';
      setVal('OriginLocationCode', org);
      setVal('DestinationLocationCode', dst);
      const depEl = document.querySelector('#DepartureDateTime');
      if (depEl) {
        depEl.value = dep;
        depEl.dataset.val = dep;
      }
      const retEl = document.querySelector('#DepartureDateTimeR');
      if (retEl) {
        if (roundTrip) {
          retEl.disabled = false;
          retEl.value = ret;
          if (retEl.dataset) retEl.dataset.val = ret;
        } else {
          retEl.disabled = true;
        }
      }
      const adult = document.querySelector('[name="AdultCount"]');
      if (adult) adult.value = '1';
    }, { org: origin.toUpperCase(), dst: destination.toUpperCase(), dep: date, ret: returnDate || '', roundTrip: isRoundTrip });

    const form = page.locator('form#searchForm');
    if ((await form.count()) === 0) {
      throw new Error('searchForm not found on the page');
    }
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      page.evaluate(() => {
        const el = document.querySelector('form#searchForm');
        if (el) el.submit();
      }),
    ]);

    await page.waitForTimeout(8000); // results render server-side; give it a beat
    const html = await page.content();

    const tag = `${origin.toUpperCase()}-${destination.toUpperCase()}${isRoundTrip ? `_RT_${returnDate}` : ''}_${date}`;
    const outFile = join(OUT_DIR, `portal_results_${tag}.html`);
    writeFileSync(outFile, html, 'utf8');

    const resultBlocks = (html.match(/class="[^"]*\bResults\b[^"]*"/g) || []).length;
    const prices = (html.match(/price_value[^>]*>[^<]*</g) || []).slice(0, 8);
    console.log(`✔ Results HTML saved: ${outFile}`);
    console.log(`  Results blocks: ${resultBlocks}`);
    console.log(`  First price_value samples: ${prices.length ? prices.join(' | ') : '(none found — markup needs calibration)'}`);

    // Structured JSON capture (parseSearchResultDataJson calibration source).
    if (wantJson) {
      const searchIdMatch = page.url().match(/SearchResult\/(\d+)/) || html.match(/SearchResultData\/(\d+)/);
      if (!searchIdMatch) {
        console.log('  ⚠ No search id found — JSON engine could not be probed on this response.');
      } else {
        const searchId = searchIdMatch[1];
        const jsonRes = await context.request.get(`${BASE}/Flight/Search/SearchResultData/${searchId}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json, text/javascript, */*; q=0.01' },
        });
        if (jsonRes.ok()) {
          const body = await jsonRes.text();
          const jsonFile = join(OUT_DIR, `portal_results_${tag}.json`);
          writeFileSync(jsonFile, body, 'utf8');
          let count = 'unknown';
          try {
            const parsed = JSON.parse(body);
            count = String(parsed?.PricedItineraries?.length ?? 0);
          } catch { /* keep 'unknown' */ }
          console.log(`✔ Structured JSON saved: ${jsonFile} (PricedItineraries: ${count})`);
        } else {
          console.log(`  ⚠ SearchResultData answered HTTP ${jsonRes.status()} — HTML engine only.`);
        }
      }
    }

    await browser.close();
  } catch (err) {
    await browser.close();
    console.error(err.message);
    process.exit(1);
  }
}

switch (command) {
  case 'login':
    await login();
    break;
  case 'check':
    await check();
    break;
  case 'search': {
    const [origin, destination, date, returnDate] = args;
    await runSearch(origin, destination, date, returnDate);
    break;
  }
  case 'probe': {
    const [origin, destination, date, returnDate] = args;
    await runSearch(origin, destination, date, returnDate, { wantJson: true });
    break;
  }
  default:
    console.error('unknown command — use login | check | search <ORG> <DST> <YYYY-MM-DD> [RETURN] | probe <ORG> <DST> <YYYY-MM-DD> [RETURN]');
    process.exit(1);
}
