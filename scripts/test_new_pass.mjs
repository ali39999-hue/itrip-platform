async function test() {
  const tests = [
    { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { uname: '09123764868', pass: '@Hvd1367++' } },
    { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { username: '09123764868', api_password: '@Hvd1367++' } },
    { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { uname: '09123764868', pass: 'Hvd1367++' } },
    { url: 'http://smswbs.ir/class/sms/restful/getData.php', body: { username: '09123764868', api_password: 'Hvd1367++' } },
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
