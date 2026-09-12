import { defineConfig } from 'vitest/config';
import path from 'path';

// Unit/integration tests must never touch the development database.
// Resolves to itrip_test database even when running `npx vitest` directly.
const devDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/itrip?schema=public';
const resolvedTestDbUrl = process.env.TEST_DATABASE_URL || devDbUrl.replace(/\/itrip(\?|$)/, '/itrip_test$1');

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
    env: {
      DEMO_MODE: 'true',
      DATABASE_URL: resolvedTestDbUrl,
      TEST_DATABASE_URL: resolvedTestDbUrl,
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
