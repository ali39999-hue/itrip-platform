import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { validateCsrfRequest } from './lib/security/csrf-protection';
import { isSafeRedirectUrl } from './lib/security/url-validator';
import { RateLimiter } from './lib/security/rate-limiter';
import {
  NEXT_LOCALE_COOKIE,
  countryToLocale,
  detectCountryFromHeaders,
  getFirstVisitLocale,
  isSupportedLocale,
} from './lib/locale-detection';

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Define route access mapped strictly to canonical relational permissions (IAM-107)
const ROUTE_REQUIRED_PERMISSIONS: Record<string, string[]> = {
  '/admin/operator': ['booking:view:all'],
  '/admin/finance/settlements': ['finance:view', 'finance:reports:view', 'finance:settlement:match'],
  '/admin/finance': ['finance:view', 'finance:reports:view'],
  '/admin/users': ['user:manage'],
  '/admin/bookings': ['booking:view:all'],
  '/admin/ops': ['ops:override:cancel'],
  '/admin/tours': ['catalog:hotels:edit', 'catalog:flights:edit'],
  '/admin/content': ['catalog:hotels:edit', 'catalog:flights:edit'],
  '/admin/travel-files': ['booking:view:all', 'ops:override:cancel'],
  '/admin/exceptions': ['ops:override:cancel', 'booking:view:all'],
  '/admin/logs': ['audit:view', 'ops:override:cancel', 'booking:view:all'],
  '/admin/suppliers': ['supplier:view'],
  '/admin/inventory': ['inventory:view'],
  '/admin/organizations': ['booking:view:all', 'user:manage'],
  '/admin/referrals': ['booking:view:all'],
  '/admin': ['booking:view:all', 'ops:override:cancel', 'finance:view'], // general admin back-office access
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // OBS-001 (lite): every response carries a correlation id — generated here
  // when the caller (LB/CDN) did not supply one — so clients and logs can be
  // correlated end-to-end. Request-scoped propagation into server actions is
  // tracked as remaining OBS work.
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
  const withCorrelation = (response: NextResponse): NextResponse => {
    response.headers.set('x-correlation-id', correlationId);
    return response;
  };

  // 1. Handle API routes: enforce CSRF on state mutations, rate limiting, and attach correlation headers
  if (pathname.startsWith('/api/')) {
    const csrfCheck = validateCsrfRequest(request);
    if (!csrfCheck.valid) {
      return withCorrelation(
        NextResponse.json(
          { success: false, error: `Forbidden: CSRF validation failed (${csrfCheck.reason})` },
          { status: 403 }
        )
      );
    }

    // Rate limit sensitive authentication routes against brute-force and OTP flooding
    if (pathname.startsWith('/api/auth/')) {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const rateCheck = await RateLimiter.checkRateLimit(`ratelimit:auth:${clientIp}`, 30, 60);
      if (!rateCheck.allowed) {
        return withCorrelation(
          NextResponse.json(
            { success: false, error: 'Too many requests. Please slow down and try again.' },
            { status: 429, headers: { 'Retry-After': '60' } }
          )
        );
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-correlation-id', correlationId);
    return withCorrelation(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // 1b. Skip auth & i18n for _next, static files, fonts, and public assets
  // robots.txt / sitemap.xml are app metadata routes — locale-prefixed variants
  // don't exist, so they must never be handed to intlMiddleware.
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/ocr/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/offline.html' ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|ico)$/)
  ) {
    return withCorrelation(NextResponse.next());
  }

  // Preferred locale for prefix-less paths: explicit NEXT_LOCALE cookie
  // first, then IP/CDN country, then the legacy 'fa' fallback. A locale
  // prefix already in the URL always wins (handled by next-intl below).
  const cookieLocale = request.cookies.get(NEXT_LOCALE_COOKIE)?.value;
  const ipCountry = detectCountryFromHeaders((name) => request.headers.get(name));
  const preferredLocale = isSupportedLocale(cookieLocale)
    ? cookieLocale
    : (countryToLocale(ipCountry) ?? 'fa');

  // Extract valid locale if present
  const localeMatch = pathname.match(/^\/(fa|en|ar|zh|ru)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : preferredLocale;

  // 2. Handle /login, /signin or /[locale]/(login|signin|auth/signin) aliases -> redirect to /[locale]/auth (SEC-104 open redirect check)
  if (
    pathname === '/login' ||
    pathname === '/signin' ||
    pathname === '/sign-in' ||
    pathname.match(/^\/(fa|en|ar|zh|ru)\/(login|signin|sign-in|auth\/signin|auth\/sign-in)$/)
  ) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
    const authUrl = new URL('/' + locale + '/auth', request.url);
    if (callbackUrl && isSafeRedirectUrl(callbackUrl)) {
      authUrl.searchParams.set('callbackUrl', callbackUrl);
    }
    return withCorrelation(NextResponse.redirect(authUrl));
  }

  // 2b. Handle /erp or /[locale]/erp aliases -> redirect to /[locale]/admin
  const erpMatch = pathname.match(/^\/(?:(fa|en|ar|zh|ru)\/)?erp(?:\/(.*))?$/);
  if (erpMatch) {
    const targetLocale = erpMatch[1] || locale;
    const subPath = erpMatch[2] ? `/${erpMatch[2]}` : '';
    return withCorrelation(NextResponse.redirect(new URL(`/${targetLocale}/admin${subPath}`, request.url)));
  }

  // 3. Handle /admin paths (with or without locale prefix)
  const isAdminPath = pathname.match(/^\/(?:(?:fa|en|ar|zh|ru)\/)?admin(?:\/|$)/);

  if (isAdminPath) {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      // No secret configured — block admin access entirely
      const authUrl = new URL('/' + locale + '/auth', request.url);
      authUrl.searchParams.set('callbackUrl', pathname);
      return withCorrelation(NextResponse.redirect(authUrl));
    }

    // Get next-auth token safely without throwing.
    // In production over HTTPS (Vercel), NextAuth v5 uses the __Secure- prefix and matching salt.
    const hasSecureCookie =
      request.cookies.has('__Secure-authjs.session-token') ||
      request.cookies.has('__Secure-next-auth.session-token');

    const isSecure =
      hasSecureCookie ||
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https';

    try {
      let token = await getToken({
        req: request,
        secret,
        secureCookie: isSecure,
      });

      // Robust fallback: if token wasn't resolved, try alternate secureCookie mode
      if (!token) {
        token = await getToken({
          req: request,
          secret,
          secureCookie: !isSecure,
        });
      }

      // Legacy fallback for next-auth cookie names if still not found
      if (!token) {
        if (hasSecureCookie) {
          token = await getToken({
            req: request,
            secret,
            cookieName: '__Secure-next-auth.session-token',
            secureCookie: true,
          });
        } else {
          token = await getToken({
            req: request,
            secret,
            cookieName: 'next-auth.session-token',
            secureCookie: false,
          });
        }
      }

      // Check if logged in user has sufficient canonical permissions for admin sub-routes (IAM-107)
      if (token) {
        const userPerms = (token.permissions as string[]) || [];
        const userRole = (token.role as string) || '';
        const tokenEmail = (token.email as string) || '';
        const isSuperOrAdmin =
          userRole === 'SUPER_ADMIN' ||
          userRole === 'ADMIN' ||
          tokenEmail === 'admin@firuzo.com' ||
          tokenEmail.startsWith('admin@');
        const normalizedPath = pathname.replace(/^\/(fa|en|ar|zh|ru)/, '');
        const matchingRoute = Object.keys(ROUTE_REQUIRED_PERMISSIONS)
          .sort((a, b) => b.length - a.length)
          .find(route => normalizedPath === route || normalizedPath.startsWith(route + '/'));

        if (matchingRoute) {
          const requiredPerms = ROUTE_REQUIRED_PERMISSIONS[matchingRoute];
          // Canonical relational check: user must possess at least one of the route's required
          // permissions. `'*'` is only ever minted server-side for SUPER_ADMIN (src/auth.ts).
          const hasAccess = isSuperOrAdmin || userPerms.includes('*') || requiredPerms.some((p) => userPerms.includes(p));
          if (!hasAccess) {
            return withCorrelation(NextResponse.redirect(new URL('/' + locale + '/account', request.url)));
          }
        }
      } else {
        // Unauthenticated user trying to access admin — redirect to auth with callbackUrl
        const authUrl = new URL('/' + locale + '/auth', request.url);
        authUrl.searchParams.set('callbackUrl', pathname);
        return withCorrelation(NextResponse.redirect(authUrl));
      }
    } catch {
      // Fail closed: an unreadable token never grants admin access.
      const authUrl = new URL('/' + locale + '/auth', request.url);
      authUrl.searchParams.set('callbackUrl', pathname);
      return withCorrelation(NextResponse.redirect(authUrl));
    }
  }

  // 3b. First-visit IP locale: prefix-less page navigation with no stored
  // choice redirects to the IP-detected locale (and stores it, so next-intl
  // and later visits honor the same choice). Explicit prefixes, stored
  // cookies, and unknown countries fall through to next-intl unchanged.
  const hasLocalePrefix = localeMatch !== null;
  const hasLocaleCookie = isSupportedLocale(cookieLocale);
  const firstVisitLocale = getFirstVisitLocale({ cookieLocale, country: ipCountry });
  // GET/HEAD only: never reroute mutations (form posts, server actions).
  const isNavigational = request.method === 'GET' || request.method === 'HEAD';
  if (isNavigational && !hasLocalePrefix && !hasLocaleCookie && firstVisitLocale && ipCountry) {
    const url = request.nextUrl.clone();
    url.pathname = `/${firstVisitLocale}${pathname === '/' ? '' : pathname}`;
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set(NEXT_LOCALE_COOKIE, firstVisitLocale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    });
    return withCorrelation(redirect);
  }

  // 4. Delegate to next-intl middleware for routing/redirects (if not an API route)
  return withCorrelation(intlMiddleware(request));
}

export const config = {
  matcher: [
    // Include /api for CSRF and correlation tracing
    '/api/:path*',
    // Apply middleware to all pages except _next/static, _next/image, favicon.ico, fonts,
    // and root-level SEO/PWA endpoints (robots.txt, sitemap.xml, manifest.json, sw.js, offline.html)
    '/((?!_next/static|_next/image|favicon.ico|fonts|robots.txt|sitemap.xml|manifest.json|sw.js|offline.html).*)',
  ],
};
