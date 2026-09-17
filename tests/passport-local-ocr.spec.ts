import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Fixed fictional PNG: every browser receives identical pixels, independent
// of OS font rendering. No real customer passport is used.
const image = fs.readFileSync(path.resolve('tests/fixtures/fictional-passport-mrz.png'));

for (const locale of ['fa', 'en']) {
  test(`local passport OCR -> review -> checkout fields (${locale})`, async ({ page, context, baseURL }) => {
    test.setTimeout(120_000);
    // Client display fixture only: does not create an authenticated server
    // session. This test never submits a booking or accesses private data.
    await page.addInitScript(() => localStorage.setItem('firuzo-auth', JSON.stringify({
      version: 3, state: { user: { id: 'ocr-ui-fixture', role: 'CUSTOMER', profileComplete: true }, kyc: { step: 'phone' } },
    })));
    await context.addCookies([{
      name: 'firuzo-booking-storage', url: baseURL!,
      value: encodeURIComponent(JSON.stringify({ version: 2, state: {
        bookingContext: { id: 'ocr-test', type: 'flights', title: 'OCR test', subtitle: 'International',
          price: 100000, totalPrice: 100000, currency: 'IRR', adults: 1, children: 0 }, cart: [],
      } })),
    }]);
    await page.goto(`/${locale}/checkout`);
    const scanButton = page.getByRole('button', { name: /Smart Passport Scan|اسکن هوشمند پاسپورت/ });
    await expect(scanButton).toBeVisible({ timeout: 30_000 });
    await scanButton.click();
    await page.waitForLoadState('networkidle');
    const unexpected: string[] = [];
    // Block any external OCR dependency/service while scanning. Model, worker
    // and application chunks must all come from this origin.
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== new URL(baseURL!).origin) { unexpected.push(url.origin); return route.abort(); }
      if (request.method() !== 'GET' && request.method() !== 'HEAD') {
        unexpected.push(`upload:${url.pathname}`); return route.abort();
      }
      return route.continue();
    });
    await page.locator('input[type=file]').setInputFiles({ name: 'fictional-mrz.png', mimeType: 'image/png', buffer: image });
    const confirm = page.getByRole('button', { name: /Confirm details and autofill|تأیید اطلاعات و تکمیل فرم/ });
    await expect(confirm).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('#firstName')).toHaveValue('');
    const review = page.getByRole('dialog').filter({ has: confirm });
    await expect(review).toContainText('ALICE');
    await expect(review).toContainText('L898902C3');
    await confirm.click();
    await expect(page.locator('#firstName')).toHaveValue('ALICE');
    await expect(page.locator('#lastName')).toHaveValue('SPECIMEN');
    await expect(page.locator('#passportNo')).toHaveValue('L898902C3');
    expect(unexpected).toEqual([]);
  });
}
