#!/usr/bin/env node
/**
 * CI-108: Post-Deployment Smoke Verification Gate
 *
 * Verifies production/staging deployment health:
 * 1. GET /api/health/live (Liveness probe returns 200)
 * 2. GET /api/health/ready (Readiness probe returns 200 with DB status)
 * 3. GET /fa (Localized Homepage renders successfully)
 * 4. GET /fa/flights (Search portal responds)
 *
 * Usage: node scripts/deployment-smoke-check.mjs [baseUrl]
 */

const baseUrl = process.argv[2] || process.env.DEPLOYMENT_URL || 'http://localhost:3000';

console.log('====================================================');
console.log(` iTRIP Post-Deployment Smoke Verification (CI-108)`);
console.log(` Target Host: ${baseUrl}`);
console.log('====================================================\n');

async function testEndpoint(name, path, expectedStatus = 200, validator) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  process.stdout.write(`• Checking ${name} [${path}]... `);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'iTrip-Deployment-Smoke-Checker/1.3.0',
        'X-Smoke-Check': 'true',
      },
    });
    clearTimeout(timeout);

    if (res.status !== expectedStatus) {
      console.log(`❌ FAIL (HTTP ${res.status}, expected ${expectedStatus})`);
      return false;
    }

    if (validator) {
      const data = await res.json().catch(() => null);
      const validationErr = validator(data);
      if (validationErr) {
        console.log(`❌ FAIL (${validationErr})`);
        return false;
      }
    }

    console.log(`✓ PASS (${res.status})`);
    return true;
  } catch (err) {
    console.log(`❌ FAIL (${err.message})`);
    return false;
  }
}

async function runSmokeSuite() {
  const checks = [
    {
      name: 'Liveness Probe',
      path: '/api/health/live',
      expectedStatus: 200,
      validator: (data) => {
        if (!data || (data.status !== 'alive' && data.status !== 'live')) return 'Expected status: alive or live';
        return null;
      },
    },
    {
      name: 'Readiness Probe',
      path: '/api/health/ready',
      expectedStatus: 200,
      validator: (data) => {
        if (!data || data.status !== 'ready') return 'Expected status: ready';
        if (!data.checks || (data.checks.database !== 'connected' && data.checks.database?.status !== 'healthy')) {
          return 'Database check is not healthy';
        }
        return null;
      },
    },
    {
      name: 'Persian Homepage (RTL)',
      path: '/fa',
      expectedStatus: 200,
    },
    {
      name: 'English Landing (LTR)',
      path: '/en',
      expectedStatus: 200,
    },
    {
      name: 'Flight Search Landing',
      path: '/fa/flights',
      expectedStatus: 200,
    },
    {
      name: 'Hotel Search Landing',
      path: '/fa/hotels',
      expectedStatus: 200,
    },
  ];

  let passedCount = 0;
  for (const check of checks) {
    const passed = await testEndpoint(check.name, check.path, check.expectedStatus, check.validator);
    if (passed) passedCount++;
  }

  console.log(`\n----------------------------------------------------`);
  console.log(`Summary: ${passedCount}/${checks.length} deployment smoke probes passed.`);

  if (passedCount < checks.length) {
    console.error('❌ Post-deployment smoke check FAILED. Pipeline must abort release.');
    process.exit(1);
  }

  console.log('✓ All deployment smoke checks PASSED cleanly.');
  process.exit(0);
}

runSmokeSuite().catch((err) => {
  console.error('Smoke suite runner error:', err);
  process.exit(1);
});
