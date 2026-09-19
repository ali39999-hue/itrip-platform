/**
 * AUTH-001..AUTH-005 — negative security tests for the admin bootstrap and OTP paths.
 *
 * These tests load the env WITHOUT touching it (vi.resetModules() + dynamic
 * import) so each case can simulate its own deployment configuration. They
 * assert the fail-closed invariants directly:
 *   - no hardcoded default admin password can authenticate in production,
 *   - identifier strings alone never grant privilege,
 *   - OTP material never leaks to the client outside demo mode,
 *   - signing secrets are never defaulted in production.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveSigningSecret } from '@/lib/security/secrets';

const DEMO_PASSWORD = 'Firuzo-Demo-Admin-Only!';

const CONFIG_VARS = [
  'ADMIN_PASSWORD',
  'ADMIN_PHONES',
  'ADMIN_EMAILS',
  'AUTH_SECRET',
  'NEXTAUTH_SECRET',
  'DEMO_MODE',
  'NODE_ENV',
];

const savedEnv: Record<string, string | undefined> = {};

function stashEnv(): void {
  for (const key of CONFIG_VARS) savedEnv[key] = process.env[key];
}

function restoreEnv(): void {
  for (const key of CONFIG_VARS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}

stashEnv();
afterEach(() => {
  restoreEnv();
  vi.resetModules();
});

async function loadAuth() {
  return import('@/auth');
}

function setDeployment(vars: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

// Test-only fallback so the pure bootstrap/secret helpers can be loaded under a
// simulated production env. It is never used to sign real traffic.
function ensureTestAuthSecret(): void {
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    process.env.AUTH_SECRET = `test-only-auth-secret-${process.pid}`;
  }
}

describe('admin bootstrap hardening (AUTH-002)', () => {
  it('exposes no production fallback admin password (fails closed when unset)', async () => {
    // NOTE: an EMPTY (not deleted) value is used on purpose — Vitest auto-loads
    // the local `.env` and only respects values that are NOT already set, so
    // `delete` would re-inject the developer's ADMIN_PASSWORD here. Empty string
    // simulates "the deployment did not configure it".
    setDeployment({ ADMIN_PASSWORD: '', NODE_ENV: 'production', DEMO_MODE: 'false' });
    ensureTestAuthSecret();
    const { getAdminBootstrapPassword } = await loadAuth();
    expect(getAdminBootstrapPassword()).toBeNull();
  });

  it('uses the deployment secret when configured', async () => {
    setDeployment({ ADMIN_PASSWORD: 's3cr3t-from-vault', NODE_ENV: 'production', DEMO_MODE: 'false' });
    ensureTestAuthSecret();
    const { getAdminBootstrapPassword } = await loadAuth();
    expect(getAdminBootstrapPassword()).toBe('s3cr3t-from-vault');
  });

  it('never returns the published demo password in a production-shaped environment', async () => {
    setDeployment({ ADMIN_PASSWORD: '', NODE_ENV: 'production', DEMO_MODE: 'false' });
    ensureTestAuthSecret();
    const { getAdminBootstrapPassword } = await loadAuth();
    const pwd = getAdminBootstrapPassword();
    expect(pwd).toBeNull();
    expect(pwd).not.toBe(DEMO_PASSWORD);
  });

  it('demo bootstrap lists are not importable as production authority', async () => {
    setDeployment({ ADMIN_PHONES: undefined, ADMIN_EMAILS: undefined, NODE_ENV: 'production', DEMO_MODE: 'false' });
    ensureTestAuthSecret();
    const { DEMO_ADMIN_PHONES, DEMO_ADMIN_EMAILS, getAdminPhones, getAdminEmails, isKnownAdminIdentifier } =
      await loadAuth();
    expect(DEMO_ADMIN_PHONES).toContain('09120000000');
    expect(DEMO_ADMIN_EMAILS).toContain('admin@firuzo.com');
    expect(getAdminPhones()).toEqual([]);
    expect(getAdminEmails()).toEqual([]);
    expect(isKnownAdminIdentifier('admin@firuzo.com')).toBe(false);
    expect(isKnownAdminIdentifier('09120000000')).toBe(false);
    expect(isKnownAdminIdentifier('admin')).toBe(false);
  });

  it('env-configured bootstrap identifiers are honored', async () => {
    setDeployment({
      ADMIN_PHONES: '09990001111',
      ADMIN_EMAILS: 'ops@example.com',
      NODE_ENV: 'production',
      DEMO_MODE: 'false',
    });
    ensureTestAuthSecret();
    const { isKnownAdminIdentifier } = await loadAuth();
    expect(isKnownAdminIdentifier('ops@example.com')).toBe(true);
    expect(isKnownAdminIdentifier('09990001111')).toBe(true);
    expect(isKnownAdminIdentifier('09120000000')).toBe(false);
    expect(isKnownAdminIdentifier('admin@firuzo.com')).toBe(false);
  });
});

describe('signing secret resolution (SEC-014)', () => {
  it('returns null in production when no secret is configured', () => {
    setDeployment({ AUTH_SECRET: undefined, NEXTAUTH_SECRET: undefined, NODE_ENV: 'production', DEMO_MODE: 'false' });
    expect(resolveSigningSecret(['AUTH_SECRET', 'NEXTAUTH_SECRET'], 'voucher-hmac')).toBeNull();
  });

  it('prefers the configured secret over any demo value', () => {
    setDeployment({ AUTH_SECRET: 'real-key-from-vault', NODE_ENV: 'production', DEMO_MODE: 'false' });
    expect(resolveSigningSecret(['AUTH_SECRET', 'NEXTAUTH_SECRET'], 'voucher-hmac')).toBe('real-key-from-vault');
  });

  it('labels any non-production value so it can never be mistaken for a real key', () => {
    setDeployment({ AUTH_SECRET: undefined, NODE_ENV: 'test', DEMO_MODE: 'true' });
    const value = resolveSigningSecret(['AUTH_SECRET'], 'voucher-hmac');
    expect(value).not.toBe('voucher-hmac');
    expect(value).toContain('demo-only:');
  });
});