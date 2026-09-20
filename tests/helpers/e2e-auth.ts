import fs from 'node:fs';
import path from 'node:path';
import type { Page, Response } from '@playwright/test';

/**
 * Logs a seeded user in through the REAL NextAuth credentials provider
 * (identifier + bcrypt password) by driving the standard CSRF -> callback
 * flow on the page's own request context, so the session cookie lands in the
 * browser context exactly like a UI login.
 *
 * Password candidates: CI/environment-provided values first, then the local
 * .env values the dev server actually seeded with. This works in every
 * environment, unlike the OTP UI flow whose codes are random and HMAC-hashed.
 *
 * 429 handling: middleware token-buckets the whole /api/auth/* path family
 * (30 requests / 60s per client IP — src/middleware.ts). Both the CSRF probe
 * AND the credentials callback spend a token, and a full e2e suite presents a
 * single shared local IP, so a 16-test ERP family drains the bucket mid-run.
 * The limiter answers 429 with Retry-After; instead of failing the whole spec
 * family for a minute, honor Retry-After (capped) and retry the throttled
 * request until the bucket refills. This does not bypass the limiter — it
 * waits it out, like a real well-behaved client must.
 */

const MAX_429_RETRIES = 10;
const MAX_RETRY_WAIT_MS = 12_000;
const DEFAULT_RETRY_WAIT_MS = 3_000;

function retryWaitMs(res: Response, attempt: number): number {
  const retryAfter = Number(res.headers()['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, MAX_RETRY_WAIT_MS);
  }
  return Math.min(DEFAULT_RETRY_WAIT_MS * attempt, MAX_RETRY_WAIT_MS);
}

async function attemptLogin(
  page: Page,
  identifier: string,
  password: string
): Promise<boolean> {
  // 1. CSRF probe (rate limited like every other /api/auth/* request).
  let csrfRes = await page.request.get('/api/auth/csrf');
  let retries = 0;
  while (csrfRes.status() === 429 && retries < MAX_429_RETRIES) {
    retries += 1;
    await page.waitForTimeout(retryWaitMs(csrfRes, retries));
    csrfRes = await page.request.get('/api/auth/csrf');
  }
  if (!csrfRes.ok()) return false;
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  // 2. Credentials callback (shares the same per-IP bucket).
  const doCallback = (): Promise<Response> =>
    page.request.post('/api/auth/callback/credentials', {
      form: {
        identifier,
        password,
        channel: 'credentials',
        csrfToken,
        json: 'true',
      },
    });

  let res = await doCallback();
  while (res.status() === 429 && retries < MAX_429_RETRIES) {
    retries += 1;
    await page.waitForTimeout(retryWaitMs(res, retries));
    res = await doCallback();
  }

  // page.request shares cookie storage with the browser context: a successful
  // credentials callback leaves the NextAuth session cookie in the jar.
  const cookies = await page.context().cookies();
  return cookies.some((c) => c.name.startsWith('authjs.session-token'));
}

function readDotEnv(key: string): string | undefined {
  // Playwright transpiles helpers, so resolve from the process cwd (tests run
  // from the project root) instead of __dirname.
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const m = fs
    .readFileSync(envPath, 'utf8')
    .match(new RegExp('^' + key + '="?([^"\\r\\n]+)"?', 'm'));
  const value = m ? m[1] : undefined;
  return value && value.length > 0 ? value : undefined;
}

export interface E2eCredentials {
  identifier: string;
  password?: string;
  envKey: 'ADMIN_PASSWORD' | 'USER_PASSWORD';
}

export async function apiLogin(page: Page, credentials: E2eCredentials): Promise<boolean> {
  // SEC-014: candidates come from the environment / .env the dev server was
  // actually seeded with. There is deliberately no hardcoded password here — a
  // default in the repository is a published credential.
  const candidates = Array.from(
    new Set(
      [process.env[credentials.envKey], credentials.password, readDotEnv(credentials.envKey)].filter(
        (v): v is string => Boolean(v && v.length > 0)
      )
    )
  );

  for (const password of candidates) {
    if (await attemptLogin(page, credentials.identifier, password)) {
      return true;
    }
  }
  return false;
}

export const E2E_ADMIN: E2eCredentials = {
  identifier: 'admin@firuzo.com',
  envKey: 'ADMIN_PASSWORD',
};
export const E2E_USER: E2eCredentials = {
  identifier: 'user@firuzo.com',
  envKey: 'USER_PASSWORD',
};
