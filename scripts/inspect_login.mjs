import { chromium } from 'playwright';

async function inspectLoginPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.partocrs.ir/Authenticate?ReturnUrl=%2FDashboard%2FHome', { waitUntil: 'domcontentloaded' });
  
  const officeInput = await page.locator('#Signin_OfficeId, input[name="Signin.OfficeId"]').count();
  const userInput = await page.locator('#Signin_UserName, input[name="Signin.UserName"]').count();
  const passInput = await page.locator('#Signin_Password, input[name="Signin.Password"]').count();
  const captchaInput = await page.locator('#MathCaptchaAnswer, input[name="MathCaptchaAnswer"]').count();
  
  console.log({
    officeInput,
    userInput,
    passInput,
    captchaInput,
  });

  const imgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(i => ({
      src: i.src.slice(0, 100),
      id: i.id,
      className: i.className,
      alt: i.alt,
    }));
  });
  console.log('Images on login page:', imgs);

  // Take screenshot of the login box
  await page.screenshot({ path: 'login_preview.png' });
  console.log('Screenshot saved to login_preview.png');

  await browser.close();
}

inspectLoginPage().catch(console.error);
