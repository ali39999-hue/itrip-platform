// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

async function testHupaOtp() {
  const url = 'https://sms.hupa.ir/class/sms/restful/OTP/send_OTP.php';
  const start = Date.now();
  const payload = {
    username: process.env.SMSWBS_USERNAME,
    api_password: process.env.SMSWBS_PASSWORD,
    mobile: '09105247414',
    footer: 'فیروزو'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });
    const text = await res.text();
    console.log('STATUS:', res.status, (Date.now() - start) + 'ms');
    console.log('RESPONSE:', text);
  } catch (e) {
    console.log('ERROR:', e.message, (Date.now() - start) + 'ms');
  }
}
testHupaOtp();
