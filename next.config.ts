import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  output: 'standalone',
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
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com https://upload.wikimedia.org https://cdn.alibaba.ir https://cdn.grschannel.com https://www.eghamat24.com https://ak-d.tripcdn.com https://*.tile.openstreetmap.org; connect-src 'self' https://vitals.vercel-insights.com; frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
