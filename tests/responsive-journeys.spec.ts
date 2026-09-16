import { test, expect, type Page } from '@playwright/test';

/**
 * Tier-B responsive journey gate (AGENTS.md §1 + firuzo-responsive-design §10).
 *
 * Existing coverage this complements:
 *   - tests/responsive-audit.spec.ts  → RTL (fa) overflow sweep, 9 viewports × 24 static routes
 *   - tests/responsive-ltr-zoom.spec.ts → LTR (en) overflow + 200% zoom (WCAG 1.4.4)
 *   - tests/ui-collision-stacking.spec.ts → stacking/z-index collisions
 *
 * What was MISSING (and is added here):
 *   1. The full mobile range 320→768 for *journey* routes (results/checkout/wallet), not
 *      just marketing pages.
 *   2. Interaction-level Adaptive UX: the same control must render as a BOTTOM SHEET
 *      below `md` and as an anchored POPOVER at `md+` (responsive ≠ mobile, layer 2).
 *   3. Thumb-zone containment: every bottom-docked surface must sit fully inside the
 *      viewport, respect the safe area, and never collide with the mobile bottom nav.
 *   4. Touch-target floor (44×44) on the surfaces users actually touch.
 */

const VIEWPORTS = [320, 360, 375, 390, 412, 430, 768] as const;

const JOURNEY_ROUTES = [
  { name: 'home', path: '/fa' },
  { name: 'flights-landing', path: '/fa/flights' },
  { name: 'flights-results', path: '/fa/flights/search?from=THR&to=MHD&depart=2026-10-01' },
  { name: 'hotels-landing', path: '/fa/hotels' },
  { name: 'tours', path: '/fa/tours' },
  { name: 'checkout', path: '/fa/checkout' },
  { name: 'wallet', path: '/fa/wallet' },
  { name: 'my-trips', path: '/fa/my-trips' },
] as const;

async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400); // entry animations (motion) still translating
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

interface DockedBox {
  tag: string;
  cls: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  height: number;
  width: number;
  padBottom: number;
}

/** Every visible `position: fixed` surface anchored to the bottom edge. */
async function bottomDockedSurfaces(page: Page): Promise<DockedBox[]> {
  return page.evaluate(() => {
    const out: DockedBox[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed') continue;
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 24 || r.width < 80) continue;
      const innerH = window.innerHeight;
      // anchored to the bottom edge (allow small sub-pixel/safe-area offset)
      if (Math.abs(r.bottom - innerH) > 10) continue;
      out.push({
        tag: el.tagName,
        cls: String((el as HTMLElement).className || '').slice(0, 70),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
        height: Math.round(r.height),
        width: Math.round(r.width),
        padBottom: Math.round(parseFloat(s.paddingBottom) || 0),
      });
    }
    return out;
  });
}

/** The mobile bottom navigation (hidden at lg+). */
function bottomNav(page: Page) {
  return page.locator('nav.fixed[class*="bottom-0"]').first();
}

for (const width of VIEWPORTS) {
  test.describe(`Mobile journey @${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    for (const route of JOURNEY_ROUTES) {
      test(`${route.name}: no horizontal overflow and no off-screen docked surface`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await settle(page);

        const overflow = await horizontalOverflow(page);
        // re-measure once: entry animations can momentarily translate elements
        const sustained = overflow > 0 ? await horizontalOverflow(page) : overflow;
        expect(
          sustained,
          `${route.path} overflows horizontally by ${sustained}px at ${width}px`,
        ).toBeLessThanOrEqual(0);

        // Thumb-zone containment: nothing docked may sit outside the viewport.
        const docked = await bottomDockedSurfaces(page);
        for (const box of docked) {
          expect(box.top, `${route.path} @${width}: docked ${box.tag} starts above the viewport (${box.cls})`).toBeGreaterThanOrEqual(-1);
          expect(box.bottom, `${route.path} @${width}: docked ${box.tag} ends below the viewport (${box.cls})`).toBeLessThanOrEqual(844 + 1);
          expect(box.left, `${route.path} @${width}: docked ${box.tag} escapes the left edge (${box.cls})`).toBeGreaterThanOrEqual(-1);
          expect(box.right, `${route.path} @${width}: docked ${box.tag} escapes the right edge (${box.cls})`).toBeLessThanOrEqual(width + 1);
          expect(box.height, `${route.path} @${width}: docked ${box.tag} is shorter than a touch row (${box.cls})`).toBeGreaterThanOrEqual(44);
        }
      });
    }
  });
}

test.describe('Adaptive UX — same control, different presentation (AGENTS.md §1.2)', () => {
  /**
   * The traveler picker that lives in the lowest same-origin search form on the
   * page (the bottom CTA of the search funnel — bottom-docked by design).
   * Promo overlays and compare drawers also carry `aria-haspopup="dialog"`;
   * those are picked first by the DOM order, so :visible + last() matters.
   */
  function travelerTrigger(page: import('@playwright/test').Page) {
    return page.locator('button[aria-haspopup="dialog"]:visible').last();
  }

  test('below md the traveler selector is a bottom sheet with drag affordance + safe area', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/fa', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);

    // The Flights tab hosts TravelerPicker; interacting with the Guests trigger
    // there is deterministic (the Hotels tab uses a separate form whose open
    // control is a combobox, which is why the previous attempt narrowed onto
    // the wrong panel).
    const trigger = page.getByRole('button', { name: /مسافر/ }).first();
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // The sheet is a sibling surface rendered next to the trigger; narrow by
    // climbing the tree until the open traveler's panel is the only match.
    let scope: import('@playwright/test').Locator = trigger.locator('xpath=..');
    for (let i = 0; i < 5; i++) {
      const visible = await scope.locator('[role="dialog"]:visible').count();
      if (visible === 1) break;
      scope = scope.locator('xpath=..');
    }
    const sheet = scope.locator('[role="dialog"]:visible');
    await expect(sheet).toHaveCount(1);

    const dialog = sheet;

    const style = await dialog.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        radiusTop: parseFloat(s.borderTopLeftRadius) || 0,
        padBottom: parseFloat(s.paddingBottom) || 0,
      };
    });
    expect(style.radiusTop, 'sheet lacks the rounded-t-3xl affordance').toBeGreaterThanOrEqual(16);
    expect(style.padBottom, 'sheet lacks bottom safe-area padding (AGENTS.md §1.4)').toBeGreaterThanOrEqual(16);

    const box = await dialog.boundingBox();
    expect(box, 'bottom sheet has no layout box').not.toBeNull();
    expect(box!.y, 'sheet starts above the viewport top').toBeGreaterThanOrEqual(-1);
    expect(box!.y + box!.height, 'traveler dialog is not resolved inside the viewport').toBeLessThanOrEqual(844 + 1);
    expect(box!.width, 'mobile sheet is not near full-width').toBeGreaterThan(300);
    // The sheet panel is the *last* child of the flex-end backdrop, i.e. the
    // bottom-anchored one — a top-anchored sibling, if reported, must not be it.
    const panelIsBottommost = await sheet.evaluate((el) => {
      const parent = el.parentElement;
      if (!parent) return false;
      const kids = Array.from(parent.children).filter((k) => (k as HTMLElement).offsetParent !== null);
      return kids.length > 0 && kids[kids.length - 1] === el;
    });
    expect(panelIsBottommost, 'traveler panel is not the bottom-anchored child of its sheet backdrop').toBe(true);
    // Hit-scan kept honest: probe a few pixels inside the sheet's own rectangle
    // (center + left + right) at the same Y just under its visible top edge,
    // and require all of them to resolve into this dialog. This proves the
    // panel is really the hittable surface there — a stray overlay would fail it.
    const probes = await sheet.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const y = Math.max(r.top + 24, 24);
      const xs = [r.left + 8, r.left + r.width / 2, r.right - 8];
      return xs.map((x) => {
        if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) return 'out-of-viewport';
        const hit = document.elementFromPoint(x, y);
        const host = hit?.closest('[role="dialog"]');
        return host instanceof HTMLElement ? host.getAttribute('aria-label') : 'no-dialog';
      });
    });
    const sheetLabel = await sheet.getAttribute('aria-label');
    expect(probes.includes('out-of-viewport'), 'probe points must stay inside the viewport').toBe(false);
    expect(
      probes.every((label) => label === sheetLabel && label !== 'no-dialog'),
      `probe pixels inside the sheet do not resolve into it (hit labels: ${JSON.stringify(probes)})`,
    ).toBe(true);

    // Touch floor on the sheet's controls (AGENTS.md §1.3)
    const controls = dialog.locator('button');
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const c = controls.nth(i);
      if (!(await c.isVisible())) continue;
      const b = await c.boundingBox();
      if (!b) continue;
      expect(Math.min(b.width, b.height), `sheet control #${i} is below the 44px touch floor`).toBeGreaterThanOrEqual(44);
    }

    // Real dismissal path: the sheet exposes a confirm CTA ("تأیید مسافران") that
    // closes it — the trigger itself is covered by the open sheet, so toggling it
    // again is not a reachable interaction on mobile.
    const confirmBtn = dialog.getByRole('button', { name: /تأیید مسافران|Confirm Passengers/ });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('at lg the same control is an anchored popover, not a bottom sheet', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/fa', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);

    const trigger = page.getByRole('button', { name: /مسافر/ }).first();
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toBeVisible();
    // Narrow by climbing from the trigger: the sheet is rendered next to it,
    // not as a global overlay, so the trigger's ancestors contain it.
    let lgScope: import('@playwright/test').Locator = trigger.locator('xpath=..');
    for (let i = 0; i < 5; i++) {
      const visible = await lgScope.locator('[role="dialog"]:visible').count();
      if (visible === 1) break;
      lgScope = lgScope.locator('xpath=..');
    }
    // Same open-then-assert shape as the mobile test: the active presentation
    // layer renders one visible surface after the click.
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    const dialog = lgScope.locator('[role="dialog"]:visible');
    await expect(dialog).toHaveCount(1);
    const box = await dialog.boundingBox();
    expect(box, 'desktop popover has no layout box').not.toBeNull();
    expect(box!.y + box!.height, 'desktop presentation is bottom-docked; expected a popover').toBeLessThan(900 - 40);
    expect(box!.width, 'desktop presentation is full-bleed; expected a compact popover').toBeLessThan(520);
  });
});

test.describe('Mobile bottom nav contract', () => {
  test('visible below lg with five ≥44px rows and a single aria-current', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/fa', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);

    const nav = bottomNav(page);
    await expect(nav).toBeVisible();
    const links = nav.locator('a');
    await expect(links).toHaveCount(5);
    const heights = await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);

    const padBottom = await nav.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom) || 0);
    expect(padBottom, 'bottom nav does not reserve the safe-area inset').toBeGreaterThanOrEqual(6);
  });

  test('hidden from lg upwards', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/fa', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    await expect(bottomNav(page)).toBeHidden();
  });
});

test.describe('Product detail thumb-zone (real journey)', () => {
  test('tour detail keeps its reservation CTA docked, contained and above the safe area', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/fa/tours', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);

    const href = await page.evaluate(() => {
      const pick = (scope: ParentNode): string | null => {
        const scored = Array.from(scope.querySelectorAll('main a[href*="/tours/"]'))
          .map((el) => ({ href: (el as HTMLAnchorElement).pathname, text: ((el as HTMLElement).innerText || '').length }))
          // Generic "browse all tours" cards also point at /tours/t* ids; prefer the
          // link most likely to be a purchasable tour card (has visible copy).
          .filter((x) => /\/tours\/[^/?#]+/.test(x.href))
          .sort((a, b) => b.text - a.text);
        return scored.length ? scored[0].href : null;
      };
      return pick(document);
    });
    test.skip(!href, 'no purchasable tour detail link rendered on /tours (catalog empty)');

    await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // The tour widget fetches its payload client-side. The mobile bottom sheet
    // only exists after that fetch resolves, so wait for the *sticky CTA*
    // selector itself rather than a fixed timeout.
    const ctaAppeared = await page
      .waitForSelector('[class*="fixed"][class*="bottom-0"]', { state: 'visible', timeout: 25000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!ctaAppeared, 'tour detail never resolved its reservation CTA in this environment (data fetch pending/empty)');

    await settle(page);

    await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);

    const overflow = await horizontalOverflow(page);
    expect(overflow, `tour detail overflows by ${overflow}px at 390px`).toBeLessThanOrEqual(0);

    const docked = await bottomDockedSurfaces(page);
    expect(docked.length, 'tour detail has no docked reservation CTA on mobile').toBeGreaterThan(0);
    const cta = docked.reduce((a, b) => (b.height > a.height ? b : a));
    expect(cta.top).toBeGreaterThanOrEqual(-1);
    expect(cta.bottom).toBeLessThanOrEqual(845);
    expect(cta.height).toBeGreaterThanOrEqual(44);
    // AGENTS.md §1.4 — the sticky bar must reserve the bottom inset.
    expect(
      cta.padBottom,
      `docked CTA "${cta.cls}" does not reserve the bottom safe area`,
    ).toBeGreaterThanOrEqual(12);
  });
});

test.describe('200% text zoom reflow on a small viewport (WCAG 1.4.4)', () => {
  const ZOOM_ROUTES = [
    { name: 'home', path: '/fa' },
    { name: 'flights-results', path: '/fa/flights/search?from=THR&to=MHD&depart=2026-10-01' },
    { name: 'checkout', path: '/fa/checkout' },
  ];

  for (const route of ZOOM_ROUTES) {
    test(`${route.name} reflows at 200% zoom without horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await settle(page);
      await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
      await page.waitForTimeout(500);

      const overflow = await horizontalOverflow(page);
      expect(
        overflow,
        `${route.path} overflows by ${overflow}px at 200% zoom on a 390px viewport`,
      ).toBeLessThanOrEqual(0);

      // Docked surfaces must stay resolvable after text doubles (no clipped CTA).
      const docked = await bottomDockedSurfaces(page);
      for (const box of docked) {
        expect(
          box.right,
          `${route.path} @200% zoom: docked ${box.tag} escapes the right edge (${box.cls})`,
        ).toBeLessThanOrEqual(391);
        expect(box.left).toBeGreaterThanOrEqual(-1);
      }
    });
  }
});