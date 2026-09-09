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
    { username: '09123764868', password: '@Hvd1367++' },
    { uname: '09123764868', pass: '@Hvd1367++' },
    { username: '09123764868', api_password: '@Hvd1367++' },
    { user: '09123764868', pass: '@Hvd1367++' },
    { username: '09123764868', password: 'Hvd1367++@' },
    { uname: '09123764868', pass: 'Hvd1367++@' }
  ];

  for (const c of combos) {
    const res = await testCombination(c);
    console.log(JSON.stringify(res.payload), '=>', res.status || res.error, res.data || '', `(${res.time}ms)`);
  }
}

run();
