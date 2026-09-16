/**
 * SEC-013 — seed credentials must never be predictable in production.
 *
 * `prisma/seed.ts` used to fall back to `FiruzoAdmin2026!@#` when ADMIN_PASSWORD
 * was absent, in EVERY environment. That value is in the public repository, so
 * seeding a production database without the env var created a publicly-known
 * SUPER_ADMIN. The resolution is now environment-aware and lives here as a pure
 * function so it can be unit-tested without a database:
 *
 *   NODE_ENV=production + ADMIN_PASSWORD missing  -> THROW (refuse to seed)
 *   NODE_ENV=production + USER_PASSWORD missing   -> THROW (refuse to seed)
 *   any other NODE_ENV                            -> explicit dev fixture
 *
 * The dev fixtures are clearly isolated: they are only reachable when the
 * runtime is explicitly NOT production.
 */

export interface SeedCredentialEnv {
  NODE_ENV?: string;
  ADMIN_PASSWORD?: string;
  USER_PASSWORD?: string;
}

/** Non-production fixtures only. Never reachable with NODE_ENV=production. */
export const DEV_ADMIN_FIXTURE = 'FiruzoAdmin2026!@#';
export const DEV_USER_FIXTURE = 'FiruzoUser2026!@#';

export interface SeedCredentials {
  adminPassword: string;
  userPassword: string;
  /** True when a non-production fixture was used instead of an explicit secret. */
  usedDevFixtures: boolean;
}

export function resolveSeedCredentials(env: SeedCredentialEnv = process.env): SeedCredentials {
  const isProduction = env.NODE_ENV === 'production';
  const adminPassword = env.ADMIN_PASSWORD?.trim() || '';
  const userPassword = env.USER_PASSWORD?.trim() || '';

  if (isProduction) {
    const missing = [
      adminPassword ? null : 'ADMIN_PASSWORD',
      userPassword ? null : 'USER_PASSWORD',
    ].filter((v): v is string => Boolean(v));

    if (missing.length > 0) {
      throw new Error(
        `SEC-013: refusing to seed a production database with default credentials. ` +
          `Missing required environment variable(s): ${missing.join(', ')}. ` +
          `Set an explicit secret for each (the development fixtures are never used in production).`,
      );
    }
  }

  return {
    adminPassword: adminPassword || DEV_ADMIN_FIXTURE,
    userPassword: userPassword || DEV_USER_FIXTURE,
    usedDevFixtures: !adminPassword || !userPassword,
  };
}