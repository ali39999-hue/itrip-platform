import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Responsive QA per .agents/skills/firuzo-responsive-design:
 * 1. LTR (en) Tier-A overflow sweep — complements responsive-audit.spec.ts which covers fa (RTL).
 * 2. 200% text zoom reflow (WCAG 1.4.4) — no horizontal scroll, no clipped interactive elements.
 */

const TIER_A_WIDTHS = [320, 390, 430, 768, 1024, 1440];

const LTR_ROUTES = [
  { path: '/en', name: 'Homepage' },
  { path: '/en/flights', name: 'Flights' },
  { path: '/en/hotels', name: 'Hotels' },
  { path: '/en/tours', name: 'Tours' },
  { path: '/en/services', name: 'Services' },
];

const ZOOM_ROUTES = [
  { path: '/fa', name: 'Homepage' },
  { path: '/fa/flights', name: 'Flights' },
  { path: '/fa/hotels', name: 'Hotels' },
  { path: '/fa/tours', name: 'Tours' },
];

async function overflowPx(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe('LTR (en) Tier-A overflow sweep', () => {
  for (const width of TIER_A_WIDTHS) {
    for (const route of LTR_ROUTES) {
      test(`${route.name} @${width}px no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(800); // let entry animations settle
        const overflow = await overflowPx(page);
        // entry animations can momentarily translate elements — re-measure once
        const sustained = overflow > 0 ? await overflowPx(page) : overflow;
        expect(
          sustained,
          `${route.path} overflows by ${sustained}px at ${width}px (LTR)`,
        ).toBeLessThanOrEqual(0);
      });
    }
  }
});

test.describe('Ultra-wide desktop: no overflow, content capped', () => {
  for (const width of [1920, 2560]) {
    for (const route of [...LTR_ROUTES.slice(0, 3), { path: '/fa', name: 'Homepage-RTL' }]) {
      test(`${route.name} @${width}px stays contained`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(800);
        const overflow = await overflowPx(page);
        expect(overflow, `${route.path} overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(0);
        // content must not stretch edge-to-edge: the main container stays capped
        // (max-w 1440-ish) and is centered — its box must be narrower than the viewport
        const mainBox = await page.evaluate(() => {
          const main = document.querySelector('main') || document.body;
          const r = main.getBoundingClientRect();
          return { width: Math.round(r.width), winWidth: window.innerWidth };
        });
        expect(
          mainBox.width,
          `main stretches to ${mainBox.width}px at ${width}px — container cap is missing`,
        ).toBeLessThanOrEqual(1500);
      });
    }
  }
});

test.describe('200% text zoom reflow (WCAG 1.4.4)', () => {
  for (const route of ZOOM_ROUTES) {
    test(`${route.name} reflows at 200% zoom without clipping`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
      await page.waitForTimeout(500);

      const overflow = await overflowPx(page);
      expect(overflow, `${route.path} overflows at 200% zoom`).toBeLessThanOrEqual(0);

      // interactive elements must not clip *visible* content when text doubles.
      // Decorative (aria-hidden) overflow — e.g. a corner status dot — is excluded,
      // and each descendant is checked by rect, not by the element's scrollWidth.
      const clipped = await page.evaluate(() => {
        const out: Array<{ tag: string; over: number; cls: string; text: string }> = [];
        for (const el of document.querySelectorAll('button, a, input, select')) {
          const s = getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden') continue;
          const er = el.getBoundingClientRect();
          // skip visually-hidden controls (sr-only sets a 1px box + clip rect)
          if (er.width < 8 || er.height < 8 || s.clip !== 'auto') continue;

          let over = 0;
          const hasDirectText = [...el.childNodes].some(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim(),
          );
          if (hasDirectText && el.scrollWidth > el.clientWidth + 2) {
            over = el.scrollWidth - el.clientWidth;
          }
          for (const k of el.querySelectorAll('*')) {
            const ks = getComputedStyle(k);
            if (ks.display === 'none' || ks.visibility === 'hidden' || k.getAttribute('aria-hidden') === 'true') continue;
            const kr = k.getBoundingClientRect();
            if (kr.width === 0 || kr.height === 0) continue;
            const rOver = kr.right - er.right;
            const lOver = er.left - kr.left;
            if (rOver > 2 || lOver > 2) over = Math.max(over, rOver, lOver);
          }

          if (over > 0) {
            out.push({
              tag: el.tagName,
              over: Math.round(over),
              cls: (el.className || '').toString().slice(0, 80),
              text: (el.textContent || '').trim().slice(0, 40),
            });
          }
        }
        return out;
      });

      const report = `tests/results/zoom-clipped-${route.name}.json`;
      try {
        mkdirSync('tests/results', { recursive: true });
        writeFileSync(report, JSON.stringify(clipped, null, 2));
      } catch {
        // report is best-effort diagnostics
      }
      expect(
        clipped,
        `${route.path}: ${clipped.length} interactive elements clip at 200% zoom (report: ${report})`,
      ).toHaveLength(0);
    });
  }
});
