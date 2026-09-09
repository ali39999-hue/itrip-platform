async function testFormData() {
  const form = new FormData();
  form.append('method', 'getData');
  form.append('username', '09123764868');
  form.append('password', '@Hvd1367++');

  const start = Date.now();
  try {
    const res = await fetch('https://smshooshmand.com/webservice/test', {
      method: 'POST',
      headers: {
        'Cookie': 'alarm=active; theme=k-theme; PHPSESSID=m9k120v43n7q012e84v3v0o634',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      },
      body: form,
      redirect: 'manual'
    });
    console.log('STATUS:', res.status, (Date.now() - start) + 'ms');
    console.log('RESPONSE:', await res.text());
  } catch (e) {
    console.log('ERROR:', e.message, (Date.now() - start) + 'ms');
  }
}

testFormData();
