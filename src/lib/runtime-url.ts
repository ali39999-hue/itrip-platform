/**
 * Universal Dynamic Runtime URL & Domain Resolution
 *
 * Automatically detects and constructs the canonical application URL across all environments:
 * 1. Explicit domain envs: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL, APP_URL, NEXTAUTH_URL
 * 2. Vercel deployments (VERCEL_PROJECT_PRODUCTION_URL, VERCEL_BRANCH_URL, VERCEL_URL)
 * 3. PaaS / Container environments (Railway, Render, Fly.io, Coolify, Portainer)
 * 4. Dynamic request headers (x-forwarded-host, host, x-forwarded-proto, x-forwarded-ssl)
 * 5. Localhost & Private LAN fallback (PORT, HOSTNAME, IP addresses)
 */

function cleanUrl(urlStr: string, defaultProtocol = 'https'): string {
  let cleaned = urlStr.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    // If localhost or local numeric IP, default to http; otherwise https
    const isLocal =
      cleaned.startsWith('localhost') ||
      cleaned.startsWith('127.0.0.1') ||
      /^192\.168\./.test(cleaned) ||
      /^10\./.test(cleaned);
    cleaned = `${isLocal ? 'http' : defaultProtocol}://${cleaned}`;
  }
  return cleaned;
}

/**
 * Checks if a hostname belongs to localhost or a private LAN IP.
 */
export function isLocalOrPrivateHost(hostname: string): boolean {
  if (!hostname) return false;
  const raw = hostname.toLowerCase().trim();
  const bracketed = raw.match(/^\[(.+)\](?::\d+)?$/);
  let host: string;
  if (bracketed) {
    host = bracketed[1];
  } else if ((raw.match(/:/g) || []).length > 1) {
    host = raw;
  } else {
    host = raw.split(':')[0];
  }
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1' ||
    host.endsWith('.local') ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^10\.\d+\.\d+\.\d+$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)
  );
}

/**
 * Resolves the canonical base URL from static environment variables.
 * Safe to call anywhere: Server Components, Server Actions, Route Handlers, Workers.
 */
export function getAppBaseUrl(): string {
  // 1. Explicit site URL variables (custom domain in production or dev)
  const explicitUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.SITE_URL;

  if (explicitUrl && explicitUrl.trim()) {
    return cleanUrl(explicitUrl);
  }

  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim()) {
    return cleanUrl(process.env.NEXTAUTH_URL);
  }

  // 2. Vercel Auto-detection (Production domain, preview branch URL, or system deployment URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }

  // 3. Other Cloud / PaaS Providers
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/\/+$/, '')}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return cleanUrl(process.env.RENDER_EXTERNAL_URL);
  }
  if (process.env.FLY_APP_NAME) {
    return `https://${process.env.FLY_APP_NAME}.fly.dev`;
  }
  if (process.env.COOLIFY_URL) {
    return cleanUrl(process.env.COOLIFY_URL);
  }

  // 4. Standalone Server / Docker / Local Network environment
  const port = process.env.PORT || '3000';
  const hostname = process.env.HOSTNAME || process.env.HOST || 'localhost';

  if (process.env.NODE_ENV === 'production') {
    // If HOSTNAME is set to a real domain, use it
    if (hostname && hostname !== '0.0.0.0' && hostname !== 'localhost') {
      const proto = isLocalOrPrivateHost(hostname) ? 'http' : 'https';
      return `${proto}://${hostname}${port !== '80' && port !== '443' ? `:${port}` : ''}`;
    }
    // Standard default port
    return `http://localhost:${port}`;
  }

  return `http://localhost:${port}`;
}

/**
 * Resolves base URL dynamically from an incoming HTTP request or header map.
 * Enables zero-config previews, multi-domain routing, intranet IPs, and reverse proxy support (Nginx, Traefik, Caddy, Cloudflare).
 */
export function getRequestBaseUrl(
  headersMap?: Headers | Record<string, string | string[] | undefined>
): string {
  if (headersMap) {
    const getHeader = (name: string): string | undefined => {
      if (typeof (headersMap as Headers).get === 'function') {
        return (headersMap as Headers).get(name) || undefined;
      }
      const val = (headersMap as Record<string, string | string[] | undefined>)[name.toLowerCase()];
      return Array.isArray(val) ? val[0] : val;
    };

    // Extract first forwarded host if multiple proxies appended hosts
    const rawForwardedHost = getHeader('x-forwarded-host') || getHeader('host');
    if (rawForwardedHost) {
      const host = rawForwardedHost.split(',')[0].trim();

      // Determine protocol
      const rawProto = getHeader('x-forwarded-proto');
      let proto = rawProto ? rawProto.split(',')[0].trim().toLowerCase() : '';
      if (!proto) {
        const ssl = getHeader('x-forwarded-ssl');
        if (ssl === 'on') {
          proto = 'https';
        } else {
          proto = isLocalOrPrivateHost(host) ? 'http' : 'https';
        }
      }

      // Strip redundant standard ports
      let cleanHost = host;
      if (proto === 'https' && cleanHost.endsWith(':443')) {
        cleanHost = cleanHost.slice(0, -4);
      } else if (proto === 'http' && cleanHost.endsWith(':80')) {
        cleanHost = cleanHost.slice(0, -3);
      }

      return `${proto}://${cleanHost}`;
    }
  }

  return getAppBaseUrl();
}

/**
 * Constructs an absolute URL for a given relative path using the detected base URL.
 * Example: toAbsoluteUrl('/fa/checkout') -> 'https://my-agency.ir/fa/checkout'
 */
export function toAbsoluteUrl(
  path: string,
  headersMap?: Headers | Record<string, string | string[] | undefined>
): string {
  const base = getRequestBaseUrl(headersMap);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
