import { test, expect } from '@playwright/test';

test.describe('New Features Tests', () => {
  test('Travelogues page and detail view', async ({ page }) => {
    await page.goto('/fa/travelogues');

    // Wait for the first link that starts with /fa/travelogues/
    const firstTravelogueLink = page.locator('a[href^="/fa/travelogues/"]').first();
    await expect(firstTravelogueLink).toBeVisible();

    await firstTravelogueLink.click();

    // Assert that we navigated to the detail page (e.g. /fa/travelogues/1)
    await page.waitForURL(/\/fa\/travelogues\/\d+/);

    // Assert Like and Share buttons are visible. We know they contain Heart and Share2 icons from lucide-react.
    // They are within button tags. We can check for standard svg icons with these classes or attributes if lucide adds them.
    // Lucide icons often have `lucide-heart` and `lucide-share-2` classes.
    await expect(page.locator('button:has(.lucide-heart)')).toBeVisible();
    await expect(page.locator('button:has(.lucide-share-2)')).toBeVisible();
  });

  test('Plan page buttons', async ({ page }) => {
    // Navigate directly to result view using query params to bypass the wizard
    await page.goto('/fa/plan?dest=turkey&who=solo&days=3&bud=balanced&pace=relaxed');

    // Assert buttons are visible
    await expect(page.getByRole('button', { name: 'بهتر کردن برنامه' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'عوض کردن' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ویرایش' })).toBeVisible();
  });
});
