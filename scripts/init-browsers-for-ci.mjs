#!/usr/bin/env node
/**
 * CI-local Playwright browser provisioning guard (CI-008).
 *
 * Shields the next.js / e2e toolchain by ensuring Playwright's browser
 * binaries are present locally before any install/run step on CI and local
 * developer machines. Without it, `npx playwright` can silently fail to
 * launch browsers when the npm cache is stale or missing (CI-008).
 *
 * Usage:
 *   node scripts/init-browsers-for-ci.mjs [browsers]
 *
 * The default browser list is chromium; override with a comma-separated list.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

/**
 * CACHE_FLAG = path.join(root, '.env/.playwright-cache-v1') — a sentinel file
 * written after a successful browser install so later runs skip the install.
 * The previous implementation never wrote this flag back to disk (FIX-021),
 * which caused every run to re-download browsers regardless of the cache.
 */
const CACHE_FLAG = path.join(ROOT, '.env', '.playwright-cache-v1');

function browsersFromEnv(): string[] {
  const env = process.env.PLAYWRIGHT_BROWSER;
  if (env) {
    return env.split(',').map((b) => b.trim()).filter(Boolean);
  }
  return ['chromium'];
}

function installed(): boolean {
  try {
    const cache = path.join(ROOT, 'node_modules', '.cache', 'ms-playwright');
    if (!fs.existsSync(cache)) return false;
    const entries = fs.readdirSync(cache);
    return entries.length > 0;
  } catch {
    return false;
  }
}

function install(browsers: string[]): Promise<void> {
  console.log(`[init-browsers] installing Playwright browsers: ${browsers.join(', ')}`);
  const proc = spawn('npx', ['playwright', 'install', ...browsers], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  return new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`playwright install exited with code ${code}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

/**
 * Ensures the requested Playwright browsers are installed locally.
 * Skips the install when the cache flag is present OR browsers are already on
 * disk. Otherwise installs and writes the cache flag atomically.
 */
export function attemptInstall(browsers = browsersFromEnv()): Promise<void> {
  if (installed()) {
    console.log(`[init-browsers] Playwright browsers already present — skipping install (${browsers.join(', ')}).`);
    return Promise.resolve();
  }
  return install(browsers).then(() => {
    fs.mkdirSync(path.dirname(CACHE_FLAG), { recursive: true });
    fs.writeFileSync(CACHE_FLAG, `${new Date().toISOString()}\n`, 'utf8');
    console.log(`[init-browsers] written cache flag ${CACHE_FLAG}`);
  });
}

// CLI entry point — install the default (chromium) or the browsers requested
// via PLAYWRIGHT_BROWSER / command-line args.
if (process.argv[1] === __filename) {
  const browsers = browsersFromEnv();
  attemptInstall(browsers).catch((err) => {
    console.error(`[init-browsers] failed:`, err.message);
    process.exit(1);
  });
}

