import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Ultra-Compact Mobile', width: 320, height: 640 },
  { name: 'Android Standard', width: 360, height: 800 },
  { name: 'iPhone Compact', width: 375, height: 812 },
  { name: 'iPhone Standard', width: 390, height: 844 },
  { name: 'Android Large', width: 412, height: 915 },
  { name: 'iPhone Pro Max', width: 430, height: 932 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Tablet Landscape', width: 1024, height: 768 },
  { name: 'Desktop Large', width: 1440, height: 900 },
];

const routes = [
  { path: '/fa', name: 'Homepage' },
  { path: '/fa/flights', name: 'Flights' },
  { path: '/fa/flights/search', name: 'FlightSearch' },
  { path: '/fa/hotels', name: 'Hotels' },
  { path: '/fa/hotels/search', name: 'HotelSearch' },
  { path: '/fa/checkout', name: 'Checkout' },
  { path: '/fa/trips', name: 'Trips' },
  { path: '/fa/tours', name: 'Tours' },
  { path: '/fa/services', name: 'Services' },
  { path: '/fa/auth', name: 'Auth' },
  { path: '/fa/account', name: 'Account' },
  { path: '/fa/destinations', name: 'Destinations' },
  { path: '/fa/visa', name: 'Visa' },
  { path: '/fa/insurance', name: 'Insurance' },
  { path: '/fa/esim', name: 'ESim' },
  { path: '/fa/city-pass', name: 'CityPass' },
  { path: '/fa/trains', name: 'Trains' },
  { path: '/fa/transfers', name: 'Transfers' },
  { path: '/fa/travelogues', name: 'Travelogues' },
  { path: '/fa/guide', name: 'Guide' },
  { path: '/fa/support', name: 'Support' },
  { path: '/fa/interpreter', name: 'Interpreter' },
  { path: '/fa/wallet', name: 'Wallet' },
  { path: '/fa/book', name: 'Book' },
];

for (const vp of viewports) {
  test.describe(`Audit on ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of routes) {
      test(`${route.name} (${route.path}) layout and overflow check`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Check horizontal overflow
        const overflowData = await page.evaluate(() => {
          const docScroll = document.documentElement.scrollWidth;
          const bodyScroll = document.body.scrollWidth;
          const winWidth = window.innerWidth;
          const isOverflow = docScroll > winWidth + 2 || bodyScroll > winWidth + 2;

          const offending = [];
          if (isOverflow) {
            const all = document.querySelectorAll('*');
            for (const el of all) {
              const rect = el.getBoundingClientRect();
              if (rect.right > winWidth + 2 || rect.left < -2) {
                offending.push({
                  tag: el.tagName,
                  className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
                  id: el.id,
                  rect: { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) }
                });
                if (offending.length >= 5) break;
              }
            }
          }
          return { isOverflow, docScroll, bodyScroll, winWidth, offending };
        }, vp.width);

        // یک اندازه‌گیریِ سرریز ممکن است وسط انیمیشن ورود (motion translate) باشد —
        // سرریز واقعی پایدار است؛ ۸۰۰ms صبر و اندازه‌گیری مجدد، flake حذف می‌کند.
        let sustained = overflowData;
        if (overflowData.isOverflow) {
          await page.waitForTimeout(800);
          const remeasured = await page.evaluate(() => ({
            isOverflow:
              document.documentElement.scrollWidth > window.innerWidth + 2 ||
              document.body.scrollWidth > window.innerWidth + 2,
            docScroll: document.documentElement.scrollWidth,
            bodyScroll: document.body.scrollWidth,
            winWidth: window.innerWidth,
          }));
          sustained = { ...remeasured, offending: overflowData.offending };
        }

        if (sustained.isOverflow) {
          console.warn(`[OVERFLOW] ${route.name} on ${vp.name}: docScroll=${sustained.docScroll}, winWidth=${sustained.winWidth}`);
          console.warn(`Offenders:`, JSON.stringify(sustained.offending));
        }

        expect(
          sustained.isOverflow,
          `Page ${route.name} has horizontal scroll on ${vp.name} (docScroll: ${sustained.docScroll}, bodyScroll: ${sustained.bodyScroll}, winWidth: ${sustained.winWidth}) offenders: ${JSON.stringify(sustained.offending)}`
        ).toBeFalsy();
      });
    }
  });
}
