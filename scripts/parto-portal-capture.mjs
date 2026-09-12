/**
 * Parto portal session capture & search probe (human-in-the-loop).
 *
 * Usage (from itrip-platform/):
 *   node scripts/parto-portal-capture.mjs login
 *       Opens a real browser; YOU log in manually (solve the math captcha —
 *       it is an intentional anti-automation control, we never bypass it).
 *       On success the session is saved to .parto-portal-state.json and the
 *       equivalent Cookie header is printed for PARTO_PORTAL_COOKIE.
 *
 *   node scripts/parto-portal-capture.mjs check
 *       Verifies the saved session can open /Flight/Search (no login redirect).
 *
 *   node scripts/parto-portal-capture.mjs search THR MHD 2026-10-01
 *       Performs one one-way search with the saved session, dumps the raw
 *       results HTML for parser calibration and prints a summary.
 *
 * Env: PARTO_PORTAL_BASE_URL (default https://www.partocrs.ir),
 *      PARTO_PORTAL_STATE_FILE (default ./.parto-portal-state.json)
 */

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const BASE = (process.env.PARTO_PORTAL_BASE_URL || 'https://www.partocrs.ir').replace(/\/+$/, '');
if (!/^https:\/\/(www\.)?partocrs\.ir$/.test(BASE)) {
  console.error('blocked: PARTO_PORTAL_BASE_URL must be https://www.partocrs.ir');
  process.exit(1);
}
const STATE_FILE = process.env.PARTO_PORTAL_STATE_FILE || resolve('.parto-portal-state.json');
const OUT_DIR = 'C:\\Users\\Lenovo\\Desktop\\firouzo\\api_hunt\\portal_bundles';
mkdirSync(OUT_DIR, { recursive: true });

const [command, ...args] = process.argv.slice(2);

async function login() {
  console.log('Opening the Parto login page in a visible browser…');
  console.log('→ Credentials (CRS011982 / nasseri) are auto-filled if available.');
  console.log('→ All you need to do is solve the math captcha and click Login.\n');

  const officeId = process.env.PARTO_OFFICE_ID || process.env.PARTO_CRS_OFFICE_ID || 'CRS011982';
  const username = process.env.PARTO_USERNAME || process.env.PARTO_CRS_USERNAME || 'nasseri';
  const password = process.env.PARTO_PASSWORD || process.env.PARTO_CRS_PASSWORD || '123456';

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/Authenticate?ReturnUrl=%2FDashboard%2FHome`, { waitUntil: 'domcontentloaded' });

  try {
    const officeInput = page.locator('#Signin_OfficeId, input[name="Signin.OfficeId"]');
    await officeInput.waitFor({ timeout: 5000 });
    await officeInput.fill(officeId);

    const userInput = page.locator('#Signin_UserName, input[name="Signin.UserName"]');
    await userInput.fill(username);

    const passInput = page.locator('#Signin_Password, input[name="Signin.Password"]');
    await passInput.fill(password);

    // Focus the math captcha input so the user can immediately type the number
    const captchaInput = page.locator('#MathCaptchaAnswer, input[name="MathCaptchaAnswer"]');
    if (await captchaInput.count()) {
      await captchaInput.focus();
      console.log('✔ Form auto-filled and captcha field focused. Type the captcha on your screen and press Enter.');
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

function validateArgs(origin, destination, date) {
  if (!/^[A-Za-z]{3}$/.test(origin || '') || !/^[A-Za-z]{3}$/.test(destination || '')) {
    console.error('origin/destination must be 3-letter IATA codes, e.g. THR MHD');
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    console.error('date must be YYYY-MM-DD');
    process.exit(1);
  }
}

async function runSearch(origin, destination, date) {
  validateArgs(origin, destination, date);
  const { browser, context } = await newContextWithState();
  try {
    const page = await openSearchPage(context);

    await page.evaluate(({ org, dst, dep }) => {
      const setVal = (name, value) => {
        const el = document.querySelector(`[name="${name}"]`);
        if (el) el.value = value;
      };
      const flightTypeBtn = document.querySelector('#OneWay');
      if (flightTypeBtn) flightTypeBtn.click();
      const flightType = document.querySelector('#FlightType') || document.querySelector('[name="FlightType"]');
      if (flightType) flightType.value = 'OneWay';
      setVal('OriginLocationCode', org);
      setVal('DestinationLocationCode', dst);
      const depEl = document.querySelector('#DepartureDateTime');
      if (depEl) {
        depEl.value = dep;
        depEl.dataset.val = dep;
      }
      const retEl = document.querySelector('#DepartureDateTimeR');
      if (retEl) retEl.disabled = true;
      const adult = document.querySelector('[name="AdultCount"]');
      if (adult) adult.value = '1';
    }, { org: origin.toUpperCase(), dst: destination.toUpperCase(), dep: date });

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

    const outFile = join(OUT_DIR, `portal_results_${origin.toUpperCase()}-${destination.toUpperCase()}_${date}.html`);
    writeFileSync(outFile, html, 'utf8');

    const resultBlocks = (html.match(/class="[^"]*\bResults\b[^"]*"/g) || []).length;
    const prices = (html.match(/price_value[^>]*>[^<]*</g) || []).slice(0, 8);
    console.log(`✔ Results HTML saved: ${outFile}`);
    console.log(`  Results blocks: ${resultBlocks}`);
    console.log(`  First price_value samples: ${prices.length ? prices.join(' | ') : '(none found — markup needs calibration)'}`);
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
    const [origin, destination, date] = args;
    await runSearch(origin, destination, date);
    break;
  }
  default:
    console.error('unknown command — use login | check | search <ORG> <DST> <YYYY-MM-DD>');
    process.exit(1);
}
