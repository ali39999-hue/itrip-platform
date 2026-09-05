import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    // Unit/integration tests must never touch the development database.
    // The isolated itrip_test database is provisioned via scripts/ensure-test-db.mjs
    // and `DATABASE_URL=...itrip_test npx prisma migrate deploy` (see README).
    env: process.env.TEST_DATABASE_URL
      ? { DATABASE_URL: process.env.TEST_DATABASE_URL }
      : {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
    },
  },
});
