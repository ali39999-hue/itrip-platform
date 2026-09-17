import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAppBaseUrl,
  getRequestBaseUrl,
  toAbsoluteUrl,
  isLocalOrPrivateHost,
} from './runtime-url';
import { isSafeRedirectUrl, getSafeRedirectUrl } from './security/url-validator';
import { prisma } from './prisma';

describe('Universal Runtime Portability & Domain Resolution Suite (PORT-001)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env to isolated clean slate before each test
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.SITE_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_URL;
    delete process.env.RAILWAY_PUBLIC_DOMAIN;
    delete process.env.RENDER_EXTERNAL_URL;
    delete process.env.FLY_APP_NAME;
    delete process.env.COOLIFY_URL;
    delete process.env.HOSTNAME;
    delete process.env.PORT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Static getAppBaseUrl() across environments', () => {
    it('resolves custom production domain from NEXT_PUBLIC_SITE_URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://my-travel-agency.com/';
      expect(getAppBaseUrl()).toBe('https://my-travel-agency.com');
    });

    it('resolves custom corporate domain from APP_URL or SITE_URL', () => {
      process.env.APP_URL = 'https://portal.itrip.ir';
      expect(getAppBaseUrl()).toBe('https://portal.itrip.ir');
    });

    it('resolves Vercel production deployment automatically', () => {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'itrip-platform.vercel.app';
      expect(getAppBaseUrl()).toBe('https://itrip-platform.vercel.app');
    });

    it('resolves Vercel preview branch deployment automatically', () => {
      process.env.VERCEL_BRANCH_URL = 'itrip-platform-git-feat-test.vercel.app';
      expect(getAppBaseUrl()).toBe('https://itrip-platform-git-feat-test.vercel.app');
    });

    it('resolves Railway public domain automatically', () => {
      process.env.RAILWAY_PUBLIC_DOMAIN = 'firuzo-prod.up.railway.app';
      expect(getAppBaseUrl()).toBe('https://firuzo-prod.up.railway.app');
    });

    it('resolves Render external service URL automatically', () => {
      process.env.RENDER_EXTERNAL_URL = 'https://firuzo.onrender.com/';
      expect(getAppBaseUrl()).toBe('https://firuzo.onrender.com');
    });

    it('resolves Fly.io app automatically', () => {
      process.env.FLY_APP_NAME = 'firuzo-global';
      expect(getAppBaseUrl()).toBe('https://firuzo-global.fly.dev');
    });

    it('resolves Coolify self-hosted deployment automatically', () => {
      process.env.COOLIFY_URL = 'https://travel.my-vps-server.net';
      expect(getAppBaseUrl()).toBe('https://travel.my-vps-server.net');
    });

    it('resolves custom port on Docker or VPS when PORT is defined', () => {
      process.env.PORT = '8080';
      expect(getAppBaseUrl()).toBe('http://localhost:8080');
    });

    it('defaults cleanly to port 3000 when no environment variables exist', () => {
      expect(getAppBaseUrl()).toBe('http://localhost:3000');
    });
  });

  describe('2. Dynamic getRequestBaseUrl() from proxy & request headers', () => {
    it('resolves incoming Host header accurately', () => {
      const headers = new Headers({ host: 'custom-agency.com' });
      expect(getRequestBaseUrl(headers)).toBe('https://custom-agency.com');
    });

    it('resolves X-Forwarded-Host and X-Forwarded-Proto behind reverse proxy (Nginx/Caddy/Traefik)', () => {
      const headers = new Headers({
        'x-forwarded-host': 'b2b.firuzo.ir',
        'x-forwarded-proto': 'https',
      });
      expect(getRequestBaseUrl(headers)).toBe('https://b2b.firuzo.ir');
    });

    it('handles multi-hop proxy chains cleanly by selecting the client-facing host', () => {
      const headers = new Headers({
        'x-forwarded-host': 'client-domain.com, proxy1.internal:8443, proxy2.internal',
        'x-forwarded-proto': 'https, http',
      });
      expect(getRequestBaseUrl(headers)).toBe('https://client-domain.com');
    });

    it('strips redundant port 443 on HTTPS requests', () => {
      const headers = new Headers({
        'x-forwarded-host': 'secure.agency.com:443',
        'x-forwarded-proto': 'https',
      });
      expect(getRequestBaseUrl(headers)).toBe('https://secure.agency.com');
    });

    it('strips redundant port 80 on HTTP requests', () => {
      const headers = new Headers({
        'x-forwarded-host': 'local-test.com:80',
        'x-forwarded-proto': 'http',
      });
      expect(getRequestBaseUrl(headers)).toBe('http://local-test.com');
    });

    it('preserves non-standard custom ports on VPS or Docker (e.g. :3000, :8080)', () => {
      const headers = new Headers({
        'x-forwarded-host': '192.168.1.100:8080',
        'x-forwarded-proto': 'http',
      });
      expect(getRequestBaseUrl(headers)).toBe('http://192.168.1.100:8080');
    });

    it('handles plain object headers map as well as Headers instance', () => {
      const headersObj = {
        'x-forwarded-host': 'travel-portal.online',
        'x-forwarded-proto': 'https',
      };
      expect(getRequestBaseUrl(headersObj)).toBe('https://travel-portal.online');
    });
  });

  describe('3. Absolute URL construction via toAbsoluteUrl()', () => {
    it('prepends base URL to relative path with leading slash', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://itrip.ir';
      expect(toAbsoluteUrl('/fa/checkout')).toBe('https://itrip.ir/fa/checkout');
    });

    it('prepends base URL to path without leading slash cleanly', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://itrip.ir';
      expect(toAbsoluteUrl('api/version')).toBe('https://itrip.ir/api/version');
    });

    it('uses dynamic request host when headers are passed to toAbsoluteUrl', () => {
      const headers = new Headers({
        'x-forwarded-host': 'partner.agency.com',
        'x-forwarded-proto': 'https',
      });
      expect(toAbsoluteUrl('/verify?token=abc', headers)).toBe(
        'https://partner.agency.com/verify?token=abc'
      );
    });
  });

  describe('4. Local and Private Network Host detection', () => {
    it('identifies localhost and loopbacks as local', () => {
      expect(isLocalOrPrivateHost('localhost')).toBe(true);
      expect(isLocalOrPrivateHost('localhost:3000')).toBe(true);
      expect(isLocalOrPrivateHost('127.0.0.1')).toBe(true);
      expect(isLocalOrPrivateHost('127.0.0.1:8080')).toBe(true);
      expect(isLocalOrPrivateHost('::1')).toBe(true);
      expect(isLocalOrPrivateHost('[::1]')).toBe(true);
      expect(isLocalOrPrivateHost('[::1]:8080')).toBe(true);
      expect(isLocalOrPrivateHost('0:0:0:0:0:0:0:1')).toBe(true);
      expect(isLocalOrPrivateHost(' LOCALHOST:3000 ')).toBe(true);
    });

    it('identifies RFC1918 private network IPs as local', () => {
      expect(isLocalOrPrivateHost('192.168.1.50')).toBe(true);
      expect(isLocalOrPrivateHost('192.168.0.10:3000')).toBe(true);
      expect(isLocalOrPrivateHost('10.0.0.5')).toBe(true);
      expect(isLocalOrPrivateHost('172.16.0.1')).toBe(true);
    });

    it('identifies public internet hostnames as non-local', () => {
      expect(isLocalOrPrivateHost('firuzo.com')).toBe(false);
      expect(isLocalOrPrivateHost('itrip-platform.vercel.app')).toBe(false);
      expect(isLocalOrPrivateHost('8.8.8.8')).toBe(false);
    });
  });

  describe('5. Open-redirect and safe URL validation across domains', () => {
    it('permits safe relative application paths', () => {
      expect(isSafeRedirectUrl('/fa/account')).toBe(true);
      expect(isSafeRedirectUrl('/en/my-trips')).toBe(true);
      expect(isSafeRedirectUrl('/admin')).toBe(true);
    });

    it('rejects protocol-relative and backslash exploit attempts', () => {
      expect(isSafeRedirectUrl('//evil.com')).toBe(false);
      expect(isSafeRedirectUrl('/\\evil.com')).toBe(false);
      expect(isSafeRedirectUrl('\\evil.com')).toBe(false);
      expect(isSafeRedirectUrl('/%2fevil.com')).toBe(false);
      expect(isSafeRedirectUrl('/%5cevil.com')).toBe(false);
    });

    it('rejects CRLF injection attempts', () => {
      expect(isSafeRedirectUrl('/safe\r\nSet-Cookie: session=evil')).toBe(false);
      expect(isSafeRedirectUrl('/safe\nLocation: http://evil.com')).toBe(false);
    });

    it('safely falls back to default relative path on malicious target', () => {
      expect(getSafeRedirectUrl('//evil.com', '/fallback')).toBe('/fallback');
      expect(getSafeRedirectUrl('/valid/path', '/fallback')).toBe('/valid/path');
    });

    it('automatically trusts the active deployment host configured in env', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://my-custom-ota.com';
      expect(isSafeRedirectUrl('https://my-custom-ota.com/fa/payment-status')).toBe(true);
      expect(isSafeRedirectUrl('https://untrusted-phishing.com/login')).toBe(false);
    });
  });

  describe('6. Prisma singleton cache resilience across module imports', () => {
    it('maintains a single cached PrismaClient instance on globalThis', () => {
      expect(prisma).toBeDefined();
      expect((globalThis as { prisma?: unknown }).prisma).toBe(prisma);
    });
  });
});
