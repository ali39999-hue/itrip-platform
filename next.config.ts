import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { execSync } from 'node:child_process';
import os from 'node:os';
import packageJson from './package.json';

const withNextIntl = createNextIntlPlugin();
const isDev = process.env.NODE_ENV !== 'production';

function getLocalNetworkOrigins(): string[] {
  const origins = new Set<string>();
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          origins.add(`${net.address}:3000`);
          origins.add(net.address);
        }
      }
    }
  } catch {
    // fallback safely
  }
  return Array.from(origins);
}

const envAllowed = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];

const baseAllowedOrigins = [
  'localhost:3000',
  '127.0.0.1:3000',
  '*.vercel.app',
  '*.firuzo.com',
  'firuzo.com',
  '*.firuzo.online',
  'firuzo.online',
  'call.firuzo.online',
  ...(isDev ? ['*.trycloudflare.com'] : []),
  ...envAllowed,
];

const allAllowedOrigins = Array.from(
  new Set([
    ...baseAllowedOrigins,
    ...(isDev ? getLocalNetworkOrigins() : []),
  ])
);

let commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '';
if (!commitSha) {
  try {
    commitSha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    commitSha = 'cf45237';
  }
}
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version || '1.2.0';

// CI-012 / BASE-008 — A production build with demo behaviour enabled is a
// hard error: simulated success paths must never be able to ship. Demo builds
// must explicitly target a non-production runtime (NODE_ENV != production).
if (!isDev && process.env.DEMO_MODE === 'true') {
  throw new Error(
    'CI-012: Refusing production build with DEMO_MODE=true. Set DEMO_MODE=false (or build for a non-production runtime).'
  );
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  // Build-time type checking stays enabled: `npm run typecheck` must pass
  // before any build (the old ignoreBuildErrors gate is intentionally gone).
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
  },
  ...(isDev
    ? {
        allowedDevOrigins: allAllowedOrigins,
      }
    : {}),
  experimental: {
    serverActions: {
      allowedOrigins: allAllowedOrigins,
    },
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowLocalIP: isDev,
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 800],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'cdn.alibaba.ir',
      },
      {
        protocol: 'https',
        hostname: 'cdn.grschannel.com',
      },
      {
        protocol: 'https',
        hostname: 'www.eghamat24.com',
      },
      {
        protocol: 'https',
        hostname: 'ak-d.tripcdn.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://call.firuzo.online https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com https://upload.wikimedia.org https://cdn.alibaba.ir https://cdn.grschannel.com https://www.eghamat24.com https://ak-d.tripcdn.com https://*.tile.openstreetmap.org https://call.firuzo.online https://ecardo.ir https://api.ecardo.ir; connect-src 'self' https://vitals.vercel-insights.com https://call.firuzo.online https://*.google-analytics.com https://ecardo.ir https://api.ecardo.ir; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://ecardo.ir https://api.ecardo.ir;",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:locale/planner',
        destination: '/:locale/plan',
        permanent: true,
      },
      {
        source: '/planner',
        destination: '/fa/plan',
        permanent: true,
      },
      {
        source: '/:locale/auth/login',
        destination: '/:locale/auth',
        permanent: true,
      },
      {
        source: '/:locale/auth/signin',
        destination: '/:locale/auth',
        permanent: true,
      },
      {
        source: '/:locale/terms',
        destination: '/:locale/guide',
        permanent: false,
      },
      {
        source: '/:locale/privacy',
        destination: '/:locale/guide',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
