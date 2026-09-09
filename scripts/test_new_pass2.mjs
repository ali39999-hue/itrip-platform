async function test() {
  const t = { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { uname: '09123764868', pass: '@Hvd1367++' } };
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
