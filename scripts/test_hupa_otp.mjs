async function testHupaOtp() {
  const url = 'https://sms.hupa.ir/class/sms/restful/OTP/send_OTP.php';
  const start = Date.now();
  const payload = {
    username: '09123764868',
    api_password: '@Hvd1367++',
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
