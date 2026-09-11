import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/components/**/*.test.tsx', 'jsdom'],
    ],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    // Unit/integration tests must never touch the development database.
    // The isolated itrip_test database is provisioned via scripts/ensure-test-db.mjs
    // and `DATABASE_URL=...itrip_test npx prisma migrate deploy` (see README).
    env: {
      DEMO_MODE: 'true',
      ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
    },
    server: {
      deps: {
        inline: ['next-auth'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Server-action/domain tests transitively pull in next-auth, whose ESM
      // internals import 'next/server' (extensionless) while other files use
      // 'next/server.js' — alias every spelling so suites can load the auth
      // chain under vitest's node environment.
      'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
      'next/server.js': path.resolve(__dirname, './node_modules/next/server.js'),
      'next/headers': path.resolve(__dirname, './node_modules/next/headers.js'),
      'next/headers.js': path.resolve(__dirname, './node_modules/next/headers.js'),
      'next/cache': path.resolve(__dirname, './node_modules/next/cache.js'),
    },
  },
});
