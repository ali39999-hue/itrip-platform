import { chromium } from 'playwright';

async function testSwapDirect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto('http://localhost:3000/fa/flights', { waitUntil: 'networkidle' });
  const fromInput = page.locator('#search-from-input');
  const toInput = page.locator('#search-to-input');

  console.log('Before swap - From:', await fromInput.inputValue(), 'To:', await toInput.inputValue());

  const swapBtn = page.locator('button:visible[aria-label*="جابجایی"]').first();
  console.log('Swap button found:', await swapBtn.count());
  await swapBtn.click();
  await page.waitForTimeout(500);

  console.log('After swap - From:', await fromInput.inputValue(), 'To:', await toInput.inputValue());
  await browser.close();
}

testSwapDirect().catch(console.error);
