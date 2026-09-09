async function testOtp() {
  const url = 'http://smswbs.ir/class/sms/restful/OTP/send_OTP.php';
  const start = Date.now();
  const body = {
    username: '09123764868',
    api_password: 'Hvd1367++@',
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
