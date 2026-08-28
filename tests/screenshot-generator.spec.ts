import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const outDir = path.join(process.cwd(), 'screenshots', '01-desktop-fa');

test.use({ viewport: { width: 1440, height: 1080 } });

test('generate all handoff screenshots', async ({ page }) => {
  test.setTimeout(120000);
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const take = async (name: string, p: string, fullPage: boolean = true) => {
    console.log(`Taking screenshot: ${name}`);
    await page.goto('http://localhost:3000' + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, name), fullPage });
  };

  await take('01-home.png', '/fa');
  await take('03-hotels-search.png', '/fa/hotels/search');
  await take('05-flights-search.png', '/fa/flights/search');
  await take('07-tours.png', '/fa/tours');
  await take('10-services-catalog.png', '/fa/services');
  await take('12-visa.png', '/fa/visa');
  await take('13-insurance.png', '/fa/insurance');
  await take('14-esim.png', '/fa/esim');
  
  // Set auth mock for wallet/admin
  await page.evaluate(() => {
    localStorage.setItem('itrip-auth', JSON.stringify({ state: { user: { role: 'admin', phone: '09121230000', name: 'O O_U.UOU+' } } }));
  });
  
  await take('17-wallet.png', '/fa/wallet');
  await take('20-my-trips.png', '/fa/my-trips');
  await take('24-admin-dashboard.png', '/fa/admin');
});