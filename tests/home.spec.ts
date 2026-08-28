import { test, expect } from '@playwright/test';

test('Homepage UX Architecture Validation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });

  // 1. Verify Hero Section and Title
  const heroHeading = page.getByRole('heading', { level: 1 });
  await expect(heroHeading).toBeVisible();

  // 2. Verify SearchWidget Tabs (Flights, Hotels, Tours)
  await expect(page.getByRole('tab', { name: /پرواز|Flights/i }).or(page.getByText('پرواز').first())).toBeVisible();

  // 3. Verify AI Smart Planner Hook Section
  await expect(page.getByText(/چیدمان هوشمند|Smart Planning|برنامه‌ریز هوشمند/i).first()).toBeVisible();

  // 4. Verify Global Header & Footer
  await expect(page.locator('header').first()).toBeVisible();
  await expect(page.locator('footer').first()).toBeVisible();
});
