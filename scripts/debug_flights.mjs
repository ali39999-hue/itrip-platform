import http from 'node:http';
import { chromium } from '@playwright/test';

async function testFlights() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('console', msg => console.log(`CONSOLE [${msg.type()}]:`, msg.text()));

  try {
    const res = await page.goto('http://localhost:3000/fa/flights', { waitUntil: 'domcontentloaded' });
    console.log('Page status:', res.status());
    await page.waitForTimeout(3000);

    const errorDetails = await page.evaluate(() => {
      const overlay = document.querySelector('nextjs-portal');
      const errHeading = document.querySelector('[data-nextjs-dialog-header], h1, h2, pre');
      return {
        hasOverlay: !!overlay,
        overlayText: overlay ? overlay.shadowRoot?.innerHTML?.slice(0, 1000) || overlay.innerText : null,
        bodyText: document.body.innerText.slice(0, 1500)
      };
    });

    console.log('Error details:', JSON.stringify(errorDetails, null, 2));
  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await browser.close();
  }
}

const server = http.createServer((req, res) => res.end('ok'));
server.listen(3099, '127.0.0.1', () => {
  testFlights();
});
