const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readDotEnv(key) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const m = fs.readFileSync(envPath, 'utf8').match(new RegExp('^' + key + '="?([^"\\r\\n]+)"?', 'm'));
  return m ? m[1] : undefined;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const csrfRes = await page.request.get('http://localhost:3000/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();
  const password = process.env.ADMIN_PASSWORD || readDotEnv('ADMIN_PASSWORD') || 'Admin@Firuzo2026!Secure';
  await page.request.post('http://localhost:3000/api/auth/callback/credentials', {
    form: { identifier: 'admin@firuzo.com', password, channel: 'credentials', csrfToken, json: 'true' },
  });

  await page.goto('http://localhost:3000/fa/admin/ops', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const probe = await page.evaluate(() => {
    function chain(el) {
      const out = [];
      let cur = el;
      while (cur && cur !== document.body) {
        const st = window.getComputedStyle(cur);
        if (Number(st.opacity) < 1 || st.animationName !== 'none' || st.maskImage !== 'none' || st.webkitMaskImage !== 'none') {
          out.push({
            tag: cur.tagName,
            cls: String(cur.className).slice(0, 90),
            opacity: st.opacity,
            anim: st.animationName + ' ' + st.animationDuration + ' ' + st.animationFillMode + ' timeline:' + st.animationTimeline,
            mask: st.maskImage !== 'none' ? st.maskImage.slice(0, 80) : '',
          });
        }
        cur = cur.parentElement;
      }
      return out;
    }

    // a sidebar link below the fold
    const aside = document.querySelector('aside a, nav a');
    const links = Array.from(document.querySelectorAll('aside a, [class*="sidebar"] a')).slice(0, 12);
    const samples = links.map((a) => {
      const r = a.getBoundingClientRect();
      const st = window.getComputedStyle(a);
      return { text: (a.innerText || '').slice(0, 18), top: Math.round(r.top), opacity: st.opacity };
    });

    // bookings-like row sampling isn't here; return aside chain for one faded item
    const faded = links.find((a) => Number(window.getComputedStyle(a).opacity) < 1);
    return { samples, chain: faded ? chain(faded) : null };
  });
  console.log(JSON.stringify(probe, null, 1));

  await browser.close();
})();
