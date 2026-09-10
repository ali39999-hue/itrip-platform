// One-off: list every process.env / serverEnv var referenced in src, diff vs .env.example
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|mjs)$/.test(f) && !/\.test\./.test(f)) files.push(p);
  }
})(join(process.cwd(), 'src'));

const used = new Map();
const re = /process\.env\.([A-Z0-9_]+)/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(src))) {
    if (!used.has(m[1])) used.set(m[1], []);
    used.get(m[1]).push(f.replace(process.cwd(), ''));
  }
}

const exampleKeys = new Set(
  ['DATABASE_URL', 'AUTH_SECRET', 'AUTH_TRUST_HOST', 'NEXTAUTH_URL', 'DEMO_MODE', 'NEXT_PUBLIC_DEMO_MODE',
   'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'TELEGRAM_BOT_TOKEN',
   'NEXT_PUBLIC_TELEGRAM_BOT_USERNAME', 'BALE_BOT_TOKEN', 'NEXT_PUBLIC_BALE_BOT_USERNAME', 'WECHAT_APP_ID',
   'WECHAT_APP_SECRET', 'NEXT_PUBLIC_WECHAT_APP_ID', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN',
   'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER', 'RESEND_API_KEY', 'EMAIL_FROM',
   'SMSWBS_USERNAME', 'SMS_PROVIDER', 'SMS_SENDER_LINE', 'SMS_OTP_LINE', 'SMS_PATTERN_CODE',
   'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_HOST', 'ADMIN_PASSWORD', 'USER_PASSWORD',
   'ECARDO_BASE_URL', 'SMSWBS_PASSWORD', 'NEXT_PUBLIC_WECHAT_APP_ID']
);

const missing = [...used.keys()].filter((k) => !exampleKeys.has(k)).sort();
console.log('=== Referenced in src but MISSING from .env.example ===');
for (const k of missing) console.log(`${k}  (${used.get(k).length} refs, e.g. ${used.get(k)[0]})`);
console.log(`\ntotal used=${used.size}, missing=${missing.length}`);
