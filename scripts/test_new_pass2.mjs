// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

async function test() {
  const t = { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { uname: process.env.SMSWBS_USERNAME, pass: process.env.SMSWBS_PASSWORD } };
  const start = Date.now();
  try {
    const res = await fetch(t.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t.body),
      signal: AbortSignal.timeout(20000)
    });
    console.log(res.status, (await res.text()), Date.now() - start + 'ms');
  } catch (e) {
    console.log('ERR:', e.message, Date.now() - start + 'ms');
  }
}
test();
