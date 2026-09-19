// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

import http from 'node:http';

async function testWithLongTimeout() {
  const payload = JSON.stringify({
    username: process.env.SMSWBS_USERNAME,
    api_password: process.env.SMSWBS_PASSWORD
  });
  const start = Date.now();

  const req = http.request({
    hostname: 'smswbs.ir',
    port: 80,
    path: '/class/sms/restful/getData.php',
    method: 'POST',
    localAddress: '10.233.102.8',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: 30000
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data, (Date.now() - start) + 'ms'));
  });

  req.on('error', e => console.log('ERROR:', e.message));
  req.on('timeout', () => { req.destroy(); console.log('TIMEOUT'); });
  req.write(payload);
  req.end();
}

testWithLongTimeout();
