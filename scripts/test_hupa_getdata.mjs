// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

async function test() {
  const url = 'http://sms.hupa.ir/class/sms/restful/getData.php';
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.SMSWBS_USERNAME,
        api_password: process.env.SMSWBS_PASSWORD
      }),
      signal: AbortSignal.timeout(30000)
    });
    const text = await res.text();
    console.log('STATUS:', res.status, (Date.now() - start) + 'ms');
    console.log('RESPONSE:', text);
  } catch (e) {
    console.log('ERR:', e.message, (Date.now() - start) + 'ms');
  }
}
test();
