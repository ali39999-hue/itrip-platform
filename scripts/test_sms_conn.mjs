// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

async function test() {
  const urls = [
    'http://smswbs.ir/class/sms/restful/getData.php',
    'https://sms.hupa.ir/class/sms/restful/getData.php',
    'https://smshooshmand.com/class/sms/restful/getData.php',
    'http://185.4.30.32/class/sms/restful/getData.php'
  ];
  for (const u of urls) {
    const start = Date.now();
    try {
      const res = await fetch(u, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uname: process.env.SMSWBS_USERNAME, pass: process.env.SMSWBS_PASSWORD }),
        signal: AbortSignal.timeout(5000)
      });
      const text = await res.text();
      console.log(u, 'STATUS:', res.status, text.slice(0, 80), (Date.now() - start) + 'ms');
    } catch (e) {
      console.log(u, 'FAILED:', e.message, (Date.now() - start) + 'ms');
    }
  }
}
test();
