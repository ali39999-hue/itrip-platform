import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Define route permissions mapped to required roles or permissions
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/admin/finance': ['SUPER_ADMIN', 'FINANCE'],
  '/admin/bookings': ['SUPER_ADMIN', 'FINANCE', 'OPS'],
  '/admin': ['SUPER_ADMIN', 'FINANCE', 'OPS'], // general admin access
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Skip auth & i18n for api, _next, static files, and public routes
  if (
    pathname.startsWith('/api/') || 
    pathname.startsWith('/_next/') || 
    pathname === '/favicon.ico' ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)
  ) {
    return NextResponse.next();
  }

  // Extract valid locale if present
  const localeMatch = pathname.match(/^\/(fa|en|ar|zh|ru)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'fa';

  // 2. Handle /login or /[locale]/login alias -> redirect to /[locale]/auth
  if (pathname === '/login' || pathname.match(/^\/(fa|en|ar|zh|ru)\/login$/)) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
    const authUrl = new URL('/' + locale + '/auth', request.url);
    if (callbackUrl) {
      authUrl.searchParams.set('callbackUrl', callbackUrl);
    }
    return NextResponse.redirect(authUrl);
  }

  // 3. Handle /admin paths (with or without locale prefix)
  const isAdminPath = pathname.match(/^\/([a-z]{2}\/)?admin/);
  
  if (isAdminPath) {
    const secret = process.env.AUTH_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET is required in production environment');
    }

    // Get next-auth token
    const token = await getToken({ 
      req: request, 
      secret: secret || 'demo-secret-key-firuzo-2026'
    });

    // Check if token exists in NextAuth JWT
    if (token) {
      const userRole = (token.role as string) || 'CUSTOMER';
      const normalizedPath = pathname.replace(/^\/(fa|en|ar|zh|ru)/, '');
      const matchingRoute = Object.keys(ROUTE_PERMISSIONS)
        .sort((a, b) => b.length - a.length)
        .find(route => normalizedPath.startsWith(route) || normalizedPath === route);

      if (matchingRoute) {
        const allowedRoles = ROUTE_PERMISSIONS[matchingRoute];
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL('/' + locale + '/account', request.url));
        }
      }
    }
  }

  // 4. Delegate to next-intl middleware for routing/redirects (if not an API route)
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Apply middleware to all routes except api, _next/static, _next/image, favicon.ico
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
