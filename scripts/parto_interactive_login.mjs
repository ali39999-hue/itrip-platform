import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

async function runInteractiveLogin() {
  const ANS_FILE = resolve('captcha_task.ans');
  const IMG_FILE = resolve('captcha_task.png');
  const RESULT_FILE = resolve('captcha_task.result.json');

  if (existsSync(ANS_FILE)) unlinkSync(ANS_FILE);
  if (existsSync(RESULT_FILE)) unlinkSync(RESULT_FILE);

  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Parto Authenticate...');
  await page.goto('https://www.partocrs.ir/Authenticate?ReturnUrl=%2FDashboard%2FHome', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const signinForm = page.locator('form[action*="Signin"]');
  if (await signinForm.count() === 0) {
    throw new Error('Signin form not found');
  }

  // Credentials
  const officeId = process.env.PARTO_OFFICE_ID || '';
  const username = process.env.PARTO_USERNAME || '';
  const password = process.env.PARTO_PASSWORD || '';

  await signinForm.locator('input[name="Signin.OfficeId"]').fill(officeId);
  await signinForm.locator('input[name="Signin.UserName"]').fill(username);
  await signinForm.locator('input[name="Signin.Password"]').fill(password);

  // Captcha image from the EXACT signin form
  const captchaImg = signinForm.locator('img.math-captcha-image');
  const src = await captchaImg.getAttribute('src');
  if (!src || !src.startsWith('data:image/png;base64,')) {
    throw new Error('Captcha image src missing in signin form');
  }

  const base64Data = src.replace(/^data:image\/png;base64,/, '');
  writeFileSync(IMG_FILE, Buffer.from(base64Data, 'base64'));
  console.log('✔ Captcha image from Signin form saved to', IMG_FILE);
  console.log('Waiting for answer in', ANS_FILE, '...');

  // Wait up to 60s for answer file
  let answer = null;
  const startTime = Date.now();
  while (Date.now() - startTime < 60000) {
    if (existsSync(ANS_FILE)) {
      answer = readFileSync(ANS_FILE, 'utf8').trim();
      if (answer) break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!answer) {
    writeFileSync(RESULT_FILE, JSON.stringify({ error: 'TIMEOUT' }));
    await browser.close();
    return;
  }

  console.log(`Received answer: "${answer}". Submitting form...`);
  const captchaInput = signinForm.locator('input[name="MathCaptchaAnswer"]');
  await captchaInput.fill(answer);

  const submitBtn = signinForm.locator('button[type="submit"]');
  await submitBtn.click();

  console.log('Waiting for response...');
  await page.waitForTimeout(5000);

  const currentUrl = page.url();
  console.log('Current URL after submit:', currentUrl);
  await page.screenshot({ path: 'after_submit.png' });

  const alertText = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('.alert, .validation-summary-errors, .field-validation-error, .text-danger, .toast, .sweet-alert, .modal.in'));
    return alerts.map((a) => a.textContent?.trim()).filter(Boolean).join(' | ');
  });

  const isSuccess = /Dashboard|Profile|Home/i.test(currentUrl) && !currentUrl.includes('Authenticate');

  if (isSuccess) {
    const state = await context.storageState({ path: '.parto-portal-state.json' });
    const cookies = state.cookies ?? [];
    writeFileSync(RESULT_FILE, JSON.stringify({
      success: true,
      url: currentUrl,
      cookiesCount: cookies.length,
    }));
    console.log(`✔ SUCCESS! Logged in to Parto. Saved ${cookies.length} cookies.`);
  } else {
    writeFileSync(RESULT_FILE, JSON.stringify({
      success: false,
      url: currentUrl,
      alert: alertText || 'No alert detected - check after_submit.png',
    }));
    console.log('Login failed. Alert text:', alertText);
  }

  await browser.close();
}

runInteractiveLogin().catch((err) => {
  console.error('Error:', err);
  writeFileSync('captcha_task.result.json', JSON.stringify({ error: err.message }));
});
