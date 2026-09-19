// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

async function testOtp() {
  const url = 'http://smswbs.ir/class/sms/restful/OTP/send_OTP.php';
  const start = Date.now();
  const body = {
    username: process.env.SMSWBS_USERNAME,
    api_password: process.env.SMSWBS_PASSWORD,
    mobile: '09105247414',
    footer: 'سامانه فیروزو'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });
    const text = await res.text();
    console.log('OTP RESULT:', res.status, text, (Date.now() - start) + 'ms');
  } catch (e) {
    console.log('OTP FAILED:', e.message, (Date.now() - start) + 'ms');
  }
}
testOtp();
