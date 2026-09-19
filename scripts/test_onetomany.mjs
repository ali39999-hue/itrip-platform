// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

async function testOneToMany() {
  const url = 'http://smswbs.ir/class/sms/restful/sendSms_OneToMany.php';
  const start = Date.now();
  const body = {
    username: process.env.SMSWBS_USERNAME,
    api_password: process.env.SMSWBS_PASSWORD,
    fromNum: '50004001764868',
    toNum: ['09105247414'],
    messageContent: 'کد تایید ورود به فیروزو: 123456'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    const text = await res.text();
    console.log('OneToMany RESULT:', res.status, text, (Date.now() - start) + 'ms');
  } catch (e) {
    console.log('OneToMany FAILED:', e.message, (Date.now() - start) + 'ms');
  }
}
testOneToMany();
