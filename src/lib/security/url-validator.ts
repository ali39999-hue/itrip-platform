/**
 * SEC-104: Canonical URL Validator & Open-Redirect Guard
 *
 * Strictly blocks open-redirect attacks by only permitting:
 * 1. Safe relative paths (preventing protocol-relative '//', backslash '/\', and control chars)
 * 2. Whitelisted trusted domains and their verified subdomains
 */

export const DEFAULT_TRUSTED_DOMAINS = [
  'itrip.ir',
  'firuzo.online',
  'localhost',
  '127.0.0.1',
];

/**
 * Checks whether a given URL is safe for redirection.
 */
export function isSafeRedirectUrl(
  urlStr: string | null | undefined,
  customTrustedDomains?: string[]
): boolean {
  if (!urlStr || typeof urlStr !== 'string') {
    return false;
  }

  const trimmed = urlStr.trim();
  if (!trimmed) return false;

  // Disallow CRLF injection
  if (/[\r\n\0]/.test(trimmed)) {
    return false;
  }

  // Safe relative paths: starts with single '/', not followed by '/' or '\'
  if (trimmed.startsWith('/')) {
    // Block '//evil.com', '/\evil.com', '/\\evil.com'
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('/%2f') || trimmed.startsWith('/%5c')) {
      return false;
    }
    // Block backslashes anywhere in path prefix
    if (trimmed.startsWith('\\')) {
      return false;
    }
    return true;
  }

  // Absolute URLs: validate scheme and hostname against trusted list
  try {
    const parsed = new URL(trimmed);

    // Reject non-http(s) protocols (javascript:, data:, vbscript:)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    const trusted = [
      ...DEFAULT_TRUSTED_DOMAINS,
      ...(customTrustedDomains || []),
    ];

    if (process.env.NEXT_PUBLIC_SITE_URL) {
      try {
        const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL);
        trusted.push(siteUrl.hostname);
      } catch {
        // ignore malformed site URL
      }
    }

    const host = parsed.hostname.toLowerCase();
    const isDomainAllowed = trusted.some((domain) => {
      const d = domain.toLowerCase().trim();
      return host === d || host.endsWith(`.${d}`);
    });

    return isDomainAllowed;
  } catch {
    return false;
  }
}

/**
 * Resolves a redirect target safely, falling back to a default relative path if unsafe.
 */
export function getSafeRedirectUrl(
  urlStr: string | null | undefined,
  fallback: string = '/',
  customTrustedDomains?: string[]
): string {
  if (isSafeRedirectUrl(urlStr, customTrustedDomains)) {
    return urlStr!.trim();
  }
  return fallback;
}

/**
 * Asserts that a redirect URL is safe, throwing an error if it fails validation.
 */
export function assertSafeRedirectUrl(
  urlStr: string,
  customTrustedDomains?: string[]
): void {
  if (!isSafeRedirectUrl(urlStr, customTrustedDomains)) {
    throw new Error(`Open redirect blocked: unsafe URL '${urlStr}'`);
  }
}
