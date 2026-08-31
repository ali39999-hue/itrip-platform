import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com', 'localhost:3000', '127.0.0.1:3000'],
  experimental: {
    serverActions: {
      allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000', '*.trycloudflare.com'],
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Local dev runs behind a fake-IP VPN/DNS (198.18.0.0/15) — the optimizer's
    // SSRF guard would reject every remote image as "private IP".
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
