import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

/**
 * Logs a seeded user in through the REAL NextAuth credentials provider
 * (identifier + bcrypt password) by driving the standard CSRF -> callback
 * flow on the page's own request context, so the session cookie lands in the
 * browser context exactly like a UI login.
 *
 * Password candidates: CI/environment-provided values first, then the local
 * .env values the dev server actually seeded with. This works in every
 * environment, unlike the OTP UI flow whose codes are random and HMAC-hashed.
 */
async function attemptLogin(
  page: Page,
  identifier: string,
  password: string
): Promise<boolean> {
  const csrfRes = await page.request.get('/api/auth/csrf');
  if (!csrfRes.ok()) return false;
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  await page.request.post('/api/auth/callback/credentials', {
    form: {
      identifier,
      password,
      channel: 'credentials',
      csrfToken,
      json: 'true',
    },
  });

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
  fallback: string;
}

export async function apiLogin(page: Page, credentials: E2eCredentials): Promise<boolean> {
  const candidates = Array.from(
    new Set(
      [process.env[credentials.envKey], credentials.password, readDotEnv(credentials.envKey), credentials.fallback].filter(
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
  fallback: 'Admin@Firuzo2026!Secure',
};
export const E2E_USER: E2eCredentials = {
  identifier: 'user@firuzo.com',
  envKey: 'USER_PASSWORD',
  fallback: 'User@Firuzo2026!Secure',
};
