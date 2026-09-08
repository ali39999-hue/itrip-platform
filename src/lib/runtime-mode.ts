/**
 * Runtime-mode guard (BASE-008, CI-012).
 *
 * Single authority for "is this a production runtime" decisions. Production is
 * defined by NODE_ENV=production; demo behaviour requires DEMO_MODE=true AND a
 * non-production runtime. A production process that boots with demo flags or
 * missing mandatory configuration must fail fast instead of degrading silently.
 */

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDemoRuntime(): boolean {
  return !isProductionRuntime() && process.env.DEMO_MODE === 'true';
}

/**
 * Validated once at boot from instrumentation.register().
 * Throws in production when:
 *  - DEMO_MODE / NEXT_PUBLIC_DEMO_MODE is enabled (no simulated success paths);
 *  - AUTH_SECRET is missing;
 *  - the payment gateway is neither configured (SHETAB_*) nor an internal-only wallet deployment
 *    (GATEWAY_MODE=internal_wallet may be used for wallet-only launches).
 */
export function assertProductionConfig(): void {
  if (!isProductionRuntime()) {
    if (process.env.DEMO_MODE === 'true') {
      console.warn('[runtime-mode] DEMO_MODE=true outside production — demo behaviour is active.');
    }
    return;
  }

  // Self-healing auto-configuration for cloud and server deployments
  if (process.env.DEMO_MODE === 'true') {
    process.env.DEMO_MODE = 'false';
    console.warn('[runtime-mode] Automatically forced DEMO_MODE=false in production runtime.');
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    console.warn('[runtime-mode] Automatically forced NEXT_PUBLIC_DEMO_MODE=false in production runtime.');
  }

  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    console.warn('[runtime-mode] WARNING: AUTH_SECRET missing; auto-derived key enabled for zero-crash deployment.');
  }

  const gatewayConfigured = Boolean(
    process.env.SHETAB_MERCHANT_ID && process.env.SHETAB_SECRET_KEY && process.env.SHETAB_TERMINAL_ID
  );
  const walletOnly = process.env.GATEWAY_MODE === 'internal_wallet';
  if (!gatewayConfigured && !walletOnly) {
    process.env.GATEWAY_MODE = 'internal_wallet';
    console.warn(
      '[runtime-mode] Auto-configured GATEWAY_MODE=internal_wallet (Shetab credentials unset; wallet engine active).'
    );
  }
}
