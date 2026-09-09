const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();

  // 1) Auth page: does #password exist?
  const p1 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p1.goto('http://localhost:3000/fa/auth', { waitUntil: 'networkidle' });
  const pwCount = await p1.locator('#password').count();
  const otpHint = await p1.getByText(/کد تایید|رمز یکبار|OTP/i).count();
  console.log('auth page #password count:', pwCount, '| OTP-related text:', otpHint > 0);
  await p1.screenshot({ path: 'screenshots/visual-review/auth_page_now.png' });

  // 2) Plan page: which buttons exist?
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p2.goto('http://localhost:3000/fa/plan', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(1500);
  const btns = await p2.$$eval('button', (els) => els.map((e) => e.innerText.trim()).filter(Boolean));
  console.log('plan page buttons:', JSON.stringify(btns.slice(0, 20)));
  await p2.screenshot({ path: 'screenshots/visual-review/plan_page_now.png' });

  await browser.close();
  console.log('DONE');
})();
