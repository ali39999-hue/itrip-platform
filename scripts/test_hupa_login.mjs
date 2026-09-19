// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

import https from 'node:https';

async function testLogin() {
  const params = new URLSearchParams({
    username: process.env.SMSWBS_USERNAME,
    password: process.env.SMSWBS_PASSWORD
  });
  const body = params.toString();

  const req = https.request({
    hostname: 'sms.hupa.ir',
    port: 443,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      'User-Agent': 'Mozilla/5.0'
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('LOGIN STATUS:', res.statusCode);
      console.log('SET-COOKIE:', res.headers['set-cookie']);
      console.log('LOCATION:', res.headers['location']);
      console.log('DATA:', data.slice(0, 200));
    });
  });

  req.on('error', e => console.log('ERROR:', e.message));
  req.write(body);
  req.end();
}

testLogin();
