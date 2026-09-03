import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
const isDevOrDemo = process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true';

const nextConfig: NextConfig = {
  ...(isDevOrDemo
    ? {
        allowedDevOrigins: ['*.trycloudflare.com', 'localhost:3000', '127.0.0.1:3000'],
        experimental: {
          serverActions: {
            allowedOrigins: ['localhost:3000', '127.0.0.1:3000', '*.trycloudflare.com'],
          },
        },
      }
    : {}),
  images: {
    formats: ['image/avif', 'image/webp'],
    // Local dev / demo runs behind a fake-IP VPN/DNS (198.18.0.0/15)
    dangerouslyAllowLocalIP: isDevOrDemo,
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
};

export default withNextIntl(nextConfig);
