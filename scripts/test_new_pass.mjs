// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

async function test() {
  const tests = [
    { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { uname: process.env.SMSWBS_USERNAME, pass: process.env.SMSWBS_PASSWORD } },
    { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { username: process.env.SMSWBS_USERNAME, api_password: process.env.SMSWBS_PASSWORD } },
    { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { uname: process.env.SMSWBS_USERNAME, pass: process.env.SMSWBS_PASSWORD } },
    { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { username: process.env.SMSWBS_USERNAME, api_password: process.env.SMSWBS_PASSWORD } },
  ];
  for (const t of tests) {
    try {
      const res = await fetch(t.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t.body),
        signal: AbortSignal.timeout(5000)
      });
      console.log(JSON.stringify(t.body), res.status, (await res.text()).slice(0, 100));
    } catch (e) {
      console.log(JSON.stringify(t.body), 'ERR:', e.message);
    }
  }
}
test();
