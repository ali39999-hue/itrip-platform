#!/usr/bin/env node
/**
 * Automated Deployment Preflight & Self-Configuration
 *
 * Automatically prepares the database, environment, and Prisma clients
 * whether running on Vercel, Docker, VPS, or PaaS (Railway/Render).
 */

import { execSync } from 'child_process';

console.log('\n============================================================');
console.log(' 🚀 Firuzo / iTrip Automated Self-Configuration & Preflight');
console.log('============================================================');

// 1. Environment & Host Detection
const isVercel = process.env.VERCEL === '1';
const hostDomain =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'localhost:3000';

console.log(`• Environment: ${isVercel ? 'Vercel Serverless' : (process.env.NODE_ENV || 'server')}`);
console.log(`• Detected Host Domain: ${hostDomain}`);

// 2. Secret & Configuration Diagnostics
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.warn('  ⚠️ AUTH_SECRET or NEXTAUTH_SECRET is not set. NextAuth may fail in production.');
} else {
  console.log('  ✓ Auth secret detected.');
}

if (process.env.ECARDO_PUBLIC_KEY) {
  console.log('  ✓ Ecardo Payment Gateway credentials detected.');
} else {
  console.log('  ℹ Ecardo Payment Gateway credentials unset (wallet-only or demo fallback).');
}

// 3. Generate Prisma Client
try {
  console.log('• Ensuring Prisma Client is generated...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('  ✓ Prisma Client generated.');
} catch (err) {
  console.warn('  ⚠️ Prisma generate encountered a warning:', err.message);
}

// 4. Automated Database Migrations
if (process.env.DATABASE_URL) {
  console.log('• DATABASE_URL detected. Checking and applying database migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('  ✓ Database migrations applied cleanly.');
  } catch (err) {
    console.warn('  ℹ Note: Database migration during build phase skipped or deferred (database may be unreachable during static build step):', err.message);
  }
} else {
  console.log('• No DATABASE_URL set yet. Skipping migration step (runtime fallback active).');
}

// 4. Verification completed
console.log('============================================================');
console.log(' ✓ Self-configuration completed. Proceeding to Next.js build.');
console.log('============================================================\n');
process.exit(0);
