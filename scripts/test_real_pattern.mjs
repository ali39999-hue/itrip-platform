// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

async function testRealPattern() {
  const url = 'http://smswbs.ir/class/sms/webservice/sendPattern.php';
  const start = Date.now();
  const payload = {
    fromNum: '3000505',
    toNum: '09105247414',
    user: process.env.SMSWBS_USERNAME,
    pass: process.env.SMSWBS_PASSWORD,
    pattern_code: '1412',
    input_data: [
      { code: '123456' }
    ]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });
    const text = await res.text();
    console.log('STATUS:', res.status, (Date.now() - start) + 'ms');
    console.log('RESPONSE:', text);
  } catch (e) {
    console.log('ERROR:', e.message, (Date.now() - start) + 'ms');
  }
}
testRealPattern();
