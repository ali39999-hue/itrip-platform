/**
 * E2E-LIVE-001 — real browser smoke against the LIVE deployment.
 *
 * This is a genuine browser-based E2E check (not a unit test, not a mock):
 * Playwright launches the locally installed Chrome (channel:'chrome') and
 * drives the LIVE production site, asserting the version/health/homepage
 * contract. The result is recorded by scripts/record-gate-result.mjs so the
 * quality report can treat E2E as a REAL measured gate (QR-002) rather than
 * an env-var "pass".
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE_URL = process.env.LIVE_URL || 'https://itrip-platform.vercel.app';
const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost:3000';
const EXPECTED_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  } catch {
    return '1.8.4';
  }
})();
const INCLUDE_LOCALHOST = process.argv.includes('--include-local');
const TEST_TIMEOUT = 90_000;

let overallPassed = true;

const errors = [];

async function checkApiVersion(baseUrl, label) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  try {
    const response = await page.goto(`${baseUrl}/api/version`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    if (!response || !response.ok()) {
      errors.push(`[${label}] /api/version returned ${response ? response.status() : 'no-response'}`);
      overallPassed = false;
      return;
    }
    const body = await response.json();
    if (body.version !== EXPECTED_VERSION) {
      errors.push(`[${label}] /api/version.version=${body.version} (expected ${EXPECTED_VERSION})`);
      overallPassed = false;
    }
  } catch (err) {
    errors.push(`[${label}] /api/version failed: ${err instanceof Error ? err.message : String(err)}`);
    overallPassed = false;
  } finally {
    await browser.close();
  }
}



async function checkHealthLive(baseUrl) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  try {
    const response = await page.goto(`${baseUrl}/api/health/live`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    if (!response || !response.ok()) {
      errors.push(`[health/live] returned ${response ? response.status() : 'no-response'}`);
      overallPassed = false;
    }
  } catch (err) {
    errors.push(`[health/live] failed: ${err instanceof Error ? err.message : String(err)}`);
    overallPassed = false;
  } finally {
    await browser.close();
  }
}

async function smokeHomePage(baseUrl, label) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  try {
    const response = await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    if (!response || !response.ok()) {
      errors.push(`[${label}] homepage returned ${response ? response.status() : 'no-response'}`);
      overallPassed = false;
      return;
    }
    const brand = await page.locator('text=Firuzo').first();
    const visible = await brand.isVisible().catch(() => false);
    if (!visible) {
      errors.push(`[${label}] brand "Firuzo" not visible on homepage`);
      overallPassed = false;
    }
    const msgs = [];
    const onConsole = msg => {
      if (msg.type() === 'error') msgs.push(msg.text());
    };
    page.on('console', onConsole);
    await page.waitForTimeout(600);
    page.removeListener('console', onConsole);
    const consoleErrors = msgs.filter(m => !m.includes('favicon'));
    if (consoleErrors.length > 0) {
      errors.push(`[${label}] console errors on homepage: ${consoleErrors.slice(0, 3).join(' | ')}`);
      overallPassed = false;
    }
  } catch (err) {
    errors.push(`[${label}] homepage failed: ${err instanceof Error ? err.message : String(err)}`);
    overallPassed = false;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`[e2e-live-smoke] expected version: ${EXPECTED_VERSION}`);
  console.log(`[e2e-live-smoke] LIVE_URL: ${LIVE_URL}`);
  console.log(`[e2e-live-smoke] include localhost: ${INCLUDE_LOCALHOST}`);

  await checkApiVersion(LIVE_URL, 'LIVE /api/version');
  await checkHealthLive(LIVE_URL);
  await smokeHomePage(LIVE_URL, 'LIVE homepage');

  if (INCLUDE_LOCALHOST) {
    try {
      await checkApiVersion(LOCAL_URL, 'localhost /api/version');
    } catch {
      errors.push('[localhost] server not reachable — skipped localhost /api/version');
    }
    try {
      await smokeHomePage(LOCAL_URL, 'localhost homepage');
    } catch {
      errors.push('[localhost] server not reachable — skipped localhost homepage');
    }
  }

  const status = overallPassed ? 'pass' : 'fail';
  const note = [
    `expected version=${EXPECTED_VERSION}`,
    `live=${LIVE_URL}`,
    `errors=${errors.length}`,
    errors.slice(0, 3).join('; '),
  ].join(' — ');
  console.log(`[e2e-live-smoke] result=${status} (errors: ${errors.length})`);
  errors.forEach(e => console.error('  ' + e));

    const recordPath = path.join(root, 'scripts', 'record-gate-result.mjs');
  try {
    const child = fork(recordPath, ['e2e', status, '--', note], {
      cwd: root,
      stdio: 'ignore',
    });
    const result = await new Promise(resolve => {
      const timer = setTimeout(() => { if (!child.exitCode) { child.kill(); resolve(2); } }, 30_000);
      child.on('exit', code => { clearTimeout(timer); resolve(code ?? 2); });
      child.on('error', () => resolve(2));
    });
    console.log(`[e2e-live-smoke] recorded e2e=${status} (fork exit ${result})`);
  } catch (err) {
    console.error('[e2e-live-smoke] could not record result:', err);
  }

  process.exit(overallPassed ? 0 : 1);
}

main().catch(err => {
  console.error('[e2e-live-smoke] fatal:', err);
  process.exit(1);
});
