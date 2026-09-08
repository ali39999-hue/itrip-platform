/**
 * Dynamic Runtime URL & Domain Resolution
 *
 * Automatically detects the canonical application URL across environments:
 * 1. Explicit NEXT_PUBLIC_SITE_URL / NEXTAUTH_URL (custom domain)
 * 2. Vercel deployments (VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL)
 * 3. PaaS environments (Railway, Render, Fly.io)
 * 4. Dynamic request headers (x-forwarded-host / host)
 * 5. Localhost development fallback
 */

export function getAppBaseUrl(): string {
  // 1. Explicit domain configuration
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  }
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
    return process.env.NEXTAUTH_URL.replace(/\/+$/, '');
  }

  // 2. Vercel Auto-detection
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }

  // 3. Other Cloud Providers
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/\/+$/, '')}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
  }

  // 4. Fallback: Dev or standard production
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://firuzo.com';
  }

  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/**
 * Resolves base URL dynamically from an incoming HTTP request or header map.
 * Enables zero-config previews, multi-domain routing, and reverse proxy support.
 */
export function getRequestBaseUrl(headersMap?: Headers | Record<string, string | string[] | undefined>): string {
  if (headersMap) {
    const getHeader = (name: string): string | undefined => {
      if (typeof (headersMap as Headers).get === 'function') {
        return (headersMap as Headers).get(name) || undefined;
      }
      const val = (headersMap as Record<string, string | string[] | undefined>)[name.toLowerCase()];
      return Array.isArray(val) ? val[0] : val;
    };

    const forwardedHost = getHeader('x-forwarded-host') || getHeader('host');
    if (forwardedHost) {
      const proto = getHeader('x-forwarded-proto') || (forwardedHost.includes('localhost') ? 'http' : 'https');
      return `${proto}://${forwardedHost.split(',')[0].trim()}`.replace(/\/+$/, '');
    }
  }

  return getAppBaseUrl();
}
