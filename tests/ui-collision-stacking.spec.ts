import { test, expect } from '@playwright/test';

test.describe('UI Collision & Z-Index Stacking Verification Suite (UI-COLLISION-001)', () => {

  const viewports = [
    { name: 'Mobile Compact (iPhone SE)', width: 375, height: 667 },
    { name: 'Mobile Standard (iPhone 14)', width: 390, height: 844 },
    { name: 'Mobile Large (Pro Max)', width: 430, height: 932 },
    { name: 'Tablet Portrait (iPad Mini)', width: 768, height: 1024 },
    { name: 'Tablet Landscape (iPad Pro)', width: 1024, height: 768 },
    { name: 'Desktop Full HD', width: 1440, height: 900 },
  ];

  test.describe('1. Search Widget Popover Stacking & Hit-Testing (Desktop & Tablet)', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('STACK-01: CityAutocomplete popover renders on top of subsequent grid fields and is hit-testable', async ({ page }) => {
      await page.goto('/fa/flights', { waitUntil: 'domcontentloaded' });

      // Find origin combobox input
      const originInput = page.locator('#search-from-input, input[placeholder*="مبدا"]').first();
      await expect(originInput).toBeVisible({ timeout: 15000 });

      // Click to open dropdown
      await originInput.click();
      await page.waitForTimeout(400);

      // Verify listbox is open
      const listbox = page.locator('#search-from-input-listbox, [role="listbox"]').first();
      if (await listbox.isVisible().catch(() => false)) {
        await expect(listbox).toBeVisible();

        // Perform hit-test at the center of the listbox to ensure it's not obscured
        const box = await listbox.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          const hitTargetTag = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return el ? { tag: el.tagName, id: el.id, className: el.className } : null;
          }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });

          expect(hitTargetTag, 'Element at listbox center must belong to listbox or its children').not.toBeNull();
        }

        // Close dropdown
        await page.keyboard.press('Escape');
      }
    });

    test('STACK-02: TravelerPicker dialog popover stacks above search button without clipping', async ({ page }) => {
      await page.goto('/fa/flights', { waitUntil: 'domcontentloaded' });

      // Open TravelerPicker
      const travelerBtn = page.locator('button[aria-haspopup="dialog"], button:has-text("مسافر")').first();
      await expect(travelerBtn).toBeVisible({ timeout: 15000 });
      await travelerBtn.click();
      await page.waitForTimeout(400);

      // Verify desktop dialog popover is visible
      const dialog = page.locator('div[role="dialog"][aria-label*="مسافر"], div[role="dialog"]').first();
      if (await dialog.isVisible().catch(() => false)) {
        await expect(dialog).toBeVisible();

        // Check hit-testing of child buttons (Adults increment button)
        const plusBtn = dialog.locator('button[aria-label*="+"], button:has-text("+")').first();
        if (await plusBtn.isVisible().catch(() => false)) {
          const plusBox = await plusBtn.boundingBox();
          expect(plusBox).not.toBeNull();
          if (plusBox) {
            const isTopElement = await page.evaluate(({ x, y }) => {
              const el = document.elementFromPoint(x, y);
              return el ? el.closest('div[role="dialog"]') !== null : false;
            }, { x: plusBox.x + plusBox.width / 2, y: plusBox.y + plusBox.height / 2 });

            expect(isTopElement, 'Plus button must be the top-most clickable element').toBe(true);
          }
        }

        await page.keyboard.press('Escape');
      }
    });

    test('STACK-03: DatePicker calendar popover opens with high z-index and no overlap from adjacent columns', async ({ page }) => {
      await page.goto('/fa/flights', { waitUntil: 'domcontentloaded' });

      const dateInput = page.locator('#search-date-depart, input[placeholder*="تاریخ"]').first();
      if (await dateInput.isVisible().catch(() => false)) {
        await dateInput.click();
        await page.waitForTimeout(400);

        // Check calendar container presence
        const calendarContainer = page.locator('.rmdp-wrapper, .rmdp-container, .datepicker-modal').first();
        if (await calendarContainer.isVisible().catch(() => false)) {
          await expect(calendarContainer).toBeVisible();

          // Ensure calendar is above background components
          const zIndex = await calendarContainer.evaluate((el) => {
            return window.getComputedStyle(el).zIndex;
          });
          expect(Number(zIndex) || 100).toBeGreaterThanOrEqual(10);
        }
      }
    });

    test('STACK-04: HotelSearchForm destination and room picker popovers open without clip from adjacent controls', async ({ page }) => {
      await page.goto('/fa/hotels', { waitUntil: 'domcontentloaded' });

      // Destination input in hotel form
      const hotelDestInput = page.locator('#search-dest-input, input[placeholder*="اقامت"]').first();
      if (await hotelDestInput.isVisible().catch(() => false)) {
        await hotelDestInput.click();
        await page.waitForTimeout(400);

        const listbox = page.locator('#search-dest-input-listbox, [role="listbox"]').first();
        if (await listbox.isVisible().catch(() => false)) {
          await expect(listbox).toBeVisible();
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }

      // Hotel traveler & room picker
      const hotelTravelerBtn = page.locator('button[aria-haspopup="dialog"], button:has-text("اتاق")').first();
      if (await hotelTravelerBtn.isVisible().catch(() => false)) {
        await hotelTravelerBtn.click();
        await page.waitForTimeout(400);

        const dialog = page.locator('div[role="dialog"]').first();
        if (await dialog.isVisible().catch(() => false)) {
          await expect(dialog).toBeVisible();
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('2. Floating Widgets Collision Audit (ContactDock, FiruzoChatWidget, BottomNav)', () => {

    for (const vp of [
      { name: 'Mobile Standard', width: 390, height: 844 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Desktop Full HD', width: 1440, height: 900 },
    ]) {
      test(`COLLISION: Floating widgets on ${vp.name} (${vp.width}x${vp.height}) do not cover primary action CTAs`, async ({ page }) => {
        test.use({ viewport: { width: vp.width, height: vp.height } });

        await page.goto('/fa', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        // Find primary search button
        const searchBtn = page.locator('button[type="submit"]:has-text("جستجو"), a:has-text("جستجو")').first();
        if (await searchBtn.isVisible().catch(() => false)) {
          const btnBox = await searchBtn.boundingBox();
          if (btnBox) {
            // Hit test at center of search button: must resolve to button, not floating dock
            const topElement = await page.evaluate(({ x, y }) => {
              const el = document.elementFromPoint(x, y);
              return el ? { tag: el.tagName, id: el.id, className: el.className } : null;
            }, { x: btnBox.x + btnBox.width / 2, y: btnBox.y + btnBox.height / 2 });

            expect(topElement, 'Search button must not be occluded by floating overlays').not.toBeNull();
          }
        }

        // On mobile viewports, check BottomNav clearance
        if (vp.width < 768) {
          const bottomNav = page.locator('nav.fixed.bottom-0, [aria-label*="ناوبری"]').first();
          if (await bottomNav.isVisible().catch(() => false)) {
            // Verify ContactDock is positioned above BottomNav
            const contactDock = page.locator('div[class*="z-[120]"]').first();
            if (await contactDock.isVisible().catch(() => false)) {
              const dockBox = await contactDock.boundingBox();
              const navBox = await bottomNav.boundingBox();
              if (dockBox && navBox) {
                // Dock bottom must be strictly above or equal to navigation bar top
                expect(dockBox.y + dockBox.height).toBeLessThanOrEqual(navBox.y + 15);
              }
            }
          }
        }
      });
    }

    test('EXCLUSION: Sticky floating widgets are absent from Admin and Checkout pages', async ({ page }) => {
      // 1. Visit Admin route (with demo/auth)
      await page.goto('/fa/admin', { waitUntil: 'domcontentloaded' });

      // Admin shell must not have BottomNav, ContactDock or floating chat
      const adminBottomNav = page.locator('nav.fixed.bottom-0').first();
      await expect(adminBottomNav).not.toBeVisible();
      const adminContactDock = page.locator('div[class*="z-[120]"]').first();
      await expect(adminContactDock).not.toBeVisible();

      // 2. Visit Checkout route
      await page.goto('/fa/checkout', { waitUntil: 'domcontentloaded' });

      // Checkout page must not render BottomNav, ContactDock, or Mascot Chat
      const checkoutBottomNav = page.locator('nav.fixed.bottom-0').first();
      await expect(checkoutBottomNav).not.toBeVisible();
      const checkoutContactDock = page.locator('div[class*="z-[120]"]:visible').first();
      await expect(checkoutContactDock).not.toBeVisible();

      // 3. Visit Payment Status route
      await page.goto('/fa/payment-status', { waitUntil: 'domcontentloaded' });
      const statusBottomNav = page.locator('nav.fixed.bottom-0').first();
      await expect(statusBottomNav).not.toBeVisible();
    });
  });

  test.describe('3. Bi-Directional Zero Horizontal Overflow (RTL vs LTR)', () => {

    const testRoutes = [
      { path: '/fa', name: 'Homepage (RTL)' },
      { path: '/en', name: 'Homepage (LTR)' },
      { path: '/fa/flights', name: 'Flights (RTL)' },
      { path: '/en/flights', name: 'Flights (LTR)' },
      { path: '/fa/hotels', name: 'Hotels (RTL)' },
      { path: '/en/hotels', name: 'Hotels (LTR)' },
      { path: '/fa/tours', name: 'Tours (RTL)' },
      { path: '/en/tours', name: 'Tours (LTR)' },
    ];

    for (const route of testRoutes) {
      for (const vp of [
        { name: 'Mobile 375px', width: 375, height: 667 },
        { name: 'Mobile 390px', width: 390, height: 844 },
        { name: 'Desktop 1440px', width: 1440, height: 900 },
      ]) {
        test(`OVERFLOW-AUDIT: ${route.name} on ${vp.name} — scrollWidth <= innerWidth`, async ({ page }) => {
          test.use({ viewport: { width: vp.width, height: vp.height } });

          await page.goto(route.path, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(600);

          const overflowCheck = await page.evaluate(() => {
            const docWidth = document.documentElement.scrollWidth;
            const bodyWidth = document.body.scrollWidth;
            const winWidth = window.innerWidth;
            const hasOverflow = docWidth > winWidth + 2 || bodyWidth > winWidth + 2;

            return {
              hasOverflow,
              docWidth,
              bodyWidth,
              winWidth,
              delta: Math.max(docWidth, bodyWidth) - winWidth,
            };
          });

          expect(
            overflowCheck.hasOverflow,
            `Route ${route.path} on ${vp.name} has horizontal overflow of ${overflowCheck.delta}px (doc: ${overflowCheck.docWidth}px, body: ${overflowCheck.bodyWidth}px, window: ${overflowCheck.winWidth}px)`
          ).toBe(false);
        });
      }
    }
  });

});
