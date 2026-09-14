import { chromium } from 'playwright';

async function inspectTabs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.partocrs.ir/Authenticate');

  const forms = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map(f => {
      const img = f.querySelector('img.math-captcha-image');
      const input = f.querySelector('input[name="MathCaptchaAnswer"]');
      const token = f.querySelector('input[name="MathCaptchaToken"]');
      return {
        id: f.id,
        action: f.action,
        visible: f.offsetParent !== null,
        imgSrc: img?.src?.slice(0, 50),
        inputVal: input?.value,
        tokenVal: token?.value?.slice(0, 30),
      };
    });
  });
  console.log('Forms on page:', forms);
  await browser.close();
}

inspectTabs();
