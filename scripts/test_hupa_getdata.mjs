async function test() {
  const url = 'http://sms.hupa.ir/class/sms/restful/getData.php';
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '09123764868',
        api_password: '@Hvd1367++'
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
