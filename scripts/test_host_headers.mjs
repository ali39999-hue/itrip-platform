import http from 'node:http';

async function testHost(hostHeader, path) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '185.4.30.32',
      port: 80,
      path: path,
      method: 'POST',
      headers: {
        'Host': hostHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ host: hostHeader, path, status: res.statusCode, preview: data.slice(0, 100) }));
    });
    req.on('error', e => resolve({ host: hostHeader, path, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ host: hostHeader, path, error: 'timeout' }); });
    req.write('{}');
    req.end();
  });
}

async function run() {
  const hosts = ['smswbs.ir', 'www.smswbs.ir', 'sms.hupa.ir', 'smshooshmand.com', 'www.smshooshmand.com'];
  const paths = [
    '/class/sms/webservice/sendPattern.php',
    '/class/sms/restful/OTP/send_OTP.php',
    '/class/sms/restful/getData.php'
  ];

  for (const h of hosts) {
    for (const p of paths) {
      const res = await testHost(h, p);
      console.log(`${res.host}${res.path} => ${res.status || res.error} | ${res.preview || ''}`);
    }
  }
}

run();
