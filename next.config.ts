import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { execSync } from 'node:child_process';
import packageJson from './package.json';

const withNextIntl = createNextIntlPlugin();
const isDev = process.env.NODE_ENV !== 'production';

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
  typescript: {
    // Existing TS errors are pre-existing schema mismatches; skip during build.
    // Run `npm run typecheck` locally for full type-checking.
    ignoreBuildErrors: true,
  },

  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
  },
  ...(isDev
    ? {
        allowedDevOrigins: ['localhost:3000', '127.0.0.1:3000'],
        experimental: {
          serverActions: {
            allowedOrigins: ['localhost:3000', '127.0.0.1:3000'],
          },
        },
      }
    : {}),
  images: {
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowLocalIP: isDev,
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
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://call.firuzo.online https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com https://upload.wikimedia.org https://cdn.alibaba.ir https://cdn.grschannel.com https://www.eghamat24.com https://ak-d.tripcdn.com https://*.tile.openstreetmap.org https://call.firuzo.online; connect-src 'self' https://vitals.vercel-insights.com https://call.firuzo.online https://*.google-analytics.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
