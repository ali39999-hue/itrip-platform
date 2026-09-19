/**
 * Canonical signing-secret resolution (SEC-014 / AUTH-005).
 *
 * Every HMAC / JWT signing key in the platform resolves through this module so
 * that:
 *   1. production NEVER falls back to a value published in the repository, and
 *   2. the "demo" behaviour is explicit, documented and unreachable in production.
 *
 * A published fallback key is equivalent to no key at all: anyone with the source
 * can forge voucher tokens or session cookies. Callers therefore receive `null`
 * in production when the secret is not configured and MUST fail closed.
 */
import { isDemoRuntime } from '../runtime-mode';

/**
 * Resolves the first configured secret from `envNames`.
 *
 * @returns the configured secret, a clearly-labelled demo/build value when the
 *          runtime is explicitly non-production, or `null` when the caller must
 *          fail closed (production with no configured secret).
 */
export function resolveSigningSecret(envNames: readonly string[], demoFallback: string): string | null {
  for (const name of envNames) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  if (isDemoRuntime()) return `demo-only:${demoFallback}`;
  // Static build collection must not fail the whole build for a runtime secret;
  // this value is never used to authenticate real traffic at build time.
  if (process.env.NEXT_PHASE === 'phase-production-build') return `build-phase-only:${demoFallback}`;
  return null;
}

/** Resolves the NextAuth-equivalent secret (AUTH_SECRET with NEXTAUTH_SECRET alias). */
export function resolveAuthSigningSecret(demoFallback: string): string | null {
  return resolveSigningSecret(['AUTH_SECRET', 'NEXTAUTH_SECRET'], demoFallback);
}
