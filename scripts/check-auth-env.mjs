// Reads .env / .env.local and reports which auth-related keys are present (values masked).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const files = ['.env', '.env.local', '.env.example'].map((f) => path.join(root, 'itrip-platform', f));
const keys = [
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET',
  'TELEGRAM_BOT_TOKEN', 'NEXT_PUBLIC_TELEGRAM_BOT_USERNAME',
  'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER',
  'WECHAT_APP_ID', 'WECHAT_APP_SECRET', 'NEXT_PUBLIC_WECHAT_APP_ID',
  'BALE_BOT_TOKEN', 'AUTH_SECRET', 'NEXTAUTH_SECRET', 'APP_BASE_URL', 'NEXTAUTH_URL',
];

const found = new Map();
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (keys.includes(m[1]) && m[2].trim() !== '' && m[2].trim() !== '""' && !m[2].includes('your-') && !m[2].includes('xxx')) {
      found.set(m[1], path.basename(file));
    }
  }
}
for (const k of keys) {
  console.log(`${found.has(k) ? 'SET  ' : 'unset'} ${k}${found.has(k) ? `  (${found.get(k)})` : ''}`);
}
