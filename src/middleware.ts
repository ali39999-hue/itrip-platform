import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { validateCsrfRequest } from './lib/security/csrf-protection';
import { isSafeRedirectUrl } from './lib/security/url-validator';

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Define route access mapped strictly to canonical relational permissions (IAM-107)
const ROUTE_REQUIRED_PERMISSIONS: Record<string, string[]> = {
  '/admin/finance/settlements': ['finance:view', 'finance:reports:view', 'finance:settlement:match'],
  '/admin/finance': ['finance:view', 'finance:reports:view'],
  '/admin/users': ['user:manage', 'ops:override:cancel'],
  '/admin/bookings': ['booking:view:all'],
  '/admin/ops': ['ops:override:cancel'],
  '/admin/content': ['catalog:hotels:edit', 'catalog:flights:edit'],
  '/admin/travel-files': ['booking:view:all', 'ops:override:cancel'],
  '/admin/exceptions': ['ops:override:cancel', 'booking:view:all'],
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

  // 1. Handle API routes: enforce CSRF on state mutations and attach correlation headers
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
    return withCorrelation(NextResponse.next());
  }

  // 1b. Skip auth & i18n for _next, static files, fonts, and public assets
  // robots.txt / sitemap.xml are app metadata routes — locale-prefixed variants
  // don't exist, so they must never be handed to intlMiddleware.
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/fonts/') ||
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

  // Extract valid locale if present
  const localeMatch = pathname.match(/^\/(fa|en|ar|zh|ru)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'fa';

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

  // 3. Handle /admin paths (with or without locale prefix)
  const isAdminPath = pathname.match(/^\/(?:(?:fa|en|ar|zh|ru)\/)?admin(?:\/|$)/);
  
  if (isAdminPath) {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      // No secret configured — block admin access entirely
      return withCorrelation(NextResponse.redirect(new URL('/' + locale + '/auth', request.url)));
    }

    // Get next-auth token safely without throwing
    try {
      const token = await getToken({
        req: request,
        secret
      });

      // Check if logged in user has sufficient canonical permissions for admin sub-routes (IAM-107)
      if (token) {
        const userPerms = (token.permissions as string[]) || [];
        const normalizedPath = pathname.replace(/^\/(fa|en|ar|zh|ru)/, '');
        const matchingRoute = Object.keys(ROUTE_REQUIRED_PERMISSIONS)
          .sort((a, b) => b.length - a.length)
          .find(route => normalizedPath === route || normalizedPath.startsWith(route + '/'));

        if (matchingRoute) {
          const requiredPerms = ROUTE_REQUIRED_PERMISSIONS[matchingRoute];
          // Canonical relational check: user must possess at least one of the route's required
          // permissions. `'*'` is only ever minted server-side for SUPER_ADMIN (src/auth.ts).
          const hasAccess = userPerms.includes('*') || requiredPerms.some((p) => userPerms.includes(p));
          if (!hasAccess) {
            return withCorrelation(NextResponse.redirect(new URL('/' + locale + '/account', request.url)));
          }
        }
      } else {
        // Unauthenticated user trying to access admin — redirect to auth
        return withCorrelation(NextResponse.redirect(new URL('/' + locale + '/auth', request.url)));
      }
    } catch {
      // Fail closed: an unreadable token never grants admin access.
      return withCorrelation(NextResponse.redirect(new URL('/' + locale + '/auth', request.url)));
    }
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
