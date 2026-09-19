// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

import http from 'node:http';

async function testCombination(payloadObj, path = '/class/sms/restful/getData.php') {
  const payload = JSON.stringify(payloadObj);
  const start = Date.now();
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'smswbs.ir',
      port: 80,
      path,
      method: 'POST',
      localAddress: '10.233.102.8',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ payload: payloadObj, status: res.statusCode, data, time: Date.now() - start });
      });
    });

    req.on('error', e => resolve({ payload: payloadObj, error: e.message, time: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ payload: payloadObj, error: 'timeout', time: Date.now() - start }); });
    req.write(payload);
    req.end();
  });
}

async function run() {
  const combos = [
    { username: process.env.SMSWBS_USERNAME, password: process.env.SMSWBS_PASSWORD },
    { uname: process.env.SMSWBS_USERNAME, pass: process.env.SMSWBS_PASSWORD },
    { username: process.env.SMSWBS_USERNAME, api_password: process.env.SMSWBS_PASSWORD },
    { user: process.env.SMSWBS_USERNAME, pass: process.env.SMSWBS_PASSWORD },
    { username: process.env.SMSWBS_USERNAME, password: process.env.SMSWBS_PASSWORD },
    { uname: process.env.SMSWBS_USERNAME, pass: process.env.SMSWBS_PASSWORD }
  ];

  for (const c of combos) {
    const res = await testCombination(c);
    console.log(JSON.stringify(res.payload), '=>', res.status || res.error, res.data || '', `(${res.time}ms)`);
  }
}

run();
