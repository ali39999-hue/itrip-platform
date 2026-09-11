/**
 * SEC-103: Canonical CSRF & Mutation Protection Engine
 *
 * Enforces strict Origin / Referer validation and Sec-Fetch-Site guards on all
 * state-changing HTTP requests (POST, PUT, PATCH, DELETE), while permitting
 * cryptographically signed webhooks and bearer-authenticated service endpoints.
 */

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Routes exempt from CSRF checks due to explicit cryptographic authentication */
const EXEMPT_PATH_PREFIXES = [
  '/api/payments/webhook', // Verified by HMAC-SHA256 signature
  '/api/auth',             // NextAuth handles its own anti-CSRF tokens
  // Gateway browser-return callbacks (BUG-005): UX-only handlers that resolve a
  // payment and redirect to /payment-status. They mutate nothing — capture
  // authority stays with the HMAC-verified webhook above — but the POST variant
  // of a PSP browser flow is by definition cross-site and cannot carry our CSRF
  // tokens.
  '/api/payments/callback',
  '/api/payments/ecardo/callback',
];

export interface CsrfValidationOptions {
  allowedOrigins?: string[];
  exemptPaths?: string[];
}

export interface CsrfCheckResult {
  valid: boolean;
  reason?: string;
}

/**
 * Extracts a normalized origin from an incoming URL or header string.
 */
function extractOrigin(urlOrHost: string): string | null {
  if (!urlOrHost) return null;
  try {
    const url = new URL(urlOrHost.includes('://') ? urlOrHost : `https://${urlOrHost}`);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Validates state-changing requests against CSRF threats.
 */
export function validateCsrfRequest(
  request: Request | { headers: Headers; url: string; method: string },
  options: CsrfValidationOptions = {}
): CsrfCheckResult {
  const method = request.method.toUpperCase();

  // Safe read-only methods (GET, HEAD, OPTIONS) do not require mutation CSRF checks
  if (!STATE_CHANGING_METHODS.has(method)) {
    return { valid: true };
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check exempt paths
  const exemptPaths = options.exemptPaths ?? EXEMPT_PATH_PREFIXES;
  if (exemptPaths.some((prefix) => pathname.startsWith(prefix))) {
    return { valid: true };
  }

  // Check if Bearer Authorization header is present (non-cookie API calls)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return { valid: true };
  }

  // Check Sec-Fetch-Site header (modern browsers)
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return { valid: false, reason: 'Cross-site request blocked by Sec-Fetch-Site policy' };
  }

  // Determine expected origin from Host / X-Forwarded-Host / NEXT_PUBLIC_SITE_URL
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const protocol = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http';
  const expectedOrigin = `${protocol}://${host}`.toLowerCase();

  const allowedOrigins = new Set(
    (options.allowedOrigins || []).map((o) => o.toLowerCase())
  );
  allowedOrigins.add(expectedOrigin);

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const siteUrlOrigin = extractOrigin(process.env.NEXT_PUBLIC_SITE_URL);
    if (siteUrlOrigin) allowedOrigins.add(siteUrlOrigin);
  }

  // Allow local dev origins
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
  }

  // Check Origin header first
  const origin = request.headers.get('origin');
  if (origin) {
    const normalizedOrigin = extractOrigin(origin);
    if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) {
      return { valid: true };
    }
    return { valid: false, reason: `Origin header mismatch: ${origin} not in allowed origins` };
  }

  // Fallback to Referer header if Origin is absent
  const referer = request.headers.get('referer');
  if (referer) {
    const refererOrigin = extractOrigin(referer);
    if (refererOrigin && allowedOrigins.has(refererOrigin)) {
      return { valid: true };
    }
    return { valid: false, reason: `Referer header mismatch: ${referer} not in allowed origins` };
  }

  // If request contains cookies but neither Origin nor Referer is provided
  const cookie = request.headers.get('cookie');
  if (cookie) {
    // A browser state-changing request carrying session cookies must supply Origin or Referer
    return {
      valid: false,
      reason: 'State-changing request carrying cookies lacks Origin or Referer header',
    };
  }

  // Request without cookies and without Origin/Referer (e.g. server-to-server or test runner)
  return { valid: true };
}
