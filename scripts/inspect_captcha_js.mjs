import { chromium } from 'playwright';

async function inspectCaptchaJs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.partocrs.ir/Authenticate');

  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => s.src || s.textContent).filter(s => s.includes('MathCaptcha') || s.includes('captcha'));
  });
  console.log('Scripts mentioning captcha:', scripts.length);
  for (const s of scripts) {
    console.log('--- Script sample: ---', s.slice(0, 300));
  }
  await browser.close();
}

inspectCaptchaJs();
